import * as THREE from "three";

// Build a land/sea mask from OSM coastline polylines (local metres, see geo.js).
//
// Method: rasterise the coastline as a thick wall on an N×N grid, then flood-fill
// outward from a known land point and a known sea point. Cells reached from land
// become land, cells reached from sea become sea, the coastline itself becomes "shore".
//
// Mask values written to the texture (red channel, 0..255):
//   255 = land, 128 = shore (coastline), 0 = sea
//
// bounds = [xmin, zmin, xmax, zmax] in metres.

export function buildLandMask({ coast, bounds, landPoint, seaPoint, N = 1024 }) {
  const [xmin, zmin, xmax, zmax] = bounds;
  const W = xmax - xmin;
  const D = zmax - zmin;

  const toCell = ([x, z]) => [Math.floor(((x - xmin) / W) * N), Math.floor(((z - zmin) / D) * N)];
  const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < N && cy < N;

  // 1. Rasterise coastline as a 3-cell-thick wall
  const wall = new Uint8Array(N * N);
  const mark = (cx, cy) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (inside(x, y)) wall[y * N + x] = 1;
      }
    }
  };
  for (const line of coast) {
    for (let i = 0; i < line.pts.length - 1; i++) {
      let [x0, y0] = toCell(line.pts[i]);
      const [x1, y1] = toCell(line.pts[i + 1]);
      // Bresenham line
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        mark(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
  }

  // 2. Multi-source flood fill: land seed and sea seed, 4-connected, walls block
  const label = new Uint8Array(N * N); // 0 = unset, 1 = land, 2 = sea
  const queue = new Int32Array(N * N);
  let head = 0, tail = 0;
  const seed = ([x, z], value) => {
    const [cx, cy] = toCell([x, z]);
    if (!inside(cx, cy)) return;
    const i = cy * N + cx;
    if (wall[i] || label[i]) return;
    label[i] = value;
    queue[tail++] = i;
  };
  seed(landPoint, 1);
  seed(seaPoint, 2);

  while (head < tail) {
    const i = queue[head++];
    const x = i % N, y = (i - x) / N;
    const v = label[i];
    const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbours) {
      if (!inside(nx, ny)) continue;
      const j = ny * N + nx;
      if (wall[j] || label[j]) continue;
      label[j] = v;
      queue[tail++] = j;
    }
  }

  // 3. Build the texture: land 255, shore 128, sea 0; unreached cells default to land
  const data = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    if (wall[i]) data[i] = 128;
    else if (label[i] === 2) data[i] = 0;
    else data[i] = 255;
  }
  const texture = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    min: [xmin, zmin],
    size: [W, D],
    stats: { walls: wall.reduce((a, b) => a + b, 0), land: data.filter((v) => v === 255).length, sea: data.filter((v) => v === 0).length },
  };
}
