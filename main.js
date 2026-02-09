
const { app, BrowserWindow, Menu, ipcMain } = require("electron");

const path = require("path");
const drive = require("./googledrive");

app.disableHardwareAcceleration();

let mainWindow;
let zoomLevel = 1; // default zoom

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // ===== APPLICATION MENU =====
  const menuTemplate = [
 
{
  label: "File",
  submenu: [
    {
      label: "Sync to Google Drive",
      accelerator: "CmdOrCtrl+S",
      click: () => {
        if (global.lastExcelFile) {
          drive.ensureAuth()
            .then(() => drive.uploadOrReplace(global.lastExcelFile))
            .catch(err => console.error(err));
        } else {
          mainWindow.webContents.executeJavaScript(
            `alert("No Excel file loaded to sync.")`
          );
        }
      }
    },
    {
      label: "Disconnect Google Drive",
      click: () => {
        drive.disconnect();
        mainWindow.webContents.executeJavaScript(
          `alert("Disconnected from Google Drive. You will be asked to login again next time.")`
        );
      }
    },
    { type: "separator" },
    { role: "quit" }
  ]
},


    {
      label: "Edit",
      submenu: [
        {
          label: "Voice Settings",
          accelerator: "CmdOrCtrl+V",
          click: () => {
            mainWindow.webContents.send("open-voice-settings");
          }
        }
      ]
    },

    {
  label: "View",
  submenu: [
    {
      label: "Zoom In",
      accelerator: "CmdOrCtrl+=",
      click: () => {
        zoomLevel = Math.min(zoomLevel + 0.1, 2);
        mainWindow.webContents.setZoomFactor(zoomLevel);
      }
    },
    {
      label: "Zoom Out",
      accelerator: "CmdOrCtrl+-",
      click: () => {
        zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
        mainWindow.webContents.setZoomFactor(zoomLevel);
      }
    },
    {
      label: "Reset Zoom",
      accelerator: "CmdOrCtrl+N",
      click: () => {
        zoomLevel = 1;
        mainWindow.webContents.setZoomFactor(1);
      }
    },
    { type: "separator" },
    {
      label: "Reload",
      accelerator: "CmdOrCtrl+R",
      click: () => {
        mainWindow.reload();
      }
    },
    { type: "separator" },
    {
      label: "Toggle DevTools",
      role: "toggleDevTools"
    }
  ]
},


    {
      label: "Window",
      submenu: [
        { role: "minimize" }
      ]
    },
    {
  label: "Help",
  submenu: [
    {
      label: "About",
      click: () => {
        mainWindow.webContents.executeJavaScript(`
          alert(
            "Attendance Management System\\n\\n" +
            "Version: 1.0.0\\n\\n" +
            "Developed by: Vishal Singh\\n" +
            "© 2026 Vishal Singh\\n\\n" +
            "This application is designed for offline attendance " +
            "management using Excel files.\\n\\n" +
            "All rights reserved."
          );
        `);
      }
    }
  ]
}

  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile("index.html");
}
// ===== GOOGLE DRIVE IPC =====
ipcMain.handle("drive-connect", async () => {
  // ensures login (only first time)
  await drive.ensureAuth();
  return "CONNECTED";
});
ipcMain.handle("drive-disconnect", async () => {
  drive.disconnect();
  return "DISCONNECTED";
});


ipcMain.handle("drive-upload", async (_, filePath) => {
  await drive.ensureAuth();
  await drive.uploadOrReplace(filePath);
  return "UPLOADED";
});
ipcMain.handle("set-last-file", (_, filePath) => {
  global.lastExcelFile = filePath;
});


app.whenReady().then(() => {
  createWindow();

  // optional auto-sync if file path exists
  if (global.lastExcelFile) {
    drive.ensureAuth()
      .then(() => drive.uploadOrReplace(global.lastExcelFile))
      .catch(() => {});
  }
});


// ===== MAC SUPPORT =====
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
