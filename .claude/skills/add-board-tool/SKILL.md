---
name: add-board-tool
description: Checklist for adding a new drawing tool or board object type (shape, sticky note, etc.) to Sketchboard. Use when the task adds a tool button, a new object type, or changes how objects are drawn, selected or saved.
---

# Add a tool or object type

Follow every step; skipping one causes bugs like objects vanishing after reload or breaking undo.

## A new tool (button)
1. `src/renderer/index.html`: add a `.tool-button` with `data-tool`, `data-label`, `data-shortcut`, `aria-label` (pt-BR label), and a matching `.menu-tool` entry in the context menu.
2. `renderer.js`: add the name to `toolNames`; handle it in `setTool` / `updateToolUi`; add the keyboard shortcut in the key handler (near `m: "marker"`).
3. If it paints with the brush, add it to the `isBrushTool` list and `activeBrushSize`/`updateBrushCursor` logic.
4. Pointer behavior goes through `pointerDown` / `pointerMove` / `pointerUp` via a `start<Tool>Interaction` function that sets `state.interaction`.

## A new object type
The object lives in the `objects` array with `type: "<name>"`. Update all of:
1. **Create**: factory (`createStroke`, `createTextObject` are the models); ids come from `nextId++`.
2. **Draw**: add a branch in `render()` (and a `draw<Type>Object` function).
3. **Hit-test and handles**: `hitTestObject`, `handleAt`, `drawSelection`, `updateResize`.
4. **Clone**: `cloneObject` (history snapshots, copy/paste).
5. **Persist**: `serializeObject` AND `restoreSerializedObject` with safe defaults for every field (`object.x || default`). Old files must still load.
6. **Bounds**: anything used by selection/export must have bounds (`strokeBounds` pattern).
7. **History + save**: finish the interaction with `commitHistory()` and `scheduleSave()`.

Keep object keys alphabetical. Then read `change-workspace-format`: a new object type is a format change.

## Verify
`npm start`: create the object, undo/redo, reload the app, export/import workflows, copy/paste, zoom and pan.
