const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

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
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // la música sigue sonando con la ventana minimizada
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile("index.html");
  // Si se suelta un archivo fuera de la zona prevista, no navegar a él: la app es esta página
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  // Cualquier enlace externo se abre en el navegador, no dentro de la app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
}

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
