import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { toMeters } from "./geo.js";

// Scene built from data/kaleici.json (converted from OpenStreetMap, ODbL).
// Coordinates are local meters: x = east, z = south (three.js: -z is north).

const DATA_URL = "data/kaleici.json";
const CENTER = toMeters(36.8835, 30.704); // middle of the Kaleiçi box

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#3fb6c4");

// Orthographic camera at a true isometric angle, centered on the old town.
let frustum = 1300;
const aspect = () => window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-frustum * aspect(), frustum * aspect(), frustum, -frustum, 1, 20000);
camera.position.set(CENTER[0] + 1000, 1000, CENTER[1] + 1000);
camera.lookAt(CENTER[0], 0, CENTER[1]);

// Warm, soft light
const sun = new THREE.DirectionalLight("#fff3d6", 1.6);
sun.position.set(CENTER[0] - 600, 900, CENTER[1] + 400);
sun.target.position.set(CENTER[0], 0, CENTER[1]);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 4000 });
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight("#dff6f2", "#8a9c6a", 0.9));

// Sea: stylised animated water. Stepped colour bands (pixel-like) moving slowly over time.
const seaMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color("#2b8fa6") },
    uLight: { value: new THREE.Color("#5fbfcf") },
  },
  vertexShader: `
    varying vec2 vXZ;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vXZ = wp.xz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uLight;
    varying vec2 vXZ;
    void main() {
      float w = sin(vXZ.x * 0.011 + uTime * 0.9)
              + sin(vXZ.y * 0.014 - uTime * 0.7)
              + sin((vXZ.x + vXZ.y) * 0.006 + uTime * 0.5);
      float band = floor((w + 3.0) * 1.1) / 6.6; // quantised into a few steps
      gl_FragColor = vec4(mix(uDeep, uLight, band), 1.0);
    }`,
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), seaMaterial);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -2;
sea.receiveShadow = true;
scene.add(sea);

const land = new THREE.Mesh(new THREE.BoxGeometry(12000, 4, 12000), new THREE.MeshLambertMaterial({ color: "#e8c488" }));
land.position.set(0, 0, 555 - 6000); // coast ≈ z 555 m
land.receiveShadow = true;
scene.add(land);

// ---------- helpers ----------

const stripClosing = (pts) => {
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) return pts.slice(0, -1);
  return pts;
};

// Building: footprint extruded upward. Shape y = -z so the rotation lands it at world z.
function buildingGeometry(b) {
  const pts = stripClosing(b.pts);
  if (pts.length < 3) return null;
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// Flat polygon (parks, beaches)
function polygonGeometry(pts) {
  const p = stripClosing(pts);
  if (p.length < 3) return null;
  const shape = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// Ribbon along a polyline with a given width, lying flat at height y
function ribbonGeometry(pts, width, y) {
  const pos = [];
  const hw = width / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) continue;
    const nx = (-dz / len) * hw, nz = (dx / len) * hw;
    const a = [x0 + nx, y, z0 + nz], b = [x0 - nx, y, z0 - nz];
    const c = [x1 + nx, y, z1 + nz], d = [x1 - nx, y, z1 - nz];
    pos.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const ROAD_WIDTH = {
  motorway: 16, trunk: 14, primary: 11, secondary: 9, tertiary: 8,
  residential: 6, living_street: 5, pedestrian: 5, service: 3.5,
  footway: 2, path: 1.5, steps: 1.5,
};
const ROAD_COLOR = {
  motorway: "#f0b96b", trunk: "#f0b96b", primary: "#f7e7b8", secondary: "#f7efd9",
  tertiary: "#f7efd9", residential: "#fbf6ea", living_street: "#fbf6ea",
  pedestrian: "#e9d9bd", service: "#e4dccb", footway: "#d9c8a4", path: "#c8b58f", steps: "#c8b58f",
};

// Palette taken from the tinyrj reference (see docs/references/inspiration.md)
const BUILDING_BANDS = [
  { max: 6, color: "#f2ece0" },        // low: cream
  { max: 12, color: "#9fc6e0" },       // mid: sky blue
  { max: Infinity, color: "#e8c27a" }, // tall: warm ochre
];
const bandFor = (h) => BUILDING_BANDS.find((b) => h <= b.max).color;

// ---------- load and build ----------

const res = await fetch(DATA_URL);
if (!res.ok) throw new Error(`Could not load ${DATA_URL} (${res.status}). Run tools/fetch-osm.mjs and tools/osm-to-json.mjs first.`);
const data = await res.json();

// Buildings grouped by color, merged per group
const buildingGroups = new Map();
for (const b of data.buildings) {
  const g = buildingGeometry(b);
  if (!g) continue;
  const color = bandFor(b.h);
  if (!buildingGroups.has(color)) buildingGroups.set(color, []);
  buildingGroups.get(color).push(g);
}
for (const [color, geos] of buildingGroups) {
  const merged = mergeGeometries(geos);
  const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Roads grouped by kind-color
const roadGroups = new Map();
for (const r of data.roads) {
  const width = ROAD_WIDTH[r.kind] ?? 4;
  const color = ROAD_COLOR[r.kind] ?? "#f7efd9";
  const g = ribbonGeometry(r.pts, width, 0.6);
  if (!g) continue;
  if (!roadGroups.has(color)) roadGroups.set(color, []);
  roadGroups.get(color).push(g);
}
for (const [color, geos] of roadGroups) {
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Parks and beaches
const parkGeos = data.parks.map((p) => polygonGeometry(p.pts)).filter(Boolean);
if (parkGeos.length) {
  const mesh = new THREE.Mesh(mergeGeometries(parkGeos), new THREE.MeshLambertMaterial({ color: "#5f9b4a" }));
  mesh.position.y = 0.4;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Coastline as a light foam line
const coastGeos = data.coast.map((c) => ribbonGeometry(c.pts, 3, 1.2)).filter(Boolean);
if (coastGeos.length) {
  scene.add(new THREE.Mesh(mergeGeometries(coastGeos), new THREE.MeshBasicMaterial({ color: "#fff8e6" })));
}

// Landmarks: small warm markers (names will be shown on hover in a later step)
const landmarkGeo = new THREE.BoxGeometry(10, 30, 10);
const landmarkMat = new THREE.MeshLambertMaterial({ color: "#e8703b" });
const landmarks = new THREE.InstancedMesh(landmarkGeo, landmarkMat, data.landmarks.length);
const m4 = new THREE.Matrix4();
data.landmarks.forEach((lm, i) => {
  m4.makeTranslation(lm.pos[0], 15, lm.pos[1]);
  landmarks.setMatrixAt(i, m4);
});
landmarks.castShadow = true;
scene.add(landmarks);

console.log("counts", data.counts, data.attribution);

// ---------- controls ----------

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.left = -frustum * aspect();
  camera.right = frustum * aspect();
  camera.top = frustum;
  camera.bottom = -frustum;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);

window.addEventListener(
  "wheel",
  (e) => {
    frustum = Math.min(3000, Math.max(300, frustum * (e.deltaY > 0 ? 1.1 : 0.9)));
    onResize();
  },
  { passive: true }
);

renderer.setAnimationLoop(() => {
  seaMaterial.uniforms.uTime.value = performance.now() / 1000;
  renderer.render(scene, camera);
});
