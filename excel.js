const XLSX = require("xlsx");
const fs = require("fs");

let workbook;
let filePath;
let sheetName;

function ensureWorkbookLoaded() {
  if (!workbook || !filePath || !sheetName) {
    throw new Error("No Excel file is currently open.");
  }
}

function saveWorkbook() {
  ensureWorkbookLoaded();
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

function fixHeaderDatesToText() {
  if (!workbook || !sheetName) return;

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headerRow = 0;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];

    if (cell && cell.t === "n") {
      const d = XLSX.SSF.parse_date_code(cell.v);
      const formatted = `${String(d.d).padStart(2,"0")}-${String(d.m).padStart(2,"0")}-${d.y}`;

      sheet[addr] = { t: "s", v: formatted };
    }
  }

  saveWorkbook();
}

function openExcel(path) {
  filePath = path;

  // ✅ FIRST load workbook
  workbook = XLSX.readFile(filePath);
  sheetName = workbook.SheetNames[0]; // FIRST & ONLY SHEET

  // ✅ THEN clean header dates
  fixHeaderDatesToText();
}


// ------------------ HELPERS ------------------


function formatDateDDMMYYYY(input) {
  const d = new Date(input);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function normalizeHeaderCell(cell) {
  if (!cell) return "";

  // If Excel converted date → number
  if (cell.t === "n") {
    const d = XLSX.SSF.parse_date_code(cell.v);
    return `${String(d.d).padStart(2, "0")}-${String(d.m).padStart(2, "0")}-${d.y}`;
  }

  // Otherwise treat as string
  return String(cell.v);
}

// ------------------ CORE LOGIC ------------------

function getStudents() {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  blankrows: false
});
  return data.slice(1); // skip header
}

function createDate(date) {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headerRow = 0;

  // ✅ Normalize incoming date
  const formattedDate = formatDateDDMMYYYY(date);

  // 🔍 Check if date already exists (SAFE READ)
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];

    const headerValue = normalizeHeaderCell(cell);

    if (headerValue === formattedDate) {
      return { colIndex: c, existed: true };
    }
  }

  // ➕ Add new date column (FORCE STRING)
  const newCol = range.e.c + 1;
  const newCellAddr = XLSX.utils.encode_cell({ r: headerRow, c: newCol });

  sheet[newCellAddr] = {
    t: "s",          // FORCE STRING
    v: formattedDate
  };

  sheet["!ref"] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: range.e.r, c: newCol }
  });

  saveWorkbook();

  return { colIndex: newCol, existed: false };
}

function markAttendance(rowIndex, colIndex, value) {
  ensureWorkbookLoaded();
  const sheet = workbook.Sheets[sheetName];
  const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

  sheet[cellAddr] = { t: "n", v: value };
  return saveWorkbook();
}

function getAttendanceForDate(colIndex) {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const attendance = {};

  for (let r = 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: colIndex });
    const cell = sheet[addr];

    if (cell && (cell.v === 1 || cell.v === 0)) {
      attendance[r] = cell.v;
    }
  }

  return attendance;
}

function getAttendanceStats() {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const START_COL = 7; // attendance starts from 8th column
  const stats = {};

  for (let r = 1; r < data.length; r++) {
    let total = 0;
    let present = 0;

    for (let c = START_COL; c < data[r].length; c++) {
      if (data[r][c] === 1 || data[r][c] === 0) {
        total++;
        if (data[r][c] === 1) present++;
      }
    }

    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    stats[r] = { total, present, percent };
  }

  return stats;
}

// ------------------ EXPORTS ------------------

module.exports = {
  openExcel,
  getStudents,
  createDate,
  markAttendance,
  getAttendanceForDate,
  getAttendanceStats,
  getOpenFilePath: () => filePath || ""
};
