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
  const selectedDate = document.getElementById("date").value;
  if (!selectedDate) {
    alert("Please select a date");
    return;
  }

  const result = window.api.createDate(selectedDate);
  colIndex = result.colIndex;

  const students = window.api.getStudents();
  const previousAttendance = window.api.getAttendanceForDate(colIndex);

  if (result.existed) {
    const choice = confirm(
      "Attendance already taken for this date.\n\nDo you want to update it?"
    );
    if (!choice) return;
  }

  render(students, previousAttendance);

  // 🔥 FORCE SHOW BULK BUTTONS
  const bulk = document.getElementById("bulkControls");
  if (bulk) {
    bulk.style.display = "block";
  }
}

function updateCounts() {
  let present = 0;
  let absent = 0;

  for (const row in attendanceState) {
    if (attendanceState[row] === 1) present++;
    if (attendanceState[row] === 0) absent++;
  }

  // If counter elements don't exist yet, create them
  let counter = document.getElementById("counter");
  if (!counter) {
    counter = document.createElement("div");
    counter.id = "counter";
    counter.style.position = "fixed";
    counter.style.right = "20px";
    counter.style.top = "120px";
    counter.style.background = "white";
    counter.style.padding = "15px 20px";
    counter.style.borderRadius = "12px";
    counter.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    counter.style.fontSize = "18px";
    counter.style.fontWeight = "600";

    document.body.appendChild(counter);
  }

  counter.innerHTML = `
    ✅ Present: ${present}<br>
    ❌ Absent: ${absent}
  `;
}


function render(data, previousAttendance = {}) {
  const container = document.getElementById("students");
  container.innerHTML = "";
  attendanceState = {};
  updateCounts();

  data.forEach((r, i) => {
    const row = i + 1;

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

    // ✅ THIS IS THE REQUIRED CHANGE
    if (previousAttendance[row] === 1) {
      presentBtn.classList.add("active");
      attendanceState[row] = 1;
    } 
    else if (previousAttendance[row] === 0) {
      absentBtn.classList.add("active");
      attendanceState[row] = 0;
    }

    // Buttons still editable
    presentBtn.onclick = () => mark(row, 1, presentBtn, absentBtn);
    absentBtn.onclick = () => mark(row, 0, presentBtn, absentBtn);

    container.appendChild(card);
  });

  updateCounts();
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

window.addEventListener("DOMContentLoaded", () => {
  const presentBtn = document.getElementById("markAllPresent");
  const absentBtn = document.getElementById("markAllAbsent");

  if (!presentBtn || !absentBtn) {
    console.error("Bulk buttons not found in DOM");
    return;
  }

  presentBtn.onclick = () => bulkMark(1);
  absentBtn.onclick = () => bulkMark(0);
});
function bulkMark(value) {
  if (colIndex === -1) return;

  const cards = document.querySelectorAll(".student-card");

  cards.forEach((card, index) => {
    const row = index + 1;

    const presentBtn = card.querySelector(".present");
    const absentBtn = card.querySelector(".absent");

    window.api.markAttendance(row, colIndex, value);
    attendanceState[row] = value;

    presentBtn.classList.remove("active");
    absentBtn.classList.remove("active");

    value === 1
      ? presentBtn.classList.add("active")
      : absentBtn.classList.add("active");
  });

  updateCounts();
}
