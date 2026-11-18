---
name: add-ipc-channel
description: How to add a new main-process capability (file access, dialog, OS feature) to Sketchboard through IPC. Use when the renderer needs something only Electron main can do.
---

# Add an IPC channel

Three files, always together. The renderer never gets Node access.

1. **`src/main.js`**: write an async function with the logic, then register it inside `app.whenReady()`:
   ```js
   ipcMain.handle("area:action", (_event, data) => doAction(data));
   ```
   Channel names are `area:action` (`workspace:save`, `window:close`). Use `BrowserWindow.fromWebContents(event.sender)` to get the window for dialogs.
2. **`src/preload.js`**: expose one narrow function on `window.sketchboard`:
   ```js
   doAction: (data) => ipcRenderer.invoke("area:action", data),
   ```
   Never expose `ipcRenderer` itself or a generic "invoke any channel" function.
3. **`src/renderer/renderer.js`**: call `await window.sketchboard.doAction(data)` and handle `{ canceled: true }` and thrown errors (show via `setSaveStatus` or similar).

## Rules
- Validate and type-check everything received from the renderer in main. Treat it as untrusted.
- Write files atomically (write `.tmp`, then rename) like `saveWorkspace`.
- Return plain serializable objects, shaped `{ canceled, path, data }` for dialogs.
- Dialog titles are pt-BR.
- Must work on macOS, Windows and Linux. Use `path.join` and `app.getPath(...)`, never hard-coded separators.
