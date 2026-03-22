const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const storagePath = path.join(app.getPath("userData"), "lastFile.json");
const MAX_RECENT_FILES = 8;
const DEFAULT_BRANDING = {
  title: "Attendance Management System",
  logoPath: "assets/logo.png",
  backgroundPath: "assets/bg.jpg"
};

function normalizeBranding(branding) {
  return {
    title: typeof branding?.title === "string" && branding.title.trim()
      ? branding.title.trim()
      : DEFAULT_BRANDING.title,
    logoPath: typeof branding?.logoPath === "string" && branding.logoPath.trim()
      ? branding.logoPath
      : DEFAULT_BRANDING.logoPath,
    backgroundPath: typeof branding?.backgroundPath === "string" && branding.backgroundPath.trim()
      ? branding.backgroundPath
      : DEFAULT_BRANDING.backgroundPath
  };
}

function readStorage() {
  try {
    if (!fs.existsSync(storagePath)) {
      return { file: "", recentFiles: [], theme: "professional" };
    }

    const data = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    const recentFiles = Array.isArray(data.recentFiles) ? data.recentFiles : [];

    return {
      file: data.file || "",
      recentFiles,
      theme: data.theme === "classic" ? "classic" : "professional",
      branding: normalizeBranding(data.branding)
    };
  } catch (err) {
    return {
      file: "",
      recentFiles: [],
      theme: "professional",
      branding: { ...DEFAULT_BRANDING }
    };
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
    recentFiles,
    theme: data.theme,
    branding: data.branding
  });
}

function getLastFile() {
  const data = readStorage();
  const recentFiles = getValidRecentFiles([data.file, ...data.recentFiles]);

  if (recentFiles.length !== data.recentFiles.length || data.file !== (recentFiles[0] || "")) {
    writeStorage({
      file: recentFiles[0] || "",
      recentFiles,
      theme: data.theme,
      branding: data.branding
    });
  }

  return recentFiles[0] || "";
}

function getRecentFiles() {
  const data = readStorage();
  const recentFiles = getValidRecentFiles([data.file, ...data.recentFiles]);

  writeStorage({
    file: recentFiles[0] || "",
    recentFiles,
    theme: data.theme,
    branding: data.branding
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
    recentFiles: filteredFiles,
    theme: data.theme,
    branding: data.branding
  });

  return filteredFiles;
}

function getTheme() {
  return readStorage().theme;
}

function saveTheme(theme) {
  const data = readStorage();
  const nextTheme = theme === "classic" ? "classic" : "professional";

  writeStorage({
    file: data.file,
    recentFiles: data.recentFiles,
    theme: nextTheme,
    branding: data.branding
  });

  return nextTheme;
}

function getBranding() {
  return readStorage().branding;
}

function saveBranding(branding) {
  const data = readStorage();
  const nextBranding = normalizeBranding(branding);

  writeStorage({
    file: data.file,
    recentFiles: data.recentFiles,
    theme: data.theme,
    branding: nextBranding
  });

  return nextBranding;
}

module.exports = {
  saveLastFile,
  getLastFile,
  getRecentFiles,
  removeRecentFile,
  getTheme,
  saveTheme,
  getBranding,
  saveBranding
};
