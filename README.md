# Sketchboard

Sketchboard is a clean Electron whiteboard for drawing, placing images, editing text and organizing multiple workflow boards.

## Run locally

```bash
npm install
npm start
```

## Build installers

```bash
npm run dist:mac
npm run dist:win
```

Generated installers are saved in `dist/`.

## Workflow backup

Use the workflow menu inside the app to export all workflows to a `.sketchboard.json` file and import them later into another workspace.
