import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UNIVERSITIES } from './SchoolSelection';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { TrackedDriver, LatLng } from '../lib/geo';
import { getRoute, RouteResult } from '../lib/routing';

interface CampusMapProps {
  schoolId: string;
  pickupId?: string;
  dropoffId?: string;
  poolingState: 'idle' | 'forming' | 'matched' | 'transit' | 'arrived' | 'rated';
  isMatchingDriver?: boolean;
  liveDistance?: number;
  onSelectPickup?: (stopId: string) => void;
  onSelectDropoff?: (stopId: string) => void;
  matchedDriverName?: string;
  isContinuousBackground?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

// Fix default Leaflet marker asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function divIcon(html: string, size: [number, number] = [30, 30]) {
  return L.divIcon({
    html,
    className: 'campusride-leaflet-icon',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
}

const pickupIcon = divIcon(
  `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
    <span style="position:absolute;width:32px;height:32px;border-radius:9999px;background:rgba(46,204,113,0.5);animation:crPing 1.5s infinite;"></span>
    <div style="width:28px;height:28px;background:#2ECC71;color:#fff;border-radius:9999px;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>
  </div>`
);
const dropoffIcon = divIcon(
  `<div style="width:28px;height:28px;background:#E74C3C;color:#fff;border-radius:9999px;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;font-size:14px;">🏁</div>`
);
const stopIcon = divIcon(
  `<div style="width:14px;height:14px;background:#fff;border:3px solid #2ECC71;border-radius:9999px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>`,
  [14, 14]
);
const currentLocationIcon = divIcon(
  `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
    <span style="position:absolute;width:32px;height:32px;border-radius:9999px;background:rgba(52,152,219,0.5);animation:crPing 1.5s infinite;"></span>
    <div style="width:16px;height:16px;background:#3498DB;color:#fff;border-radius:9999px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.6);"></div>
  </div>`,
  [16, 16]
);

function driverIcon(vehicleType: 'Car' | 'Keke' | 'Shuttle', isMatched: boolean) {
  const emoji = vehicleType === 'Keke' ? '🛺' : vehicleType === 'Shuttle' ? '🚐' : '🚗';
  const bg = isMatched ? '#F1C40F' : '#ffffff';
  const border = isMatched ? '#fff' : '#F1C40F';
  const color = isMatched ? '#000' : '#000';
  const s = isMatched ? 36 : 28;
  return divIcon(
    `<div style="width:${s}px;height:${s}px;background:${bg};color:${color};border:3px solid ${border};border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;font-size:${isMatched ? 18 : 14}px;">${emoji}</div>`
  );
}

export const CampusMap: React.FC<CampusMapProps> = ({
  schoolId,
  pickupId,
  dropoffId,
  poolingState,
  liveDistance,
  onSelectPickup,
  onSelectDropoff,
  matchedDriverName = 'David Alao',
  isContinuousBackground = false,
  userLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const driversLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const selectedSchool = UNIVERSITIES.find((u) => u.id === schoolId) || UNIVERSITIES[0];
  const stops = useMemo(() => {
    const baseStops = selectedSchool.stops;
    if (userLocation) {
      return [{ id: 'current_location', name: 'Current Location', lat: userLocation.lat, lng: userLocation.lng }, ...baseStops];
    }
    return baseStops;
  }, [selectedSchool, userLocation]);

  const pickupStop = stops.find((s) => s.id === pickupId);
  const dropoffStop = stops.find((s) => s.id === dropoffId);

  // ---- Live driver locations from Firestore ----
  const [trackedDrivers, setTrackedDrivers] = useState<TrackedDriver[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'driverLocations'),
      (snapshot) => {
        const list: TrackedDriver[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          if (typeof d.lat === 'number' && typeof d.lng === 'number') {
            list.push({
              id: docSnap.id,
              name: d.name || 'Driver',
              lat: d.lat,
              lng: d.lng,
              vehicleType: d.vehicleType || 'Car',
              status: d.status || 'Offline',
              updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0,
              rating: d.rating,
            });
          }
        });
        setTrackedDrivers(list);
      },
      (err) => console.warn('Error subscribing to driverLocations:', err)
    );
    return () => unsub();
  }, []);

  const onlineDriversCount = trackedDrivers.filter((d) => d.status !== 'Offline').length;
  const matchedDriver = trackedDrivers.find((d) => d.name === matchedDriverName);

  // ---- OSM/ORS route (pickup -> dropoff, or matched driver -> pickup) ----
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function computeRoute() {
      if ((poolingState === 'matched' || poolingState === 'transit') && matchedDriver) {
        const target = poolingState === 'transit' && dropoffStop ? dropoffStop : pickupStop;
        if (!target) return;
        const r = await getRoute(
          { lat: matchedDriver.lat, lng: matchedDriver.lng },
          { lat: target.lat, lng: target.lng },
          matchedDriver.vehicleType
        );
        if (!cancelled) {
          setRoute(r);
          setEtaMinutes(r.durationMinutes);
        }
        return;
      }

      if (pickupStop && dropoffStop) {
        const r = await getRoute(
          { lat: pickupStop.lat, lng: pickupStop.lng },
          { lat: dropoffStop.lat, lng: dropoffStop.lng },
          'Car'
        );
        if (!cancelled) {
          setRoute(r);
          setEtaMinutes(r.durationMinutes);
        }
        return;
      }

      if (!cancelled) {
        setRoute(null);
        setEtaMinutes(null);
      }
    }

    computeRoute();
    const interval =
      (poolingState === 'matched' || poolingState === 'transit') && matchedDriver
        ? setInterval(computeRoute, 10_000)
        : null;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [pickupId, dropoffId, poolingState, matchedDriver?.lat, matchedDriver?.lng]);

  // Points to fit bounds to
  const boundsPoints = useMemo(() => {
    const pts: LatLng[] = [];
    if (pickupStop) pts.push({ lat: pickupStop.lat, lng: pickupStop.lng });
    if (dropoffStop) pts.push({ lat: dropoffStop.lat, lng: dropoffStop.lng });
    if (matchedDriver && (poolingState === 'matched' || poolingState === 'transit')) {
      pts.push({ lat: matchedDriver.lat, lng: matchedDriver.lng });
    }
    return pts;
  }, [pickupStop?.id, dropoffStop?.id, matchedDriver?.lat, matchedDriver?.lng, poolingState]);

  // ---- Initialize Leaflet Map Instance Safely ----
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    const map = L.map(container, {
      center: [selectedSchool.center.lat, selectedSchool.center.lng],
      zoom: selectedSchool.zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // High-resolution satellite imagery from ESRI
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
    }).addTo(map);

    // Reference overlay for places/labels
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      opacity: 0.5,
    }).addTo(map);

    // Reference overlay for roads/transportation
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      opacity: 0.5,
    }).addTo(map);

    const stopsLayer = L.layerGroup().addTo(map);
    const driversLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);

    stopsLayerRef.current = stopsLayer;
    driversLayerRef.current = driversLayer;
    routeLayerRef.current = routeLayer;
    mapInstanceRef.current = map;

    // Handle container resizing smoothly
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      stopsLayerRef.current = null;
      driversLayerRef.current = null;
      routeLayerRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
    };
  }, [selectedSchool.id]);

  // ---- Update Stops Layer ----
  useEffect(() => {
    const layer = stopsLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    stops.forEach((stop) => {
      const isPickup = stop.id === pickupId;
      const isDropoff = stop.id === dropoffId;
      const isCurrentLocation = stop.id === 'current_location';
      const icon = isPickup ? pickupIcon : isDropoff ? dropoffIcon : isCurrentLocation ? currentLocationIcon : stopIcon;

      const marker = L.marker([stop.lat, stop.lng], {
        icon,
        title: stop.name,
      }).bindTooltip(stop.name, {
        permanent: true,
        direction: 'right',
        offset: [15, 0],
        className: 'bg-transparent border-0 shadow-none px-0 py-0 text-[8px] font-bold text-slate-900 dark:text-white whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
      });

      marker.on('click', () => {
        if (onSelectPickup && !pickupId) {
          onSelectPickup(stop.id);
        } else if (onSelectDropoff && pickupId && !dropoffId) {
          onSelectDropoff(stop.id);
        }
      });

      marker.addTo(layer);
    });
  }, [stops, pickupId, dropoffId, onSelectPickup, onSelectDropoff]);

  // ---- Update Drivers Layer ----
  useEffect(() => {
    const layer = driversLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    trackedDrivers
      .filter((d) => d.status !== 'Offline')
      .forEach((drv) => {
        const isMatched = (poolingState === 'matched' || poolingState === 'transit') && drv.name === matchedDriverName;

        let lat = drv.lat;
        let lng = drv.lng;

        // If matched and in transit, simulate car movement along the actual route using liveDistance
        if (isMatched && poolingState === 'transit' && route && typeof liveDistance === 'number' && route.coordinates.length > 1) {
           const percent = Math.max(0, Math.min(100, liveDistance)) / 100;
           const totalSegments = route.coordinates.length - 1;
           const exactIndex = percent * totalSegments;
           const lowerIndex = Math.floor(exactIndex);
           const upperIndex = Math.ceil(exactIndex);
           if (lowerIndex === upperIndex) {
              lat = route.coordinates[lowerIndex][0];
              lng = route.coordinates[lowerIndex][1];
           } else {
              const remainder = exactIndex - lowerIndex;
              const lat1 = route.coordinates[lowerIndex][0];
              const lng1 = route.coordinates[lowerIndex][1];
              const lat2 = route.coordinates[upperIndex][0];
              const lng2 = route.coordinates[upperIndex][1];
              lat = lat1 + (lat2 - lat1) * remainder;
              lng = lng1 + (lng2 - lng1) * remainder;
           }
        }

        const marker = L.marker([lat, lng], {
          icon: driverIcon(drv.vehicleType, isMatched),
          title: `${drv.name} (${drv.vehicleType})`,
          zIndexOffset: isMatched ? 1000 : 0,
        });
        marker.addTo(layer);
      });
  }, [trackedDrivers, poolingState, matchedDriverName, route, liveDistance]);

  // ---- Update Route Polyline Layer ----
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (route && route.coordinates.length > 1) {
      const polyline = L.polyline(route.coordinates, {
        color: '#2ECC71',
        weight: 5,
        opacity: 1.0,
        dashArray: route.source === 'fallback' ? '6 8' : undefined,
      });
      polyline.addTo(layer);
    }
  }, [route]);

  // ---- Update FitBounds ----
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pointsToFit = boundsPoints.length > 0 ? boundsPoints : stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    if (pointsToFit.length === 0) return;

    if (pointsToFit.length === 1) {
      map.setView([pointsToFit[0].lat, pointsToFit[0].lng], map.getZoom() || selectedSchool.zoom);
      return;
    }

    const bounds = L.latLngBounds(pointsToFit.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [boundsPoints, stops, selectedSchool.zoom]);

  return (
    <div className={`w-full transition-all ${
      isContinuousBackground
        ? 'h-full relative overflow-hidden bg-slate-100 dark:bg-neutral-900 lg:bg-white lg:rounded-3xl lg:border lg:border-slate-200 lg:shadow-xs lg:flex lg:flex-col lg:animate-fadeIn lg:h-auto'
        : 'bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col animate-fadeIn'
    }`}>
      <style>{`
        @keyframes crPing { 0% { transform: scale(1); opacity: 1; } 75%, 100% { transform: scale(2); opacity: 0; } }
        .campusride-leaflet-icon { background: transparent; border: none; }
        .leaflet-container { font-family: inherit; width: 100%; height: 100%; z-index: 1; }
      `}</style>

      <div className={`relative w-full ${isContinuousBackground ? 'h-full lg:h-[320px] xl:h-[400px]' : 'h-[320px] md:h-[400px]'}`}>
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className={`p-4 bg-slate-50 dark:bg-black text-slate-600 dark:text-neutral-200 border-t border-slate-150 dark:border-neutral-800 flex-wrap gap-4 items-center justify-between text-xs font-semibold ${isContinuousBackground ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
          <span>{onlineDriversCount} {onlineDriversCount === 1 ? 'driver' : 'drivers'} online on campus</span>
          {etaMinutes !== null && (
            <span className="ml-3 px-2 py-0.5 rounded-full bg-[#46C96B]/10 dark:bg-white/10 text-[#46C96B] dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wide">
              ETA {etaMinutes} min{route?.source === 'fallback' ? ' (est.)' : ''}
            </span>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-[#001058]"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-neutral-400">Pickup</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-400 dark:border-slate-500"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-neutral-400">Destination</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-neutral-600"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-neutral-400">Campus Stops</span>
          </div>
        </div>
      </div>
    </div>
  );
};