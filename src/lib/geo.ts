/**
 * Geo utilities: haversine distance + driver/rider matching algorithm.
 * Replaces reliance on Google's distance/matrix services with pure math,
 * refined by OpenRouteService ETA when available (see routing.ts).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackedDriver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vehicleType: 'Car' | 'Keke' | 'Shuttle';
  status: 'On Trip' | 'Idle' | 'Break' | 'Offline';
  updatedAt: number; // ms epoch, from driverLocations doc
  rating?: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in kilometers. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Rough speed-based ETA fallback when no routing engine is reachable. */
export function estimateEtaMinutes(distanceKm: number, vehicleType: 'Car' | 'Keke' | 'Shuttle'): number {
  const avgSpeedKmh = vehicleType === 'Keke' ? 18 : vehicleType === 'Shuttle' ? 22 : 28;
  const minutes = (distanceKm / avgSpeedKmh) * 60;
  return Math.max(1, Math.round(minutes));
}

export interface MatchCandidate {
  driver: TrackedDriver;
  distanceKm: number;
  etaMinutes: number;
}

const MAX_STALE_LOCATION_MS = 90_000; // ignore drivers whose GPS ping is >90s old
const DEFAULT_MAX_RADIUS_KM = 8;

/**
 * Core dispatch algorithm: given a rider's pickup coordinate and the pool of
 * currently tracked drivers, return the nearest eligible drivers ranked by
 * distance.
 *
 * Eligibility: status === 'Idle', location fresh, within maxRadiusKm,
 * and optionally matching the requested vehicle type.
 */
export function findNearestDrivers(
  pickup: LatLng,
  drivers: TrackedDriver[],
  options?: {
    vehicleType?: 'Car' | 'Keke' | 'Shuttle';
    maxRadiusKm?: number;
    limit?: number;
    now?: number;
  }
): MatchCandidate[] {
  const now = options?.now ?? Date.now();
  const maxRadiusKm = options?.maxRadiusKm ?? DEFAULT_MAX_RADIUS_KM;
  const limit = options?.limit ?? 5;

  const eligible = drivers.filter((d) => {
    if (d.status !== 'Idle') return false;
    if (now - d.updatedAt > MAX_STALE_LOCATION_MS) return false;
    if (options?.vehicleType && d.vehicleType !== options.vehicleType) return false;
    return true;
  });

  const candidates: MatchCandidate[] = eligible
    .map((driver) => {
      const distanceKm = haversineDistanceKm(pickup, { lat: driver.lat, lng: driver.lng });
      return {
        driver,
        distanceKm,
        etaMinutes: estimateEtaMinutes(distanceKm, driver.vehicleType),
      };
    })
    .filter((c) => c.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return candidates.slice(0, limit);
}

/** Single best match convenience wrapper. */
export function findClosestDriver(
  pickup: LatLng,
  drivers: TrackedDriver[],
  options?: Parameters<typeof findNearestDrivers>[2]
): MatchCandidate | null {
  const [best] = findNearestDrivers(pickup, drivers, { ...options, limit: 1 });
  return best ?? null;
}