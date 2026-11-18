# Contributing to Sketchboard

Thanks for helping out. Sketchboard is a small, lightweight whiteboard, and we want to keep it that way: simple code, few dependencies, fast startup.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/kaikynetto/sketchboard.git
cd sketchboard
npm install
npm start
```

## Project layout

| Path | What it does |
|---|---|
| `src/main.js` | Electron main process: window, file save/load, export/import |
| `src/preload.js` | Safe bridge exposed to the renderer as `window.sketchboard` |
| `src/renderer/` | The app itself: canvas, tools, workflows, math assistant |
| `build/` | Installer resources (macOS entitlements) |
| `scripts/` | Maintenance scripts |

## Making changes

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Fork the repo and create a branch from `main` (`fix/eraser-lag`, `feat/export-png`).
3. Keep changes focused. One pull request should do one thing.
4. Run `npm run check` and try the app with `npm start`.
5. Open a pull request and fill in the template. Screenshots or GIFs help for UI changes.

### Guidelines

- **Stay lightweight.** Avoid adding runtime dependencies. If you need one, explain why in the PR.
- **Security.** The renderer stays sandboxed. New capabilities go through `preload.js` with explicit IPC handlers, never `nodeIntegration`.
- **Compatibility.** The `.sketchboard.json` format must keep loading older files. Don't remove or rename saved fields without a migration.
- **Cross-platform.** The app ships for macOS, Windows and Linux. Avoid OS-specific code, or guard it.
- **Commits.** Short, imperative messages ("Add PNG export"), like the existing history.

## Building installers

```bash
npm run dist:mac     # macOS DMG (arm64 and x64)
npm run dist:win     # Windows installer (x64)
npm run dist:linux   # Linux AppImage and deb (x64)
```

Output goes to `dist/`. Local builds are unsigned unless you set the signing variables described below.

## Releases and signing (maintainers)

Releases are built by GitHub Actions when a tag like `v0.2.0` is pushed:

```bash
npm version minor        # bumps package.json and creates the tag
git push --follow-tags
```

The workflow builds all three platforms, signs them when secrets are configured, generates `SHA256SUMS.txt` and publishes a GitHub Release.

Repository secrets used for signing (all optional; unsigned builds are produced without them):

| Secret | Purpose |
|---|---|
| `MAC_CERTIFICATE` | Base64 of the *Developer ID Application* `.p12` certificate |
| `MAC_CERTIFICATE_PASSWORD` | Password of that `.p12` |
| `APPLE_ID` | Apple ID used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for that Apple ID |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `WIN_CERTIFICATE` | Base64 of the Authenticode `.pfx` certificate |
| `WIN_CERTIFICATE_PASSWORD` | Password of that `.pfx` |

Linux packages are not signed; verify them with `SHA256SUMS.txt`.

## Reporting security issues

Please don't open a public issue. Use GitHub's private vulnerability reporting under the repository's **Security** tab.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
