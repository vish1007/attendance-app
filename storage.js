const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const filePath = path.join(app.getPath("userData"), "lastFile.json");

function saveLastFile(excelPath) {
  fs.writeFileSync(filePath, JSON.stringify({ file: excelPath }));
}

function getLastFile() {
  if (!fs.existsSync(filePath)) return "";
  const data = JSON.parse(fs.readFileSync(filePath));
  return data.file || "";
}

module.exports = {
  saveLastFile,
  getLastFile
};
