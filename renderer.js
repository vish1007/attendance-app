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

// ⏱️ controls roll-call timeout
let rollDelay = 4000;

const voiceSettings = {
  rate: 0.85,
  volume: 1,
  pitch: 1
};

let rollIndex = 0;
let isRollPlaying = false;
let rollTimer = null; 
let studentsCache = [];

let attendanceState = {};
attendanceState = {};
let indianVoice = null;

speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  indianVoice =
    voices.find(v => v.lang === "en-IN") ||
    voices.find(v => v.lang.startsWith("en"));
};

updateCounts();

 // rowIndex -> 1 (present) | 0 (absent)

let filePath = "";
let currentDate = "";
let colIndex = -1;
let recentFiles = [];
let attendanceStatsCache = {};

function focusSearchInput() {
  const searchBox = document.getElementById("searchBox");
  const searchInput = document.getElementById("searchInput");
  if (!searchBox || !searchInput) return;

  searchBox.style.display = "block";
  searchInput.disabled = false;

  setTimeout(() => {
    searchInput.focus();
    searchInput.select();
  }, 0);
}

function setDefaultDateIfEmpty() {
  const dateInput = document.getElementById("date");
  if (!dateInput || dateInput.value) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  dateInput.value = `${year}-${month}-${day}`;
}

function filterStudents(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const cards = document.querySelectorAll(".student-card");

  cards.forEach(card => {
    const name = card.querySelector(".name")?.innerText.toLowerCase() || "";
    const appIdText = [...card.querySelectorAll(".meta")]
      .find(m => m.innerText.includes("App.ID"))
      ?.innerText.toLowerCase() || "";

    if (
      !normalizedQuery ||
      name.includes(normalizedQuery) ||
      appIdText.includes(normalizedQuery)
    ) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

function cloneAttendanceStats(stats = {}) {
  const clonedStats = {};

  Object.entries(stats).forEach(([row, value]) => {
    clonedStats[row] = {
      total: Number(value?.total || 0),
      present: Number(value?.present || 0),
      percent: Number(value?.percent || 0)
    };
  });

  return clonedStats;
}

function updateCachedAttendanceStats(row, nextValue) {
  const key = String(row);
  const previousValue = attendanceState[row];
  const stats = attendanceStatsCache[key] || { total: 0, present: 0, percent: 0 };

  if (previousValue === nextValue) {
    attendanceStatsCache[key] = stats;
    return;
  }

  if (previousValue === undefined) {
    stats.total += 1;
  }

  if (previousValue === 1) {
    stats.present = Math.max(0, stats.present - 1);
  }

  if (nextValue === 1) {
    stats.present += 1;
  }

  stats.percent = stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0;

  attendanceStatsCache[key] = stats;
}

function getFileName(fullPath) {
  if (!fullPath) return "";
  const parts = fullPath.split(/[/\\]/);
  return parts[parts.length - 1] || fullPath;
}

function updateCurrentFileLabel() {
  const currentFile = document.getElementById("currentFile");
  if (!currentFile) return;

  if (!filePath) {
    currentFile.style.display = "none";
    currentFile.textContent = "";
    return;
  }

  currentFile.style.display = "block";
  currentFile.textContent = `Selected file: ${filePath}`;
}

function renderRecentFiles() {
  const section = document.getElementById("recentFilesSection");
  const list = document.getElementById("recentFilesList");
  if (!section || !list) return;

  list.innerHTML = "";

  if (!recentFiles.length) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  recentFiles.forEach(path => {
    const button = document.createElement("button");
    button.className = "recent-file-btn";
    button.type = "button";
    button.innerHTML = `
      <span class="recent-file-name">${getFileName(path)}</span>
      <span class="recent-file-path">${path}</span>
    `;
    button.onclick = () => {
      openSelectedFile(path);
    };

    list.appendChild(button);
  });
}

async function refreshRecentFiles() {
  recentFiles = await window.appState.getRecentFiles();
  renderRecentFiles();
}

async function openSelectedFile(selectedPath) {
  if (!selectedPath) return;

  filePath = selectedPath;
  window.api.openExcel(filePath);
  await window.appState.setLastFile(filePath);
  await refreshRecentFiles();
  updateCurrentFileLabel();
}

document.getElementById("file").addEventListener("change", e => {
  if (!e.target.files.length) return;

  openSelectedFile(e.target.files[0].path);
});

document.getElementById("startBtn").addEventListener("click", start);

function start() {
  if (!filePath) {
    alert("Please select an Excel file or choose one from Recent Files");
    return;
  }

  const selectedDate = document.getElementById("date").value;
  if (!selectedDate) {
    alert("Please select a date");
    return;
  }

  focusSearchInput();

  const result = window.api.createDate(selectedDate);
  colIndex = result.colIndex;
  document.getElementById("students").style.display = "block";

  const students = window.api.getStudents();
  const attendanceStats = window.api.getAttendanceStats();
  attendanceStatsCache = cloneAttendanceStats(attendanceStats);

  const previousAttendance = window.api.getAttendanceForDate(colIndex);

  if (result.existed) {
    const choice = confirm(
      "Attendance already taken for this date.\n\nDo you want to update it?"
    );
    if (!choice) return;
  }

  render(students, previousAttendance, attendanceStats);
  studentsCache = students.map((r, i) => ({
  row: i + 1,
  appId: String(r[4])
}));

document.getElementById("rollCallControls").style.display = "flex";


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


function render(data, previousAttendance = {}, attendanceStats = {}) {

  const container = document.getElementById("students");
  container.innerHTML = "";
  attendanceState = {};
  attendanceStatsCache = cloneAttendanceStats(attendanceStats);
  updateCounts();

  data.forEach((r, i) => {
    const row = i + 1;

    const card = document.createElement("div");
    card.className = "student-card";

    card.innerHTML = `
<div class="name-row">
  <div class="name">${r[2]}</div>

  <div class="attendance-box">
    <div class="attendance-bar">
      <div class="attendance-fill"></div>
      <div class="attendance-text">0%</div>
    </div>
  </div>
</div>

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
    updateAttendanceBar(row);

  });

  updateCounts();
}

function updateAttendanceBar(row) {
  const card = document.querySelectorAll(".student-card")[row - 1];
  const stats = attendanceStatsCache[String(row)];
  if (!card || !stats) return;

  const percent = stats.percent;

  const fill = card.querySelector(".attendance-fill");
  const text = card.querySelector(".attendance-text");
  if (!fill || !text) return;

  // Width & text
  fill.style.width = percent + "%";
  text.textContent = percent + "%";

  // 🎨 Color rules
// 🔥 BAR COLOR ONLY
  if (percent >= 75) {
    fill.style.background = "#22c55e"; // green
  } else if (percent >= 50) {
    fill.style.background = "#facc15"; // yellow
  } else {
    fill.style.background = "#ef4444"; // red
  }

  // 🔥 TEXT COLOR ALWAYS BLACK
  text.style.color = "#000000";
}





function mark(row, value, pBtn, aBtn) {
  if (colIndex === -1) return;

  updateCachedAttendanceStats(row, value);

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

  // 🔥 Update ONLY the progress bar (NOT the name)
  updateAttendanceBar(row);
}

window.addEventListener("DOMContentLoaded", () => {
  refreshRecentFiles();
  updateCurrentFileLabel();
  setDefaultDateIfEmpty();

  // ===== BULK BUTTONS =====
  const presentBtn = document.getElementById("markAllPresent");
  const absentBtn = document.getElementById("markAllAbsent");

  if (presentBtn && absentBtn) {
    presentBtn.onclick = () => bulkMark(1);
    absentBtn.onclick = () => bulkMark(0);
  }

  // ===== VOICE + ROLL SETTINGS (VOICE MODAL) =====
  const rollSpeed = document.getElementById("rollSpeed");
  const rateInput = document.getElementById("voiceRate");
  const volumeInput = document.getElementById("voiceVolume");
  const pitchInput = document.getElementById("voicePitch");

  if (rollSpeed) {
    rollDelay = Number(rollSpeed.value);
    rollSpeed.onchange = () => {
      rollDelay = Number(rollSpeed.value);
    };
  }

  if (rateInput) {
    voiceSettings.rate = Number(rateInput.value);
    rateInput.oninput = () => {
      voiceSettings.rate = Number(rateInput.value);
    };
  }

  if (volumeInput) {
    voiceSettings.volume = Number(volumeInput.value);
    volumeInput.oninput = () => {
      voiceSettings.volume = Number(volumeInput.value);
    };
  }

  if (pitchInput) {
    voiceSettings.pitch = Number(pitchInput.value);
    pitchInput.oninput = () => {
      voiceSettings.pitch = Number(pitchInput.value);
    };
  }

  // ===== EDIT → VOICE SETTINGS OPEN =====
  window.api.onOpenVoiceSettings(() => {
    const modal = document.getElementById("voiceSettingsModal");
    if (modal) modal.style.display = "block";
  });

  // ===== CLOSE VOICE SETTINGS =====
  const closeVoiceBtn = document.getElementById("closeVoiceSettings");
  if (closeVoiceBtn) {
    closeVoiceBtn.onclick = () => {
      document.getElementById("voiceSettingsModal").style.display = "none";
    };
  }

  // ===== ROLL CALL BACK BUTTON =====
  const backBtn = document.getElementById("rollBackBtn");

  if (backBtn) {
    backBtn.onclick = () => {
      // 🛑 stop roll call
      isRollPlaying = false;

      if (rollTimer) {
        clearTimeout(rollTimer);
        rollTimer = null;
      }

      rollIndex = 0;
      speechSynthesis.cancel();

      // Restore the attendance screen instead of going back to setup.
      backBtn.style.display = "none";
      document.getElementById("setupControls").style.display = "none";
      document.getElementById("students").style.display = "block";
      document.getElementById("bulkControls").style.display = "block";
      document.getElementById("rollCallControls").style.display = "flex";
      document.getElementById("searchBox").style.display = "block";
      const searchInput = document.getElementById("searchInput");

      // Reset card visibility, then restore any active search filter.
      document.querySelectorAll(".student-card").forEach(card => {
        card.classList.remove("hidden");
        card.style.outline = "none";
      });

      if (searchInput) {
        filterStudents(searchInput.value);
      }
    };
  }

});



function bulkMark(value) {
  if (colIndex === -1) return;

  const cards = document.querySelectorAll(".student-card");

  cards.forEach((card, index) => {
    const row = index + 1;

    const presentBtn = card.querySelector(".present");
    const absentBtn = card.querySelector(".absent");

    updateCachedAttendanceStats(row, value);
    window.api.markAttendance(row, colIndex, value);
    attendanceState[row] = value;

    presentBtn.classList.remove("active");
    absentBtn.classList.remove("active");

    value === 1
      ? presentBtn.classList.add("active")
      : absentBtn.classList.add("active");
       updateAttendanceBar(row);
  });

  updateCounts();
}
function speakLast4Digits(appId) {
  const last4 = appId.slice(-4).split("").join(" ");

  const utterance = new SpeechSynthesisUtterance(last4);
  utterance.rate = voiceSettings.rate;
  utterance.volume = voiceSettings.volume;
  utterance.pitch = voiceSettings.pitch;

  if (indianVoice) {
    utterance.voice = indianVoice;
  }

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}


document.getElementById("playRoll").onclick = () => {
  // 🔥 Hide setup UI
  document.getElementById("rollBackBtn").style.display = "block";

  document.getElementById("setupControls").style.display = "none";

  document.getElementById("bulkControls").style.display = "none";
  document.getElementById("rollCallControls").style.display = "none";

  // Only students area visible
  document.getElementById("students").style.display = "block";

  // Hide all student cards initially
  document.querySelectorAll(".student-card").forEach(card => {
    card.classList.add("hidden");
  });

  isRollPlaying = true;
  playNext();
};



function clearHighlight(row) {
  const card = document.querySelectorAll(".student-card")[row - 1];
  if (!card) return;
  card.style.outline = "none";
}

function markCurrentStudentAbsent() {
  if (rollIndex < 0 || rollIndex >= studentsCache.length) return;

  const row = rollIndex + 1;
  const card = document.querySelectorAll(".student-card")[row - 1];
  if (!card) return;

  const presentBtn = card.querySelector(".present");
  const absentBtn = card.querySelector(".absent");

  // 🔴 Mark ABSENT ONLY (NO PAUSE, NO STOP)
  updateCachedAttendanceStats(row, 0);
  window.api.markAttendance(row, colIndex, 0);
  attendanceState[row] = 0;

  // Update UI
  presentBtn.classList.remove("active");
  absentBtn.classList.add("active");

  updateCounts();
  updateAttendanceBar(row);


  console.log("Marked ABSENT (roll continues):", row);
}


function playNext() {
  if (!isRollPlaying) return;

  if (rollIndex >= studentsCache.length) {
    isRollPlaying = false;
    alert("Roll call completed");
    return;
  }

  const row = rollIndex + 1;
  const student = studentsCache[rollIndex];

  speakLast4Digits(student.appId);

  updateCachedAttendanceStats(row, 1);
  window.api.markAttendance(row, colIndex, 1);
  attendanceState[row] = 1;
  updateCounts();
  updateAttendanceBar(row);
 // ✅ ADD THIS


  highlightStudent(row);

  scheduleNext(); // 🔥 auto-continue handled here
}

function scheduleNext() {
  if (!isRollPlaying) return;

  if (rollTimer) {
    clearTimeout(rollTimer);
    rollTimer = null;
  }

  rollTimer = setTimeout(() => {
    if (!isRollPlaying) return;

    rollIndex++;
    playNext();
  }, rollDelay); // 🔥 user-selected delay
}


function highlightStudent(row) {
  showStudentByIndex(row - 1);

  const card = document.querySelectorAll(".student-card")[row - 1];
  if (!card) return;

  const presentBtn = card.querySelector(".present");
  const absentBtn = card.querySelector(".absent");

  presentBtn.classList.add("active");
  absentBtn.classList.remove("active");

  card.style.outline = "3px solid #22c55e";
}



function loadIndianVoice() {
  const voices = speechSynthesis.getVoices();

  // Prefer Indian English
  indianVoice = voices.find(v => v.lang === "en-IN");

  // Fallback if exact match not found
  if (!indianVoice) {
    indianVoice = voices.find(v => v.lang.startsWith("en"));
  }

  console.log("Selected voice:", indianVoice?.name, indianVoice?.lang);
}
window.addEventListener("keydown", (e) => {
  if (!isRollPlaying) return;

  // Ignore typing inside inputs
  if (
    document.activeElement &&
    document.activeElement.tagName === "INPUT"
  ) {
    return;
  }

  // ➕ Increase volume
  if (e.key === "+" || e.key === "=") {
    voiceSettings.volume = Math.min(
      1,
      +(voiceSettings.volume + 0.1).toFixed(2)
    );

    const volSlider = document.getElementById("voiceVolume");
    if (volSlider) volSlider.value = voiceSettings.volume;

    console.log("Volume increased:", voiceSettings.volume);
  }

  // ➖ Decrease volume
  if (e.key === "-") {
    voiceSettings.volume = Math.max(
      0,
      +(voiceSettings.volume - 0.1).toFixed(2)
    );

    const volSlider = document.getElementById("voiceVolume");
    if (volSlider) volSlider.value = voiceSettings.volume;

    console.log("Volume decreased:", voiceSettings.volume);
  }
});

function showStudentByIndex(index) {
  if (index < 0 || index >= studentsCache.length) return;

  rollIndex = index;

  // Hide all cards
  document.querySelectorAll(".student-card").forEach(card =>
    card.classList.add("hidden")
  );

  // Show current card
  const card = document.querySelectorAll(".student-card")[rollIndex];
  if (!card) return;

  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}
window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  // Ignore inputs
  if (
    document.activeElement &&
    document.activeElement.tagName === "INPUT"
  ) {
    return;
  }

  // ▶ / ⏸ P = pause / resume
if (key === "p") {
  if (isRollPlaying) {
    // ⏸ PAUSE
    isRollPlaying = false;

    if (rollTimer) {
      clearTimeout(rollTimer);
      rollTimer = null;
    }

    console.log("PAUSED at", rollIndex + 1);
  } else {
    // ▶ RESUME (auto-continues)
    isRollPlaying = true;

    console.log("RESUMED at", rollIndex + 1);
    playNext(); // 🔥 scheduler will handle future moves
  }
  return;
}


  // 🔴 O = mark absent (no pause)
  if (key === "o") {
    markCurrentStudentAbsent();
    return;
  }

  // ⬅️ previous
  if (e.key === "ArrowLeft") {
    isRollPlaying = false;
    if (rollTimer) clearTimeout(rollTimer);
    showStudentByIndex(rollIndex - 1);
    return;
  }

  // ➡️ next
  if (e.key === "ArrowRight") {
    isRollPlaying = false;
    if (rollTimer) clearTimeout(rollTimer);
    showStudentByIndex(rollIndex + 1);
    return;
  }
});
const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("mousedown", e => {
    e.stopPropagation();
  });

  searchInput.addEventListener("click", e => {
    e.stopPropagation();
    searchInput.focus();
  });

  searchInput.addEventListener("keydown", e => {
    e.stopPropagation();
  });

  searchInput.addEventListener("input", () => {
    filterStudents(searchInput.value);
  });
}
// document.getElementById("rollBackBtn").onclick = () => {
//   // 🛑 stop roll call
//   isRollPlaying = false;

//   if (rollTimer) {
//     clearTimeout(rollTimer);
//     rollTimer = null;
//   }

//   rollIndex = 0;
//   speechSynthesis.cancel();

//   // 🔄 restore UI
//   document.git addgetElementById("rollBackBtn").style.display = "none";
//   document.getElementById("setupControls").style.display = "block";
//   document.getElementById("bulkControls").style.display = "block";
//   document.getElementById("rollCallControls").style.display = "flex";
//   document.getElementById("students").style.display = "block";

//   // 👀 show all students again
//   document.querySelectorAll(".student-card").forEach(card => {
//     card.classList.remove("hidden");
//     card.style.outline = "none";
//   });
// };

