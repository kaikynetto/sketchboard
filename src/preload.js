const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sketchboard", {
  appName: "Sketchboard",
  exportWorkspaceConfig: (data) => ipcRenderer.invoke("workspace:export", data),
  importWorkspaceConfig: () => ipcRenderer.invoke("workspace:import"),
  loadWorkspace: () => ipcRenderer.invoke("workspace:load"),
  saveWorkspace: (data) => ipcRenderer.invoke("workspace:save", data),
  windowControls: {
    close: () => ipcRenderer.invoke("window:close"),
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize")
  }
});
