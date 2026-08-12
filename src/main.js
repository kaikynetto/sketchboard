const path = require("path");
const fs = require("fs/promises");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");

app.setName("Sketchboard");

function getWorkspacePath() {
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "sketchboard.workspace.json");
  }

  return path.join(__dirname, "..", "sketchboard.workspace.json");
}

async function saveWorkspace(data) {
  const workspacePath = getWorkspacePath();
  const temporaryPath = `${workspacePath}.tmp`;
  const payload = JSON.stringify(data, null, 2);

  await fs.writeFile(temporaryPath, payload, "utf8");
  await fs.rename(temporaryPath, workspacePath);

  return {
    path: workspacePath,
    savedAt: new Date().toISOString()
  };
}

async function loadWorkspace() {
  const workspacePath = getWorkspacePath();

  try {
    const payload = await fs.readFile(workspacePath, "utf8");
    return {
      data: JSON.parse(payload),
      path: workspacePath
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        data: null,
        path: workspacePath
      };
    }

    throw error;
  }
}

async function exportWorkspaceConfig(event, data) {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(window, {
    defaultPath: path.join(app.getPath("documents"), "sketchboard-workflows.sketchboard.json"),
    filters: [
      { extensions: ["json"], name: "Sketchboard workflows" },
      { extensions: ["json"], name: "JSON" }
    ],
    title: "Exportar workflows"
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), "utf8");

  return {
    canceled: false,
    path: result.filePath,
    savedAt: new Date().toISOString()
  };
}

async function importWorkspaceConfig(event) {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(window, {
    filters: [
      { extensions: ["json"], name: "Sketchboard workflows" },
      { extensions: ["json"], name: "JSON" }
    ],
    properties: ["openFile"],
    title: "Importar workflows"
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const payload = await fs.readFile(filePath, "utf8");

  return {
    canceled: false,
    data: JSON.parse(payload),
    path: filePath
  };
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 520,
    title: "Sketchboard",
    backgroundColor: "#000000",
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("workspace:save", (_event, data) => saveWorkspace(data));
  ipcMain.handle("workspace:load", () => loadWorkspace());
  ipcMain.handle("workspace:export", exportWorkspaceConfig);
  ipcMain.handle("workspace:import", importWorkspaceConfig);
  ipcMain.handle("window:close", (event) => BrowserWindow.fromWebContents(event.sender)?.close());
  ipcMain.handle("window:minimize", (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.handle("window:toggle-maximize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) {
      return;
    }

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
