# AGENTS.md

Guidance for AI coding agents (and humans) working on Sketchboard, a lightweight open source whiteboard built with Electron. Licensed MIT.

## Commands

```bash
npm install          # setup
npm start            # run the app
npm run check        # syntax check of main, preload and renderer (also run by CI)
npm run pack         # unpacked build, quick packaging smoke test
npm run dist:mac     # DMG (arm64 + x64)
npm run dist:win     # NSIS installer (x64)
npm run dist:linux   # AppImage + deb (x64)
```

There is no test suite, linter or formatter yet. Verify changes with `npm run check` and by running the app.

## Layout

| Path | Purpose |
|---|---|
| `src/main.js` | Electron main process: window, workspace save/load, export/import, IPC handlers |
| `src/preload.js` | The only bridge to the renderer, exposed as `window.sketchboard` |
| `src/renderer/renderer.js` | The whole app: canvas, tools, history, workflows, math assistant |
| `src/renderer/index.html`, `styles.css` | UI and styles |
| `build/` | Installer resources (macOS entitlements) |
| `.github/workflows/` | `ci.yml` (checks) and `release.yml` (tag-driven signed releases) |
| `.claude/skills/` | Project skills with detailed checklists |

## Core rules

- Vanilla JS, no framework, no bundler, **no new runtime dependencies**.
- Style: 2 spaces, double quotes, semicolons, `const` first, object keys sorted alphabetically.
- UI strings are **pt-BR**. Code, comments, commits and docs are English.
- Colors come from the CSS variables in `:root` of `styles.css`.
- Board objects use world coordinates (`screenToWorld` / `worldToScreen`). Every user-visible change calls `commitHistory()` and `scheduleSave()`.
- The renderer is sandboxed. Privileged features go through a narrow IPC channel in `main.js` + `preload.js`; never enable `nodeIntegration`.
- Saved data must stay backward compatible: add fields only with defaults, never rename or drop them silently.
- Must work on macOS, Windows and Linux.

## Skills

Detailed checklists live in `.claude/skills/<name>/SKILL.md`. Read the matching one before starting:

- `sketchboard-conventions`: style and architecture rules (always applicable)
- `add-board-tool`: new tool or board object type
- `add-ipc-channel`: new main-process capability
- `change-workspace-format`: anything persisted or exported
- `pre-pr-check`: before opening or updating a PR
- `cut-release`: publishing a version (maintainers only)

## Git and releases

- Branch from `main`, keep PRs focused, short imperative commit messages.
- Do not push, tag or publish a release without explicit maintainer confirmation.
- Never commit `dist/`, `*.tmp`, workspace JSON files, certificates or secrets.
- Releases are built by GitHub Actions on `v*` tags; see `CONTRIBUTING.md`.
