---
name: change-workspace-format
description: Rules for changing anything that is saved to disk or exported (workspace JSON, .sketchboard.json, object fields, workflow fields). Use when adding, renaming or removing persisted fields, or touching normalize*/serialize*/restore* functions.
---

# Changing the saved format

Users keep `.sketchboard.json` backups for years. A format change must never lose or reject older data.

## Where the format lives
- Save/load: `serializeWorkspace`, `serializeBoardState`, `serializeObject`.
- Load/import: `normalizeWorkspacePayload`, `normalizeWorkflowRecord`, `restoreSerializedObject`.
- Disk: `workspace:save` / `workspace:load` / `workspace:export` / `workspace:import` in `main.js`.

## Rules
1. **Additive by default.** New field = optional, with a default in the matching `normalize*`/`restore*` function (`field ?? default`).
2. **Never rename or delete** a persisted field silently. If unavoidable, read both the old and new name in `normalize*` and write only the new one.
3. **Legacy shapes stay supported.** `normalizeWorkspacePayload` already migrates the pre-workflows single-board format. Keep that branch working.
4. Keep `serializeObject` and `restoreSerializedObject` symmetric: every field written must be read back.
5. Imported data is untrusted: coerce types (`Number(...)`, `Array.isArray(...)`) like `normalizeWorkflowRecord` does.
6. If a change is not purely additive, add a `version` number to the workspace payload and a migration step in `normalizeWorkspacePayload`.

## Verify
Load an old export (keep one from `main` as a fixture), confirm it opens with all content, then save, reload and re-export. Mention the format change in the PR description.
