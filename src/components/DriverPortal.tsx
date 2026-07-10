import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Wallet,
  Calendar,
  MessageSquare,
  Send,
  Check,
  Copy,
  ArrowRightLeft
} from 'lucide-react';
import { CAMPUS_STOPS } from '../data';
import { UNIVERSITIES } from './SchoolSelection';
import { CampusMap } from './CampusMap';

interface DriverPortalProps {
  activeView: string;
  driverProfile: DriverState;
  activeRide: RideRequest | null;
  notifications?: AppNotification[];
  onUpdateDriverProfile: (updates: Partial<DriverState>) => void;
  onUpdateRide: (ride: RideRequest | null) => void;
  onAddNotification: (notif: AppNotification) => void;
  onAddTransaction: (txn: Transaction) => void;
  onMarkNotificationsRead?: () => void;
  onClearNotifications?: () => void;
  selectedSchoolId?: string;
  onNavigate?: (view: string) => void;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({
  activeView,
  driverProfile,
  activeRide,
  notifications = [],
  onUpdateDriverProfile,
  onUpdateRide,
  onAddNotification,
  onAddTransaction,
  onMarkNotificationsRead,
  onClearNotifications,
  selectedSchoolId,
  onNavigate,
}) => {
  // Local Shift States
  const [shiftOnline, setShiftOnline] = useState<boolean>(() => driverProfile?.status !== 'Offline');
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  const [simTransitLoading, setSimTransitLoading] = useState<boolean>(false);
  const [scheduledRides, setScheduledRides] = useState<any[]>([]);
  const [liveDistance, setLiveDistance] = useState<number>(0);

  // Sync shift online with driver profile status
  useEffect(() => {
    setShiftOnline(driverProfile?.status !== 'Offline');
  }, [driverProfile?.status]);

  // Real-time Chat States
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string; isUser: boolean; senderId?: string }[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState<boolean>(false);
  const floatingChatBottomRef = useRef<HTMLDivElement>(null);

  // Sync driver-side messages
  useEffect(() => {
    if (!activeRide) {
      setChatMessages([]);
      return;
    }
    const chatId = activeRide.id;
    const loadChat = () => {
      const stored = localStorage.getItem(`campusride_chat_${chatId}`);
      if (stored) {
        try {
          const msgs = JSON.parse(stored);
          setChatMessages(msgs);
        } catch (e) {
          console.error("Error parsing chat messages", e);
        }
      } else {
        // If empty, set welcome system msg
        const welcome = [
          { sender: 'System', text: `Welcome to the active transit chat room! Discuss route details safely with your companions and driver.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
        ];
        localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify(welcome));
        setChatMessages(welcome);
      }
    };

    loadChat();
    window.addEventListener('storage', loadChat);
    const interval = setInterval(loadChat, 1500);
    return () => {
      window.removeEventListener('storage', loadChat);
      clearInterval(interval);
    };
  }, [activeRide?.id]);

  // Scroll to bottom of floating chat
  useEffect(() => {
    if (isChatOverlayOpen && floatingChatBottomRef.current) {
      setTimeout(() => {
        floatingChatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [chatMessages, isChatOverlayOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRide) return;

    const chatId = activeRide.id;
    const newMsg = {
      sender: `${driverProfile.name} (Driver)`,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    };

    const stored = localStorage.getItem(`campusride_chat_${chatId}`);
    let msgs = [];
    if (stored) {
      try {
        msgs = JSON.parse(stored);
      } catch (err) {}
    }
    const updated = [...msgs, newMsg];
    localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify(updated));
    setChatMessages(updated);
    setChatInput('');
  };

  const sendQuickReply = (text: string) => {
    if (!activeRide) return;
    const chatId = activeRide.id;
    const newMsg = {
      sender: `${driverProfile.name} (Driver)`,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    };

    const stored = localStorage.getItem(`campusride_chat_${chatId}`);
    let msgs = [];
    if (stored) {
      try {
        msgs = JSON.parse(stored);
      } catch (err) {}
    }
    const updated = [...msgs, newMsg];
    localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify(updated));
    setChatMessages(updated);
  };

  // Local Trust-Transfer Bank details state
  const [bankName, setBankName] = useState<string>(driverProfile.bankName || 'Access Bank Nigeria');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(driverProfile.bankAccountNumber || '2088392102');
  const [bankAccountName, setBankAccountName] = useState<string>(driverProfile.bankAccountName || driverProfile.name || 'David Alao');
  const [savingBank, setSavingBank] = useState<boolean>(false);

  const handleSaveBankDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      alert("All bank details fields are required.");
      return;
    }
    if (bankAccountNumber.trim().length < 10) {
      alert("Please enter a valid 10-digit Nigerian bank account number.");
      return;
    }
    setSavingBank(true);
    setTimeout(() => {
      onUpdateDriverProfile({
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim()
      });
      setSavingBank(false);
      alert("Trust-Transfer bank details saved successfully!");
    }, 800);
  };

  // Synchronize live distance animation for driver when on transit
  React.useEffect(() => {
    let timer: any;
    if (activeRide && activeRide.status === 'in_transit') {
      setLiveDistance(0);
      timer = setInterval(() => {
        setLiveDistance((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 5;
        });
      }, 1000);
    } else {
      setLiveDistance(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeRide?.status]);

  // Helper to resolve stop names
  const getStopName = (stopId: string) => {
    const stop = CAMPUS_STOPS.find(s => s.id === stopId);
    return stop ? stop.name : stopId;
  };

  // Sync scheduled rides
  React.useEffect(() => {
    const syncScheduled = () => {
      const stored = localStorage.getItem('campusride_global_scheduled_rides');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setScheduledRides(parsed);
        } catch (e) {
          console.error("Error parsing scheduled rides", e);
        }
      } else {
        setScheduledRides([]);
      }
    };

    syncScheduled();
    window.addEventListener('storage', syncScheduled);
    const interval = setInterval(syncScheduled, 2000);
    return () => {
      window.removeEventListener('storage', syncScheduled);
      clearInterval(interval);
    };
  }, []);

  // Claim a scheduled ride
  const handleClaimScheduledRide = (ride: any) => {
    const claimedRide: RideRequest = {
      id: ride.id,
      passengerId: ride.passengerId || 'std-unknown',
      passengerName: ride.passengerName || 'Student Companion',
      passengerAvatar: ride.passengerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      passengerRating: ride.passengerRating || 4.8,
      passengerType: 'Student',
      pickup: getStopName(ride.pickup),
      dropoff: getStopName(ride.dropoff),
      status: 'accepted',
      vehicleType: ride.vehicleType || 'Car',
      cost: ride.fare || 1200,
      etaMinutes: 4,
      date: ride.date,
      time: ride.time,
      createdAt: Date.now(),
      driverId: driverProfile.id,
      driverName: driverProfile.name,
      driverAvatar: driverProfile.avatar,
      driverVehicle: driverProfile.vehicle,
      driverRating: driverProfile.rating,
    };

    // Remove it from global scheduled rides
    const stored = localStorage.getItem('campusride_global_scheduled_rides');
    if (stored) {
      try {
        const allRides = JSON.parse(stored) as any[];
        const updated = allRides.filter(r => r.id !== ride.id);
        localStorage.setItem('campusride_global_scheduled_rides', JSON.stringify(updated));
        setScheduledRides(updated);
      } catch (e) {}
    }

    // Set active ride on driver
    onUpdateRide(claimedRide);
    onUpdateDriverProfile({ status: 'On Trip' });

    onAddNotification({
      id: `driver-notif-${Date.now()}`,
      title: 'Scheduled Ride Claimed',
      message: `You claimed scheduled trip ${ride.id} from ${getStopName(ride.pickup)} to ${getStopName(ride.dropoff)}. Proceed to dashboard to execute.`,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      type: 'success'
    });

    alert(`Scheduled trip ${ride.id} claimed successfully! Let's execute the ride.`);
    if (onNavigate) {
      onNavigate('driver_dashboard');
    }
  };

  // Synchronize incoming ride request from students across tabs/components in real time
  React.useEffect(() => {
    const handleStorageChange = () => {
      const globalRideStr = localStorage.getItem('campusride_global_active_ride');
      if (globalRideStr) {
        try {
          const globalRide = JSON.parse(globalRideStr) as RideRequest;
          if (globalRide.status === 'requested') {
            setIncomingRequest(globalRide);
          } else {
            setIncomingRequest(null);
          }
        } catch (e) {
          setIncomingRequest(null);
        }
      } else {
        setIncomingRequest(null);
      }
    };

    // Initial sync
    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    // 1-second interval fallback polling for robust UI sync
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Monitor active trip cancellation from the student in real-time
  useEffect(() => {
    if (!activeRide) return;

    const checkCancellation = () => {
      const globalRideStr = localStorage.getItem('campusride_global_active_ride');
      if (!globalRideStr) {
        // The student has cancelled the active ride!
        onUpdateRide(null);
        onUpdateDriverProfile({ status: 'Idle' });
        onAddNotification({
          id: `driver-notif-${Date.now()}`,
          title: 'Ride Cancelled',
          message: `The active trip has been cancelled by the student.`,
          date: 'Today',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          type: 'warning'
        });
        alert("The active trip has been cancelled by the student.");
      }
    };

    window.addEventListener('storage', checkCancellation);
    const interval = setInterval(checkCancellation, 1500);

    return () => {
      window.removeEventListener('storage', checkCancellation);
      clearInterval(interval);
    };
  }, [activeRide?.id, onUpdateRide, onUpdateDriverProfile, onAddNotification]);

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
    if (activeRide) {
      alert("You are not allowed to accept more than one ride at once. Each driver must complete their active ride before accepting another.");
      return;
    }

    // Validate if the ride is still active in global storage before accepting
    const globalRideStr = localStorage.getItem('campusride_global_active_ride');
    if (!globalRideStr) {
      alert("This ride request has already been cancelled or deleted by the student.");
      setIncomingRequest(null);
      return;
    }

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
    const globalRideStr = localStorage.getItem('campusride_global_active_ride');
    if (globalRideStr) {
      try {
        const globalRide = JSON.parse(globalRideStr) as RideRequest;
        if (globalRide.status === 'requested') {
          setIncomingRequest(globalRide);
          alert(`Fetched active student request from ${globalRide.passengerName}!`);
          return;
        }
      } catch (e) {
        console.error("Error parsing global ride request", e);
      }
    }
    setIncomingRequest(null);
    alert("No active ride requests currently forming on campus.");
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
      if (!activeRide.riderPaid) {
        alert("The student has not completed their boarding payment yet. Please ask them to pay using their digital wallet, cash, or transfer before starting the ride.");
        return;
      }
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
      // Conclude trip: update driver balance, increment metrics, set to completed
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

      onUpdateRide({
        ...activeRide,
        status: 'completed'
      });
    } else if (activeRide.status === 'completed') {
      onUpdateRide(null);
    }
  };

  return (
    <div id="driver-portal-viewport" className="flex-1 overflow-y-auto px-4 py-6 md:p-8 bg-[#F9FAFB]">
      
      {/* Upper Shift Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-100 pb-5">
        <div>
          <span className="text-xs font-bold text-[#BE5912] uppercase tracking-widest font-mono">Driver Shift Center</span>
          <h1 className="text-2xl font-extrabold text-[#BE5912] tracking-tight">
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
                ? 'bg-[#BE5912] text-white hover:bg-[#BE5912]' 
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Shift Mode: {shiftOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* RENDER VIEW: DRIVER DASHBOARD */}
        {activeView === 'driver_dashboard' && (
          <motion.div
            key="driver_dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-driver-dashboard"
            className="space-y-6"
          >
          
          {/* Main Today's Performance KPI Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* KPI Trips */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Completed Travels</span>
                <span className="text-2xl font-extrabold text-[#BE5912] block">{driverProfile.completedTripsCount}</span>
                <span className="text-[9px] text-[#BE5912] font-bold bg-[#F9FAFB] px-2 rounded-full inline-block">
                  Target: 20 shifts
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] text-orange-600 flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
            </div>

            {/* KPI Average Rating */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block font-mono">Average Rating</span>
                <span className="text-2xl font-extrabold text-[#BE5912] block">★ {driverProfile.rating}</span>
                <span className="text-[9px] text-[#BE5912] font-bold bg-[#BE5912]/10 px-2 rounded-full inline-block">
                  {driverProfile.ratingsCount} reviews
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#BE5912]/10 text-[#BE5912] flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
            </div>

            {/* KPI Hours Online */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Hours Clocked</span>
                <span className="text-2xl font-extrabold text-[#BE5912] block">{driverProfile.hoursOnline} hrs</span>
                <span className="text-[9px] text-[#BE5912] font-bold bg-[#BE5912]/10 px-2 rounded-full inline-block">
                  Active duty state
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#BE5912]/10 text-[#BE5912] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Incoming Requests Panel OR Active Trip Controller */}
            <div className="lg:col-span-12 space-y-6">
              {(() => {
                const selectedSchool = UNIVERSITIES.find(u => u.id === (selectedSchoolId || 'run')) || UNIVERSITIES[0];
                const campusStops = selectedSchool.stops;
                const activePickupStop = activeRide ? campusStops.find(s => s.name === activeRide.pickup || s.id === activeRide.pickup) : undefined;
                const activeDropoffStop = activeRide ? campusStops.find(s => s.name === activeRide.dropoff || s.id === activeRide.dropoff) : undefined;
                const poolingState = !activeRide 
                  ? 'idle' 
                  : activeRide.status === 'in_transit' 
                    ? 'transit' 
                    : 'matched';

                return (
                  <CampusMap
                    schoolId={selectedSchool.id}
                    pickupId={activePickupStop?.id}
                    dropoffId={activeDropoffStop?.id}
                    poolingState={poolingState}
                    liveDistance={liveDistance}
                    matchedDriverName={driverProfile.name}
                  />
                );
              })()}
              
              {/* STATUS CARD: ON TRIP (SIMULATION MODE CONTROLS) */}
              {activeRide ? (
                <div className="bg-white rounded-3xl border-2 border-[#BE5912] p-6 shadow-md shadow-orange-50 space-y-6">
                  
                  {/* Trip details header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="bg-[#BE5912] text-white text-[9px] font-bold uppercase px-2.5 py-0.5 rounded font-mono">
                        Active Destination: {activeRide.dropoff}
                      </span>
                      <h2 className="text-lg font-extrabold text-[#BE5912] mt-2">Active Campus Commuter State</h2>
                      <p className="text-xs text-slate-500">Currently executing verified registrar peer travel itinerary.</p>
                    </div>
                    <span className="bg-[#BE5912]/10 text-[#BE5912] font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg border border-orange-250 animate-pulse">
                      Status: {activeRide.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  {/* Passenger Card details */}
                  <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <img 
                        referrerPolicy="no-referrer"
                        src={activeRide.passengerAvatar} 
                        alt="Passenger" 
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-205"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[#BE5912]">{activeRide.passengerName}</h4>
                        <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-semibold">
                          <span className="bg-[#BE5912]/10 text-[#BE5912] px-1.5 py-0.5 rounded font-bold font-mono">STUDENT</span>
                          <span>★ {activeRide.passengerRating} Rating</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trust Payment Method Validation Panel */}
                  <div className="p-4 rounded-2xl border flex flex-col gap-3.5 bg-gray-50 border-gray-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block font-mono">Fare Method:</span>
                        <span className="text-xs font-black text-[#BE5912] bg-[#BE5912]/10 border border-orange-200 px-2 py-0.5 rounded-lg">
                          {activeRide.paymentMethod === 'transfer' ? 'Bank Transfer' : activeRide.paymentMethod === 'cash' ? 'Cash Payment' : 'Rider choosing...'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-[#BE5912]">₦{activeRide.cost}</span>
                    </div>

                    {activeRide.paymentMethod === 'transfer' && (
                      <div className="bg-white border border-gray-150 p-3 rounded-xl space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Rider Submitted:</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            activeRide.paymentConfirmedByRider 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {activeRide.paymentConfirmedByRider ? 'Transfer Sent (Rider Claim)' : 'Awaiting Transfer'}
                          </span>
                        </div>

                        {/* Driver confirmation block */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                          <span className="text-gray-500 font-medium">Driver Validation:</span>
                          {activeRide.paymentValidatedByDriver ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              ✓ Received & Confirmed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const confirmed = window.confirm(`Confirm you have received the ₦${activeRide.cost} bank transfer from ${activeRide.passengerName || 'the student'}?`);
                                if (confirmed) {
                                  const updated = {
                                    ...activeRide,
                                    paymentValidatedByDriver: true
                                  };
                                  onUpdateRide(updated);

                                  // Add system chat notification
                                  const chatId = activeRide.id;
                                  if (chatId) {
                                    const msg = {
                                      sender: 'System',
                                      text: `Driver ${driverProfile.name} has validated receipt of the ₦${activeRide.cost} bank transfer. Trip paid in full.`,
                                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                      isUser: false
                                    };
                                    const stored = localStorage.getItem(`campusride_chat_${chatId}`);
                                    const msgs = stored ? JSON.parse(stored) : [];
                                    localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify([...msgs, msg]));
                                  }

                                  onAddNotification({
                                    id: `notif-${Date.now()}`,
                                    title: 'Payment Received',
                                    message: `You validated the ₦${activeRide.cost} bank transfer from ${activeRide.passengerName}.`,
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    date: 'Today',
                                    isRead: false,
                                    type: 'success'
                                  });
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-3 py-1 rounded-xl cursor-pointer shadow-xs"
                            >
                              Confirm Receipt of Fund
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeRide.paymentMethod === 'cash' && (
                      <div className="bg-white border border-gray-150 p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Cash handover:</span>
                        {activeRide.paymentValidatedByDriver ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            ✓ Received
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(`Confirm that you have received physical cash of ₦${activeRide.cost} from ${activeRide.passengerName}?`);
                              if (confirmed) {
                                const updated = {
                                  ...activeRide,
                                  paymentValidatedByDriver: true
                                };
                                onUpdateRide(updated);

                                // Add system chat notification
                                const chatId = activeRide.id;
                                if (chatId) {
                                  const msg = {
                                    sender: 'System',
                                    text: `Driver ${driverProfile.name} has confirmed receiving the ₦${activeRide.cost} physical cash payment.`,
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    isUser: false
                                  };
                                  const stored = localStorage.getItem(`campusride_chat_${chatId}`);
                                  const msgs = stored ? JSON.parse(stored) : [];
                                  localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify([...msgs, msg]));
                                }

                                onAddNotification({
                                  id: `notif-${Date.now()}`,
                                  title: 'Cash Payment Received',
                                  message: `You confirmed receipt of ₦${activeRide.cost} in physical cash.`,
                                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  date: 'Today',
                                  isRead: false,
                                  type: 'success'
                                });
                              }
                            }}
                            className="bg-[#BE5912] hover:bg-[#BE5912]/90 text-white text-[10px] font-extrabold px-3 py-1 rounded-xl cursor-pointer"
                          >
                            Mark Cash Received
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pickup -> Destination Details route list */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-[#BE5912]/20 flex items-center justify-center text-[#BE5912] shrink-0 text-[10px] font-extrabold">A</div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">Pickup Spot Location</span>
                        <span className="text-xs font-bold text-[#BE5912]">{activeRide.pickup}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-700 shrink-0 text-[10px] font-extrabold font-mono">B</div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block font-mono">Destination Stop</span>
                        <span className="text-xs font-bold text-[#BE5912]">{activeRide.dropoff}</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Trip Status Controls */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 text-xs text-slate-700">
                    <h4 className="font-extrabold text-[#BE5912] mb-2 flex items-center">
                      <Car className="w-4 h-4 mr-1.5" />
                      Live Transit Operations
                    </h4>
                    <p className="text-[11px] text-[#737686] mb-3.5 leading-relaxed">
                      Log each transport milestone below to update the rider and coordinate dynamic registrar micro-transfers.
                    </p>

                    <button
                      onClick={advanceDriverTripStatus}
                      className={`w-full py-2.5 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-sm ${
                        activeRide.status === 'arriving' && !activeRide.riderPaid
                          ? 'bg-amber-500 hover:bg-amber-600 cursor-pointer'
                          : 'bg-[#BE5912] hover:bg-[#BE5912]/90 cursor-pointer'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-white shrink-0" />
                      <span>
                        {activeRide.status === 'accepted' && 'Mark Arrived at Pickup Stop'}
                        {activeRide.status === 'arriving' && (activeRide.riderPaid ? 'Start Boarding & Commute' : 'Waiting for Passenger Payment...')}
                        {activeRide.status === 'in_transit' && 'Conclude Ride & Receive Fare'}
                        {activeRide.status === 'completed' && 'Conclude & Return to Queue'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* INCOMING QUEUES (VISIBLE IF IDLE) */
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-[#BE5912]">Incoming Transit Invitations</h3>
                      <p className="text-xs text-gray-400">Student requests matched dynamically to your silver Toyota sedan.</p>
                    </div>
                    {!incomingRequest && (
                      <button 
                        onClick={refreshPassengerMatches}
                        className="text-xs text-[#BE5912] font-bold hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Requests</span>
                      </button>
                    )}
                  </div>

                  {!shiftOnline ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <h4 className="font-bold text-xs text-[#BE5912]">Offline Shift Mode Active</h4>
                      <p className="text-[11px] text-gray-500">Go Online in the top right to start receiving peer requests.</p>
                    </div>
                  ) : incomingRequest ? (
                    /* High-Fidelity Incoming request block card */
                    <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            referrerPolicy="no-referrer"
                            src={incomingRequest.passengerAvatar} 
                            alt="Student Sarah Photograph" 
                            className="w-10 h-10 rounded-full object-cover border border-[#c3c6d7]"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-[#BE5912]">{incomingRequest.passengerName}</h4>
                            <span className="text-[9px] bg-[#F9FAFB] text-[#BE5912] px-1.5 py-0.5 rounded font-bold font-mono">★ {incomingRequest.passengerRating} Star Rider</span>
                          </div>
                        </div>
                      </div>

                      {/* Route specs */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[9px] font-bold text-gray-400 font-mono block tracking-wider uppercase">Pickup Spot Campus</span>
                          <span className="font-bold text-[#BE5912] truncate block">{incomingRequest.pickup}</span>
                        </div>
                        <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[9px] font-bold text-gray-400 font-mono block tracking-wider uppercase">Destination Stop</span>
                          <span className="font-bold text-[#BE5912] truncate block">{incomingRequest.dropoff}</span>
                        </div>
                      </div>

                      {/* CTA Panel buttons */}
                      <div className="flex space-x-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={handleAcceptRide}
                          className="flex-1 py-2.5 bg-[#BE5912] hover:bg-[#BE5912]/90 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-md shadow-orange-500/10"
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
          </div>
        </motion.div>
      )}

        {/* RENDER VIEW: EARNINGS LEDGER */}
        {false && activeView === 'driver_earnings' && (
          <motion.div
            key="driver_earnings"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-driver-earnings"
            className="space-y-6"
          >
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#BE5912]">Shift Performance & Earnings</h3>
                <p className="text-xs text-gray-450 font-medium">Breakdown of credits reloads, carpool clean-energy incentives, and tips.</p>
              </div>

              <div className="bg-[#F9FAFB] text-[#BE5912] border border-[#BE5912]/30 px-4 py-2 rounded-xl text-xs font-bold leading-normal">
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
                <span className="text-xs bg-[#BE5912] text-white font-bold px-3 py-1 rounded-full">+12.5% vs Last Week</span>
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
                    <span className="text-[9px] font-mono text-orange-500 invisible group-hover:visible mb-1">₦{item.amt}</span>
                    <div 
                      className="w-full bg-[#BE5912] rounded-t-md transition-all group-hover:bg-amber-400 shadow-sm shadow-amber-900/10" 
                      style={{ height: `${Math.max(item.amt / 224 * 100, 5)}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 mt-2 font-mono">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

        {/* RENDER VIEW: SCHEDULED RIDES LIST */}
        {activeView === 'driver_scheduled' && (
          <motion.div
            key="driver_scheduled"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-driver-scheduled"
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-extrabold text-[#BE5912] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#BE5912]" /> Scheduled Rides Catalog
                </h2>
                <p className="text-xs text-gray-500">Claim upcoming student travel requests matching your shift boundaries in advance.</p>
              </div>

              {scheduledRides.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
                  <Calendar className="w-10 h-10 text-gray-300 mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 mb-1">No Scheduled Rides Found</h4>
                  <p className="text-xs text-gray-400 max-w-sm">When students book peer rides in advance, they will show up here for you to claim.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scheduledRides.map((ride) => (
                    <div key={ride.id} className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 font-mono">{ride.id}</span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                              {ride.mode === 'solo' ? 'Solo' : 'Pool'}
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#BE5912] font-mono">₦{ride.fare} Expected</span>
                        </div>

                        {/* Passenger Details */}
                        <div className="flex items-center gap-3">
                          <img 
                            referrerPolicy="no-referrer"
                            src={ride.passengerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                            alt={ride.passengerName} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <h4 className="text-xs font-black text-slate-800">{ride.passengerName || 'Student Companion'}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-amber-500">★</span>
                              <span className="text-[10px] text-slate-500 font-bold">{ride.passengerRating || '4.8'}</span>
                              <span className="text-[10px] text-slate-400">• Student</span>
                            </div>
                          </div>
                        </div>

                        {/* Route Map/Track layout */}
                        <div className="space-y-2 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                          <div className="relative">
                            <div className="absolute -left-[14px] top-1.5 w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pickup</span>
                            <span className="text-xs font-bold text-slate-700">{getStopName(ride.pickup)}</span>
                          </div>
                          <div className="relative">
                            <div className="absolute -left-[14px] top-1.5 w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Destination</span>
                            <span className="text-xs font-bold text-slate-700">{getStopName(ride.dropoff)}</span>
                          </div>
                        </div>

                        {/* Date Time info */}
                        <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-bold font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#BE5912]" /> {ride.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#BE5912]" /> {ride.time}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-gray-50">
                        <button
                          type="button"
                          onClick={() => handleClaimScheduledRide(ride)}
                          className="w-full h-11 bg-[#BE5912] text-white hover:bg-[#BE5912]/90 rounded-xl text-xs font-bold tracking-wide transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept & Start Scheduled Ride
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* RENDER VIEW: VEHICLES PRESET */}
        {activeView === 'driver_settings' && (
          <motion.div
            key="driver_settings"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-driver-settings"
            className="max-w-xl mx-auto bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6"
          >
          <div>
            <h2 className="text-lg font-extrabold text-[#BE5912]">Vehicle profile registries</h2>
            <p className="text-xs text-gray-400">Current car description records certified to complete campus rides.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] text-[#BE5912] flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">PRIMARY VEHICLE FILE</span>
                  <h4 className="text-sm font-bold text-[#BE5912]">Toyota Camry 2.5 Hybrid (Silver)</h4>
                  <p className="text-xs font-mono text-gray-500">License Plate Tag: 4P-928X • Decal VERIFIED</p>
                </div>
              </div>
              <span className="bg-[#BE5912]/10 text-[#BE5912] text-[10px] font-bold px-2.5 py-1 rounded border border-orange-200 font-mono">
                ACTIVE
              </span>
            </div>

            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between opacity-60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#BE5912]/10 text-[#BE5912] flex items-center justify-center">
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
                className="text-xs text-[#BE5912] font-bold hover:underline"
              >
                Set Active
              </button>
            </div>
          </div>

          {/* Trust-Transfer Bank Details Form */}
          <div className="pt-6 border-t border-gray-150 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#BE5912]">Trust-Transfer Payout Account</h3>
              <p className="text-xs text-gray-400">Specify the bank details displayed to riders when they choose to pay via direct transfer.</p>
            </div>

            <form onSubmit={handleSaveBankDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Access Bank Nigeria"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-[#BE5912]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Account Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2088392102"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    required
                    maxLength={10}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-[#BE5912]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Account Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. David Alao"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-[#BE5912]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingBank}
                  className="bg-[#BE5912] hover:bg-[#BE5912]/90 text-white font-bold py-2.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 animate-none"
                >
                  {savingBank ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Account...</span>
                    </>
                  ) : (
                    'Save Bank Details'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-gray-150 flex items-center justify-between">
            <div className="text-[11px] text-[#BE5912] bg-[#F9FAFB]/35 border border-amber-300 p-3 rounded-xl flex items-start space-x-1.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-[#BE5912] shrink-0 mt-0.5" />
              <span>
                Adding or modifying vehicle profiles is subject to a 24-hour verification window by Campus Transit administrators.
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* DRIVER NOTIFICATIONS INBOX */}
      {activeView === 'notifications' && (
        <motion.div
          key="notifications"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.05, ease: 'easeInOut' }}
          className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 text-slate-800"
        >
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-[#BE5912] tracking-tight uppercase">Driver Notification Inbox</h1>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  onMarkNotificationsRead?.();
                  alert('All messages marked as read.');
                }}
                className="text-xs text-[#BE5912] hover:underline font-bold cursor-pointer"
              >
                Mark all as read
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear your notification history?")) {
                    onClearNotifications?.();
                  }
                }}
                className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif, index) => (
                <div 
                  key={index} 
                  className={`p-5 rounded-2xl border transition-all text-left ${
                    notif.isRead 
                      ? 'bg-slate-50/50 border-slate-200 opacity-75' 
                      : 'bg-white border-slate-150 shadow-xs shadow-md ring-1 ring-orange-500/10'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 block leading-snug">{notif.title}</span>
                      <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 font-mono block pt-1">{notif.time}</span>
                    </div>
                    {!notif.isRead && (
                      <span className="bg-orange-100 text-orange-700 font-bold font-mono text-[9px] px-2 py-0.5 rounded-full uppercase shrink-0">New</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No notifications or alert updates. Check back later!
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* FLOATING MESSENGER-STYLE CHAT OVERLAY ON THE LEFT */}
      {(() => {
        if (!activeRide) return null;

        const counterPartyName = activeRide.passengerName || "Active Commuter";
        const counterPartyAvatar = activeRide.passengerAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80";

        return (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            className="fixed bottom-20 left-6 md:bottom-6 md:left-80 z-50 flex flex-col-reverse items-start select-none"
            style={{ touchAction: 'none' }}
            id="driver-floating-messenger-draggable-wrapper"
          >
            {/* 1. The Floating Circle Bubble (Messenger Style) */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsChatOverlayOpen(!isChatOverlayOpen)}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl border cursor-grab active:cursor-grabbing transition-colors duration-200 shrink-0 ${
                isChatOverlayOpen 
                  ? 'bg-rose-600 border-rose-500 hover:bg-rose-700' 
                  : 'bg-[#BE5912] border-orange-500/20 hover:bg-[#BE5912]/95'
              }`}
              style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)' }}
              id="driver-floating-messenger-bubble"
            >
              {isChatOverlayOpen ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <div className="relative">
                  <img 
                    src={counterPartyAvatar} 
                    alt={counterPartyName}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border-2 border-white"
                  />
                  {/* Pulsing indicator of active chat */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                </div>
              )}
              
              {/* Unread message count preview alert (simulated) */}
              {!isChatOverlayOpen && chatMessages.length > 0 && (
                <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[9px] font-black h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {chatMessages.length}
                </span>
              )}
            </motion.button>

            {/* 2. Expanded Floating Messenger Panel */}
            <AnimatePresence>
              {isChatOverlayOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 15 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="mb-3 w-[330px] sm:w-[360px] h-[450px] bg-white rounded-3xl shadow-2xl border border-slate-150 flex flex-col overflow-hidden select-text"
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
                  id="driver-floating-messenger-panel"
                >
                  {/* Header */}
                  <div className="p-4 bg-[#BE5912] text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative">
                        <img 
                          src={counterPartyAvatar} 
                          alt={counterPartyName} 
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-white/20"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black truncate max-w-[150px]">{counterPartyName}</h4>
                        <span className="text-[9px] text-white/85 uppercase tracking-wider font-mono font-bold block">
                          Active Trip Rider
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button 
                        onClick={() => setIsChatOverlayOpen(false)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/90 hover:text-white cursor-pointer"
                        title="Minimize"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Body - Message feed */}
                  <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3 flex flex-col">
                    {chatMessages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-[11px] text-slate-400">No messages yet. Message the rider about pickup!</p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMsgFromMe = msg.sender.includes('Driver') || msg.sender === driverProfile.name;
                        return (
                          <div 
                            key={idx} 
                            className={`max-w-[85%] flex flex-col ${
                              isMsgFromMe ? 'self-end items-end' : 'self-start items-start'
                            }`}
                          >
                            <div className="flex items-center space-x-1 mb-0.5 text-[9px] text-slate-400">
                              <span className="font-extrabold">{msg.sender}</span>
                              <span>•</span>
                              <span className="font-mono">{msg.time}</span>
                            </div>
                            <div className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed shadow-2xs ${
                              msg.sender === 'System' 
                                ? 'bg-orange-50 text-slate-600 border border-orange-100 italic text-center w-full font-mono'
                                : isMsgFromMe 
                                  ? 'bg-[#BE5912] text-white rounded-tr-none' 
                                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={floatingChatBottomRef} />
                  </div>

                  {/* Quick Replies Swiper Row */}
                  <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar">
                    {['Heading to pickup now', 'I have arrived', 'Traffic is light', 'Please verify your ID'].map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          sendQuickReply(phrase);
                          // Auto scroll bottom
                          setTimeout(() => {
                            floatingChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-[#BE5912] border border-slate-150 text-slate-500 hover:text-white rounded-lg text-[9px] font-bold transition-all shrink-0 cursor-pointer"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>

                  {/* Message Input form */}
                  <form 
                    onSubmit={(e) => {
                      handleSendMessage(e);
                      // Auto scroll bottom
                      setTimeout(() => {
                        floatingChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }} 
                    className="p-2.5 bg-white border-t border-slate-150 flex items-center space-x-2"
                  >
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#BE5912] focus:ring-1 focus:ring-[#BE5912]/20"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="p-2 bg-[#BE5912] hover:bg-[#BE5912]/90 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition duration-150 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })()}
    </div>
  );
};
