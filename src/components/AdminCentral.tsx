import React, { useState } from 'react';
import { 
  HOTLINK_MAP_ADMIN, 
  SYSTEM_KPIS, 
  MOCK_RECENT_TRIPS 
} from '../data';
import { UNIVERSITIES } from './SchoolSelection';
import { 
  ShieldAlert, 
  Users, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  MapPin, 
  RefreshCw, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Info,
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import { RideRequest, DriverState } from '../types';

interface AdminCentralProps {
  activeView: string;
  activeRide: RideRequest | null;
  onUpdateRide: (ride: RideRequest | null) => void;
  selectedSchoolId?: string;
}

// Initial mock driver roster list for admin control panels
const INITIAL_DRIVERS_ROSTER: DriverState[] = [
  {
    id: 'd-202',
    name: 'David Moore',
    vehicle: 'Toyota Camry (Silver) • 4P-928X',
    rating: 4.9,
    ratingsCount: 312,
    todayEarnings: 142.50,
    completedTripsCount: 18,
    hoursOnline: 6.2,
    status: 'Idle',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY',
  },
  {
    id: 'd-203',
    name: 'Evelyn Carter',
    vehicle: 'Hyundai Elantra • 1U-479A',
    rating: 4.7,
    ratingsCount: 189,
    todayEarnings: 98.00,
    completedTripsCount: 12,
    hoursOnline: 4.8,
    status: 'On Trip',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-Cdw8CNopc8k2r2bChzvHe7QZaaNgVPTLiGVgUTgp--dffDncXZ8bU7hizu37qrlVeyhQdVbv3kihVg1LraTeO1kDBTXWUTydpgInuRRr6KgcMf80v4Etlk0ixvdHwGMd1pjRAggczT6nH3Ti71NEpOUiZZMUofg7cAEVyhtFJgXIAu_KWkyoQ1MNsW0wXbjHSUOpXEH2KfQKhDcOLk1VhacmpIBEpbNkM9L1NDmr5MdxBTYTqutaSAlGgZaJiNcn9MpBzKOrS4',
  },
  {
    id: 'd-204',
    name: 'Michael Chen',
    vehicle: 'Ford Escape Hybrid • 9Q-1049',
    rating: 4.8,
    ratingsCount: 224,
    todayEarnings: 120.50,
    completedTripsCount: 15,
    hoursOnline: 5.5,
    status: 'Break',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbGlfdOl3j1fHrDL2zGezXufqFSupJddtSKf_0ia7IWGW9Wesknx7vJovIsRYAwNk5sghKzGgUnf8vdQmr3_w45dpJDAM-rpsGw7dModifMyXyM0IiymtgW76toA-Sfd2jsWQAHbw5DlBp_rN-hx8zAt0vtD_kONTNbYV0nLhuEexvzdrmCVfuez6z5PPAmJIB6I1m43yYpepHmesBPTwdks5JrsKjRuu5z6jhJJI_sLOnZWScX-gmTvpzVLyka2OR7NHwG3a1TDE',
  },
];

export const AdminCentral: React.FC<AdminCentralProps> = ({
  activeView,
  activeRide,
  onUpdateRide,
  selectedSchoolId
}) => {
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const mapImage = selectedSchool.mapImage;

  const [driversRoster, setDriversRoster] = useState<DriverState[]>(INITIAL_DRIVERS_ROSTER);
  const [driverSearch, setDriverSearch] = useState<string>('');
  const [incidentsCount, setIncidentsCount] = useState<number>(2);

  // Toggle individual driver state
  const handleDriverStatusToggle = (driverId: string, currentStatus: string) => {
    let nextStatus: 'On Trip' | 'Idle' | 'Break' | 'Offline' = 'Idle';
    if (currentStatus === 'Idle') nextStatus = 'Break';
    else if (currentStatus === 'Break') nextStatus = 'Offline';
    else if (currentStatus === 'Offline') nextStatus = 'Idle';
    else nextStatus = 'Idle'; // On trip remains on trip or resets to idle

    setDriversRoster(
      driversRoster.map(drv => drv.id === driverId ? { ...drv, status: nextStatus } : drv)
    );
  };

  // Filter roster drivers
  const filteredRoster = driversRoster.filter(drv => 
    drv.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
    drv.vehicle.toLowerCase().includes(driverSearch.toLowerCase())
  );

  return (
    <div id="admin-portal-viewport" className="flex-1 overflow-y-auto px-4 py-6 md:p-8 bg-[#f8f9ff]">
      
      {/* Header operations central */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-100 pb-5">
        <div>
          <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-widest font-mono flex items-center">
            <ShieldAlert className="w-4 h-4 text-primary mr-1 shrink-0 animate-bounce" />
            Operations Command Central
          </span>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">
            {activeView === 'admin_operations' && 'Live Despatch Operations'}
            {activeView === 'admin_analytics' && 'Ridership Performance Analytics'}
          </h1>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 inline-block"></span>
            Campus Transit Servers: ONLINE
          </span>
        </div>
      </div>

      {/* RENDER VIEW: LIVE OPERATIONS DESPATCH */}
      {activeView === 'admin_operations' && (
        <div id="view-admin-operations" className="space-y-6">
          
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Active Campus Rides</span>
                <span className="text-2xl font-extrabold text-primary block">{SYSTEM_KPIS.activeRides}</span>
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 rounded-full inline-block">
                  Within nominal limit
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#e5eeff] text-primary flex items-center justify-center">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Idle Peer Drivers</span>
                <span className="text-2xl font-extrabold text-orange-600 block">{SYSTEM_KPIS.idleDrivers}</span>
                <span className="text-[9px] text-[#855300] font-bold bg-[#ffddb8]/35 px-2 rounded-full inline-block">
                  Ready in queue
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#8c5a00] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Revenue Today</span>
                <span className="text-2xl font-extrabold text-emerald-600 block">₦{SYSTEM_KPIS.revenueToday}</span>
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 rounded-full inline-block">
                  +14% vs weekday avg
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Incidents KPI with dynamic trigger */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-red-50/20 transition group">
              <div>
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block font-mono">Reported Safety Flags</span>
                <span className="text-2xl font-extrabold text-red-600 block">{incidentsCount}</span>
                <span className="text-[9px] text-red-650 font-bold bg-red-50 px-2 rounded-full inline-block group-hover:bg-red-100/50">
                  Click to resolve one
                </span>
              </div>
              <button 
                onClick={() => {
                  if (incidentsCount > 0) {
                    setIncidentsCount(incidentsCount - 1);
                    alert('Incident report marked: Investigated & Resolved.');
                  } else {
                    alert('Congratulations! Zero outstanding active incident reports.');
                  }
                }}
                className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Live Operations Map frame */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm overflow-hidden space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0b1c30]">Live Operations Layout Map</h3>
                  <p className="text-xs text-gray-400">Traces active peer vehicle coordinate coordinates on a real university campus base.</p>
                </div>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded font-mono uppercase">
                  Telemetry Channel Feed
                </span>
              </div>

              {/* Dynamic Map view */}
              <div className="h-64 rounded-2xl overflow-hidden relative border border-gray-100">
                <img 
                  referrerPolicy="no-referrer"
                  src={mapImage} 
                  alt="Admin Telemetry layout map view" 
                  className="w-full h-full object-cover"
                />

                {/* Simulated markup flags to outline active incidents or routes */}
                <div className="absolute top-[80px] left-[150px] bg-primary text-white p-1 rounded-full border border-white shrink-0 shadow animate-bounce">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="absolute top-[160px] left-[380px] bg-amber-500 text-white p-1 rounded-full border border-white shrink-0 shadow animate-pulse">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="absolute top-[210px] left-[490px] bg-red-500 text-white p-1 rounded-full border border-white shrink-0 shadow">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>

                <div className="absolute top-[50px] left-[162px] bg-[#0b1c30] text-[8px] text-white px-2 py-0.5 rounded shadow">
                  David Moore Camry • On Route
                </div>
                <div className="absolute top-[130px] left-[392px] bg-[#0b1c30] text-[8px] text-white px-2 py-0.5 rounded shadow">
                  Evelyn Carter Elantra • Pick Up
                </div>
              </div>
            </div>

            {/* Simulated Peak hours chart */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#0b1c30]">Peak Traffic Ride Hours</h3>
                <p className="text-xs text-gray-400">Relative demands across class blocks of time.</p>
              </div>

              {/* Simulated visual blocks for peak hours */}
              <div className="space-y-2 pt-2">
                {[
                  { range: '08:00 AM - 10:00 AM', ratio: 70, label: 'Modest' },
                  { range: '10:00 AM - 12:00 PM', ratio: 95, label: 'CRITICAL PEAK' },
                  { range: '12:00 PM - 02:00 PM', ratio: 85, label: 'High Demand' },
                  { range: '02:00 PM - 04:00 PM', ratio: 60, label: 'Standard' },
                  { range: '04:00 PM - 06:00 PM', ratio: 90, label: 'High Demand' },
                ].map((item, id) => (
                  <div key={id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-gray-600">{item.range}</span>
                      <span className={`font-bold font-mono ${item.ratio >= 90 ? 'text-red-500' : 'text-gray-500'}`}>{item.label}</span>
                    </div>
                    {/* Progress tracking line */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${item.ratio >= 90 ? 'bg-red-500' : item.ratio >= 80 ? 'bg-[#fea619]' : 'bg-primary'}`} 
                        style={{ width: `${item.ratio}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DRIVERS MANAGEMENT ROSTER */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-[#0b1c30]">Administrative Peer Roster</h3>
                <p className="text-xs text-gray-400">Review currently online vehicles and update active operational status.</p>
              </div>

              {/* Search drivers */}
              <div className="relative max-w-xs w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="Query driver name, vehicle..."
                  className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] border border-gray-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#0b1c30]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono tracking-wider uppercase">
                    <th className="pb-3 font-semibold">Driver Profile</th>
                    <th className="pb-3 font-semibold">Registered Vehicle Type</th>
                    <th className="pb-3 font-semibold">Average Rating</th>
                    <th className="pb-3 font-semibold">Trips & Earnings Today</th>
                    <th className="pb-3 font-semibold">Duty Status State</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((drv) => (
                    <tr key={drv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      
                      {/* Driver ID cell */}
                      <td className="py-3 flex items-center space-x-2.5">
                        <img 
                          referrerPolicy="no-referrer"
                          src={drv.avatar} 
                          alt="Driver" 
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <span className="font-bold text-[#0b1c30] block">{drv.name}</span>
                          <span className="font-mono text-[9px] text-[#737686]">{drv.id}</span>
                        </div>
                      </td>

                      {/* Vehicle specs */}
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[160px]">{drv.vehicle}</span>
                      </td>

                      {/* Rating column */}
                      <td className="py-3">
                        <span className="font-mono font-bold text-[#0b1c30]">★ {drv.rating}</span>
                        <span className="text-[10px] text-gray-400 block font-semibold">{drv.ratingsCount} reviews</span>
                      </td>

                      {/* Earnings */}
                      <td className="py-3">
                        <span className="font-bold text-slate-900 block">₦{drv.todayEarnings.toFixed(2)}</span>
                        <span className="text-[10px] text-gray-450 font-semibold">{drv.completedTripsCount} shifts</span>
                      </td>

                      {/* Roster state toggle button */}
                      <td className="py-3">
                        <button
                          onClick={() => handleDriverStatusToggle(drv.id, drv.status)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide border ${
                            drv.status === 'On Trip' ? 'bg-[#e5eeff] text-primary border-blue-200' :
                            drv.status === 'Idle' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            drv.status === 'Break' ? 'bg-[#ffddb8] text-[#855300] border-amber-200' :
                            'bg-gray-100 text-gray-500 border-gray-300'
                          }`}
                        >
                          {drv.status === 'On Trip' ? 'On Trip' : drv.status === 'Idle' ? 'On Duty: IDLE' : drv.status === 'Break' ? 'On Break' : 'Offline'}
                        </button>
                      </td>

                      {/* Trigger Actions */}
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            if (drv.status === 'Offline') {
                              alert(`Emergency alert dispatched to ${drv.name}. Direct radio request active.`);
                            } else {
                              alert(`Pinged driver ${drv.name} on transit radio. Current channel logs synced.`);
                            }
                          }}
                          className="text-xs font-bold text-[#004ac6] hover:underline"
                        >
                          Send Radio Dispatch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: ANALYTICS HUB */}
      {activeView === 'admin_analytics' && (
        <div id="view-admin-analytics" className="space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b1c30]">System Ridership Analytics</h3>
                <p className="text-xs text-gray-400">Aggregated digital data metrics synced from registrar logs.</p>
              </div>

              <button
                onClick={() => alert('PDF audit logs downloaded successfully.')}
                className="px-4 py-2 bg-[#0b1c30] hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                Export Audit Itinerary
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Total Trips Logged</span>
                <span className="text-3xl font-extrabold text-[#0b1c30] block">42,912</span>
                <p className="text-[10px] text-gray-500 font-medium">Accumulating since September term.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Keke & Shuttle Ratio</span>
                <span className="text-3xl font-extrabold text-orange-600 block">62.8%</span>
                <p className="text-[10px] text-gray-500 font-medium">Riders ordering Keke or Shuttle categories.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Average Match Duration</span>
                <span className="text-3xl font-extrabold text-primary block">2.4 mins</span>
                <p className="text-[10px] text-gray-500 font-medium">Mean dispatch time prior to peer acceptance.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
