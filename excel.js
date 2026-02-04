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

  const formattedDate = formatDateDDMMYYYY(date);

  // 🔍 Check if date already exists
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];
    if (cell && String(cell.v) === formattedDate) {
      return -1; // attendance already taken (BLOCK MODE)
    }
  }

  // ✅ Add new date safely
  const newCol = range.e.c + 1;
  const newCellAddr = XLSX.utils.encode_cell({ r: headerRow, c: newCol });

  sheet[newCellAddr] = {
    t: "s",
    v: formattedDate
  };

  sheet["!ref"] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: range.e.r, c: newCol }
  });

  XLSX.writeFile(workbook, filePath);

  return newCol;
}


function markAttendance(rowIndex, colIndex, value) {
  const sheet = workbook.Sheets[sheetName];
  const cell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  sheet[cell] = { t: "n", v: value };
  XLSX.writeFile(workbook, filePath);
}

module.exports = {
  openExcel,
  getStudents,
  createDate,
  markAttendance
};
