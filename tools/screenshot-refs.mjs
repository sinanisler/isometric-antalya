// Capture screenshots of inspiration sites for private style reference.
// Output goes to docs/references/inspiration/screens/ (git-ignored: third-party art).
// Usage: node tools/screenshot-refs.mjs

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "docs", "references", "inspiration", "screens");
await mkdir(outDir, { recursive: true });

const SITES = [
  { name: "tinyrj", url: "https://tinyrj.com/" },
  { name: "isometricseattle", url: "https://isometricseattle.fun/" },
  { name: "tiny-london", url: "https://tiny.london/" },
];

// Use the Chrome already installed on this machine (Playwright's bundled download was incomplete).
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

for (const site of SITES) {
  const page = await ctx.newPage();
  try {
    await page.goto(site.url, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(4000); // let the map and water animation start
    const file = join(outDir, `${site.name}-a.png`);
    await page.screenshot({ path: file });
    await page.waitForTimeout(1500); // second frame, to see whether water animates
    await page.screenshot({ path: join(outDir, `${site.name}-b.png`) });
    console.log(`ok  ${site.name} -> ${file}`);
  } catch (err) {
    console.log(`err ${site.name}: ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
