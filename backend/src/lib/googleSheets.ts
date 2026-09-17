import { google } from "googleapis";

// Reads the service account credentials + target spreadsheet ID from env.
// Nothing here runs unless credentials + sheet ID are set, so the backup
// feature is a no-op (never breaks the app) until Google is configured.
//
// Two ways to supply credentials:
//   1. GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 — the ENTIRE downloaded service
//      account JSON file, base64-encoded into one line. Recommended: this
//      sidesteps every manual-escaping mistake (stray \n, smart quotes,
//      CRLF line endings) that causes the classic Node.js
//      "error:1E08010C:DECODER routines::unsupported" error.
//   2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY —
//      the two fields typed out separately (kept for backward compatibility).
function getConfig() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return null;

  const base64Json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (base64Json) {
    try {
      const decoded = Buffer.from(base64Json.trim(), "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { email: parsed.client_email, privateKey: parsed.private_key, sheetId };
      }
    } catch (err) {
      console.error("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is set but could not be decoded/parsed:", err);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;

  // Render/most hosts store multi-line keys with literal "\n" — convert
  // those back into real newlines, or the JWT signer will reject the key.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  return { email, privateKey, sheetId };
}

export function isBackupConfigured(): boolean {
  return getConfig() !== null;
}

let sheetsClientPromise: ReturnType<typeof buildClient> | null = null;

async function buildClient() {
  const config = getConfig();
  if (!config) throw new Error("Google Sheets backup is not configured");

  const auth = new google.auth.JWT({
    email: config.email,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await auth.authorize();
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId: config.sheetId };
}

async function getClient() {
  if (!sheetsClientPromise) {
    sheetsClientPromise = buildClient();
  }
  try {
    return await sheetsClientPromise;
  } catch (err) {
    // Don't cache a failed auth attempt — let the next call retry fresh.
    sheetsClientPromise = null;
    throw err;
  }
}

async function ensureTabExists(tabName: string) {
  const { sheets, spreadsheetId } = await getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tabName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
    });
  }
}

/**
 * Fully replaces a tab's contents with `headers` + `rows` (this is what
 * gives us "live" data — every sync run reflects exactly what's in the
 * database right now, with nothing stale left behind).
 */
export async function writeSheet(tabName: string, headers: string[], rows: (string | number | boolean | null)[][]) {
  await ensureTabExists(tabName);
  const { sheets, spreadsheetId } = await getClient();

  // Clear the whole tab first so shrinking data doesn't leave old rows behind.
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A:ZZ` });

  const values = [headers, ...rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : cell)))];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/**
 * Appends rows to a tab without touching existing ones — used for the
 * "Deleted Records" log, which is meant to accumulate forever so nothing is
 * ever lost even after the live tabs stop showing a record.
 */
export async function appendToSheet(tabName: string, headers: string[], rows: (string | number | boolean | null)[][]) {
  if (rows.length === 0) return;
  await ensureTabExists(tabName);
  const { sheets, spreadsheetId } = await getClient();

  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A1:A1` });
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }

  const values = rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : cell)));
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

/** Reads column A of a tab (used to know which IDs are already logged, so appends don't duplicate). */
export async function readColumnA(tabName: string): Promise<Set<string>> {
  try {
    await ensureTabExists(tabName);
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A2:A` });
    const rows = res.data.values || [];
    return new Set(rows.map((r) => String(r[0])));
  } catch {
    return new Set();
  }
}

export function getSheetUrl(): string | null {
  const config = getConfig();
  if (!config) return null;
  return `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`;
}