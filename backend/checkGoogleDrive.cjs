require("dotenv").config();
const { google } = require("googleapis");

(async () => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  await auth.authorize();

  const drive = google.drive({
    version: "v3",
    auth,
  });

  const result = await drive.files.list({
    q: "trashed = false",
    fields: "files(id,name,mimeType,webViewLink)",
    spaces: "drive",
  });

  const files = result.data.files || [];

  console.log("\nFILES VISIBLE TO SERVICE ACCOUNT:\n");

  for (const file of files) {
    console.log("NAME:", file.name);
    console.log("ID:", file.id);
    console.log("TYPE:", file.mimeType);
    console.log("URL:", file.webViewLink);
    console.log("-----------------------------");
  }
})().catch((error) => {
  console.error(
    "ERROR:",
    error.response?.data?.error?.message || error.message
  );
});
