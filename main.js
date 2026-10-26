const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Solo una ventana: si se abre otra vez, se enfoca la que ya existe
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 760,
    minHeight: 520,
    title: "Salamence music",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#0d1116",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // la música sigue sonando con la ventana minimizada
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile("index.html");
  // Cualquier enlace externo se abre en el navegador, no dentro de la app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
}

/* ---------- abrir carpetas: dónde está tu música ---------- */
ipcMain.handle("path:show", (_e, p) => {
  if (typeof p !== "string" || !p) return { ok: false };
  if (fs.existsSync(p)) { shell.showItemInFolder(p); return { ok: true }; }
  const dir = path.dirname(p);
  if (fs.existsSync(dir)) { shell.openPath(dir); return { ok: true, fallback: true }; }
  return { ok: false };
});
ipcMain.handle("path:open", async (_e, p) => {
  if (typeof p !== "string" || !p || !fs.existsSync(p)) return { ok: false };
  const err = await shell.openPath(p);
  return { ok: !err };
});
ipcMain.handle("path:userData", () => app.getPath("userData"));

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
