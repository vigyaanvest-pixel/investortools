/* Packaging build — produces a minified, store-ready copy of the extension in dist/.
   Source files stay editable; dist/ is what you upload (Chrome Web Store / Edge Add-ons).
   JS is minified with esbuild (transform-only — imports/structure preserved, no bundling).
   Run: node tools/build.mjs   (or: npm run build) */
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

// JS files to minify (relative to ROOT)
const JS = [
  "workspace/workspace.js", "workspace/data.js", "workspace/sample.js",
  "sidepanel/sidepanel.js",
  "src/shared/theme.js", "src/shared/symbols.js", "src/shared/format.js",
  "src/background/service-worker.js", "src/background/market-data.js",
  "src/background/calendar-sync.js", "src/background/tts.js",
  "src/content/page-extract.js", "src/content/sources.js", "src/content/squawk.js",
];

// runtime files copied verbatim (manifest, license, markup, styles)
const COPY = [
  "manifest.json", "LICENSE", "styles",
  "workspace/index.html", "sidepanel/index.html",
];

// only the assets actually referenced ship (skips the unused source-plugin icons)
const ASSETS = [
  "icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png",
  "favicon.png", "vigyaanvest-mark.png", "vigyaanvest-logo-clean.png",
];

async function loadEsbuild() {
  const candidates = [
    "esbuild", // local node_modules if installed
    path.resolve(ROOT, "../public-tools/investor-overlay/node_modules/esbuild/lib/main.js"),
    path.resolve(ROOT, "../public-tools/market-calendar/node_modules/esbuild/lib/main.js"),
    path.resolve(ROOT, "../investor-overlay/node_modules/esbuild/lib/main.js"),
    path.resolve(ROOT, "../market-calendar/node_modules/esbuild/lib/main.js"),
  ];
  for (const c of candidates) {
    try {
      const spec = c === "esbuild" ? "esbuild" : pathToFileURL(c).href;
      return await import(spec);
    } catch { /* try next */ }
  }
  throw new Error("esbuild not found. Run `npm install` in this folder, or build beside investor-overlay/market-calendar (which ship esbuild).");
}

async function ensureDir(file) { await mkdir(path.dirname(file), { recursive: true }); }

async function run() {
  const esbuild = await loadEsbuild();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // copy verbatim runtime files
  for (const rel of COPY) {
    await cp(path.join(ROOT, rel), path.join(DIST, rel), { recursive: true });
  }
  // copy only referenced assets
  await mkdir(path.join(DIST, "assets"), { recursive: true });
  for (const name of ASSETS) {
    await cp(path.join(ROOT, "assets", name), path.join(DIST, "assets", name));
  }

  // minify JS (transform-only: keep imports + relative paths intact)
  let saved = 0, before = 0;
  for (const rel of JS) {
    const code = await readFile(path.join(ROOT, rel), "utf8");
    const isEsm = /^\s*(import|export)\b/m.test(code);
    const out = await esbuild.transform(code, {
      minify: true,
      target: ["chrome114", "edge114"],
      format: isEsm ? "esm" : undefined,
      legalComments: "none",
      loader: "js",
    });
    const dest = path.join(DIST, rel);
    await ensureDir(dest);
    await writeFile(dest, out.code, "utf8");
    before += code.length; saved += code.length - out.code.length;
    console.log(`  min ${rel.padEnd(34)} ${code.length} -> ${out.code.length} bytes`);
  }

  console.log(`\n✓ dist/ ready — JS minified ${before} -> ${before - saved} bytes (${Math.round((saved / before) * 100)}% smaller)`);
  console.log("  Next: zip dist/ contents (manifest at root) and upload to the store.");
  console.log("  Windows zip: npm run package   (creates dist.zip)");
}

run().catch((e) => { console.error("build failed:", e.message); process.exit(1); });
