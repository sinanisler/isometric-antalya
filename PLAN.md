# Isometric Antalya — Plan

A stylized, low-poly, isometric 3D map of Antalya, focused on the coast:
Kaleiçi (old town), Konyaaltı, and Lara. Look: Ghibli-inspired painterly
colors, soft shadows, hand-made feel, in a 3D isometric camera.

## Decisions (round 1)

| Topic | Choice | Why |
|---|---|---|
| Engine | Three.js in the browser (static ES modules, no build step) | Runs anywhere, easy to share, no Blender install needed |
| Ground truth | OpenStreetMap (ODbL) via Overpass API | Free, open, has building footprints, heights, roads, coastline |
| Google Maps | Visual reference only (manual screenshots into `docs/references/`) | Google's terms forbid scraping/extracting its map data |
| Scope | Kaleiçi + Konyaaltı first, then Lara | Smallest slice that proves the pipeline |
| Blender | Not installed; optional later for hero models | Not needed for the first pipeline |

Attribution required for any published output: "© OpenStreetMap contributors".

## Pipeline

1. `tools/fetch-osm.mjs` — query Overpass for buildings, roads, coastline, landmarks in a bounding box → `data/*.json`
2. `tools/build-scene-data.mjs` — convert to simple meter-based geometry (footprints, heights, road polylines)
3. `src/` — Three.js scene: terrain, sea, coastline, buildings, roads, landmarks, isometric camera
4. Style pass: palette, outlines, soft lighting, low-poly detail

## Bounding boxes

- Kaleiçi + Konyaaltı (round 1): lat 36.8700–36.8900, lon 30.6500–30.7150
- Lara (round 2): lat 36.8400–36.8700, lon 30.7800–30.8600 (to be confirmed)

## Status

- [x] Repo set up, first commit
- [x] Reference images copied to `docs/references/`
- [ ] OSM fetch script (blocked for now: Overpass public servers returning 502 "at capacity"; retry with backoff)
- [ ] Scene data build script
- [ ] Three.js isometric scene — terrain + sea + coastline
- [ ] Buildings from OSM
- [ ] Roads and landmarks (Kaleiçi walls, Hadrian's Gate, Yivli Minaret, Clock Tower, Konyaaltı beach, Lara beach)
- [ ] Ghibli-style pass (palette, lighting, outlines)
- [ ] Lara district

## Open questions for later

- Do you want the finished map hosted (GitHub Pages) or only run locally?
- Is Blender worth adding later for hero landmarks, or stay all-procedural?
