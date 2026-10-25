// Puente seguro entre la ventana y el proceso principal (solo lo necesario para sincronizar con el móvil)
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("salamenceNative", {
  isDesktop: true,
  syncStart: (opts) => ipcRenderer.invoke("sync:start", opts),
  syncStop: () => ipcRenderer.invoke("sync:stop"),
  syncStatus: () => ipcRenderer.invoke("sync:status"),
  readTemp: (id, start, len) => ipcRenderer.invoke("sync:readTemp", id, start, len),
  onAsk: (cb) => { ipcRenderer.on("sync:ask", (_e, msg) => cb(msg)); },
  onEvent: (cb) => { ipcRenderer.on("sync:event", (_e, msg) => cb(msg)); },
  answer: (id, result, error) => ipcRenderer.send("sync:answer", { id, result, error })
});
