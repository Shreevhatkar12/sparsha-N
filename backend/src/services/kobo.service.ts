import axios from "axios";

const KOBO_API_URL = process.env.KOBO_API_URL!;
const KOBO_API_TOKEN = process.env.KOBO_API_TOKEN!;

const koboClient = axios.create({
  baseURL: KOBO_API_URL,
  headers: {
    Authorization: `Token ${KOBO_API_TOKEN}`,
  },
});

// Fetch all forms
export async function getKoboForms() {
  const res = await koboClient.get("/api/v2/assets/");
  return res.data.results;
}

// Fetch submissions
export async function getKoboSubmissions(assetUid: string) {
  const res = await koboClient.get(`/api/v2/assets/${assetUid}/data/`);
  return res.data.results;
}