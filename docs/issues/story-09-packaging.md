**Epic:** #1 · _(label: type: task — technical enabler)_

## 1. User story
As the publisher, I want a minified, cross-browser, store-ready package with privacy and
permission docs, so that the extension can ship to the Chrome Web Store and Edge Add-ons.

## 2. Business value
This is the "ship it" enabler — without a clean, justified, cross-browser package the product
can't reach users.

## 3. Workflow(s) — trigger → behavior
- **Build:** Given the source, When `npm run build` runs, Then a minified `dist/` is produced
  (transform-only — imports/structure preserved), runtime files only.
- **Package:** Given `dist/`, When `npm run package` runs, Then `dist.zip` is created with
  forward-slash entries and `manifest.json` at the root.
- **Load:** Given Chrome or Edge, When the extension is loaded unpacked (or from the zip via
  the store), Then it runs with no server and an event-driven background worker.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] `npm run build` produces `dist/` with all referenced runtime files and minified JS.
- [ ] Minified ES-module worker/content scripts keep their relative imports intact.
- [ ] `dist/` excludes source comments, `tools/`, `node_modules`, `package.json`, and docs.
- [ ] `npm run package` produces `dist.zip` with `manifest.json` at the root.
- [ ] `dist.zip` uses forward-slash entry separators (store-safe) and is < 100 KB.
- [ ] The extension loads unpacked in current **Chrome** with no errors in the SW console.
- [ ] The extension loads unpacked in current **Edge** with no errors in the SW console.
- [ ] No localhost/server is required at runtime (all files local; only HTTPS API calls).
- [ ] The background worker is event-driven (no persistent page) and idles when not in use.
- [ ] `manifest.json` description ≤ 132 chars; `author` + `homepage_url` set.
- [ ] `PRIVACY.md`, `PERMISSIONS.md` (per-permission + per-host justifications), and `STORE_LISTING.md` exist and are accurate.
- [ ] License is proprietary (`LICENSE`, README, About footer, `package.json` consistent).
- [ ] **Edge case:** building without a local `esbuild` reuses the sibling extension's esbuild (documented fallback).
- [ ] **Edge case:** older Edge lacking `sidePanel` still loads and degrades (ties to Story 06).
- [ ] **Security:** no remotely-hosted JS; only the sandboxed TradingView iframe is remote (display-only).
- [ ] **Security:** host permissions are the minimal set, each justified in `PERMISSIONS.md`.
- [ ] **Security:** the store data-handling form is answered "does not collect user data" consistent with `PRIVACY.md`.

## 5. Edge cases
No local esbuild; Edge without sidePanel; store backslash-zip rejection (mitigated);
oversized assets (mitigated by downscaling logos).

## 6. Security cases
No remote code; minimal justified permissions; accurate data-handling disclosure; iframe is
display-only and sandboxed.

## 7. Dependencies
All feature stories (packages the whole app). Gates store submission.

## 8. Notes / technical
`tools/build.mjs` (esbuild transform-minify), `tools/zip.ps1` (forward-slash zip),
`package.json` scripts. Manual store steps (account, screenshots, hosted privacy URL) live in
`STORE_LISTING.md` and are out of code scope.
