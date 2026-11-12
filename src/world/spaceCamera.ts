/**
 * Keep a point (the Space view's camera) at least `radius` from the centre of Earth, so the camera never goes
 * inside the globe. A point inside is pushed straight out to the surface of that sphere; one outside is returned as is.
 */
export function outsideSphere(p: { x: number; y: number; z: number }, radius: number): { x: number; y: number; z: number } {
  const d = Math.hypot(p.x, p.y, p.z);
  if (d >= radius) return { ...p };
  // Right at the centre there is no "out": go straight up.
  if (d === 0) return { x: 0, y: radius, z: 0 };
  const k = radius / d;
  return { x: p.x * k, y: p.y * k, z: p.z * k };
}
