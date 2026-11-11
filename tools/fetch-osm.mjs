// Fetch ground-truth geometry from OpenStreetMap (Overpass API).
// Data: © OpenStreetMap contributors, ODbL — keep attribution in any output.
// Usage: node tools/fetch-osm.mjs [bbox-name]
// Writes data/<bbox-name>.osm.json

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// South, west, north, east
const BOXES = {
  "kaleici": [36.8770, 30.6930, 36.8900, 30.7150],
  "kaleici-konyaalti": [36.87, 30.65, 36.89, 30.715],
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const name = process.argv[2] ?? "kaleici";
const bbox = BOXES[name];
if (!bbox) throw new Error(`Unknown bbox "${name}". Known: ${Object.keys(BOXES).join(", ")}`);
const [s, w, n, e] = bbox;

const query = `
[out:json][timeout:120];
(
  way["building"](${s},${w},${n},${e});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|living_street|pedestrian|service|footway|path|steps)$"](${s},${w},${n},${e});
  way["natural"="coastline"](${s},${w},${n},${e});
  way["natural"="beach"](${s},${w},${n},${e});
  way["leisure"="park"](${s},${w},${n},${e});
  way["landuse"~"^(grass|forest|meadow|recreation_ground)$"](${s},${w},${n},${e});
  node["tourism"](${s},${w},${n},${e});
  node["historic"](${s},${w},${n},${e});
  node["amenity"="place_of_worship"](${s},${w},${n},${e});
  way["amenity"="place_of_worship"](${s},${w},${n},${e});
  way["historic"="castle"](${s},${w},${n},${e});
  way["historic"="city_wall"](${s},${w},${n},${e});
);
out body geom;
`;

async function tryEndpoint(url) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "isometric-antalya-map/0.1",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(200_000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function fetchWithBackoff() {
  let wait = 15_000;
  for (let round = 1; round <= 6; round++) {
    for (const url of ENDPOINTS) {
      try {
        console.log(`[round ${round}] ${url}`);
        return await tryEndpoint(url);
      } catch (err) {
        console.warn(`  failed: ${err.message}`);
      }
    }
    console.log(`  all endpoints busy; waiting ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    wait *= 2;
  }
  throw new Error("Overpass unavailable after retries");
}

const json = await fetchWithBackoff();
const outDir = join(root, "data");
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, `${name}.osm.json`);
await writeFile(outPath, JSON.stringify(json));
console.log(`elements: ${json.elements.length} -> ${outPath}`);
