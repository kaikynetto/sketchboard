---
name: sketchboard-conventions
description: Code style and architecture rules for Sketchboard. Use whenever writing or reviewing any code in this repo (JS, HTML, CSS), before adding features or fixing bugs, so contributions stay consistent.
---

# Sketchboard conventions

Sketchboard is a small Electron whiteboard: vanilla JS, no framework, no bundler, no runtime dependencies. Match the existing code, do not introduce new patterns.

## Layout
- `src/main.js`: main process only (window, files, IPC handlers).
- `src/preload.js`: the only bridge, exposed as `window.sketchboard`.
- `src/renderer/`: `index.html`, `styles.css`, `renderer.js` (canvas app).

## JavaScript style
- 2 spaces, double quotes, semicolons, no trailing commas.
- `const` by default, `let` only when reassigned. Never `var`.
- Plain `function` declarations for named logic, arrow functions for callbacks.
- Early returns instead of deep nesting.
- **Object literal keys are sorted alphabetically** (see `serializeObject`, `state`). Keep that when adding fields.
- DOM elements are queried once at the top of `renderer.js` as `camelCase` consts from `#kebab-id` selectors.
- Helpers use verb names: `setTool`, `updateToolUi`, `scheduleSave`, `commitHistory`.
- No new runtime dependencies. If one seems necessary, stop and justify it in the PR.

## Renderer rules
- Board coordinates are **world** coordinates; convert with `screenToWorld` / `worldToScreen`. Never store screen coordinates in objects.
- Any user-visible mutation must call `commitHistory()` (undo/redo) and `scheduleSave()` (autosave), in that order of intent.
- Redraw through `render()`; do not draw on the canvas from event handlers directly.
- Wrap saved shapes in `serializeObject` / `restoreSerializedObject` / `cloneObject` (see the `add-board-tool` skill).

## UI language and CSS
- User-facing strings are **pt-BR** (`<html lang="pt-BR">`): "Selecionar", "Borracha", "Exportar workflows". Code, comments, commits and docs are English.
- Colors, borders and shadows use the CSS variables in `:root` of `styles.css` (`--panel-bg`, `--line`, `--text`...). No hard-coded colors in component rules.
- Keep the UI dark, minimal and keyboard-friendly. Tools declare `data-shortcut` and `aria-label`.

## Security
- Renderer stays sandboxed: no `nodeIntegration`, no `remote`, no direct `require` in renderer code.
- New privileged capability = new IPC channel (see `add-ipc-channel`).
- Never `eval` user input. Math expressions go through `safeEvaluateNumericExpression`.

## Commits and PRs
- Short imperative subject ("Add PNG export"). One logical change per PR.
- Run `npm run check` and the `pre-pr-check` skill before opening a PR.
