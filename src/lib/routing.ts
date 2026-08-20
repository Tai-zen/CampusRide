import { LatLng, haversineDistanceKm, estimateEtaMinutes } from './geo';

/**
 * OpenStreetMap public routing wrapper using OSRM project server.
 * Provides turn-by-turn routes and ETAs on the real road network,
 * with a graceful straight-line fallback.
 */

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs, ready for a Leaflet Polyline
  distanceKm: number;
  durationMinutes: number;
  source: 'osrm' | 'fallback';
}

/**
 * Fetch a driving route between two points via OSRM public API.
 * Falls back to a straight-line estimate if the request fails.
 */
export async function getRoute(
  start: LatLng,
  end: LatLng,
  vehicleType?: 'Car' | 'Keke' | 'Shuttle'
): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`OSRM responded ${res.status}`);

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error('OSRM returned no route');

    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    return {
      coordinates: coords,
      distanceKm: (route.distance ?? 0) / 1000,
      durationMinutes: Math.max(1, Math.round((route.duration ?? 0) / 60)),
      source: 'osrm',
    };
  } catch (err) {
    console.warn('OSRM routing failed, using straight-line fallback:', err);
    return fallbackRoute(start, end, vehicleType);
  }
}

function fallbackRoute(
  start: LatLng,
  end: LatLng,
  vehicleType?: 'Car' | 'Keke' | 'Shuttle'
): RouteResult {
  const distanceKm = haversineDistanceKm(start, end);
  return {
    coordinates: [
      [start.lat, start.lng],
      [end.lat, end.lng],
    ],
    distanceKm,
    durationMinutes: estimateEtaMinutes(distanceKm, vehicleType || 'Car'),
    source: 'fallback',
  };
}

/**
 * Batch ETA matrix (driver -> pickup) using the public OSRM Table API.
 */
export async function getEtaMatrix(
  origins: LatLng[],
  destination: LatLng
): Promise<number[] | null> {
  if (origins.length === 0) return null;

  try {
    const coordinates = [...origins.map(o => `${o.lng},${o.lat}`), `${destination.lng},${destination.lat}`].join(';');
    // The last coordinate is the destination
    const destIndex = origins.length;
    // Sources are 0 to origins.length - 1
    const sources = origins.map((_, i) => i).join(';');
    
    const url = `https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=${sources}&destinations=${destIndex}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`OSRM table responded ${res.status}`);
    const data = await res.json();
    
    if (!data.durations || data.durations.length === 0) {
      return null;
    }
    
    return data.durations.map((row: number[]) => Math.max(1, Math.round((row[0] ?? 0) / 60)));
  } catch (err) {
    console.warn('OSRM table ETA refinement failed, keeping haversine estimates:', err);
    return null;
  }
}