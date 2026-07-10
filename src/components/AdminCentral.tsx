import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  HOTLINK_MAP_ADMIN, 
  SYSTEM_KPIS 
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
  Award,
  Mail,
  Check,
  X,
  Send
} from 'lucide-react';
import { RideRequest, DriverState } from '../types';

interface AdminCentralProps {
  activeView: string;
  activeRide: RideRequest | null;
  onUpdateRide: (ride: RideRequest | null) => void;
  selectedSchoolId?: string;
}

// Initial mock driver roster list for admin control panels
const INITIAL_DRIVERS_ROSTER: DriverState[] = [];

export const AdminCentral: React.FC<AdminCentralProps> = ({
  activeView,
  activeRide,
  onUpdateRide,
  selectedSchoolId
}) => {
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const mapImage = selectedSchool.mapImage;

  const [driversRoster, setDriversRoster] = useState<DriverState[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);

  // 1. Synchronize Driver Roster from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: DriverState[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as DriverState);
      });
      setDriversRoster(list);
    }, (error) => {
      console.error("Firestore error reading driver roster:", error);
    });
    return () => unsub();
  }, []);

  // 2. Synchronize Pending Drivers from Firestore and auto-seed if empty
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pendingDrivers'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ ...doc.data(), id: doc.id });
      });
      if (list.length === 0 && snapshot.metadata.fromCache === false) {
        // Seed default pending drivers if they do not exist
        const seed = [
          {
            id: 'drv-pending-1',
            name: 'Chinedu Okoye',
            email: 'chinedu.okoye@campusride.edu',
            carBrand: 'Yellow Piaggio Ape',
            carType: 'keke',
            plateNumber: 'KK-882-LA',
            vehicleId: 'VID-KEKE-772',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'drv-pending-2',
            name: 'Fatima Bello',
            email: 'fatima.b@campusride.edu',
            carBrand: 'White Suzuki Everyday',
            carType: 'shuttle',
            plateNumber: 'SH-192-KD',
            vehicleId: 'VID-SHUT-109',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          }
        ];
        seed.forEach(async (item) => {
          await setDoc(doc(db, 'pendingDrivers', item.id), item);
        });
        setPendingDrivers(seed);
      } else {
        setPendingDrivers(list);
      }
    }, (error) => {
      console.error("Firestore error reading pending drivers:", error);
    });
    return () => unsub();
  }, []);

  const [approvedEmailDetails, setApprovedEmailDetails] = useState<any | null>(null);
  const [driverSearch, setDriverSearch] = useState<string>('');
  const [incidentsCount, setIncidentsCount] = useState<number>(0);

  const totalTripsLogged = parseInt(localStorage.getItem('campusride_total_trips_logged') || '0', 10);
  const kekeShuttleRatio = localStorage.getItem('campusride_keke_shuttle_ratio') || '0.0%';
  const avgMatchDuration = localStorage.getItem('campusride_avg_match_duration') || '0.0 mins';

  // Toggle individual driver state in Firestore
  const handleDriverStatusToggle = async (driverId: string, currentStatus: string) => {
    let nextStatus: 'On Trip' | 'Idle' | 'Break' | 'Offline' = 'Idle';
    if (currentStatus === 'Idle') nextStatus = 'Break';
    else if (currentStatus === 'Break') nextStatus = 'Offline';
    else if (currentStatus === 'Offline') nextStatus = 'Idle';
    else nextStatus = 'Idle';

    try {
      await updateDoc(doc(db, 'users', driverId), { status: nextStatus });
    } catch (error) {
      console.error("Error toggling driver status in Firestore:", error);
    }
  };

  const handleApproveDriver = async (driver: any) => {
    try {
      const emailKey = driver.email.toLowerCase().trim();
      const userRef = doc(db, 'users', driver.id);
      const vehicleDetails = `${driver.carBrand} (${driver.carType.toUpperCase()}) • ${driver.plateNumber}${driver.vehicleId ? ` [ID: ${driver.vehicleId}]` : ''}`;

      // Create driver profile document in Firestore with isApproved set to true
      const dProfile = {
        id: driver.id,
        name: driver.name,
        email: emailKey,
        role: 'driver',
        vehicle: vehicleDetails,
        rating: 5.0,
        ratingsCount: 0,
        todayEarnings: 0,
        completedTripsCount: 0,
        hoursOnline: 0,
        status: 'Offline',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY',
        isApproved: true,
        carBrand: driver.carBrand,
        plateNumber: driver.plateNumber,
        carType: driver.carType,
        vehicleId: driver.vehicleId,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(userRef, dProfile, { merge: true });

      // Remove from pendingDrivers collection
      await deleteDoc(doc(db, 'pendingDrivers', driver.id));

      // Trigger the Simulated Email modal!
      setApprovedEmailDetails({
        to: driver.email,
        name: driver.name,
        vehicle: vehicleDetails,
        password: 'Driver123!', // default testing password
        dateSent: new Date().toLocaleString(),
      });

      // Dispatch storage event to update sidebar badges
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error("Error approving driver in Firestore:", error);
    }
  };

  const handleDeclineDriver = async (driverId: string, driverName: string) => {
    if (window.confirm(`Are you sure you want to decline ${driverName}'s driver registration?`)) {
      try {
        await deleteDoc(doc(db, 'pendingDrivers', driverId));
        alert(`Registration for ${driverName} has been declined.`);
        window.dispatchEvent(new Event('storage'));
      } catch (error) {
        console.error("Error declining driver in Firestore:", error);
      }
    }
  };

  // Filter roster drivers
  const filteredRoster = driversRoster.filter(drv => 
    drv.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
    drv.vehicle.toLowerCase().includes(driverSearch.toLowerCase())
  );

  return (
    <div id="admin-portal-viewport" className="flex-1 overflow-y-auto px-4 py-6 md:p-8 bg-[#F9FAFB]">
      
      {/* Header operations central */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-100 pb-5">
        <div>
          <span className="text-xs font-bold text-[#00875A] uppercase tracking-widest font-mono flex items-center">
            <ShieldAlert className="w-4 h-4 text-primary mr-1 shrink-0 animate-bounce" />
            Operations Command Central
          </span>
          <h1 className="text-2xl font-extrabold text-[#00875A] tracking-tight">
            {activeView === 'admin_operations' && 'Live Despatch Operations'}
            {activeView === 'admin_analytics' && 'Ridership Performance Analytics'}
            {activeView === 'admin_reviews' && 'Driver Verification Queue'}
          </h1>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <span className="bg-[#00875A]/20 text-sage-dark border border-sage-light px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center">
            <span className="w-2 h-2 rounded-full bg-[#00875A] mr-2 inline-block"></span>
            Campus Transit Servers: ONLINE
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* RENDER VIEW: LIVE OPERATIONS DESPATCH */}
        {activeView === 'admin_operations' && (
          <motion.div
            key="admin_operations"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-admin-operations"
            className="space-y-6"
          >
          
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Active Campus Rides</span>
                <span className="text-2xl font-extrabold text-primary block">{SYSTEM_KPIS.activeRides}</span>
                <span className="text-[9px] text-[#00875A] font-bold bg-[#00875A]/10 px-2 rounded-full inline-block">
                  Within nominal limit
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] text-primary flex items-center justify-center">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Idle Peer Drivers</span>
                <span className="text-2xl font-extrabold text-[#00875A] block">{SYSTEM_KPIS.idleDrivers}</span>
                <span className="text-[9px] text-[#00875A] font-bold bg-[#F9FAFB]/35 px-2 rounded-full inline-block">
                  Ready in queue
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Revenue Today</span>
                <span className="text-2xl font-extrabold text-[#00875A] block">₦{SYSTEM_KPIS.revenueToday}</span>
                <span className="text-[9px] text-[#00875A] font-bold bg-[#00875A]/10 px-2 rounded-full inline-block">
                  +14% vs weekday avg
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Incidents KPI with dynamic trigger */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-[#00875A]/10/20 transition group">
              <div>
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block font-mono">Reported Safety Flags</span>
                <span className="text-2xl font-extrabold text-[#00875A] block">{incidentsCount}</span>
                <span className="text-[9px] text-red-650 font-bold bg-[#00875A]/10 px-2 rounded-full inline-block group-hover:bg-red-100/50">
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
                className="w-10 h-10 rounded-xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center hover:bg-red-100 transition"
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
                  <h3 className="text-sm font-extrabold text-[#00875A]">Live Operations Layout Map</h3>
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
                <div className="absolute top-[160px] left-[380px] bg-[#00875A] text-white p-1 rounded-full border border-white shrink-0 shadow animate-pulse">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="absolute top-[210px] left-[490px] bg-[#00875A] text-white p-1 rounded-full border border-white shrink-0 shadow">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>

                <div className="absolute top-[50px] left-[162px] bg-[#00875A] text-[8px] text-white px-2 py-0.5 rounded shadow">
                  David Moore Camry • On Route
                </div>
                <div className="absolute top-[130px] left-[392px] bg-[#00875A] text-[8px] text-white px-2 py-0.5 rounded shadow">
                  Evelyn Carter Elantra • Pick Up
                </div>
              </div>
            </div>

            {/* Simulated Peak hours chart */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#00875A]">Peak Traffic Ride Hours</h3>
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
                      <span className={`font-bold font-mono ${item.ratio >= 90 ? 'text-[#00875A]' : 'text-gray-500'}`}>{item.label}</span>
                    </div>
                    {/* Progress tracking line */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${item.ratio >= 90 ? 'bg-[#00875A]' : item.ratio >= 80 ? 'bg-[#00875A]' : 'bg-primary'}`} 
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
                <h3 className="text-base font-extrabold text-[#00875A]">Administrative Peer Roster</h3>
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
                  className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] border border-gray-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#00875A]"
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
                          <span className="font-bold text-[#00875A] block">{drv.name}</span>
                          <span className="font-mono text-[9px] text-[#737686]">{drv.id}</span>
                        </div>
                      </td>

                      {/* Vehicle specs */}
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[160px]">{drv.vehicle}</span>
                      </td>

                      {/* Rating column */}
                      <td className="py-3">
                        <span className="font-mono font-bold text-[#00875A]">★ {drv.rating}</span>
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
                            drv.status === 'On Trip' ? 'bg-[#F9FAFB] text-[#00875A] border-[#00875A]/20' :
                            drv.status === 'Idle' ? 'bg-[#00875A]/10 text-[#00875A] border-sage-light' :
                            drv.status === 'Break' ? 'bg-[#F9FAFB] text-[#00875A] border-[#00875A]/20' :
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
                          className="text-xs font-bold text-[#00875A] hover:underline"
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
        </motion.div>
      )}

        {/* RENDER VIEW: ANALYTICS HUB */}
        {activeView === 'admin_analytics' && (
          <motion.div
            key="admin_analytics"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-admin-analytics"
            className="space-y-6"
          >
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#00875A]">System Ridership Analytics</h3>
                <p className="text-xs text-gray-400">Aggregated digital data metrics synced from registrar logs.</p>
              </div>

              <button
                onClick={() => alert('PDF audit logs downloaded successfully.')}
                className="px-4 py-2 bg-[#00875A] hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                Export Audit Itinerary
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Total Trips Logged</span>
                <span className="text-3xl font-extrabold text-[#00875A] block">{totalTripsLogged.toLocaleString()}</span>
                <p className="text-[10px] text-gray-500 font-medium">Accumulating since September term.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Keke & Shuttle Ratio</span>
                <span className="text-3xl font-extrabold text-[#00875A] block">{kekeShuttleRatio}</span>
                <p className="text-[10px] text-gray-500 font-medium">Riders ordering Keke or Shuttle categories.</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Average Match Duration</span>
                <span className="text-3xl font-extrabold text-primary block">{avgMatchDuration}</span>
                <p className="text-[10px] text-gray-500 font-medium">Mean dispatch time prior to peer acceptance.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

        {/* RENDER VIEW: REVIEWS */}
        {activeView === 'admin_reviews' && (
          <motion.div
            key="admin_reviews"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-admin-reviews"
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#00875A]">Driver Verification Queue</h3>
                  <p className="text-xs text-gray-400">
                    Review and approve submitted credentials for new peer drivers to activate their transit authorization.
                  </p>
                </div>
                <div className="bg-orange-50 text-orange-700 border border-orange-100 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center shrink-0">
                  <Clock className="w-4 h-4 mr-1.5 text-orange-600 animate-spin" style={{ animationDuration: '3s' }} />
                  {pendingDrivers.length} Pending Application{pendingDrivers.length !== 1 ? 's' : ''}
                </div>
              </div>

              {pendingDrivers.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">All Drivers Verified!</h4>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      No new driver applications are currently awaiting administrative review. Approved drivers can now log in and accept ride requests.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingDrivers.map((driver) => (
                    <div 
                      key={driver.id} 
                      className="bg-[#F9FAFB] rounded-2xl p-5 border border-gray-200 shadow-xs hover:border-[#00875A]/20 transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Upper Details */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-700 font-extrabold flex items-center justify-center text-sm border border-orange-200 uppercase shrink-0">
                              {driver.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-extrabold text-[#00875A] truncate">{driver.name}</h4>
                              <p className="text-[11px] font-mono text-gray-500 truncate">{driver.email}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold font-mono uppercase tracking-wide px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full shrink-0">
                            Pending Review
                          </span>
                        </div>

                        {/* Vehicle Description Details block */}
                        <div className="mt-4 pt-4 border-t border-gray-200/60 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-gray-400 block font-mono">Vehicle Specs</span>
                              <span className="font-semibold text-gray-700">{driver.carBrand}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block font-mono">License Plate</span>
                              <span className="font-semibold text-gray-700 font-mono">{driver.plateNumber}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-gray-400 block font-mono">Vehicle ID</span>
                              <span className="font-semibold text-gray-700 font-mono">{driver.vehicleId || 'N/A'}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-gray-400 block font-mono">Category</span>
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono border ${
                                driver.carType === 'keke' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                driver.carType === 'shuttle' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-orange-50 text-orange-700 border-orange-200'
                              }`}>
                                {driver.carType}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-450 font-medium pt-1">
                            Registered: {new Date(driver.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-6 pt-4 border-t border-gray-200/60 flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveDriver(driver)}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Verify</span>
                        </button>
                        <button
                          onClick={() => handleDeclineDriver(driver.id, driver.name)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 rounded-xl text-xs font-bold transition border border-gray-200 flex items-center justify-center cursor-pointer"
                          title="Decline Account"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIMULATED EMAIL GATEWAY OVERLAY MODAL */}
      <AnimatePresence>
        {approvedEmailDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Email Gateway Top bar header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping shrink-0" style={{ animationDuration: '2.5s' }} />
                  <span className="text-xs font-extrabold tracking-wider uppercase font-mono text-emerald-400">
                    Dispatched Notification Alert
                  </span>
                </div>
                <button
                  onClick={() => setApprovedEmailDetails(null)}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Email Envelope Header fields */}
              <div className="bg-slate-50 border-b border-gray-150 p-4 text-xs font-medium text-gray-600 space-y-1.5">
                <div className="flex">
                  <span className="w-14 text-gray-400">From:</span>
                  <span className="text-gray-800 font-semibold">campusride-verification@university.edu</span>
                </div>
                <div className="flex">
                  <span className="w-14 text-gray-400">To:</span>
                  <span className="text-[#00875A] font-bold">{approvedEmailDetails.to}</span>
                </div>
                <div className="flex">
                  <span className="w-14 text-gray-400">Subject:</span>
                  <span className="text-slate-900 font-bold">🚀 Congratulations! Your CampusRide Driver Account has been Approved!</span>
                </div>
                <div className="flex">
                  <span className="w-14 text-gray-400">Date:</span>
                  <span className="text-gray-500 font-mono">{approvedEmailDetails.dateSent}</span>
                </div>
              </div>

              {/* Beautiful Email Letter Template Body */}
              <div className="p-6 space-y-4 max-h-[360px] overflow-y-auto font-sans">
                <div className="flex items-center space-x-2 text-emerald-700">
                  <Award className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono">Verification Clear • Status: Active</span>
                </div>
                
                <h4 className="text-base font-extrabold text-slate-900">
                  Dear {approvedEmailDetails.name},
                </h4>
                
                <p className="text-xs text-slate-600 leading-relaxed">
                  We are pleased to inform you that your driver profile and vehicle documents have been successfully verified and approved by the <strong>University Parking & Transit Operations</strong>.
                </p>

                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block font-mono uppercase">Certified Transit Vehicle</span>
                    <span className="text-xs font-bold text-[#00875A]">{approvedEmailDetails.vehicle}</span>
                  </div>
                </div>

                <div className="space-y-2 font-sans">
                  <h5 className="text-xs font-black uppercase tracking-widest text-slate-800 font-mono">Getting Started Instructions:</h5>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Launch the <strong>CampusRide</strong> application in your browser.</li>
                    <li>Select the <strong>Driver</strong> role switch toggle on the login portal screen.</li>
                    <li>Enter your registered email address (<strong>{approvedEmailDetails.to}</strong>) and password to access your Shift Dashboard (Password: <strong className="font-mono text-emerald-750">{approvedEmailDetails.password}</strong>).</li>
                  </ol>
                </div>

                <p className="text-[11px] text-gray-500 italic border-t border-gray-100 pt-3">
                  Thank you for contributing to campus convenience and carbon neutrality. Welcome to our peer commuter network!
                  <br />
                  - CampusRide Transit Admin Team
                </p>
              </div>

              {/* Action buttons */}
              <div className="bg-gray-50 border-t border-gray-150 px-5 py-4 flex items-center justify-end space-x-2">
                <button
                  onClick={() => setApprovedEmailDetails(null)}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-[#00875A] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Acknowledge & Close Mail Log</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
