import * as THREE from 'three'

export const EARTH_R = 2

export function latLngToVec3(lat: number, lng: number, r = EARTH_R): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Great-circle arc lifted above the surface. */
export function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 80): THREE.Vector3[] {
  const na = a.clone().normalize()
  const nb = b.clone().normalize()
  const angle = na.angleTo(nb)
  const lift = 0.15 + angle * 0.35
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const dir = new THREE.Vector3()
    if (angle < 1e-4) dir.copy(na)
    else dir.copy(na).multiplyScalar(Math.sin((1 - t) * angle)).add(nb.clone().multiplyScalar(Math.sin(t * angle))).divideScalar(Math.sin(angle))
    pts.push(dir.normalize().multiplyScalar(EARTH_R + Math.sin(Math.PI * t) * lift))
  }
  return pts
}

export function estimateFlight(km: number) {
  const hours = km / 850 + 0.6
  return {
    km: Math.round(km),
    duration: `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`,
    priceUsd: Math.round(40 + km * 0.09),
    stops: km > 9000 ? 1 : 0,
  }
}
