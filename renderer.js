// let filePath = "";
// let currentDate = "";
// let colIndex = 0;

// document.getElementById("file").addEventListener("change", e => {
//   if (!e.target.files.length) return;
//   filePath = e.target.files[0].path;
//   window.api.openExcel(filePath);
// });

// document.getElementById("startBtn").addEventListener("click", start);

// function start() {
//   currentDate = document.getElementById("date").value;
//   if (!currentDate) {
//     alert("Select date");
//     return;
//   }

//   const already = window.api.createDate(currentDate);
//   if (already) {
//     alert("Attendance already taken");
//     return;
//   }

//   const students = window.api.getStudents();
//   colIndex = students[0].length;
//   render(students);
// }

// function render(data) {
//   const container = document.getElementById("students");
//   container.innerHTML = "";

//   data.forEach((r, i) => {
//     const card = document.createElement("div");
//     card.className = "student-card";

//     card.innerHTML = `
//       <div class="name">${r[2]}</div>
//       <div class="meta">S.No.: ${r[0]}</div>
//       <div class="meta">PRN: ${r[1]}</div>
//       <div class="meta">App.ID.: ${r[4]}</div>
      
//       <div class="buttons">
//         <button class="btn present">Present</button>
//         <button class="btn absent">Absent</button>
//       </div>
//     `;

//     const presentBtn = card.querySelector(".present");
//     const absentBtn = card.querySelector(".absent");

//     presentBtn.onclick = () => mark(i + 1, 1, presentBtn, absentBtn);
//     absentBtn.onclick = () => mark(i + 1, 0, presentBtn, absentBtn);

//     container.appendChild(card);
//   });
// }

// function mark(row, value, pBtn, aBtn) {
//   window.api.markAttendance(row, colIndex, value);

//   pBtn.classList.remove("active");
//   aBtn.classList.remove("active");

//   value === 1 ? pBtn.classList.add("active") : aBtn.classList.add("active");
// }
let attendanceState = {};
attendanceState = {};
updateCounts();

 // rowIndex -> 1 (present) | 0 (absent)

let filePath = "";
let currentDate = "";
let colIndex = -1;

document.getElementById("file").addEventListener("change", e => {
  if (!e.target.files.length) return;

  filePath = e.target.files[0].path;
  window.api.openExcel(filePath);
});

document.getElementById("startBtn").addEventListener("click", start);

function start() {
  currentDate = document.getElementById("date").value;

  if (!currentDate) {
    alert("Select date");
    return;
  }

  // 🔥 createDate now RETURNS column index
  colIndex = window.api.createDate(currentDate);

  if (colIndex === -1) {
    alert("Attendance already taken");
    return;
  }

  const students = window.api.getStudents();
  render(students);
}
function updateCounts() {
  let present = 0;
  let absent = 0;

  Object.values(attendanceState).forEach(v => {
    if (v === 1) present++;
    if (v === 0) absent++;
  });

  document.getElementById("presentCount").textContent = present;
  document.getElementById("absentCount").textContent = absent;
}

function render(data) {
  const container = document.getElementById("students");
  container.innerHTML = "";
  attendanceState = {};
  updateCounts();

  data.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "student-card";

    card.innerHTML = `
      <div class="name">${r[2]}</div>
      <div class="meta">S.No.: ${r[0]}</div>
      <div class="meta">PRN: ${r[1]}</div>
      <div class="meta">App.ID.: ${r[4]}</div>

      <div class="buttons">
        <button class="btn present">Present</button>
        <button class="btn absent">Absent</button>
      </div>
    `;

    const presentBtn = card.querySelector(".present");
    const absentBtn = card.querySelector(".absent");

    presentBtn.onclick = () => mark(i + 1, 1, presentBtn, absentBtn);
    absentBtn.onclick = () => mark(i + 1, 0, presentBtn, absentBtn);

    container.appendChild(card);
  });
}

function mark(row, value, pBtn, aBtn) {
  if (colIndex === -1) return;

  // Save to Excel
  window.api.markAttendance(row, colIndex, value);

  // Save locally for counting
  attendanceState[row] = value;

  // Update button UI
  pBtn.classList.remove("active");
  aBtn.classList.remove("active");

  if (value === 1) {
    pBtn.classList.add("active");
  } else {
    aBtn.classList.add("active");
  }

  // 🔥 Update live counts
  updateCounts();
}

