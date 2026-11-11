// Fetch ground-truth geometry for a bounding box from the main OpenStreetMap API.
// Data: © OpenStreetMap contributors, ODbL — keep attribution in any output.
// Usage: node tools/fetch-osm.mjs [bbox-name]
// Writes data/raw/<bbox-name>.osm (git-ignored; raw XML)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// [south, west, north, east]; the OSM map API caps a request at 0.25 deg², keep boxes small.
const BOXES = {
  kaleici: [36.877, 30.693, 36.89, 30.715],
};

const name = process.argv[2] ?? "kaleici";
const bbox = BOXES[name];
if (!bbox) throw new Error(`Unknown bbox "${name}". Known: ${Object.keys(BOXES).join(", ")}`);
const [s, w, n, e] = bbox;

// The API takes left,bottom,right,top = west,south,east,north
const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${w},${s},${e},${n}`;

const res = await fetch(url, {
  headers: { "User-Agent": "isometric-antalya-map/0.1" },
  signal: AbortSignal.timeout(180_000),
});
if (!res.ok) throw new Error(`OSM API -> HTTP ${res.status}`);
const xml = await res.text();

const outDir = join(root, "data", "raw");
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, `${name}.osm`);
await writeFile(outPath, xml);
console.log(`saved ${xml.length} bytes -> ${outPath}`);
