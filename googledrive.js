const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const http = require("http");
const url = require("url");

/* ===================== CONFIG ===================== */

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = require("./config");

const CLIENT_ID = GOOGLE_CLIENT_ID;
const CLIENT_SECRET = GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("Google OAuth config missing");
}


// ⚠️ DO NOT SET REDIRECT URI HERE
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/* ===================== OAUTH CLIENT ===================== */

// ✅ Create OAuth client WITHOUT redirect_uri
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET
);

/* ===================== TOKEN PATH (SAFE) ===================== */

function getTokenPath() {
  const { app } = require("electron");
  return path.join(app.getPath("userData"), "google_token.json");
}

/* ===================== TOKEN HANDLING ===================== */

function loadSavedToken() {
  try {
    const tokenPath = getTokenPath();
    if (!fs.existsSync(tokenPath)) return false;

    const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    oauth2Client.setCredentials(tokens);
    return true;
  } catch (err) {
    console.error("Failed to load token:", err);
    return false;
  }
}

function hasSavedToken() {
  return fs.existsSync(getTokenPath());
}

async function saveToken(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(getTokenPath(), JSON.stringify(tokens));
}

/* ===================== AUTH FLOW ===================== */

async function ensureAuth() {
  if (loadSavedToken()) return;

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = new url.URL(req.url, "http://localhost");
        const code = parsedUrl.searchParams.get("code");

        if (!code) return;

        await saveToken(code);

        res.end(
          "✅ Google Drive connected successfully. You can close this window."
        );

        server.close();
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    // 🔥 Listen on ANY available port
    server.listen(0, () => {
      const port = server.address().port;
      const redirectUri = `http://localhost:${port}`;

      // ✅ SET redirect URI dynamically
      oauth2Client.redirectUri = redirectUri;

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent"
      });

      const { shell } = require("electron");
      shell.openExternal(authUrl);
    });
  });
}

/* ===================== ATTENDANCE FOLDER ===================== */

async function getAttendanceFolderId(drive) {
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Attendance' and trashed=false",
    fields: "files(id, name)"
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: "Attendance",
      mimeType: "application/vnd.google-apps.folder"
    },
    fields: "id"
  });

  return folder.data.id;
}

/* ===================== DRIVE UPLOAD ===================== */

function disconnect() {
  try {
    const tokenPath = getTokenPath();

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }

    oauth2Client.setCredentials(null);
  } catch (err) {
    console.error("Failed to disconnect Google Drive:", err);
  }
}

async function uploadOrReplace(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Invalid file path");
  }

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client
  });

  const fileName = path.basename(filePath);

  // 📁 Ensure Attendance folder exists
  const folderId = await getAttendanceFolderId(drive);

  // 🔍 Check for existing file
  const list = await drive.files.list({
    q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
    fields: "files(id, name)"
  });

  // ❌ Delete old version
  for (const file of list.data.files) {
    await drive.files.delete({ fileId: file.id });
  }

  // ⬆ Upload new file
  await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: fs.createReadStream(filePath)
    }
  });
}

async function uploadIfConnected(filePath) {
  if (!hasSavedToken()) return false;
  if (!loadSavedToken()) return false;

  await uploadOrReplace(filePath);
  return true;
}

/* ===================== EXPORTS ===================== */

module.exports = {
  ensureAuth,
  uploadOrReplace,
  uploadIfConnected,
  hasSavedToken,
  disconnect
};
