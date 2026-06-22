/* Live load-unpacked smoke test for the VigyaanVest Trader Workspace extension.
   ------------------------------------------------------------------------------
   Loads dist/ as an unpacked extension in Chromium (or Edge), derives the
   extension id from its service worker, and runs a set of live checks that map
   to the epic's acceptance criteria — the part that can't be done by static
   review alone (DoD: "loads unpacked with no SW-console errors on current
   Chrome and Edge").

   This is the automated stand-in for a human clicking through load-unpacked.

   USAGE
     npm install            # installs puppeteer (devDependency)
     npm run build          # ensure dist/ is current
     npm run smoke          # = node tools/smoke-test.mjs

   OPTIONS (env vars)
     DIST=path/to/dist      Override the extension folder (default: ../dist)
     BROWSER=chrome|edge    Which browser to launch (default: chrome)
     EDGE_PATH=...          Path to msedge.exe (default: standard Windows path)
     HEADLESS=new|false     Headless mode (default: false / headful).
                            Use HEADLESS=new for CI (Chrome >= 120 runs MV3
                            service workers in new headless; under xvfb on Linux).

   EXIT CODE
     0 = all checks passed, non-zero = one or more checks failed.

   NOTE ON THE XSS CHECK
     The "no unescaped HTML in the Deck metric strip" check is a REGRESSION test
     for the known escaping gap (#4/#5/#6/#8/#10). It is expected to FAIL on the
     current build and to PASS once metric values are routed through esc().
*/

import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

let puppeteer;
try {
  puppeteer = (await import("puppeteer")).default;
} catch {
  console.error(
    "puppeteer is not installed. Run `npm install` in this folder first " +
      "(puppeteer is listed as a devDependency)."
  );
  process.exit(2);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.resolve(ROOT, process.env.DIST || "dist");
const BROWSER = (process.env.BROWSER || "chrome").toLowerCase();
const HEADLESS = process.env.HEADLESS === "new" ? "new" : process.env.HEADLESS === "false" ? false : false;
const EDGE_PATH =
  process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

/* ---------- tiny test harness ---------- */
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || "" });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name}${detail ? "  — " + detail : ""}`);
}
async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
  } catch (err) {
    record(name, false, err && err.message ? err.message : String(err));
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

/* ---------- launch ---------- */
function launchOptions() {
  const args = [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    "--no-first-run",
    "--no-default-browser-check",
  ];
  const opts = { headless: HEADLESS, args };
  if (BROWSER === "edge") opts.executablePath = EDGE_PATH;
  else opts.channel = "chrome"; // use installed stable Chrome
  return opts;
}

async function getExtensionId(browser) {
  // The MV3 service worker target's URL is chrome-extension://<id>/...
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const targets = browser.targets();
    const sw = targets.find(
      (t) =>
        (t.type() === "service_worker" || t.type() === "background_page") &&
        t.url().startsWith("chrome-extension://")
    );
    if (sw) return { id: new URL(sw.url()).host, target: sw };
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    "service worker never registered — extension failed to load, or this " +
      "browser build needs headful mode (try HEADLESS=false)."
  );
}

/* ---------- main ---------- */
console.log(`\nVigyaanVest Workspace — load-unpacked smoke test`);
console.log(`  browser : ${BROWSER}${BROWSER === "edge" ? " (" + EDGE_PATH + ")" : ""}`);
console.log(`  dist    : ${DIST}`);
console.log(`  headless: ${HEADLESS}\n`);

const browser = await puppeteer.launch(launchOptions());
let extId;

try {
  /* 1. Service worker / extension registration */
  await check("service worker registered (extension loaded)", async () => {
    const { id } = await getExtensionId(browser);
    extId = id;
    return `id ${id}`;
  });
  if (!extId) throw new Error("cannot continue without an extension id");

  const wsUrl = `chrome-extension://${extId}/workspace/index.html`;
  const spUrl = `chrome-extension://${extId}/sidepanel/index.html`;

  /* collect console errors per page */
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  /* 2. Workspace page loads + boots with no console errors */
  await check("workspace page loads, shell renders, no console errors", async () => {
    await page.goto(wsUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForFunction(() => window.VVDATA && window.VVDATA.ready, { timeout: 15000 });
    await page.waitForSelector(".viewseg button[data-view='deck']", { timeout: 10000 });
    await page.waitForSelector("#view-deck", { timeout: 10000 });
    // give boot a beat to settle
    await new Promise((r) => setTimeout(r, 500));
    assert(pageErrors.length === 0, `console errors: ${pageErrors.slice(0, 3).join(" | ")}`);
    return "Deck/Grid/Settings shell present";
  });

  /* 3. View switching: Deck -> Grid renders rows or the empty-state */
  await check("view switch to Grid renders table (rows or empty-state)", async () => {
    await page.click(".viewseg button[data-view='grid']");
    await page.waitForFunction(
      () => document.getElementById("view-grid").classList.contains("on"),
      { timeout: 5000 }
    );
    const hasContent = await page.evaluate(() => {
      const rows = document.getElementById("rows");
      return !!rows && rows.children.length > 0;
    });
    assert(hasContent, "#rows did not render any rows or empty-state");
    return "grid populated";
  });

  /* 4. Command palette opens via Ctrl+K, focuses input, shows Add row */
  await check("Ctrl+K palette opens, input focuses, 'Add' row appears", async () => {
    await page.click(".viewseg button[data-view='deck']");
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyK");
    await page.keyboard.up("Control");
    await page.waitForFunction(
      () => document.getElementById("cmdkBack").classList.contains("on"),
      { timeout: 5000 }
    );
    const focused = await page.evaluate(
      () => document.activeElement === document.getElementById("cmdkInput")
    );
    assert(focused, "palette input not auto-focused");
    await page.type("#cmdkInput", "ZZZZ");
    await page.waitForFunction(
      () => !!document.querySelector("#cmdkList [data-add]"),
      { timeout: 5000 }
    );
    await page.keyboard.press("Escape");
    return "palette + add-row OK";
  });

  /* 5. Theme toggle re-themes and persists the attribute */
  await check("theme toggle switches Light/Midnight", async () => {
    const before = await page.evaluate(() => (window.VV ? window.VV.get() : null));
    assert(before, "window.VV theme API missing");
    const target = before === "midnight" ? "light" : "midnight";
    await page.click(`[data-theme-set='${target}']`);
    const after = await page.evaluate(() => window.VV.get());
    assert(after === target, `theme did not change (${before} -> ${after})`);
    return `${before} -> ${after}`;
  });

  /* 6. Side panel page loads without console errors */
  await check("side panel page loads, no console errors", async () => {
    const sp = await browser.newPage();
    const spErrors = [];
    sp.on("console", (m) => m.type() === "error" && spErrors.push(m.text()));
    sp.on("pageerror", (e) => spErrors.push(String(e)));
    await sp.goto(spUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await sp.waitForSelector("#body", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 400));
    assert(spErrors.length === 0, `console errors: ${spErrors.slice(0, 3).join(" | ")}`);
    await sp.close();
    return "sidepanel/index.html OK";
  });

  /* 7. XSS REGRESSION — Deck metric strip must HTML-escape externally-sourced
        values. Seeds a watchlist + quote-cache with a markup payload in a
        scraped-fundamental field and asserts no element is injected.
        EXPECTED TO FAIL on the current build; PASSES once cell() uses esc(). */
  await check("XSS: Deck metric strip escapes scraped values (regression)", async () => {
    // seed storage from the extension page context (has chrome.storage access)
    await page.evaluate(() => {
      return new Promise((res) => {
        const payload = '<img src=x data-xss="1">';
        chrome.storage.local.set(
          {
            "vvw-watchlist": [{ symbol: "XSST", market: "US" }],
            "vvw-quotes": {
              XSST: {
                co: "XSS Test Co",
                last: "$1.00",
                price: "$1.00",
                chg: "+0.0%",
                today: "+0.0%",
                up: true,
                mktcap: payload, // <-- malicious scraped fundamental
              },
            },
          },
          () => res()
        );
      });
    });
    await page.goto(wsUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForFunction(() => window.VVDATA && window.VVDATA.ready, { timeout: 15000 });
    await page.waitForSelector("#wl .wlrow[data-sym='XSST']", { timeout: 10000 });
    // click + read synchronously, before any async hydrate can overwrite
    const out = await page.evaluate(() => {
      const row = document.querySelector("#wl .wlrow[data-sym='XSST']");
      row.click(); // focusDeck -> renderCenter (synchronous)
      const center = document.getElementById("center");
      return {
        injected: center.querySelectorAll("[data-xss]").length,
        textHasLiteral: center.innerText.includes("data-xss"),
      };
    });
    assert(
      out.injected === 0,
      `payload was injected as a live element (data-xss count=${out.injected}) — ` +
        `metric values are not HTML-escaped`
    );
    return out.textHasLiteral ? "escaped to text" : "not injected";
  });

  // clean up the seeded keys so reruns / the user's profile stay tidy
  await page.evaluate(
    () =>
      new Promise((res) =>
        chrome.storage.local.remove(["vvw-watchlist", "vvw-quotes"], () => res())
      )
  );
} catch (err) {
  record("harness", false, err && err.message ? err.message : String(err));
} finally {
  await browser.close();
}

/* ---------- summary ---------- */
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log(`\n${"-".repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed, ${results.length} total`);
if (failed) {
  console.log(`  Failing checks:`);
  results.filter((r) => !r.ok).forEach((r) => console.log(`    - ${r.name}: ${r.detail}`));
}
console.log(`${"-".repeat(60)}\n`);
process.exit(failed ? 1 : 0);
