---
name: cut-release
description: Steps to publish a new Sketchboard version (tag, CI build, signing, GitHub Release). Use only when a maintainer asks to cut, publish or prepare a release. Never run the push step without explicit confirmation.
---

# Cut a release

Releases are built by `.github/workflows/release.yml` when a `v*` tag is pushed. Versions follow semver; note that `v0.1.0` already exists on the initial commit, so the next one must be higher.

## Steps
1. Be on an up to date `main` with a clean tree and green CI.
2. For a first dry run, use a pre-release tag: `npm version 0.2.0-rc.1`.
3. Pick the bump: `npm version patch` (fixes), `minor` (features), `major` (breaking, e.g. incompatible file format). This edits `package.json`, commits and creates tag `vX.Y.Z`.
4. **Ask the maintainer to confirm**, then `git push --follow-tags`. Publishing is public and hard to undo.
5. Watch the Release workflow. It builds macOS (arm64 + x64 DMG), Windows (NSIS exe), Linux (AppImage + deb), then publishes the GitHub Release with `SHA256SUMS.txt`.
6. Download each installer and smoke test it. Edit the generated release notes if needed.

## Signing
Controlled by repo secrets (listed in `CONTRIBUTING.md`). Without them the build succeeds but is unsigned; say so in the release notes. Never print or commit certificates or passwords.

## If a build fails
Fix on a branch, delete the broken tag locally and remotely only with maintainer approval, then tag again.
