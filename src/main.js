import * as THREE from "three";
import { toMeters } from "./geo.js";

// Round 1 scene: isometric camera, sea, land, placeholder coast.
// Buildings and roads from OSM are added once data/kaleici-konyaalti.osm.json exists.

const canvasHost = document.body;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#cfe9ea");

// Orthographic camera at a true isometric angle (~35.26° pitch, 45° yaw).
const aspect = () => window.innerWidth / window.innerHeight;
let frustum = 900;
const camera = new THREE.OrthographicCamera(-frustum * aspect(), frustum * aspect(), frustum, -frustum, 1, 10000);
camera.position.set(1000, 1000, 1000);
camera.lookAt(0, 0, 0);

// Warm Ghibli-ish light
const sun = new THREE.DirectionalLight("#fff3d6", 1.6);
sun.position.set(-600, 900, 400);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 4000 });
scene.add(sun);
scene.add(new THREE.HemisphereLight("#dff6f2", "#8a9c6a", 0.9));

// Sea: a big plane covering the bay
const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(12000, 12000),
  new THREE.MeshLambertMaterial({ color: "#3fb6c4" })
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -2;
sea.receiveShadow = true;
scene.add(sea);

// Land: placeholder plate (replaced by OSM coastline polygons later)
const land = new THREE.Mesh(
  new THREE.BoxGeometry(6000, 4, 6000),
  new THREE.MeshLambertMaterial({ color: "#a8c77a" })
);
land.position.set(0, -2, 0);
land.receiveShadow = true;
scene.add(land);

// Demo marker so the projection can be checked: Kaleiçi clock tower area
const [mx, mz] = toMeters(36.8849, 30.7056);
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(20, 60, 20),
  new THREE.MeshLambertMaterial({ color: "#e8a86b" })
);
marker.position.set(mx, 30, mz);
marker.castShadow = true;
scene.add(marker);

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
    frustum = Math.min(4000, Math.max(200, frustum * (e.deltaY > 0 ? 1.1 : 0.9)));
    onResize();
  },
  { passive: true }
);

renderer.setAnimationLoop(() => renderer.render(scene, camera));
