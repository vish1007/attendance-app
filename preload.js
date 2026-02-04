const { contextBridge } = require("electron");
const excel = require("./excel");

contextBridge.exposeInMainWorld("api", {
  openExcel: excel.openExcel,
  getStudents: excel.getStudents,
  createDate: excel.createDate,
  markAttendance: excel.markAttendance
});
