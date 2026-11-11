// Render the local scene in headless Chrome and save two frames (to check animation).
// Serves the project root on a throwaway local port. Output: scratch folder, not the repo.
// Usage: node tools/shot-scene.mjs <outDir>

import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.argv[2] ?? join(root, "docs", "references", "scene-check");
await mkdir(outDir, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

const server = createServer(async (req, res) => {
  try {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(8123, "127.0.0.1", r));

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://127.0.0.1:8123/", { waitUntil: "load", timeout: 60_000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: join(outDir, "scene-a.png") });
await page.waitForTimeout(2000);
await page.screenshot({ path: join(outDir, "scene-b.png") });

console.log("errors:", errors.length ? errors.slice(0, 5) : "none");
console.log("saved to", outDir);
await browser.close();
server.close();
