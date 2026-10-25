const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");
const { createSyncServer, networkAddresses } = require("./sync-server");

// Solo una ventana: si se abre otra vez, se enfoca la que ya existe
if (!app.requestSingleInstanceLock()) app.quit();

let win, syncSrv = null, syncPin = "", seq = 0;
const waiting = new Map();

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

/* ---------- sincronización con el móvil ----------
   El servidor vive aquí (proceso principal) pero los datos están en la ventana (IndexedDB),
   así que le pide a la ventana lo que necesita y espera la respuesta. */
const ask = (type, params) => new Promise((resolve, reject) => {
  if (!win || win.isDestroyed()) return reject(new Error("La ventana de Salamence music no está disponible"));
  const id = ++seq;
  const timer = setTimeout(() => { waiting.delete(id); reject(new Error("La app tardó demasiado en responder")); }, 10 * 60 * 1000);
  waiting.set(id, { resolve, reject, timer });
  win.webContents.send("sync:ask", { id, type, params });
});
ipcMain.on("sync:answer", (_e, { id, result, error }) => {
  const w = waiting.get(id); if (!w) return;
  clearTimeout(w.timer); waiting.delete(id);
  error ? w.reject(new Error(error)) : w.resolve(result);
});
const status = () => ({ running: !!(syncSrv && syncSrv.isRunning()), port: syncSrv ? syncSrv.info().port : 0, pin: syncPin, addresses: networkAddresses() });
ipcMain.handle("sync:start", async (_e, opts = {}) => {
  if (syncSrv && syncSrv.isRunning()) return status();
  syncPin = String(crypto.randomInt(100000, 1000000));
  syncSrv = createSyncServer({
    ask,
    tempDir: path.join(app.getPath("temp"), "salamence-music-sync"),
    onEvent: (ev) => { if (win && !win.isDestroyed()) win.webContents.send("sync:event", ev); }
  });
  await syncSrv.start({ port: Number(opts.port) || 8787, pin: syncPin });
  return status();
});
ipcMain.handle("sync:stop", async () => { if (syncSrv) await syncSrv.stop(); return status(); });
ipcMain.handle("sync:status", () => status());
ipcMain.handle("sync:readTemp", (_e, id, start, len) => {
  if (!syncSrv) throw new Error("La sincronización no está activa");
  return syncSrv.readTemp(id, start, len);
});

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("before-quit", () => { if (syncSrv) syncSrv.stop(); });
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
