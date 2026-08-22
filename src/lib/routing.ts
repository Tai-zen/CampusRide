import { LatLng, haversineDistanceKm, estimateEtaMinutes } from './geo';

/**
 * Routing wrapper: OpenRouteService (ORS) is the primary provider when
 * VITE_ORS_API_KEY is configured, driving-car profile is used for all
 * vehicle types (ORS has no tricycle/keke profile, and driving-car is an
 * acceptable stand-in). Falls back to the public OSRM demo server, then to
 * a straight-line haversine estimate if both providers are unreachable.
 */

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs, ready for a Leaflet Polyline
  distanceKm: number;
  durationMinutes: number;
  source: 'ors' | 'osrm' | 'fallback';
}

/**
 * Fetch a driving route between two points, preferring ORS, falling back to
 * OSRM, then to a straight-line estimate if both fail.
 */
export async function getRoute(
  start: LatLng,
  end: LatLng,
  vehicleType?: 'Car' | 'Keke' | 'Shuttle'
): Promise<RouteResult> {
  const orsKey = (import.meta as any).env?.VITE_ORS_API_KEY;

  if (orsKey) {
    try {
      const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Authorization': orsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [start.lng, start.lat],
            [end.lng, end.lat],
          ],
        }),
      });

      if (!res.ok) throw new Error(`ORS responded ${res.status}`);

      const data = await res.json();
      const feature = data?.features?.[0];
      if (!feature) throw new Error('ORS returned no route');

      const coords: [number, number][] = feature.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );
      const summary = feature.properties?.summary;

      return {
        coordinates: coords,
        distanceKm: (summary?.distance ?? 0) / 1000,
        durationMinutes: Math.max(1, Math.round((summary?.duration ?? 0) / 60)),
        source: 'ors',
      };
    } catch (err) {
      console.warn('ORS routing failed, falling back to OSRM:', err);
    }
  }

  return getOsrmRoute(start, end, vehicleType);
}

async function getOsrmRoute(
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
 * ORS has no free multi-source matrix endpoint at this tier, so this stays
 * on OSRM; it's only used as a secondary refinement signal, so a slightly
 * different provider from the main route line is fine.
 */
export async function getEtaMatrix(
  origins: LatLng[],
  destination: LatLng
): Promise<number[] | null> {
  if (origins.length === 0) return null;

  try {
    const coordinates = [...origins.map(o => `${o.lng},${o.lat}`), `${destination.lng},${destination.lat}`].join(';');
    const destIndex = origins.length;
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