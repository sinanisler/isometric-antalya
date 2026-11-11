// Equirectangular projection around a fixed origin.
// Good enough for a few km around Antalya: 1 unit = 1 meter.

export const ORIGIN = { lat: 36.88, lon: 30.68 }; // Kaleiçi / Konyaaltı middle

const R = 6378137;
const DEG = Math.PI / 180;

export function toMeters(lat, lon, origin = ORIGIN) {
  const x = (lon - origin.lon) * DEG * R * Math.cos(origin.lat * DEG);
  const z = -(lat - origin.lat) * DEG * R; // north = -z (three.js forward)
  return [x, z];
}
