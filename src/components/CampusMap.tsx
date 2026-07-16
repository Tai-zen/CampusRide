import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Car, Zap, Users, Info, Compass } from 'lucide-react';
import { UNIVERSITIES } from './SchoolSelection';

interface CampusMapProps {
  schoolId: string;
  pickupId?: string;
  dropoffId?: string;
  poolingState: 'idle' | 'forming' | 'matched' | 'transit' | 'arrived' | 'rated';
  isMatchingDriver?: boolean;
  liveDistance?: number; // 0 to 100
  onSelectPickup?: (stopId: string) => void;
  onSelectDropoff?: (stopId: string) => void;
  matchedDriverName?: string;
}

interface SimulatedDriver {
  id: string;
  name: string;
  vehicleType: 'Car' | 'Keke' | 'Shuttle';
  vehicleName: string;
  rating: number;
  lat: number;
  lng: number;
  angle: number;
  targetStopIndex: number;
  speedMultiplier: number;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// Google Maps API keys strictly start with 'AIzaSy'
const isKeyValid = (key: string) => {
  return typeof key === 'string' && key.trim().length > 10 && key.startsWith('AIzaSy');
};

const hasValidKey = isKeyValid(API_KEY);

export const CampusMap: React.FC<CampusMapProps> = ({
  schoolId,
  pickupId,
  dropoffId,
  poolingState,
  isMatchingDriver = false,
  liveDistance = 0,
  onSelectPickup,
  onSelectDropoff,
  matchedDriverName = 'David Alao',
}) => {
  const selectedSchool = UNIVERSITIES.find((u) => u.id === schoolId) || UNIVERSITIES[0];
  const stops = selectedSchool.stops;
  
  // Local state for simulated drivers
  const [drivers, setDrivers] = useState<SimulatedDriver[]>([]);
  
  // Selected stops coordinates
  const pickupStop = stops.find((s) => s.id === pickupId);
  const dropoffStop = stops.find((s) => s.id === dropoffId);

  // Find min/max lat/lng to scale/normalize the stops inside our container for custom map mode
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const getCoordinates = (lat: number, lng: number) => {
    const latRange = maxLat - minLat || 0.005;
    const lngRange = maxLng - minLng || 0.005;

    // Scale to percentage coordinates with proper margins
    const x = 12 + ((lng - minLng) / lngRange) * 76;
    const y = 88 - ((lat - minLat) / latRange) * 76;

    return { x: `${x}%`, y: `${y}%`, xNum: x, yNum: y };
  };

  const pickupCoords = pickupStop ? getCoordinates(pickupStop.lat, pickupStop.lng) : null;
  const dropoffCoords = dropoffStop ? getCoordinates(dropoffStop.lat, dropoffStop.lng) : null;

  // Initialize drivers on mount/school change
  useEffect(() => {
    if (stops.length === 0) return;
    
    // Create 4 active drivers scattered across different stops
    const initialDrivers: SimulatedDriver[] = [
      {
        id: 'drv-keke-1',
        name: 'Tunde (Keke)',
        vehicleType: 'Keke',
        vehicleName: 'Keke Tricycle',
        rating: 4.8,
        lat: stops[0].lat + 0.0005,
        lng: stops[0].lng - 0.0005,
        angle: 45,
        targetStopIndex: 2 % stops.length,
        speedMultiplier: 0.8,
      },
      {
        id: 'drv-car-1',
        name: 'David Alao',
        vehicleType: 'Car',
        vehicleName: 'Toyota Corolla',
        rating: 4.9,
        lat: stops[1].lat - 0.0005,
        lng: stops[1].lng + 0.0005,
        angle: 180,
        targetStopIndex: 4 % stops.length,
        speedMultiplier: 1.2,
      },
      {
        id: 'drv-shuttle-1',
        name: 'Innocent (Shuttle)',
        vehicleType: 'Shuttle',
        vehicleName: 'Coaster Bus',
        rating: 4.7,
        lat: stops[2].lat + 0.0003,
        lng: stops[2].lng + 0.0008,
        angle: 270,
        targetStopIndex: 0,
        speedMultiplier: 1.0,
      },
      {
        id: 'drv-car-2',
        name: 'Amina (Car)',
        vehicleType: 'Car',
        vehicleName: 'Toyota Sienna',
        rating: 4.9,
        lat: stops[Math.min(3, stops.length - 1)].lat + 0.0005,
        lng: stops[Math.min(3, stops.length - 1)].lng - 0.0003,
        angle: 90,
        targetStopIndex: Math.min(5, stops.length - 1),
        speedMultiplier: 1.1,
      },
    ];
    setDrivers(initialDrivers);
  }, [schoolId]);

  // Handle simulated driver tracking movement loops
  useEffect(() => {
    if (stops.length === 0) return;
    
    const interval = setInterval(() => {
      setDrivers((prevDrivers) => {
        return prevDrivers.map((drv) => {
          // If in transit and this is the matched driver, we tie their position directly to liveDistance!
          if (poolingState === 'transit' && drv.name === matchedDriverName) {
            if (!pickupStop || !dropoffStop) return drv;
            // Interpolate coordinate along pickup -> dropoff based on liveDistance (0 - 100)
            const fraction = liveDistance / 100;
            const newLat = pickupStop.lat + (dropoffStop.lat - pickupStop.lat) * fraction;
            const newLng = pickupStop.lng + (dropoffStop.lng - pickupStop.lng) * fraction;
            
            // Calculate angle
            const angle = Math.atan2(dropoffStop.lng - pickupStop.lng, dropoffStop.lat - pickupStop.lat) * (180 / Math.PI);
            return {
              ...drv,
              lat: newLat,
              lng: newLng,
              angle: angle,
            };
          }

          // If matched (driver arriving to pickup), we animate matched driver heading to pickup stop
          if (poolingState === 'matched' && drv.name === matchedDriverName) {
            if (!pickupStop) return drv;
            
            // Move driver closer to pickup stop per tick
            const dx = pickupStop.lat - drv.lat;
            const dy = pickupStop.lng - drv.lng;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.00005) {
              return {
                ...drv,
                lat: pickupStop.lat,
                lng: pickupStop.lng,
              };
            }
            
            const step = 0.15 * drv.speedMultiplier;
            const newLat = drv.lat + dx * step;
            const newLng = drv.lng + dy * step;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            return {
              ...drv,
              lat: newLat,
              lng: newLng,
              angle: angle,
            };
          }

          // Otherwise, drivers roam campus stops in circular loops
          const targetStop = stops[drv.targetStopIndex];
          const dx = targetStop.lat - drv.lat;
          const dy = targetStop.lng - drv.lng;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.00015) {
            // Reached target stop, set next stop as target
            const nextIdx = (drv.targetStopIndex + 1) % stops.length;
            return {
              ...drv,
              targetStopIndex: nextIdx,
            };
          }

          // Move towards target stop
          const speed = 0.00004 * drv.speedMultiplier;
          const headingX = dx / distance;
          const headingY = dy / distance;
          
          const newLat = drv.lat + headingX * speed;
          const newLng = drv.lng + headingY * speed;
          const angle = Math.atan2(headingY, headingX) * (180 / Math.PI);

          return {
            ...drv,
            lat: newLat,
            lng: newLng,
            angle: angle,
          };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stops, poolingState, pickupId, dropoffId, liveDistance]);

  const getVehicleIcon = (type: 'Car' | 'Keke' | 'Shuttle') => {
    switch (type) {
      case 'Keke':
        return <Zap className="w-3.5 h-3.5 text-white" />;
      case 'Shuttle':
        return <Users className="w-3.5 h-3.5 text-white" />;
      default:
        return <Car className="w-3.5 h-3.5 text-white" />;
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col animate-fadeIn">
      {/* Top Header / Map controls bar */}
      <div className="bg-slate-50 border-b border-slate-150 p-4 flex justify-between items-center gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#BE5912]/10 flex items-center justify-center text-[#BE5912] animate-pulse">
            <Compass className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">Campus GPS & Location Tracker</h3>
            <span className="text-[10px] text-gray-500 font-mono block">GPS Feed: {selectedSchool.name} Campus Network</span>
          </div>
        </div>
      </div>

      {/* Main Map Stage */}
      <div className="relative w-full h-[320px] md:h-[400px] bg-slate-100 flex items-center justify-center overflow-hidden">
        {hasValidKey ? (
          /* GOOGLE MAPS COMPONENT (Only renders if key is authentic starting with AIzaSy) */
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={selectedSchool.center}
              defaultZoom={selectedSchool.zoom}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              options={{
                disableDefaultUI: false,
                clickableIcons: true,
              }}
            >
              {/* Stops Pins */}
              {stops.map((stop) => {
                const isPickup = stop.id === pickupId;
                const isDropoff = stop.id === dropoffId;
                
                return (
                  <AdvancedMarker
                    key={stop.id}
                    position={{ lat: stop.lat, lng: stop.lng }}
                    title={stop.name}
                    onClick={() => {
                      if (onSelectPickup && !pickupId) {
                        onSelectPickup(stop.id);
                      } else if (onSelectDropoff && pickupId && !dropoffId) {
                        onSelectDropoff(stop.id);
                      }
                    }}
                  >
                    {isPickup ? (
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-8 h-8 rounded-full bg-[#BE5912]/30 animate-ping"></span>
                        <div className="w-7 h-7 bg-[#BE5912] text-white rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : isDropoff ? (
                      <div className="w-7 h-7 bg-slate-900 text-white rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <Navigation className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <Pin background="#E2E8F0" glyphColor="#475569" scale={0.8} />
                    )}
                  </AdvancedMarker>
                );
              })}

              {/* Drivers Pins */}
              {drivers.map((drv) => {
                const isMatchedDriver = (poolingState !== 'idle' && drv.name === matchedDriverName);
                
                return (
                  <AdvancedMarker
                    key={drv.id}
                    position={{ lat: drv.lat, lng: drv.lng }}
                    title={`${drv.name} (${drv.vehicleName})`}
                  >
                    <div 
                      className={`p-2 rounded-xl flex items-center justify-center shadow-md border-2 transition-transform duration-300 ${
                        isMatchedDriver 
                          ? 'bg-[#BE5912] border-white scale-110 text-white z-20' 
                          : 'bg-white border-[#BE5912] text-[#BE5912] scale-95 z-10'
                      }`}
                      style={{ transform: `rotate(${drv.angle}deg)` }}
                    >
                      <div style={{ transform: `rotate(${-drv.angle}deg)` }}>
                        {getVehicleIcon(drv.vehicleType)}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
            <Info className="w-12 h-12 text-[#BE5912] animate-bounce" />
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Google Maps API Key Required</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                To load the interactive Google Maps view, please enter your valid <code>GOOGLE_MAPS_PLATFORM_KEY</code> in the Settings or Secrets panel.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Map Stats footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-wrap gap-4 items-center justify-between text-xs font-semibold text-slate-600">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{drivers.length} drivers online on campus</span>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-[#BE5912]"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Pickup</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-900"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Destination</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Campus Stops</span>
          </div>
        </div>
      </div>
    </div>
  );
};
