const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const storagePath = path.join(app.getPath("userData"), "lastFile.json");
const MAX_RECENT_FILES = 8;

function readStorage() {
  try {
    if (!fs.existsSync(storagePath)) {
      return { file: "", recentFiles: [] };
    }

    const data = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    const recentFiles = Array.isArray(data.recentFiles) ? data.recentFiles : [];

    return {
      file: data.file || "",
      recentFiles
    };
  } catch (err) {
    return { file: "", recentFiles: [] };
  }
}

function writeStorage(data) {
  fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
}

function getValidRecentFiles(recentFiles) {
  const seen = new Set();
  const validFiles = [];

  for (const entry of recentFiles) {
    if (!entry || typeof entry !== "string") continue;
    if (seen.has(entry)) continue;
    if (!fs.existsSync(entry)) continue;

    seen.add(entry);
    validFiles.push(entry);

    if (validFiles.length >= MAX_RECENT_FILES) break;
  }

  return validFiles;
}

function saveLastFile(excelPath) {
  const data = readStorage();
  const recentFiles = getValidRecentFiles([excelPath, ...data.recentFiles]);

  writeStorage({
    file: recentFiles[0] || excelPath,
    recentFiles
  });
}

function getLastFile() {
  const data = readStorage();
  const recentFiles = getValidRecentFiles([data.file, ...data.recentFiles]);

  if (recentFiles.length !== data.recentFiles.length || data.file !== (recentFiles[0] || "")) {
    writeStorage({
      file: recentFiles[0] || "",
      recentFiles
    });
  }

  return recentFiles[0] || "";
}

function getRecentFiles() {
  const data = readStorage();
  const recentFiles = getValidRecentFiles([data.file, ...data.recentFiles]);

  writeStorage({
    file: recentFiles[0] || "",
    recentFiles
  });

  return recentFiles;
}

function removeRecentFile(excelPath) {
  const data = readStorage();
  const filteredFiles = getValidRecentFiles(
    data.recentFiles.filter(entry => entry !== excelPath)
  );

  const nextCurrentFile = data.file === excelPath
    ? (filteredFiles[0] || "")
    : data.file;

  writeStorage({
    file: nextCurrentFile,
    recentFiles: filteredFiles
  });

  return filteredFiles;
}

module.exports = {
  saveLastFile,
  getLastFile,
  getRecentFiles,
  removeRecentFile
};
