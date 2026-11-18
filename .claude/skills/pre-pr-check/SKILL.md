---
name: pre-pr-check
description: Checklist to run before opening or updating a Sketchboard pull request. Use when the user says they are done, wants to open a PR, or asks to review their changes before pushing.
---

# Pre-PR check

1. `git status` and `git diff`: only intended files changed, no `dist/`, `.tmp` or workspace JSON.
2. `npm run check` passes (syntax check of main, preload, renderer).
3. Review the diff against the `sketchboard-conventions` skill: style, alphabetical keys, pt-BR UI strings, CSS variables, no new runtime dependency, sandbox intact.
4. If objects, tools or saved fields changed, confirm the `add-board-tool` / `change-workspace-format` checklists were followed.
5. Run `npm start` and smoke test: draw with pencil/marker/eraser, add text, paste an image, undo/redo, switch workflow, close and reopen (data persists), export then import.
6. UI changes: attach a screenshot or GIF to the PR. Update `docs/screenshot.png` only if the main view changed (`scripts/capture-readme-screenshot.js`).
7. Update README/CONTRIBUTING if behavior, commands or shortcuts changed.
8. Commit message: short, imperative. PR description follows `.github/PULL_REQUEST_TEMPLATE.md`.

Report what passed and what could not be verified (for example: only tested on one OS).
