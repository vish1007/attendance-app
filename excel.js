const XLSX = require("xlsx");
const fs = require("fs");

let workbook;
let filePath;
let sheetName;

function openExcel(path) {
  filePath = path;
  workbook = XLSX.readFile(filePath);
  sheetName = workbook.SheetNames[0]; // ✅ FIRST & ONLY SHEET
}

function getStudents() {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return data.slice(1); // skip header
}

// function createDate(date) {
//   const sheet = workbook.Sheets[sheetName];
//   const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//   if (data[0].includes(date)) return true;

//   data[0].push(date);
//   XLSX.utils.sheet_add_aoa(sheet, [data[0]], { origin: "A1" });
//   XLSX.writeFile(workbook, filePath);
//   return false;
// }
// function createDate(date) {
//   const sheet = workbook.Sheets[sheetName];

//   // Get sheet range
//   const range = XLSX.utils.decode_range(sheet["!ref"]);
//   const headerRow = 0;

//   // 🔍 Check if date already exists
//   for (let c = range.s.c; c <= range.e.c; c++) {
//     const addr = XLSX.utils.encode_cell({ r: headerRow, c });
//     const cell = sheet[addr];
//     if (cell && String(cell.v) === date) {
//       return -1; // attendance already taken (BLOCK MODE)
//     }
//   }

//   // ✅ Add ONLY ONE new header cell
//   const newCol = range.e.c + 1;
//   const newCellAddr = XLSX.utils.encode_cell({ r: headerRow, c: newCol });

//   sheet[newCellAddr] = {
//     t: "s",   // force STRING
//     v: date
//   };

//   // Extend sheet range safely
//   sheet["!ref"] = XLSX.utils.encode_range({
//     s: range.s,
//     e: { r: range.e.r, c: newCol }
//   });

//   XLSX.writeFile(workbook, filePath);

//   return newCol;
// }
function formatDateDDMMYYYY(dateStr) {
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}-${mm}-${yyyy}`;
}

function createDate(date) {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headerRow = 0;

  // 🔍 Check if date already exists
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];
    if (cell && String(cell.v) === date) {
      return { colIndex: c, existed: true };
    }
  }

  // ➕ Add new date column
  const newCol = range.e.c + 1;
  const newCellAddr = XLSX.utils.encode_cell({ r: headerRow, c: newCol });

  sheet[newCellAddr] = { t: "s", v: date };

  sheet["!ref"] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: range.e.r, c: newCol }
  });

  XLSX.writeFile(workbook, filePath);

  return { colIndex: newCol, existed: false };
}



function markAttendance(rowIndex, colIndex, value) {
  const sheet = workbook.Sheets[sheetName];
  const cell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  sheet[cell] = { t: "n", v: value };
  XLSX.writeFile(workbook, filePath);
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

module.exports = {
  openExcel,
  getStudents,
  createDate,
  markAttendance,
  getAttendanceForDate
};

