const { contextBridge, ipcRenderer } = require("electron");
const excel = require("./excel");

// ===== EXISTING API (DO NOT TOUCH) =====
contextBridge.exposeInMainWorld("api", {
  openExcel: excel.openExcel,
  getStudents: excel.getStudents,
  createDate: excel.createDate,
  markAttendance: excel.markAttendance,
  getAttendanceForDate: excel.getAttendanceForDate,
  getAttendanceStats: excel.getAttendanceStats,
  getOpenFilePath: excel.getOpenFilePath,

  onOpenVoiceSettings: (callback) =>
    ipcRenderer.on("open-voice-settings", callback)
});

// ===== GOOGLE DRIVE API =====
contextBridge.exposeInMainWorld("drive", {
  connect: () => ipcRenderer.invoke("drive-connect"),
  upload: (filePath) => ipcRenderer.invoke("drive-upload", filePath)
});

// ===== APP STATE (LAST FILE) =====
contextBridge.exposeInMainWorld("appState", {
  setLastFile: (filePath) =>
    ipcRenderer.invoke("set-last-file", filePath),
  getRecentFiles: () =>
    ipcRenderer.invoke("get-recent-files"),
  removeRecentFile: (filePath) =>
    ipcRenderer.invoke("remove-recent-file", filePath)
});
contextBridge.exposeInMainWorld("license", {
  request: (email) =>
    ipcRenderer.invoke("request-activation", email),

  check: (email) =>
    ipcRenderer.invoke("check-activation", email)
});
