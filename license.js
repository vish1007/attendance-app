const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const licensePath = path.join(
  app.getPath("userData"),
  "license.json"
);

function saveLicense(data) {
  fs.writeFileSync(licensePath, JSON.stringify(data));
}

function isActivated() {
  return fs.existsSync(licensePath);
}

module.exports = {
  saveLicense,
  isActivated
};
