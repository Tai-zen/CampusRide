import React, { useState } from 'react';
import { DriverState, RideRequest, AppNotification, Transaction } from '../types';
import { 
  Car, 
  Clock, 
  MapPin, 
  DollarSign, 
  Star, 
  Award, 
  CheckCircle,
  TrendingUp,
  XCircle,
  HelpCircle,
  Power,
  Users,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  LogOut,
  Sparkles,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { MOCK_INCOMING_REQUEST } from '../data';

interface DriverPortalProps {
  activeView: string;
  driverProfile: DriverState;
  activeRide: RideRequest | null;
  onUpdateDriverProfile: (updates: Partial<DriverState>) => void;
  onUpdateRide: (ride: RideRequest | null) => void;
  onAddNotification: (notif: AppNotification) => void;
  onAddTransaction: (txn: Transaction) => void;
  selectedSchoolId?: string;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({
  activeView,
  driverProfile,
  activeRide,
  onUpdateDriverProfile,
  onUpdateRide,
  onAddNotification,
  onAddTransaction,
  selectedSchoolId,
}) => {
  // Local Shift States
  const [shiftOnline, setShiftOnline] = useState<boolean>(true);
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(MOCK_INCOMING_REQUEST);
  const [simTransitLoading, setSimTransitLoading] = useState<boolean>(false);

  // Toggle shift Online / Offline
  const handleToggleShift = () => {
    const nextState = !shiftOnline;
    setShiftOnline(nextState);
    onUpdateDriverProfile({ status: nextState ? 'Idle' : 'Offline' });
    
    onAddNotification({
      id: `driver-notif-${Date.now()}`,
      title: nextState ? 'You are now ONLINE' : 'You went OFFLINE',
      message: nextState 
        ? 'Welcome to active shifts! You are now visible to students looking for peer rides.' 
        : 'Your shift has ended. Students can no longer request rides from your vehicle.',
      date: 'Jun 19, 2026',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      type: 'info'
    });
  };

  // Accept student incoming ride request
  const handleAcceptRide = () => {
    if (!incomingRequest) return;
    
    const acceptedRide: RideRequest = {
      ...incomingRequest,
      status: 'accepted',
      driverId: driverProfile.id,
      driverName: driverProfile.name,
      driverAvatar: driverProfile.avatar,
      driverVehicle: driverProfile.vehicle,
      driverRating: driverProfile.rating,
      etaMinutes: 4,
    };

    onUpdateRide(acceptedRide);
    onUpdateDriverProfile({ status: 'On Trip' });
    setIncomingRequest(null);

    onAddNotification({
      id: `driver-notif-${Date.now()}`,
      title: 'Ride Request Accepted',
      message: `You accepted ${acceptedRide.passengerName}'s request from ${acceptedRide.pickup} to ${acceptedRide.dropoff}. Travel to pickup spot immediately.`,
      date: 'Jun 19, 2026',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      type: 'success'
    });
  };

  // Decline invitation
  const handleDeclineRide = () => {
    setIncomingRequest(null);
    alert('Ride request has been declined. Returning to pool.');
  };

  // Refresh incoming matching invitations
  const refreshPassengerMatches = () => {
    setIncomingRequest(MOCK_INCOMING_REQUEST);
  };

  // Driver Trip Controls
  const advanceDriverTripStatus = () => {
    if (!activeRide) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (activeRide.status === 'accepted') {
      onUpdateRide({
        ...activeRide,
        status: 'arriving',
        etaMinutes: 1,
      });
      onAddNotification({
        id: `driver-notif-${Date.now()}`,
        title: 'Arrived at Pickup Stop',
        message: `You marked your vehicle as arrived at ${activeRide.pickup}. Standing by for passenger boarding.`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'info'
      });
    } else if (activeRide.status === 'arriving') {
      onUpdateRide({
        ...activeRide,
        status: 'in_transit',
        etaMinutes: 5,
      });
      onAddNotification({
        id: `driver-notif-${Date.now()}`,
        title: 'Ride Started',
        message: `Passenger has boarded. Starting active transit to ${activeRide.dropoff}.`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'info'
      });
    } else if (activeRide.status === 'in_transit') {
      // Conclude trip: update driver balance, increment metrics, clear active ride
      const fareEarned = activeRide.cost;
      onUpdateDriverProfile({
        todayEarnings: driverProfile.todayEarnings + fareEarned,
        completedTripsCount: driverProfile.completedTripsCount + 1,
        status: 'Idle',
      });

      const newTxn: Transaction = {
        id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        description: `Earnings: Trip from ${activeRide.pickup} to ${activeRide.dropoff}`,
        amount: fareEarned,
        date: 'Jun 19, 2026',
        time: timeString,
        method: 'Transit Payout',
        type: 'reload',
        status: 'Completed',
      };

      onAddTransaction(newTxn);

      onAddNotification({
        id: `driver-notif-${Date.now()}`,
        title: 'Ride Completed & Fare Credited',
        message: `Successfully completed trip for ${activeRide.passengerName}. ₦${fareEarned.toFixed(2)} has been credited to your earnings account.`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'receipt'
      });

      onUpdateRide(null);
    }
  };

  return (
    <div id="driver-portal-viewport" className="flex-1 overflow-y-auto px-4 py-6 md:p-8 bg-[#f8f9ff]">
      
      {/* Upper Shift Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-100 pb-5">
        <div>
          <span className="text-xs font-bold text-orange-600 uppercase tracking-widest font-mono">Driver Shift Center</span>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">
            {activeView === 'driver_dashboard' && 'Core Shift Dashboard'}
            {activeView === 'driver_earnings' && 'Shift Earnings Ledger'}
            {activeView === 'driver_settings' && 'Vehicle Profiles'}
          </h1>
        </div>

        {/* Dynamic Shift Online/Offline Toggle */}
        <div className="mt-3 sm:mt-0 flex items-center space-x-3.5">
          <button
            onClick={handleToggleShift}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center space-x-2 shadow-sm ${
              shiftOnline 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Shift Mode: {shiftOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW: DRIVER DASHBOARD */}
      {activeView === 'driver_dashboard' && (
        <div id="view-driver-dashboard" className="space-y-6">
          
          {/* Main Today's Performance KPI Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            
            {/* KPI Earnings */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Today's Shift Earnings</span>
                <span className="text-2xl font-extrabold text-[#0b1c30] block">₦{driverProfile.todayEarnings.toFixed(2)}</span>
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 rounded-full inline-block">
                  No registrar deductions
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* KPI Trips */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Completed Travels</span>
                <span className="text-2xl font-extrabold text-[#0b1c30] block">{driverProfile.completedTripsCount}</span>
                <span className="text-[9px] text-primary font-bold bg-blue-50 px-2 rounded-full inline-block">
                  Target: 20 shifts
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#e5eeff] text-primary flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
            </div>

            {/* KPI Average Rating */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block font-mono">Average Rating</span>
                <span className="text-2xl font-extrabold text-[#0b1c30] block">★ {driverProfile.rating}</span>
                <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-2 rounded-full inline-block">
                  {driverProfile.ratingsCount} reviews
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
            </div>

            {/* KPI Hours Online */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Hours Clocked</span>
                <span className="text-2xl font-extrabold text-[#0b1c30] block">{driverProfile.hoursOnline} hrs</span>
                <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 rounded-full inline-block">
                  Active duty state
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Incoming Requests Panel OR Active Trip Controller */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* STATUS CARD: ON TRIP (SIMULATION MODE CONTROLS) */}
              {activeRide ? (
                <div className="bg-white rounded-3xl border-2 border-primary p-6 shadow-md shadow-blue-50 space-y-6">
                  
                  {/* Trip details header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="bg-primary text-white text-[9px] font-bold uppercase px-2.5 py-0.5 rounded font-mono">
                        Active Destination: {activeRide.dropoff}
                      </span>
                      <h2 className="text-lg font-extrabold text-[#0b1c30] mt-2">Active Campus Commuter State</h2>
                      <p className="text-xs text-slate-500">Currently executing verified registrar peer travel itinerary.</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-250 animate-pulse">
                      Status: {activeRide.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  {/* Passenger Card details */}
                  <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <img 
                        referrerPolicy="no-referrer"
                        src={activeRide.passengerAvatar} 
                        alt="Passenger" 
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-205"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[#0b1c30]">{activeRide.passengerName}</h4>
                        <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-semibold">
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold font-mono">STUDENT</span>
                          <span>★ {activeRide.passengerRating} Rating</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold text-gray-400 font-mono block">FARE EARNINGS</span>
                      <span className="text-lg font-extrabold text-primary">₦{activeRide.cost.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Pickup -> Destination Details route list */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 text-[10px] font-extrabold">A</div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">Pickup Spot Location</span>
                        <span className="text-xs font-bold text-[#0b1c30]">{activeRide.pickup}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-700 shrink-0 text-[10px] font-extrabold font-mono">B</div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block font-mono">Destination Stop</span>
                        <span className="text-xs font-bold text-[#0b1c30]">{activeRide.dropoff}</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Trip Status Controls */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 text-xs text-slate-700">
                    <h4 className="font-extrabold text-[#0b1c30] mb-2 flex items-center">
                      <Car className="w-4 h-4 mr-1.5" />
                      Live Transit Operations
                    </h4>
                    <p className="text-[11px] text-[#737686] mb-3.5 leading-relaxed">
                      Log each transport milestone below to update the rider and coordinate dynamic registrar micro-transfers.
                    </p>

                    <button
                      onClick={advanceDriverTripStatus}
                      className="w-full py-2.5 bg-primary hover:bg-[#1559d8] text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>
                        {activeRide.status === 'accepted' && 'Mark Arrived at Pickup Stop'}
                        {activeRide.status === 'arriving' && 'Start Boarding & Commute'}
                        {activeRide.status === 'in_transit' && 'Conclude Ride & Receive Fare'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* INCOMING QUEUES (VISIBLE IF IDLE) */
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0b1c30]">Incoming Transit Invitations</h3>
                      <p className="text-xs text-gray-400">Student requests matched dynamically to your silver Toyota sedan.</p>
                    </div>
                    {!incomingRequest && (
                      <button 
                        onClick={refreshPassengerMatches}
                        className="text-xs text-primary font-bold hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Requests</span>
                      </button>
                    )}
                  </div>

                  {!shiftOnline ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <h4 className="font-bold text-xs text-[#0b1c30]">Offline Shift Mode Active</h4>
                      <p className="text-[11px] text-gray-500">Go Online in the top right to start receiving peer requests.</p>
                    </div>
                  ) : incomingRequest ? (
                    /* High-Fidelity Incoming request block card */
                    <div className="bg-[#f8f9ff] rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            referrerPolicy="no-referrer"
                            src={incomingRequest.passengerAvatar} 
                            alt="Student Sarah Photograph" 
                            className="w-10 h-10 rounded-full object-cover border border-[#c3c6d7]"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-[#0b1c30]">{incomingRequest.passengerName}</h4>
                            <span className="text-[9px] bg-[#e5eeff] text-primary px-1.5 py-0.5 rounded font-bold font-mono">★ {incomingRequest.passengerRating} Star Rider</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-semibold text-gray-405 block font-mono">ESTIMATED EARNINGS</span>
                          <span className="text-base font-extrabold text-emerald-600">₦{incomingRequest.cost.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Route specs */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[9px] font-bold text-gray-400 font-mono block tracking-wider uppercase">Pickup Spot Campus</span>
                          <span className="font-bold text-[#0b1c30] truncate block">{incomingRequest.pickup}</span>
                        </div>
                        <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[9px] font-bold text-gray-400 font-mono block tracking-wider uppercase">Destination Stop</span>
                          <span className="font-bold text-[#0b1c30] truncate block">{incomingRequest.dropoff}</span>
                        </div>
                      </div>

                      {/* CTA Panel buttons */}
                      <div className="flex space-x-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={handleAcceptRide}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-md shadow-emerald-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          onClick={handleDeclineRide}
                          className="px-4 py-2.5 bg-transparent border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs font-medium">
                      No matching student requests in queue. Ready & waiting for campus dispatches...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shift Rules / Commuter Information */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[#0b1c30] flex items-center">
                <Award className="w-4 h-4 text-orange-600 mr-1.5" />
                Shift Advisor Guidelines
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-[#0b1c30] block mb-1">Registrar ID Checks</span>
                  Always verify the physical Student ID Card of passengers before inviting them inside the vehicle to maintain peer compliance.
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-[#0b1c30] block mb-1">Peak Hours Commutes</span>
                  Highest student demand occurs during class turnover moments (e.g. 10:55 AM, 12:15 PM, 4:00 PM). Complete rides then to earn clean transit clean energy credits!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: EARNINGS LEDGER */}
      {activeView === 'driver_earnings' && (
        <div id="view-driver-earnings" className="space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b1c30]">Shift Performance & Earnings</h3>
                <p className="text-xs text-gray-450 font-medium">Breakdown of credits reloads, carpool clean-energy incentives, and tips.</p>
              </div>

              <div className="bg-[#eff4ff] text-[#004ac6] border border-[#dce9ff] px-4 py-2 rounded-xl text-xs font-bold leading-normal">
                Monthly Payout Method: Direct Deposit to Chase Acct (*8429)
              </div>
            </div>

            {/* Analytical Graph Placeholder (High-contrast bento styling) */}
            <div className="h-64 bg-slate-900 rounded-2xl overflow-hidden relative p-6 flex flex-col justify-between text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">Operational Analytics</span>
                  <span className="text-lg font-extrabold">Weekly Shift Revenue Graph</span>
                </div>
                <span className="text-xs bg-emerald-500 text-white font-bold px-3 py-1 rounded-full">+12.5% vs Last Week</span>
              </div>
              
              {/* Simulated visual bar charts */}
              <div className="flex items-end justify-between h-32 gap-3 pt-4">
                {[
                  { day: 'Mon', amt: 84 },
                  { day: 'Tue', amt: 124 },
                  { day: 'Wed', amt: 198 },
                  { day: 'Thu', amt: 142 },
                  { day: 'Fri (Today)', amt: 224 },
                  { day: 'Sat', amt: 0 },
                  { day: 'Sun', amt: 0 }
                ].map((item, id) => (
                  <div key={id} className="flex-1 flex flex-col items-center group cursor-pointer">
                    <span className="text-[9px] font-mono text-emerald-400 invisible group-hover:visible mb-1">₦{item.amt}</span>
                    <div 
                      className="w-full bg-[#fea619] rounded-t-md transition-all group-hover:bg-amber-400 shadow-sm shadow-amber-900/10" 
                      style={{ height: `${Math.max(item.amt / 224 * 100, 5)}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 mt-2 font-mono">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: VEHICLES PRESET */}
      {activeView === 'driver_settings' && (
        <div id="view-driver-settings" className="max-w-xl mx-auto bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#0b1c30]">Vehicle profile registries</h2>
            <p className="text-xs text-gray-400">Current car description records certified to complete campus rides.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#e5eeff] text-[#004ac6] flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">PRIMARY VEHICLE FILE</span>
                  <h4 className="text-sm font-bold text-[#0b1c30]">Toyota Camry 2.5 Hybrid (Silver)</h4>
                  <p className="text-xs font-mono text-gray-500">License Plate Tag: 4P-928X • Decal VERIFIED</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-250 font-mono">
                ACTIVE
              </span>
            </div>

            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between opacity-60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-650 flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center">
                    BACKUP VEHICLE
                  </span>
                  <h4 className="text-sm font-bold text-slate-700">Honda Civic LX</h4>
                  <p className="text-xs font-mono text-gray-500">License Plate Tag: 8U-102K • Decal VERIFIED</p>
                </div>
              </div>
              <button 
                onClick={() => alert('Backup vehicle selection set successfully.')}
                className="text-xs text-[#004ac6] font-bold hover:underline"
              >
                Set Active
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-150 flex items-center justify-between">
            <div className="text-[11px] text-[#855300] bg-[#ffddb8]/35 border border-amber-300 p-3 rounded-xl flex items-start space-x-1.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>
                Adding or modifying vehicle profiles is subject to a 24-hour verification window by Campus Transit administrators.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
