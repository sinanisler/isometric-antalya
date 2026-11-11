// Convert raw OSM XML (data/raw/<name>.osm) into a compact scene file (data/<name>.json).
// Coordinates are local meters from ORIGIN (see src/geo.js).
// Data: © OpenStreetMap contributors, ODbL.
// Usage: node tools/osm-to-json.mjs [name]

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toMeters, ORIGIN } from "../src/geo.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const name = process.argv[2] ?? "kaleici";

const xml = await readFile(join(root, "data", "raw", `${name}.osm`), "utf8");

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Nodes: id -> [lat, lon], plus tags for POI nodes
const nodes = new Map();
const nodeTags = new Map();
for (const m of xml.matchAll(/<node\s+([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
  const attrs = m[1];
  const id = attrs.match(/\bid="(\d+)"/)[1];
  const lat = parseFloat(attrs.match(/\blat="([-\d.]+)"/)[1]);
  const lon = parseFloat(attrs.match(/\blon="([-\d.]+)"/)[1]);
  nodes.set(id, [lat, lon]);
  if (m[3]) {
    const tags = parseTags(m[3]);
    if (Object.keys(tags).length) nodeTags.set(id, tags);
  }
}

function parseTags(body) {
  const tags = {};
  for (const t of body.matchAll(/<tag\s+k="([^"]*)"\s+v="([^"]*)"\s*\/>/g)) tags[decode(t[1])] = decode(t[2]);
  return tags;
}

// Ways
const ways = [];
for (const m of xml.matchAll(/<way\s+id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
  const refs = [...m[2].matchAll(/<nd\s+ref="(\d+)"/g)].map((r) => r[1]);
  ways.push({ id: m[1], refs, tags: parseTags(m[2]) });
}

const toXY = (ref) => {
  const ll = nodes.get(ref);
  if (!ll) return null;
  const [x, z] = toMeters(ll[0], ll[1]);
  return [round(x), round(z)];
};
const round = (v) => Math.round(v * 10) / 10;
const pts = (refs) => refs.map(toXY).filter(Boolean);

function buildingHeight(tags) {
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!Number.isNaN(h)) return h;
  }
  if (tags["building:levels"]) {
    const lv = parseFloat(tags["building:levels"]);
    if (!Number.isNaN(lv)) return Math.max(3, lv * 3.2);
  }
  return 9; // default for unknown buildings
}

const buildings = [];
const roads = [];
const coast = [];
const parks = [];
const landmarks = [];

for (const w of ways) {
  const { tags } = w;
  if (tags.building) {
    const p = pts(w.refs);
    if (p.length >= 3) buildings.push({ id: w.id, type: tags.building, h: round(buildingHeight(tags)), pts: p });
  } else if (tags.highway) {
    const p = pts(w.refs);
    if (p.length >= 2) roads.push({ id: w.id, kind: tags.highway, name: tags.name ?? null, pts: p });
  } else if (tags.natural === "coastline") {
    const p = pts(w.refs);
    if (p.length >= 2) coast.push({ id: w.id, pts: p });
  } else if (tags.leisure === "park" || tags.landuse || tags.natural === "beach") {
    const p = pts(w.refs);
    if (p.length >= 3) parks.push({ id: w.id, kind: tags.leisure ?? tags.landuse ?? tags.natural, pts: p });
  } else if (tags.historic || tags.tourism || tags.amenity === "place_of_worship") {
    const p = pts(w.refs);
    if (p.length >= 1) {
      const c = p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
      landmarks.push({ id: w.id, name: tags.name ?? null, kind: tags.historic ?? tags.tourism ?? tags.amenity, pos: [round(c[0]), round(c[1])] });
    }
  }
}

for (const [id, tags] of nodeTags) {
  if (tags.tourism || tags.historic || tags.amenity === "place_of_worship") {
    const xy = toXY(id);
    if (xy) landmarks.push({ id, name: tags.name ?? null, kind: tags.historic ?? tags.tourism ?? tags.amenity, pos: xy });
  }
}

const out = {
  attribution: "© OpenStreetMap contributors (ODbL)",
  origin: ORIGIN,
  counts: { buildings: buildings.length, roads: roads.length, coast: coast.length, parks: parks.length, landmarks: landmarks.length },
  buildings,
  roads,
  coast,
  parks,
  landmarks,
};

const outDir = join(root, "data");
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, `${name}.json`);
await writeFile(outPath, JSON.stringify(out));
console.log(JSON.stringify(out.counts), "->", outPath);
