// Puente seguro entre la ventana y el sistema (solo lo necesario para saber y abrir dónde está tu música)
const { contextBridge, ipcRenderer, webUtils } = require("electron");
contextBridge.exposeInMainWorld("salamenceNative", {
  isDesktop: true,
  pathOf: (file) => { try { return webUtils.getPathForFile(file) || ""; } catch { return ""; } },
  showItemInFolder: (p) => ipcRenderer.invoke("path:show", p),
  openPath: (p) => ipcRenderer.invoke("path:open", p),
  userDataPath: () => ipcRenderer.invoke("path:userData")
});
