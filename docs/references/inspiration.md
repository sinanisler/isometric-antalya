# Inspiration sites

Shared by Sinan. Their look is the target direction; we learn from the approach, we don't copy their assets.

| Site | What it is | Notes from reading the page |
|---|---|---|
| https://tinyrj.com/ | "Rio isométrico": a tile-drawing tool for building isometric maps | Favourite. The page is only the tool UI, so no visuals came through. Tiles are AI-generated from a 3D model or 2026 imagery, with soft feathered seams between tiles. Heights can be toggled on or off. |
| https://isometricseattle.fun/ | Tiled, zoomable isometric map of Seattle | Traced tile by tile by an AI image model from a render of Google Photorealistic 3D Tiles. Building outlines come from Overture/OpenStreetMap. Viewer is OpenSeadragon (large pre-rendered image pyramid, not live WebGL). Open water is painted, not traced. |
| https://tiny.london/ | Isometric pixel-art map of London | Pixel-art, not low-poly 3D. The fetched page had no visual description. |

## Takeaways for our approach

- All three are 2D or pixel-art tile maps, not live 3D. Our plan (Three.js low-poly) is different, so use them for composition, palette and framing, not for technique.
- Feathered tile seams and painted water are good ideas for the Ghibli look we want.
- Google Photorealistic 3D Tiles and Google map imagery have terms that restrict reuse. Don't build our output from them.

## Still needed

- Screenshots of tinyrj.com maps you like, saved to `docs/references/inspiration/`. Text can't carry palette, lighting or outline style; screenshots can.

## tinyrj style, read from a live capture (Copacabana view)

Screenshots are local only (git-ignored): `docs/references/inspiration/screens/`.

Approximate colours, read by eye from the capture (not sampled exactly):

| Element | Approx colour |
|---|---|
| Facades, cream/white | `#f2ece0` |
| Facades, sky blue | `#9fc6e0` |
| Facades, warm yellow/ochre | `#e8c27a` |
| Roofs, terracotta/orange | `#d9643a` |
| Sand | `#e8c488` |
| Trees, leafy green | `#5f9b4a` |
| Roads, grey | `#8a8d92` |
| Pale blocks/sidewalks, patterned | `#efe6d2` |

What we take from it:
- Chunky, slightly voxel-like 3D buildings with soft shading. Good match for low-poly extrusions.
- Orange roofs against pale facades; pale sidewalks with patterned paving.
- Trees as clumped round shapes; cars and people as tiny coloured dots.
- Compact UI overlays (search, zoom, mode switch) float over the map.
