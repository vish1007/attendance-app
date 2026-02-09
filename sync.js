const XLSX = require("xlsx");

const GOOGLE_API_URL = "PASTE_YOUR_GOOGLE_SCRIPT_WEB_APP_URL";

async function autoSync(filePath, date) {
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const colIndex = data[0].indexOf(date);
    if (colIndex === -1) return;

    const records = data.slice(1).map(r => ({
      appId: r[1],
      value: r[colIndex]
    }));

    await fetch(GOOGLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, records })
    });
  } catch (e) {
    // silent fail when offline
  }
}

module.exports = { autoSync };
