import React, { useState, useEffect, useRef } from 'react';
import { 
  UserProfile, 
  AppNotification, 
  Transaction, 
  RideRequest,
  RideStatus
} from '../types';
import { UNIVERSITIES } from './SchoolSelection';
import { 
  Car, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Users, 
  Wallet, 
  ArrowRightLeft, 
  TrendingUp, 
  CheckCircle, 
  Info, 
  Calendar, 
  Search, 
  Plus, 
  CreditCard, 
  ChevronRight, 
  Check, 
  BellRing,
  Award,
  ArrowUpRight,
  ShieldAlert,
  HelpCircle,
  Eye,
  Trash2,
  Send,
  Copy,
  MessageSquare,
  Shield,
  ThumbsUp,
  XCircle,
  UserCheck,
  Zap,
  Navigation,
  RefreshCw,
  Sparkles,
  Compass,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ActivePool {
  id: string;
  hostName: string;
  hostAvatar: string;
  hostMajor: string;
  hostRating: number;
  hostGender: string;
  pickupId: string;
  dropoffId: string;
  vehicleType: 'Car' | 'Keke' | 'Shuttle';
  currentRiders: { name: string; avatar: string; major: string; rating: number; gender: string }[];
  maxRiders: number;
  baseFare: number;
  status: 'active' | 'closed' | 'transit';
  driverAcceptCountdown?: number;
  driverAccepted?: boolean;
}

interface StudentPortalProps {
  activeView: string;
  userProfile: UserProfile;
  notifications: AppNotification[];
  transactions: Transaction[];
  activeRide: RideRequest | null;
  onNavigate: (view: string) => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onAddTransaction: (txn: Transaction) => void;
  onAddNotification: (notif: AppNotification) => void;
  onUpdateRide: (ride: RideRequest | null) => void;
  onMarkNotificationsRead: () => void;
  driverProfile?: any;
  onUpdateDriverProfile?: (updates: any) => void;
  selectedSchoolId?: string;
  onDeleteAccount?: () => void;
}

// Interface for dynamic pooling simulation
interface PoolMember {
  name: string;
  avatar: string;
  major: string;
  gender: string;
  rating: number;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  activeView,
  userProfile,
  notifications,
  transactions,
  activeRide,
  onNavigate,
  onUpdateProfile,
  onAddTransaction,
  onAddNotification,
  onUpdateRide,
  onMarkNotificationsRead,
  driverProfile,
  onUpdateDriverProfile,
  selectedSchoolId,
  onDeleteAccount,
}) => {
  // Current School Details
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const campusStops = selectedSchool.stops;

  // Booking details
  const [pickup, setPickup] = useState<string>('');
  const [dropoff, setDropoff] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'Car' | 'Keke' | 'Shuttle'>('Car');
  const [verifyPeer, setVerifyPeer] = useState<boolean>(true);
  const [bookingMode, setBookingMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [rideMode, setRideMode] = useState<'create' | 'find' | 'solo'>('create');
  const [scheduledRides, setScheduledRides] = useState<{
    id: string;
    pickup: string;
    dropoff: string;
    mode: 'create' | 'solo';
    date: string;
    time: string;
    vehicleType: string;
    fare: number;
  }[]>([]);

  const [activePools, setActivePools] = useState<ActivePool[]>([]);
  const [joinedPoolId, setJoinedPoolId] = useState<string | null>(null);
  const [browseFilterPickup, setBrowseFilterPickup] = useState<string>('all');
  const [browseFilterDropoff, setBrowseFilterDropoff] = useState<string>('all');
  const [browseFilterVehicle, setBrowseFilterVehicle] = useState<string>('all');

  // Countdown timer states
  const [driverTimer, setDriverTimer] = useState<number>(60);
  const [checkoutPool, setCheckoutPool] = useState<ActivePool | null>(null);
  const [checkoutTimer, setCheckoutTimer] = useState<number>(30);
  const [simulatedMatchTime, setSimulatedMatchTime] = useState<number>(15); // simulated driver accepts at 45s left (15s elapsed)
  
  // Initialize stops
  useEffect(() => {
    if (campusStops.length >= 2) {
      setPickup(campusStops[0].id);
      setDropoff(campusStops[1].id);
    }
  }, [selectedSchoolId]);

  // Initialize simulated active pools dynamically
  useEffect(() => {
    const stored = localStorage.getItem('campusride_active_pools');
    if (stored) {
      try {
        setActivePools(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing stored active pools", e);
      }
    } else if (campusStops && campusStops.length >= 4) {
      const initial: ActivePool[] = [];
      setActivePools(initial);
      localStorage.setItem('campusride_active_pools', JSON.stringify(initial));
    }
  }, [selectedSchoolId, campusStops]);

  // Set default currency symbol
  const currencySymbol = "₦";

  // Ride Pricing Multipliers & Tiers
  // Standard prices based on vehicle type
  const getBasePrice = () => {
    if (vehicleType === 'Car') return 350;
    if (vehicleType === 'Keke') return 200;
    return 100; // Shuttle Bus
  };

  const basePrice = getBasePrice();
  const priceTiers = {
    tier1: basePrice, // 1 rider
    tier2: Math.round(basePrice * 0.5), // 2 riders
    tier3: Math.round(basePrice * 0.33), // 3 riders
    tier4: Math.round(basePrice * 0.25), // 4 riders (full)
  };

  // Local state for interactive ride flow
  const [poolingState, setPoolingState] = useState<'idle' | 'forming' | 'matched' | 'transit' | 'arrived' | 'rated'>('idle');
  const [lobbyMembers, setLobbyMembers] = useState<PoolMember[]>([
    {
      name: userProfile.name || 'Temi Adeyemi',
      avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      major: 'Software Eng',
      gender: 'Female',
      rating: 4.8
    }
  ]);

  // Chat room state
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string; isUser: boolean }[]>([
    { sender: 'System', text: 'You created a live pool. Seating occupancy: 1/4. Pricing tier: ' + currencySymbol + priceTiers.tier1 + '/seat.', time: '11:15 AM', isUser: false },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live simulation states
  const [simStep, setSimStep] = useState<number>(0);
  const [liveDistance, setLiveDistance] = useState<number>(0); // 0 to 100% of route
  const [etaRemaining, setEtaRemaining] = useState<number>(5);
  const [verificationCode] = useState<string>(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sosActivated, setSosActivated] = useState<boolean>(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [tripCompleted, setTripCompleted] = useState<boolean>(false);

  // Top Up Wallet States
  const [fundAmount, setFundAmount] = useState<number>(1000);
  const [customFundAmount, setCustomFundAmount] = useState<string>('');
  const [showPaystackPopup, setShowPaystackPopup] = useState<boolean>(false);
  const [paystackCard, setPaystackCard] = useState<string>('');
  const [paystackExpiry, setPaystackExpiry] = useState<string>('');
  const [paystackCvv, setPaystackCvv] = useState<string>('');
  const [paystackLoading, setPaystackLoading] = useState<boolean>(false);
  const [transferCopied, setTransferCopied] = useState<boolean>(false);

  // Settings Toggles
  const [safetySharing, setSafetySharing] = useState<boolean>(true);
  const [sameGenderOnly, setSameGenderOnly] = useState<boolean>(false);
  const [lowBalanceAlert, setLowBalanceAlert] = useState<boolean>(true);

  // Helper to resolve stop name from ID
  const getStopName = (stopId: string) => {
    const stop = campusStops.find(s => s.id === stopId);
    return stop ? stop.name : stopId;
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, poolingState]);

  // Simulated live driver pool forming action loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (poolingState === 'forming') {
      const simulatedRiders: PoolMember[] = [
        { name: 'Adeola S.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', major: 'Microbiology', gender: 'Female', rating: 4.7 },
        { name: 'Chinedu O.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', major: 'Economics', gender: 'Male', rating: 4.9 },
        { name: 'Sarah M.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', major: 'Mass Comm', gender: 'Female', rating: 4.6 }
      ];

      // Step-by-step pool members joining
      timer = setTimeout(() => {
        if (lobbyMembers.length === 1) {
          // Add first rider
          const rider = simulatedRiders[0];
          setLobbyMembers(prev => [...prev, rider]);
          setChatMessages(prev => [...prev, 
            { sender: rider.name, text: 'Hey guys! Super glad I found this pool.', time: '11:16 AM', isUser: false },
            { sender: 'System', text: `${rider.name} joined. Seating: 2/4. Price dropped to ${currencySymbol}${priceTiers.tier2}/seat.`, time: '11:16 AM', isUser: false }
          ]);
          onAddNotification({
            id: `notif-${Date.now()}`,
            title: 'Pool Expansion',
            message: `${rider.name} joined your ride pool to ${getStopName(dropoff)}. Fair split initialized!`,
            time: '11:16 AM',
            date: 'Today',
            isRead: false,
            type: 'info'
          });
          setSimStep(1);
        } else if (lobbyMembers.length === 2) {
          // Add second rider
          const rider = simulatedRiders[1];
          setLobbyMembers(prev => [...prev, rider]);
          setChatMessages(prev => [...prev, 
            { sender: rider.name, text: 'Heading to classes? Mind if I hop in?', time: '11:17 AM', isUser: false },
            { sender: 'System', text: `${rider.name} joined. Seating: 3/4. Price dropped to ${currencySymbol}${priceTiers.tier3}/seat.`, time: '11:17 AM', isUser: false }
          ]);
          setSimStep(2);
        } else if (lobbyMembers.length === 3) {
          // Add third rider (full!)
          const rider = simulatedRiders[2];
          setLobbyMembers(prev => [...prev, rider]);
          setChatMessages(prev => [...prev, 
            { sender: rider.name, text: 'Awesome, last seat is mine! Let’s request driver.', time: '11:18 AM', isUser: false },
            { sender: 'System', text: `Pool is FULL (4/4). Price dropped to ${currencySymbol}${priceTiers.tier4}/seat! Match initialized.`, time: '11:18 AM', isUser: false }
          ]);
          setSimStep(3);

          // Transition to matched with driver in 4 seconds
          setTimeout(() => {
            setPoolingState('matched');
            setChatMessages(prev => [...prev, {
              sender: 'David Alao (Driver)',
              text: 'Hello everyone! I am driving the silver Toyota Corolla. Arriving in 2 minutes.',
              time: '11:19 AM',
              isUser: false
            }]);
            onAddNotification({
              id: `notif-${Date.now()}`,
              title: 'Driver Matched!',
              message: 'David Alao (4.9★) has accepted your pool request. Use Verification PIN to board.',
              time: '11:19 AM',
              date: 'Today',
              isRead: false,
              type: 'success'
            });
          }, 3500);
        }
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [poolingState, lobbyMembers]);

  // Master countdown timer effect (runs every 1 second)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // We run the interval if the user is in forming lobby, confirming checkout, or if there are active pools
    if (poolingState === 'forming' || checkoutPool || activePools.some(p => p.status === 'active')) {
      interval = setInterval(() => {
        // 1. Tick driver timer for active user in lobby
        if (poolingState === 'forming') {
          setDriverTimer(prev => {
            if (prev <= 1) {
              // Timer expired before match! Cancel pool.
              setTimeout(() => {
                handleResetPool();
                alert("Match Request Expired: No driver accepted your ride pool within the 60-second window. The pool request has been automatically cancelled.");
              }, 0);
              return 60;
            }
            return prev - 1;
          });
        }

        // 2. Tick checkout timer for confirmation modal
        if (checkoutPool) {
          setCheckoutTimer(prev => {
            if (prev <= 1) {
              setCheckoutPool(null);
              alert("Seat join reservation window expired! Please try joining again.");
              return 30;
            }
            return prev - 1;
          });
        }

        // 3. Tick down driverAcceptCountdown for ALL active pools in background
        setActivePools(prevPools => {
          let hasChange = false;
          const updated = prevPools.map(pool => {
            if (pool.status === 'active') {
              const currentCountdown = pool.driverAcceptCountdown !== undefined ? pool.driverAcceptCountdown : 60;
              if (currentCountdown <= 1) {
                hasChange = true;
                return { ...pool, status: 'closed' as const, driverAcceptCountdown: 0 };
              }
              hasChange = true;
              return { ...pool, driverAcceptCountdown: currentCountdown - 1 };
            }
            return pool;
          }).filter(pool => pool.status === 'active' && (pool.driverAcceptCountdown === undefined || pool.driverAcceptCountdown > 0));

          if (hasChange) {
            localStorage.setItem('campusride_active_pools', JSON.stringify(updated));
          }
          return updated;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [poolingState, checkoutPool, activePools.length]);

  // Reset driver timer to 60 when starting a new forming lobby
  useEffect(() => {
    if (poolingState === 'forming') {
      setDriverTimer(60);
    }
  }, [poolingState]);

  // Live path/trip progress simulation
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    if (poolingState === 'transit') {
      progressInterval = setInterval(() => {
        setLiveDistance(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setPoolingState('arrived');
            // Complete ride transaction
            const finalFare = Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1']);
            onUpdateProfile({
              walletBalance: Math.max(0, userProfile.walletBalance - finalFare),
              tripsThisWeek: userProfile.tripsThisWeek + 1,
              savedThisMonth: userProfile.savedThisMonth + (basePrice - finalFare)
            });
            onAddTransaction({
              id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
              description: `Split Ride: ${getStopName(pickup)} ➔ ${getStopName(dropoff)}`,
              amount: finalFare,
              date: 'Today',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'Digital Wallet Split',
              type: 'charge',
              status: 'Completed'
            });
            onAddNotification({
              id: `notif-${Date.now()}`,
              title: 'Arrived at Destination!',
              message: `You split the fare. paid ${currencySymbol}${finalFare} instead of ${currencySymbol}${basePrice}. Saved ${currencySymbol}${basePrice - finalFare}!`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: 'Today',
              isRead: false,
              type: 'receipt'
            });
            return 100;
          }
          const nextDist = prev + 5;
          setEtaRemaining(Math.max(1, Math.round((5 * (100 - nextDist)) / 100)));
          return nextDist;
        });
      }, 1000);
    }
    return () => clearInterval(progressInterval);
  }, [poolingState]);

  // Submit Request / Create Pool
  const handleRequestPool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) {
      alert('Please specify your pickup and destination stops.');
      return;
    }
    if (pickup === dropoff) {
      alert('Pickup and dropoff locations cannot be identical.');
      return;
    }

    const calculatedFare = priceTiers.tier1; // starting fare
    if (userProfile.walletBalance < calculatedFare) {
      alert(`Insufficient funds. This ride starts at ${currencySymbol}${calculatedFare}. Please top up your wallet.`);
      onNavigate('payments');
      return;
    }

    if (bookingMode === 'schedule') {
      if (!scheduledDate || !scheduledTime) {
        alert('Please specify both scheduled date and time.');
        return;
      }
      
      const newSchedule = {
        id: `SCH-${Math.floor(100000 + Math.random() * 900000)}`,
        pickup,
        dropoff,
        mode: rideMode === 'solo' ? ('solo' as const) : ('create' as const),
        date: scheduledDate,
        time: scheduledTime,
        vehicleType,
        fare: rideMode === 'solo' ? basePrice : priceTiers.tier4,
      };

      setScheduledRides(prev => [newSchedule, ...prev]);
      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Ride Scheduled Successfully!',
        message: `Your ${rideMode === 'solo' ? 'Solo' : 'Pool'} ride from ${getStopName(pickup)} to ${getStopName(dropoff)} has been scheduled for ${scheduledDate} at ${scheduledTime}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
        isRead: false,
        type: 'success'
      });
      
      alert(`Success! Your ride has been scheduled for ${scheduledDate} at ${scheduledTime}.`);
      setScheduledDate('');
      setScheduledTime('');
      return;
    }

    // Book now flow
    if (rideMode === 'solo') {
      // Direct solo booking - skip pool lobby forming
      setLobbyMembers([
        {
          name: userProfile.name || 'Temi Adeyemi',
          avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          major: 'Software Eng',
          gender: 'Female',
          rating: 4.8
        }
      ]);
      setChatMessages([
        { sender: 'System', text: `Solo booking initiated. Route: ${getStopName(pickup)} ➔ ${getStopName(dropoff)}. Matching you with a driver directly...`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
      ]);
      setPoolingState('forming');
      
      // Instantly match after 1.5 seconds since it's solo!
      setTimeout(() => {
        setPoolingState('matched');
        setChatMessages(prev => [...prev, {
          sender: 'David Alao (Driver)',
          text: 'Hello! I accepted your Solo Ride request. Heading to your pickup location now. ETA: 2 minutes.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: false
        }]);
        onAddNotification({
          id: `notif-${Date.now()}`,
          title: 'Solo Driver Matched!',
          message: 'David Alao (4.9★) has accepted your solo request. Boarding PIN is ready.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: 'Today',
          isRead: false,
          type: 'success'
        });
      }, 1500);
    } else {
      // Create pool flow (standard pool lobby search)
      const newPoolId = `POOL-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPool: ActivePool = {
        id: newPoolId,
        hostName: userProfile.name || 'Temi Adeyemi',
        hostAvatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        hostMajor: userProfile.major || 'B.S. Software Engineering',
        hostRating: 4.8,
        hostGender: 'Female',
        pickupId: pickup,
        dropoffId: dropoff,
        vehicleType: vehicleType,
        currentRiders: [
          {
            name: userProfile.name || 'Temi Adeyemi',
            avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            major: userProfile.major || 'Software Eng',
            rating: 4.8,
            gender: 'Female'
          }
        ],
        maxRiders: 4,
        baseFare: basePrice,
        status: 'active',
        driverAcceptCountdown: 60,
        driverAccepted: false
      };

      const updatedPools = [newPool, ...activePools];
      setActivePools(updatedPools);
      localStorage.setItem('campusride_active_pools', JSON.stringify(updatedPools));
      setJoinedPoolId(newPoolId);

      setLobbyMembers(newPool.currentRiders);
      setChatMessages([
        { sender: 'System', text: `You initiated a live pool. Route: ${getStopName(pickup)} ➔ ${getStopName(dropoff)}. Looking for companions...`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
      ]);
      setPoolingState('forming');
    }
  };

  // Chat message submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, {
      sender: userProfile.name || 'Me',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true
    }]);
    setChatInput('');
  };

  // Quick reply messages
  const sendQuickReply = (text: string) => {
    setChatMessages(prev => [...prev, {
      sender: userProfile.name || 'Me',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true
    }]);
  };

  // Trigger driver transit start
  const handleStartTransit = () => {
    setPoolingState('matched');
    setChatMessages(prev => [...prev, {
      sender: 'David Alao (Driver)',
      text: 'Hello everyone! I accepted your pool request. Heading to your pickup location now. ETA: 2 minutes.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    }]);
    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Driver Matched!',
      message: 'David Alao (4.9★) has accepted your pool request. Use Verification PIN to board.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'success'
    });
  };

  // Reset pooling flow
  const handleResetPool = () => {
    if (joinedPoolId) {
      const updated = activePools.map(pool => {
        if (pool.id === joinedPoolId) {
          const filteredRiders = pool.currentRiders.filter(r => r.name !== (userProfile.name || 'Temi Adeyemi'));
          return {
            ...pool,
            currentRiders: filteredRiders,
            status: filteredRiders.length === 0 ? 'closed' : pool.status
          };
        }
        return pool;
      }).filter(pool => pool.currentRiders.length > 0);
      
      setActivePools(updated);
      localStorage.setItem('campusride_active_pools', JSON.stringify(updated));
      setJoinedPoolId(null);
    }
    setPoolingState('idle');
    setLobbyMembers([]);
    setLiveDistance(0);
  };

  // Delete a pool created by the user
  const handleDeletePool = (poolId: string) => {
    if (!confirm('Are you sure you want to delete this ride pool you created? This will cancel the lobby for all joined members.')) {
      return;
    }
    
    const updated = activePools.filter(p => p.id !== poolId);
    setActivePools(updated);
    localStorage.setItem('campusride_active_pools', JSON.stringify(updated));

    if (joinedPoolId === poolId) {
      setJoinedPoolId(null);
      setPoolingState('idle');
      setLobbyMembers([]);
      setLiveDistance(0);
    }

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Pool Deleted',
      message: `You successfully deleted the ride pool (${poolId}) you created.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'warning'
    });

    alert('Ride pool deleted successfully.');
  };

  // Leave a pool joined by the user
  const handleLeavePool = (poolId: string) => {
    if (!confirm('Are you sure you want to leave this ride pool?')) {
      return;
    }

    const updated = activePools.map(pool => {
      if (pool.id === poolId) {
        const filteredRiders = pool.currentRiders.filter(r => r.name !== (userProfile.name || 'Temi Adeyemi'));
        return {
          ...pool,
          currentRiders: filteredRiders,
          status: filteredRiders.length === 0 ? 'closed' : pool.status as 'active' | 'closed' | 'transit'
        };
      }
      return pool;
    }).filter(pool => pool.currentRiders.length > 0);

    setActivePools(updated);
    localStorage.setItem('campusride_active_pools', JSON.stringify(updated));

    if (joinedPoolId === poolId) {
      setJoinedPoolId(null);
      setPoolingState('idle');
      setLobbyMembers([]);
      setLiveDistance(0);
    }

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Left Pool',
      message: `You have successfully left the ride pool.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'info'
    });

    alert('You have successfully left the ride pool.');
  };

  // Cancel an active ride (solo or pool)
  const handleCancelRide = () => {
    if (!confirm('Are you sure you want to cancel your active ride?')) {
      return;
    }

    if (joinedPoolId) {
      const updated = activePools.map(pool => {
        if (pool.id === joinedPoolId) {
          const filteredRiders = pool.currentRiders.filter(r => r.name !== (userProfile.name || 'Temi Adeyemi'));
          return {
            ...pool,
            currentRiders: filteredRiders,
            status: filteredRiders.length === 0 ? 'closed' : pool.status as 'active' | 'closed' | 'transit'
          };
        }
        return pool;
      }).filter(pool => pool.currentRiders.length > 0);

      setActivePools(updated);
      localStorage.setItem('campusride_active_pools', JSON.stringify(updated));
    }

    setJoinedPoolId(null);
    setPoolingState('idle');
    setLobbyMembers([]);
    setLiveDistance(0);

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Ride Cancelled',
      message: 'Your active ride has been successfully cancelled.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'warning'
    });

    alert('Your ride has been successfully cancelled.');
  };

  // Join existing pool handler
  const handleJoinPool = (pool: ActivePool) => {
    if (poolingState !== 'idle') {
      alert("You are already in an active ride or pool lobby! Please complete or cancel your current trip before joining another pool.");
      return;
    }

    if (pool.status === 'closed' || pool.currentRiders.length >= pool.maxRiders) {
      alert("This pool is full and has been closed.");
      return;
    }

    // Calculate split price for new rider count
    const newRiderCount = pool.currentRiders.length + 1;
    const poolVehicleType = pool.vehicleType;
    let baseF = 350;
    if (poolVehicleType === 'Car') baseF = 350;
    else if (poolVehicleType === 'Keke') baseF = 200;
    else baseF = 100;

    let tierPriceMultiplier = 1;
    if (newRiderCount === 2) tierPriceMultiplier = 0.5;
    else if (newRiderCount === 3) tierPriceMultiplier = 0.33;
    else if (newRiderCount === 4) tierPriceMultiplier = 0.25;

    const finalJoinFare = Math.round(baseF * tierPriceMultiplier);

    if (userProfile.walletBalance < finalJoinFare) {
      alert(`Insufficient balance. Joining this pool requires at least ${currencySymbol}${finalJoinFare}. Please fund your wallet first.`);
      onNavigate('payments');
      return;
    }

    const newUserRider = {
      name: userProfile.name || 'Temi Adeyemi',
      avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      major: userProfile.major || 'Software Eng',
      rating: 4.8,
      gender: 'Female'
    };

    const updatedRiders = [...pool.currentRiders, newUserRider];
    const isClosedNow = updatedRiders.length >= pool.maxRiders;

    const updatedPools = activePools.map(p => {
      if (p.id === pool.id) {
        return {
          ...p,
          currentRiders: updatedRiders,
          status: isClosedNow ? 'closed' : p.status as 'active' | 'closed' | 'transit'
        };
      }
      return p;
    });

    setActivePools(updatedPools);
    localStorage.setItem('campusride_active_pools', JSON.stringify(updatedPools));
    setJoinedPoolId(pool.id);

    setPickup(pool.pickupId);
    setDropoff(pool.dropoffId);
    setVehicleType(pool.vehicleType);
    setLobbyMembers(updatedRiders);
    setChatMessages([
      { sender: 'System', text: `You joined ${pool.hostName}'s pool! Route: ${getStopName(pool.pickupId)} ➔ ${getStopName(pool.dropoffId)}. Currently sharing with ${updatedRiders.length} companions. Current Split Fare: ${currencySymbol}${finalJoinFare}/seat.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
    ]);
    setPoolingState('forming');

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Successfully Joined Pool!',
      message: `You successfully joined ${pool.hostName}'s pool from ${getStopName(pool.pickupId)} to ${getStopName(pool.dropoffId)}. Estimated split fare is ${currencySymbol}${finalJoinFare}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'success'
    });

    alert(`Successfully joined ${pool.hostName}'s pool! Redirecting to the Live forming lobby...`);
    onNavigate('booking');
  };

  // Complete Rating
  const handleRateSubmit = () => {
    setPoolingState('idle');
    alert('Thank you for rating your ride! Your split savings have been recorded.');
  };

  // Wallet Funding handler
  const triggerTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(customFundAmount) || fundAmount;
    if (finalAmount <= 0) {
      alert('Please enter a valid amount to top up.');
      return;
    }
    setPaystackLoading(true);
    setTimeout(() => {
      onUpdateProfile({
        walletBalance: userProfile.walletBalance + finalAmount
      });
      onAddTransaction({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        description: 'Wallet Refilled (Paystack Unified Card)',
        amount: finalAmount,
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: 'Paystack Integrated Gateway',
        type: 'reload',
        status: 'Completed'
      });
      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Wallet Top Up Successful!',
        message: `Your balance has been credited with ${currencySymbol}${finalAmount} via Card/Transfer checkout.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
        isRead: false,
        type: 'success'
      });
      setPaystackLoading(false);
      setShowPaystackPopup(false);
      setCustomFundAmount('');
      alert(`Success! Refilled wallet with ${currencySymbol}${finalAmount}.`);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 text-white overflow-y-auto">
      <AnimatePresence mode="wait">
        
        {/* 1. VIEW CONTEXT: RIDE BOOKING / LOBBY / TRANSIT (ACTIVE VIEW = BOOKING) */}
        {activeView === 'booking' && (
          <motion.div
            key="booking"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 lg:p-8"
          >
          
          {/* LEFT SIDE OR MAIN BOOKING SECTION (7 COLS ON LARGE) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            


            {/* IF IDLE, RENDER BOOKING FORM */}
            {poolingState === 'idle' && (
              <>
                {/* Main Form Booking details */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black tracking-tight text-[#175D39] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#175D39]" /> BOOK OR SCHEDULE A RIDE
                    </h2>
                    
                    {/* Schedule vs Now Selector */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBookingMode('now')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          bookingMode === 'now'
                            ? 'bg-[#175D39] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Book Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode('schedule')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          bookingMode === 'schedule'
                            ? 'bg-[#175D39] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Schedule Ride
                      </button>
                    </div>
                  </div>
                  
                  <form onSubmit={handleRequestPool} className="space-y-5">
                    {/* Location Choice Section */}
                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pickup Spot Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pickup Spot</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#175D39]" />
                          <select
                            value={pickup}
                            onChange={(e) => setPickup(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-150 shadow-xs hover:border-[#175D39] text-slate-800 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#175D39]/50 appearance-none cursor-pointer"
                          >
                            {campusStops.map((stop) => (
                              <option key={stop.id} value={stop.id} className="bg-white text-slate-800">
                                {stop.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Swap Button inside layout */}
                      <div className="hidden md:flex absolute left-1/2 top-[32px] -translate-x-1/2 -translate-y-1/2 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            const temp = pickup;
                            setPickup(dropoff);
                            setDropoff(temp);
                          }}
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md hover:border-[#175D39] text-[#175D39] flex items-center justify-center cursor-pointer transition-colors"
                          title="Swap Route"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropoff Spot Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Destination Stop</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#175D39]" />
                          <select
                            value={dropoff}
                            onChange={(e) => setDropoff(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-150 shadow-xs hover:border-[#175D39] text-slate-800 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#175D39]/50 appearance-none cursor-pointer"
                          >
                            {campusStops.map((stop) => (
                              <option key={stop.id} value={stop.id} className="bg-white text-slate-800">
                                {stop.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Date & Time inputs if bookingMode is schedule */}
                    {bookingMode === 'schedule' && (
                      <div className="grid grid-cols-2 gap-3 p-4 bg-[#F2F2F2] rounded-2xl border border-slate-200 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#175D39]" />
                            <input
                              type="date"
                              required
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#175D39]"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Time</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#175D39]" />
                            <input
                              type="time"
                              required
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#175D39]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Choose Mode tab selection: Create a Pool vs Go Solo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ride Mode Choice</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setRideMode('create')}
                          className={`py-3 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                            rideMode === 'create'
                              ? 'bg-[#175D39] text-white shadow-md'
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          <span>Create Pool</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRideMode('solo')}
                          className={`py-3 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                            rideMode === 'solo'
                              ? 'bg-[#175D39] text-white shadow-md'
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                          }`}
                        >
                          <Car className="w-4 h-4" />
                          <span>Go Solo</span>
                        </button>
                      </div>
                    </div>

                    {/* Option 1: CREATE POOL VIEW DETAILS */}
                    {rideMode === 'create' && (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Vehicle Type Select */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Transit Vibe</label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setVehicleType('Car')}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                vehicleType === 'Car' 
                                  ? 'bg-slate-100 border-[#175D39] text-[#175D39] shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                              }`}
                            >
                              <Car className="w-6 h-6 stroke-[2]" />
                              <span className="text-xs font-bold">Car (Fast)</span>
                              <span className="text-[10px] font-mono text-slate-500">From {currencySymbol}350</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setVehicleType('Keke')}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                vehicleType === 'Keke' 
                                  ? 'bg-slate-100 border-[#175D39] text-[#175D39] shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                              }`}
                            >
                              <Zap className="w-6 h-6 stroke-[2]" />
                              <span className="text-xs font-bold">Keke (Vibe)</span>
                              <span className="text-[10px] font-mono text-slate-500">From {currencySymbol}200</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setVehicleType('Shuttle')}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                vehicleType === 'Shuttle' 
                                  ? 'bg-slate-100 border-[#175D39] text-[#175D39] shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                              }`}
                            >
                              <Users className="w-6 h-6 stroke-[2]" />
                              <span className="text-xs font-bold">Shuttle Bus</span>
                              <span className="text-[10px] font-mono text-slate-500">From {currencySymbol}100</span>
                            </button>
                          </div>
                        </div>

                        {/* Advanced Pooling Tiers display */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dynamic Pooling Tiers</span>
                            <span className="text-[10px] font-mono text-slate-500">SPLIT COST AS OTHERS JOIN</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-slate-100/40 p-2 rounded-xl border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-bold block mb-0.5">1 Rider</span>
                              <span className="text-sm font-mono font-black text-slate-800">{currencySymbol}{priceTiers.tier1}</span>
                            </div>
                            <div className="bg-slate-100/40 p-2 rounded-xl border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-bold block mb-0.5">2 Riders</span>
                              <span className="text-sm font-mono font-black text-slate-800">{currencySymbol}{priceTiers.tier2}</span>
                            </div>
                            <div className="bg-slate-100/40 p-2 rounded-xl border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-bold block mb-0.5">3 Riders</span>
                              <span className="text-sm font-mono font-black text-slate-800">{currencySymbol}{priceTiers.tier3}</span>
                            </div>
                            <div className="bg-[#175D39]/10 p-2 rounded-xl border border-[#175D39]/40 ring-1 ring-[#175D39]/20">
                              <span className="text-[10px] text-[#175D39] font-extrabold block mb-0.5 flex items-center justify-center gap-0.5">
                                4 Full <span className="w-1.5 h-1.5 rounded-full bg-[#175D39] animate-pulse"></span>
                              </span>
                              <span className="text-sm font-mono font-black text-[#175D39]">{currencySymbol}{priceTiers.tier4}</span>
                            </div>
                          </div>
                        </div>

                        {/* Toggle safety companions option */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-[#175D39]/15 flex items-center justify-center border border-[#175D39]/30">
                              <ShieldCheck className="w-5 h-5 text-[#175D39]" />
                            </div>
                            <div>
                              <span className="text-xs font-bold block text-slate-800">Safe Student Peer Matching</span>
                              <span className="text-[10px] text-slate-500 block">Only match with active university verified students</span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={verifyPeer} 
                              onChange={() => setVerifyPeer(!verifyPeer)} 
                              className="sr-only peer" 
                            />
                            <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#175D39]"></div>
                          </label>
                        </div>

                        {/* CTA button */}
                        <button
                          type="submit"
                          className="w-full bg-[#175D39] hover:bg-[#175D39]/90 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all transform active:scale-[0.99] duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                          <Users className="w-5 h-5" />
                          {bookingMode === 'schedule' ? 'Schedule Pool Ride' : 'Form Live Ride Pool'}
                        </button>
                      </div>
                    )}

                    {/* Option 2: FIND POOL VIEW DETAILS */}
                    {rideMode === 'find' && (
                      <div className="space-y-4 animate-fadeIn text-left">
                        <div className="bg-[#F2F2F2] p-4 rounded-2xl border border-slate-200">
                          <p className="text-xs font-bold text-[#175D39] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                            <Search className="w-4 h-4" /> Available Pools Headed Your Way
                          </p>
                          <p className="text-[10px] text-slate-500">Join an existing campus ride pool to instantly slash your travel expenses today.</p>
                        </div>

                        <div className="space-y-3">
                          {[
                            { id: 'pool-sim-1', host: 'Tunde Bakare', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', pickup: getStopName(pickup), dropoff: getStopName(dropoff), seats: 2, maxSeats: 4, fare: priceTiers.tier2, vehicleType: 'Car', major: 'Electrical Eng', rating: 4.8 },
                            { id: 'pool-sim-2', host: 'Amina Yusuf', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', pickup: getStopName(pickup), dropoff: getStopName(dropoff), seats: 3, maxSeats: 4, fare: priceTiers.tier3, vehicleType: 'Keke', major: 'Economics', rating: 4.9 },
                            { id: 'pool-sim-3', host: 'Emeka Obi', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', pickup: getStopName(pickup), dropoff: getStopName(dropoff), seats: 1, maxSeats: 4, fare: priceTiers.tier1, vehicleType: 'Shuttle', major: 'Mass Comm', rating: 4.6 }
                          ].map((simPool) => (
                            <div key={simPool.id} className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                              <div className="flex items-center space-x-3">
                                <img 
                                  referrerPolicy="no-referrer"
                                  src={simPool.avatar} 
                                  alt={simPool.host} 
                                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-xs shadow-sm"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-slate-800">{simPool.host}</span>
                                    <span className="text-[9px] bg-[#175D39]/10 text-[#175D39] px-1.5 py-0.5 rounded-md font-bold">★ {simPool.rating}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium font-sans">{simPool.major} • heading to {simPool.dropoff}</p>
                                  <p className="text-[10px] text-slate-500 font-bold font-mono uppercase mt-0.5 text-slate-600">{simPool.vehicleType} Vehicle</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Est. Cost</span>
                                  <span className="text-sm font-mono font-black text-[#175D39]">{currencySymbol}{simPool.fare}/seat</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (userProfile.walletBalance < simPool.fare) {
                                      alert(`Insufficient funds. You need ${currencySymbol}${simPool.fare} to join this pool.`);
                                      onNavigate('payments');
                                      return;
                                    }
                                    
                                    const poolObj: ActivePool = {
                                      id: simPool.id,
                                      hostName: simPool.host,
                                      hostAvatar: simPool.avatar,
                                      hostMajor: simPool.major,
                                      hostRating: simPool.rating,
                                      hostGender: 'Verified Student',
                                      pickupId: pickup,
                                      dropoffId: dropoff,
                                      vehicleType: simPool.vehicleType as 'Car' | 'Keke' | 'Shuttle',
                                      currentRiders: [
                                        {
                                          name: simPool.host,
                                          avatar: simPool.avatar,
                                          major: simPool.major,
                                          gender: 'Verified Student',
                                          rating: simPool.rating
                                        }
                                      ],
                                      maxRiders: 4,
                                      baseFare: simPool.vehicleType === 'Car' ? 350 : simPool.vehicleType === 'Keke' ? 200 : 100,
                                      status: 'active',
                                      driverAcceptCountdown: 60,
                                      driverAccepted: false
                                    };
                                    setCheckoutPool(poolObj);
                                    setCheckoutTimer(30);
                                  }}
                                  className="bg-[#175D39] hover:bg-[#175D39]/95 text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer shadow-sm transition-colors"
                                >
                                  Join Pool
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Option 3: GO SOLO VIEW DETAILS */}
                    {rideMode === 'solo' && (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Vehicle Type Select */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Solo Transit</label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setVehicleType('Car')}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                vehicleType === 'Car' 
                                  ? 'bg-slate-100 border-[#175D39] text-[#175D39] shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                              }`}
                            >
                              <Car className="w-6 h-6 stroke-[2]" />
                              <span className="text-xs font-bold">Solo Car</span>
                              <span className="text-[10px] font-mono text-slate-500">{currencySymbol}{basePrice}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setVehicleType('Keke')}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                vehicleType === 'Keke' 
                                  ? 'bg-slate-100 border-[#175D39] text-[#175D39] shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                              }`}
                            >
                              <Zap className="w-6 h-6 stroke-[2]" />
                              <span className="text-xs font-bold">Solo Keke</span>
                              <span className="text-[10px] font-mono text-slate-500">{currencySymbol}{basePrice}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setVehicleType('Shuttle')}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                vehicleType === 'Shuttle' 
                                  ? 'bg-slate-100 border-[#175D39] text-[#175D39] shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                              }`}
                            >
                              <Users className="w-6 h-6 stroke-[2]" />
                              <span className="text-xs font-bold">Solo Shuttle</span>
                              <span className="text-[10px] font-mono text-slate-500">{currencySymbol}{basePrice}</span>
                            </button>
                          </div>
                        </div>

                        {/* Flat Fare Receipt preview */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-600 uppercase block tracking-wider">Direct Solo Fare</span>
                            <span className="text-[10px] text-slate-500">No companions, straight direct delivery.</span>
                          </div>
                          <span className="text-lg font-mono font-black text-slate-800">{currencySymbol}{basePrice}</span>
                        </div>

                        {/* Solo CTA Button */}
                        <button
                          type="submit"
                          className="w-full bg-[#175D39] hover:bg-[#175D39]/90 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all transform active:scale-[0.99] duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                          <Car className="w-5 h-5" />
                          {bookingMode === 'schedule' ? 'Schedule Solo Ride' : 'Book Direct Solo Ride'}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Scheduled rides section if any exist */}
                {scheduledRides.length > 0 && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs space-y-4 animate-fadeIn text-left">
                    <h3 className="text-sm font-black text-[#175D39] uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4.5 h-4.5" /> Your Scheduled Rides ({scheduledRides.length})
                    </h3>

                    <div className="space-y-2.5">
                      {scheduledRides.map((ride) => (
                        <div key={ride.id} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 font-mono tracking-tight">{ride.id}</span>
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                {ride.mode === 'solo' ? 'Solo' : 'Pool'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium">{getStopName(ride.pickup)} ➔ {getStopName(ride.dropoff)}</p>
                            <p className="text-[10px] text-slate-500 font-semibold font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#175D39]" /> {ride.date} • <Clock className="w-3 h-3 text-[#175D39]" /> {ride.time}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <span className="text-xs font-mono font-black text-[#175D39]">{currencySymbol}{ride.fare}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this scheduled ride?')) {
                                  setScheduledRides(prev => prev.filter(r => r.id !== ride.id));
                                  alert('Scheduled ride cancelled.');
                                }
                              }}
                              className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* IF POOL FORMING (LOBBY), RENDER COMPANION LOADER */}
            {poolingState === 'forming' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="bg-[#175D39]/15 text-[#175D39] text-xs font-bold border border-[#175D39]/30 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      POOL FORMING LOBBY
                    </span>
                    <span className="text-xs font-mono text-slate-500">Route: {getStopName(pickup)} ➔ {getStopName(dropoff)}</span>
                  </div>

                  {/* Ticking Driver Accept Countdown Bar */}
                  <div className="bg-amber-50 border border-amber-150 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                      <div>
                        <span className="text-xs font-black text-amber-800 block uppercase tracking-wide">Waiting for Driver to Accept</span>
                        <span className="text-[10px] text-amber-700 block font-semibold">Ride cancels automatically if no driver accepts</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-mono font-black text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">
                        {driverTimer}s
                      </span>
                    </div>
                  </div>

                  <div className="text-center py-6">
                    <h3 className="text-2xl font-black text-[#175D39] tracking-tight">Searching for Companions...</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Connecting campus commuters traveling in your direction to minimize your transport fares live.</p>
                  </div>

                  {/* Occupancy Seating Tracker progress bar (just like user's wireframe) */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seating Capacity Filled</span>
                      <span className="text-sm font-mono font-black text-[#175D39]">{lobbyMembers.length}/4 SEATS</span>
                    </div>

                    {/* Seating progress bar indicators */}
                    <div className="grid grid-cols-4 gap-2.5 h-3">
                      <div className={`rounded-full transition-all duration-300 ${lobbyMembers.length >= 1 ? 'bg-[#175D39]' : 'bg-slate-200'}`}></div>
                      <div className={`rounded-full transition-all duration-300 ${lobbyMembers.length >= 2 ? 'bg-[#175D39]' : 'bg-slate-200'} ${lobbyMembers.length === 1 ? 'animate-pulse bg-gray-750' : ''}`}></div>
                      <div className={`rounded-full transition-all duration-300 ${lobbyMembers.length >= 3 ? 'bg-[#175D39]' : 'bg-slate-200'} ${lobbyMembers.length === 2 ? 'animate-pulse bg-gray-750' : ''}`}></div>
                      <div className={`rounded-full transition-all duration-300 ${lobbyMembers.length >= 4 ? 'bg-[#175D39]' : 'bg-slate-200'} ${lobbyMembers.length === 3 ? 'animate-pulse bg-gray-750' : ''}`}></div>
                    </div>

                    {/* Pricing ticker based on joined members */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-500">Current Cost per Seat:</span>
                      <span className="font-mono font-black text-lg text-[#175D39] flex items-center gap-1">
                        {currencySymbol}{Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1'])}
                        <span className="text-[10px] text-gray-500 font-medium font-sans">/seat</span>
                      </span>
                    </div>
                  </div>

                  {/* Joined Pool Members Cards */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Commuters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lobbyMembers.map((member, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center space-x-3">
                          <img 
                            referrerPolicy="no-referrer"
                            src={member.avatar} 
                            alt={member.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-150 shadow-xs shadow-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold block text-slate-800 truncate">{member.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono tracking-wide uppercase truncate block">{member.major} • {member.gender}</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400 bg-[#175D39]/10 border border-amber-500/20 px-1.5 py-0.5 rounded-lg shrink-0">
                            ★ {member.rating}
                          </span>
                        </div>
                      ))}
                      {/* Placeholder spots */}
                      {Array.from({ length: 4 - lobbyMembers.length }).map((_, idx) => (
                        <div key={idx} className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-2xl flex items-center space-x-3 opacity-40">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-gray-600">
                            ?
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-bold block text-gray-600">Waiting...</span>
                            <span className="text-[10px] text-gray-600 font-mono block">Looking for match</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-3">
                  {!joinedPoolId ? (
                    <button
                      onClick={handleCancelRide}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Solo
                    </button>
                  ) : activePools.find(p => p.id === joinedPoolId)?.hostName === (userProfile.name || 'Temi Adeyemi') ? (
                    <button
                      onClick={() => handleDeletePool(joinedPoolId)}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Pool
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLeavePool(joinedPoolId)}
                      className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Leave Pool
                    </button>
                  )}
                  <button
                    onClick={handleStartTransit}
                    className="w-full bg-[#175D39] hover:bg-[#175D39]/90 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    Match Driver Now
                  </button>
                </div>
              </div>
            )}

            {/* IF MATCHED WITH DRIVER */}
            {poolingState === 'matched' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6">
                <div className="flex justify-between items-center">
                  <span className="bg-[#175D39]/15 text-[#175D39] text-xs font-bold border border-[#175D39]/30 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    DRIVER ARRIVING
                  </span>
                  <span className="text-xs font-mono text-slate-500">ETA: 2 Minutes</span>
                </div>

                {/* Driver Profile Summary */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img 
                      referrerPolicy="no-referrer"
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" 
                      alt="David Alao" 
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-150 shadow-xs shadow-md"
                    />
                    <div>
                      <h3 className="text-base font-black text-[#175D39] flex items-center gap-1.5">
                        David Alao 
                        <span className="text-xs font-mono text-amber-400 bg-[#175D39]/10 border border-amber-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          ★ 4.9
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-bold font-mono">Toyota Corolla (Silver) • RUN-918-LA</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Mobile: +234 812 345 6789</p>
                    </div>
                  </div>
                  
                  {/* Security PIN code to unlock ride */}
                  <div className="bg-white border border-slate-150 shadow-xs px-4 py-3 rounded-2xl text-center shrink-0">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">BOARDING PIN</span>
                    <span className="text-lg font-mono font-black tracking-widest text-[#175D39]">{verificationCode}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Your Ride Pool Members</span>
                  <div className="flex items-center space-x-2">
                    {lobbyMembers.map((member, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          referrerPolicy="no-referrer"
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <span className="absolute top-full left-1/2 -translate-x-1/2 bg-gray-950 text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap mt-1">
                          {member.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCancelRide}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Ride
                  </button>
                  <button
                    onClick={() => setPoolingState('transit')}
                    className="w-full bg-[#175D39] hover:bg-[#175D39]/90 text-white font-black py-3.5 px-4 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Board Vehicle
                  </button>
                </div>
              </div>
            )}

            {/* IF IN TRANSIT tracking map */}
            {poolingState === 'transit' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6">
                <div className="flex justify-between items-center">
                  <span className="bg-[#175D39]/15 text-blue-400 text-xs font-bold border border-[#175D39]/30 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    RIDE IN TRANSIT
                  </span>
                  <span className="text-xs font-mono text-slate-500">ETA: {etaRemaining} Minutes</span>
                </div>



                {/* Active Trip Info details */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-slate-800">Emergency Response SOS</span>
                      <span className="text-[10px] text-gray-500 block">Dispatchers notified of transit metrics</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSosActivated(!sosActivated);
                      if (!sosActivated) {
                        alert('SOS activated! Redundant distress beacon sent to campus emergency services and lead dispatcher Jenkins.');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                      sosActivated 
                        ? 'bg-[#175D39] text-white border-[#175D39] animate-pulse' 
                        : 'bg-transparent text-[#175D39] border-[#175D39]/30 hover:bg-[#175D39]/10'
                    }`}
                  >
                    {sosActivated ? 'SOS ON' : 'Trigger SOS'}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setPoolingState('arrived')}
                    className="w-full bg-[#175D39] hover:bg-[#175D39]/90 text-white font-black py-3.5 px-4 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Simulate Arrival
                  </button>
                </div>
              </div>
            )}

            {/* IF ARRIVED / TRIP FINISHED - RENDER RATING & REVIEW SCREEN */}
            {(poolingState === 'arrived' || poolingState === 'rated') && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6 text-center">
                <div className="w-16 h-16 bg-[#175D39]/10 border border-[#175D39]/20 text-[#175D39] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-2xl font-black text-[#175D39] tracking-tight">Trip Completed!</h3>
                  <p className="text-xs text-slate-500">You arrived safely at {getStopName(dropoff)}.</p>
                </div>

                {/* Pricing / Split Savings Receipt card */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3.5 max-w-sm mx-auto text-left">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-2">Split Savings Receipt</span>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Standard Solo Ride:</span>
                    <span className="font-mono text-slate-600 line-through">{currencySymbol}{basePrice}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Split Occupancy Fare ({lobbyMembers.length}/4 joined):</span>
                    <span className="font-mono text-[#175D39] font-black">{currencySymbol}{Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1'])}</span>
                  </div>
                  <div className="h-px bg-gray-850"></div>
                  <div className="flex justify-between text-xs bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                    <span className="text-emerald-400 font-bold">Total Cash Saved:</span>
                    <span className="font-mono text-emerald-400 font-black">+{currencySymbol}{basePrice - Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1'])}</span>
                  </div>
                </div>

                {/* Ride rating widgets */}
                <div className="space-y-4 max-w-sm mx-auto">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Rate Driver & Companions</span>
                  <div className="flex items-center justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingScore(star)}
                        className={`p-1.5 rounded-lg transition-transform hover:scale-110 cursor-pointer`}
                      >
                        <svg className={`w-8 h-8 ${star <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Add feedback comments... (optional)"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none"
                  />

                  <button
                    onClick={handleRateSubmit}
                    className="w-full bg-[#175D39] hover:bg-[#175D39] text-slate-950 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Finish & Close Trip
                  </button>
                </div>
              </div>
            )}
            
          </div>

          {/* RIGHT SIDEBAR (5 COLS ON LARGE) - TRANSIT CHAT & ALERTS INBOX */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Real-time Transit Chat Box inside Ride Pool */}
            <div className="bg-white rounded-3xl border border-slate-200 flex flex-col h-[350px] lg:h-[450px] overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-100/50 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#175D39]/15 flex items-center justify-center text-[#175D39]">
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#175D39] uppercase tracking-wider block">Transit Pool Chat</h3>
                    <span className="text-[10px] text-gray-500 block font-mono">ID: CHAT-POOL-8832</span>
                  </div>
                </div>
                {poolingState === 'forming' || poolingState === 'matched' || poolingState === 'transit' ? (
                  <span className="text-[10px] bg-[#175D39]/10 text-[#175D39] px-2 py-0.5 rounded-md font-mono font-bold animate-pulse">
                    ● ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-gray-500 px-2 py-0.5 rounded-md font-mono">
                    OFFLINE
                  </span>
                )}
              </div>

              {/* Chat Messages Scrolling Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 flex flex-col">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`max-w-[85%] flex flex-col ${
                      msg.isUser ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 text-[10px]">
                      <span className="font-extrabold text-slate-500">{msg.sender}</span>
                      <span className="text-gray-600 font-mono">{msg.time}</span>
                    </div>
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'System' 
                        ? 'bg-slate-100/50 text-slate-600 border border-slate-200 italic text-center w-full font-mono'
                        : msg.isUser 
                          ? 'bg-[#175D39] text-white rounded-tr-none' 
                          : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef}></div>
              </div>

              {/* Quick Replies row */}
              {poolingState !== 'idle' && (
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar scroll-smooth">
                  {['On my way!', 'I am at the stop', 'Wait for me', 'Awesome split!'].map((phrase, index) => (
                    <button
                      key={index}
                      onClick={() => sendQuickReply(phrase)}
                      className="px-3 py-1 bg-slate-100 hover:bg-gray-850 text-slate-500 hover:text-white border border-slate-150 shadow-xs rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Submit Footer Form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-100/50 border-t border-slate-200 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={poolingState === 'idle' ? 'Join a pool to text...' : 'Type message here...'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={poolingState === 'idle'}
                  className="flex-1 bg-slate-50 border border-slate-150 shadow-xs rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#175D39]/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={poolingState === 'idle' || !chatInput.trim()}
                  className="p-2.5 bg-[#175D39] hover:bg-[#175D39] disabled:bg-gray-850 text-white rounded-xl transition duration-150 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>



          </div>
        </motion.div>
      )}

        {/* BROWSE ACTIVE POOLS VIEW */}
        {activeView === 'browse_pools' && (
          <motion.div
            key="browse_pools"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#175D39] tracking-tight uppercase">Browse Active Pools</h1>
              <p className="text-xs text-slate-500">
                Join matching commutes created by fellow students to split fares and ride safely.
              </p>
            </div>
            <button
              onClick={() => {
                setRideMode('create');
                onNavigate('booking');
              }}
              className="px-5 py-3 bg-[#175D39] hover:bg-[#175D39]/90 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#175D39]/10"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Start New Pool</span>
            </button>
          </div>

          {/* Filters Widget Panel */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <Search className="w-4 h-4 text-[#175D39]" />
              <span>Search Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pickup filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pickup Stop</label>
                <select
                  value={browseFilterPickup}
                  onChange={(e) => setBrowseFilterPickup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#175D39]"
                >
                  <option value="all">All Pickup Stops</option>
                  {campusStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>{stop.name}</option>
                  ))}
                </select>
              </div>

              {/* Dropoff filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Destination</label>
                <select
                  value={browseFilterDropoff}
                  onChange={(e) => setBrowseFilterDropoff(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#175D39]"
                >
                  <option value="all">All Destinations</option>
                  {campusStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>{stop.name}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vehicle Category</label>
                <select
                  value={browseFilterVehicle}
                  onChange={(e) => setBrowseFilterVehicle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#175D39]"
                >
                  <option value="all">All Vehicles (Any)</option>
                  <option value="Car">Car (Cozy Comfort)</option>
                  <option value="Keke">Keke Marwa (Tricycle)</option>
                  <option value="Shuttle">Campus Shuttle Bus</option>
                </select>
              </div>
            </div>

            {/* Clear filters row */}
            {(browseFilterPickup !== 'all' || browseFilterDropoff !== 'all' || browseFilterVehicle !== 'all') && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setBrowseFilterPickup('all');
                    setBrowseFilterDropoff('all');
                    setBrowseFilterVehicle('all');
                  }}
                  className="text-[10px] font-bold text-[#175D39] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" /> Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Pools Grid */}
          {activePools.filter(pool => {
            if (browseFilterPickup !== 'all' && pool.pickupId !== browseFilterPickup) return false;
            if (browseFilterDropoff !== 'all' && pool.dropoffId !== browseFilterDropoff) return false;
            if (browseFilterVehicle !== 'all' && pool.vehicleType !== browseFilterVehicle) return false;
            return true;
          }).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePools.filter(pool => {
                if (browseFilterPickup !== 'all' && pool.pickupId !== browseFilterPickup) return false;
                if (browseFilterDropoff !== 'all' && pool.dropoffId !== browseFilterDropoff) return false;
                if (browseFilterVehicle !== 'all' && pool.vehicleType !== browseFilterVehicle) return false;
                return true;
              }).map((pool) => {
                const isUserJoined = joinedPoolId === pool.id;
                const isFull = pool.currentRiders.length >= pool.maxRiders;
                
                // Determine prices dynamically based on vehicle
                let baseF = 350;
                if (pool.vehicleType === 'Car') baseF = 350;
                else if (pool.vehicleType === 'Keke') baseF = 200;
                else baseF = 100;

                const splitFareMax = Math.round(baseF / pool.maxRiders);

                return (
                  <div key={pool.id} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition-shadow duration-150">
                    
                    {/* Host Profile */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          referrerPolicy="no-referrer"
                          src={pool.hostAvatar}
                          alt={pool.hostName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-xs"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block text-slate-800 truncate">{pool.hostName}</span>
                          <span className="text-[10px] text-gray-500 font-medium block truncate uppercase tracking-wider">{pool.hostMajor} • {pool.hostGender}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1 font-bold">
                        ★ {pool.hostRating}
                      </span>
                    </div>

                    {/* Driver Matching Ticking Timer */}
                    <div className="flex items-center justify-between bg-amber-50/75 border border-amber-150 px-3 py-2 rounded-xl text-xs">
                      <div className="flex items-center space-x-1.5 text-amber-800 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>Driver matching closes:</span>
                      </div>
                      <span className="font-mono font-black text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">
                        {pool.driverAcceptCountdown !== undefined ? pool.driverAcceptCountdown : 60}s
                      </span>
                    </div>

                    {/* Route Line */}
                    <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-[#175D39] shrink-0" />
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Pickup</span>
                          <span className="text-xs font-bold text-slate-800 truncate block">{getStopName(pool.pickupId)}</span>
                        </div>
                      </div>
                      <div className="h-4 border-l-2 border-dashed border-slate-200 ml-2"></div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Destination</span>
                          <span className="text-xs font-bold text-slate-800 truncate block">{getStopName(pool.dropoffId)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capacity indicators */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        <span>Lobby Capacity</span>
                        <span className={isFull ? 'text-red-500' : 'text-[#175D39]'}>
                          {pool.currentRiders.length}/{pool.maxRiders} Seats Filled
                        </span>
                      </div>
                      {/* Grid representation of filled seats */}
                      <div className="grid grid-cols-4 gap-1.5 h-2">
                        {Array.from({ length: pool.maxRiders }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`rounded-full h-full ${
                              idx < pool.currentRiders.length ? 'bg-[#175D39]' : 'bg-slate-150'
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {/* Member Avatars */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center -space-x-2 overflow-hidden">
                        {pool.currentRiders.map((rider, idx) => (
                          <div key={idx} className="relative group/rider shrink-0">
                            <img
                              referrerPolicy="no-referrer"
                              src={rider.avatar}
                              alt={rider.name}
                              className="w-7 h-7 rounded-full object-cover border-2 border-white"
                            />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1 py-0.5 rounded-md opacity-0 group-hover/rider:opacity-100 transition-opacity whitespace-nowrap mb-1 z-10 font-bold">
                              {rider.name} ({rider.major})
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Vehicle Category Badge */}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md font-mono ${
                        pool.vehicleType === 'Car' 
                          ? 'bg-emerald-50 border border-emerald-200 text-[#175D39]'
                          : pool.vehicleType === 'Keke'
                            ? 'bg-amber-50 border border-amber-200 text-amber-600'
                            : 'bg-blue-50 border border-blue-200 text-blue-600'
                      }`}>
                        {pool.vehicleType.toUpperCase()}
                      </span>
                    </div>

                    {/* Fare / Splits Box */}
                    <div className="flex justify-between items-center bg-slate-50/70 border border-slate-200/40 p-3 rounded-2xl">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase tracking-wide">Dynamic split fare</span>
                        <div className="flex items-baseline space-x-1.5 mt-0.5">
                          <span className="text-base font-extrabold text-[#175D39] font-mono">
                            {currencySymbol}{splitFareMax}
                          </span>
                          <span className="text-[9px] text-slate-400 line-through font-mono">
                            {currencySymbol}{baseF}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-emerald-600 font-bold block bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-100 font-sans">
                          Save up to {Math.round((1 - (splitFareMax / baseF)) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Join / Leave / Delete button */}
                    {pool.hostName === (userProfile.name || 'Temi Adeyemi') ? (
                      <button
                        onClick={() => handleDeletePool(pool.id)}
                        className="w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Pool (Created by You)</span>
                      </button>
                    ) : pool.currentRiders.some(r => r.name === (userProfile.name || 'Temi Adeyemi')) ? (
                      <button
                        onClick={() => handleLeavePool(pool.id)}
                        className="w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-xs"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Leave Pool</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCheckoutPool(pool);
                          setCheckoutTimer(30);
                        }}
                        disabled={isFull}
                        className={`w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isFull
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-[#175D39] hover:bg-[#175D39]/95 text-white shadow-md shadow-emerald-50'
                        }`}
                      >
                        {isFull ? (
                          <span>Full / Closed</span>
                        ) : (
                          <>
                            <span>Join Pool</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-[#175D39]">
                <Compass className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">No Matching Ride Pools</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  There are currently no active ride pools that match your chosen pickup or destination filters. 
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setBrowseFilterPickup('all');
                    setBrowseFilterDropoff('all');
                    setBrowseFilterVehicle('all');
                  }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => {
                    if (browseFilterPickup !== 'all') setPickup(browseFilterPickup);
                    if (browseFilterDropoff !== 'all') setDropoff(browseFilterDropoff);
                    onNavigate('booking');
                  }}
                  className="px-4 py-2.5 bg-[#175D39] hover:bg-[#175D39]/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Start New Pool
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

        {/* 2. VIEW CONTEXT: ACTIVITY DASHBOARD (CHARTS & HISTORIC TRIPS) */}
        {activeView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          <h1 className="text-2xl font-black text-[#175D39] tracking-tight">RIDER PORTAL SUMMARY</h1>
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Available balance</span>
              <div className="text-2xl font-black text-[#175D39] font-mono mt-1">{currencySymbol}{userProfile.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Ready for instant pool fares</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Pooling savings (Month)</span>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">+{currencySymbol}{userProfile.savedThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
              <p className="text-[10px] text-emerald-400 mt-0.5">Saved split cost by sharing rides</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Trips completed</span>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">{userProfile.tripsThisWeek}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Reliable campus commutes logged</p>
            </div>
          </div>

          {/* Interactive Custom SVG Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-[#175D39] uppercase tracking-wider">Weekly Transit Outlay</h3>
                <p className="text-xs text-gray-500">Breakdown of transport expenses on campus (split vs. solo)</p>
              </div>
              <span className="text-xs bg-slate-100 border border-slate-150 shadow-xs px-3 py-1 rounded-xl font-mono">Last 7 Days</span>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-[200px] w-full flex items-end justify-between pt-6 px-4">
              {[
                { day: 'Mon', split: 350, solo: 700 },
                { day: 'Tue', split: 175, solo: 700 },
                { day: 'Wed', split: 117, solo: 700 },
                { day: 'Thu', split: 350, solo: 700 },
                { day: 'Fri', split: 88,  solo: 700 },
                { day: 'Sat', split: 0,   solo: 0 },
                { day: 'Sun', split: 117, solo: 700 }
              ].map((data, idx) => {
                const maxVal = 700;
                const splitHeight = data.split > 0 ? (data.split / maxVal) * 150 : 0;
                const soloHeight = data.solo > 0 ? (data.solo / maxVal) * 150 : 0;
                
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-gray-950 text-white text-[10px] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-slate-200 flex flex-col pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      <span className="font-extrabold text-[#175D39]">Split: {currencySymbol}{data.split}</span>
                      <span className="text-slate-500 line-through">Solo: {currencySymbol}{data.solo}</span>
                    </div>

                    <div className="w-12 h-[150px] flex items-end justify-center gap-1">
                      {/* Solo Ride Bar Indicator (Backdrop) */}
                      <div 
                        className="w-3.5 bg-slate-200 hover:bg-gray-700 rounded-t-sm transition-all duration-300"
                        style={{ height: `${soloHeight}px` }}
                      ></div>
                      {/* Active Pool Split Bar */}
                      <div 
                        className="w-3.5 bg-gradient-to-t from-[#175D39] to-[#175D39] rounded-t-sm transition-all duration-300"
                        style={{ height: `${splitHeight}px` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono text-gray-500 mt-2 block">{data.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center items-center gap-6 pt-4 border-t border-slate-200 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gradient-to-r from-[#175D39] to-[#175D39] rounded-xs"></span>
                <span>Active Split Ride Outlay</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-slate-200 rounded-xs"></span>
                <span>Alternative Solo Transport Cost</span>
              </div>
            </div>
          </div>

          {/* Historic Trips Log List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-[#175D39] uppercase tracking-wider">Past Completed Rides</h3>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((txn, index) => (
                  <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-white">{txn.description}</span>
                        <span className="text-[10px] text-gray-500 block font-mono">{txn.date} • {txn.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-white block">-{currencySymbol}{txn.amount}</span>
                      <span className="text-[9px] bg-[#175D39]/10 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-mono tracking-wide">Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs italic">
                No recent trips on record. Choose "Request Ride" to get started!
              </div>
            )}
          </div>
        </motion.div>
      )}

        {/* 3. VIEW CONTEXT: NOTIFICATIONS INBOX */}
        {activeView === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-[#175D39] tracking-tight">NOTIFICATIONS INBOX</h1>
            <button
              onClick={() => {
                onMarkNotificationsRead();
                alert('All messages marked as read.');
              }}
              className="text-xs text-[#175D39] hover:underline font-bold cursor-pointer"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((notif, index) => (
              <div 
                key={index} 
                className={`p-5 rounded-2xl border transition-all ${
                  notif.isRead 
                    ? 'bg-white border-slate-200 opacity-70' 
                    : 'bg-white border-slate-150 shadow-xs shadow-md ring-1 ring-blue-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      notif.type === 'success' 
                        ? 'bg-[#175D39]/10 text-emerald-400' 
                        : notif.type === 'receipt' 
                          ? 'bg-[#175D39]/10 text-blue-450' 
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#175D39] uppercase tracking-wider">{notif.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono tracking-wide shrink-0">{notif.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

        {/* 4. VIEW CONTEXT: WALLET & PAYMENTS SCREEN */}
        {activeView === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          <h1 className="text-2xl font-black text-[#175D39] tracking-tight">WALLET & PAYMENTS</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: VIRTUAL CARD & FUNDING CHANNELS (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Sleek Virtual Debit Card Mockup */}
              <div className="bg-gradient-to-br from-[#F2F2F2] via-[#175D39] to-black rounded-3xl p-6 sm:p-8 border border-slate-150 shadow-xs relative overflow-hidden shadow-xl ring-1 ring-[#175D39]/10 min-h-[220px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-[#175D39]/5 blur-3xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">CAMPUS TRANSIT PASS</span>
                    <h3 className="text-lg font-black text-white">{userProfile.name || 'Temi Adeyemi'}</h3>
                  </div>
                  <span className="bg-[#175D39]/10 text-[#175D39] text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-[#175D39]/20 uppercase">
                    STUDENT COMMUTER
                  </span>
                </div>

                <div className="my-6 relative z-10">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-wider font-mono">DIGITAL BALANCE</span>
                  <div className="text-3xl sm:text-4xl font-black text-[#175D39] font-mono mt-0.5 tracking-tight">
                    {currencySymbol}{userProfile.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="flex justify-between items-center relative z-10 text-[10px] font-mono text-gray-500 border-t border-slate-200 pt-4">
                  <span>METRIC: {userProfile.idNumber || 'RUN/2022/10432'}</span>
                  <span>EXP: TRANSIT END</span>
                </div>
              </div>

              {/* Instant Fund Wallet Form */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-[#175D39] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-[#175D39]" /> Reload Comm commuter wallet
                </h3>
                
                <form onSubmit={(e) => { e.preventDefault(); setShowPaystackPopup(true); }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[1000, 2500, 5000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => { setFundAmount(amount); setCustomFundAmount(''); }}
                        className={`py-3 rounded-xl border font-mono font-bold text-xs transition-all cursor-pointer ${
                          fundAmount === amount && !customFundAmount
                            ? 'bg-gradient-to-b from-gray-900 to-slate-950 border-[#175D39] text-[#175D39]' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-white hover:bg-slate-100'
                        }`}
                      >
                        +{currencySymbol}{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Or Custom Top Up Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono font-black">{currencySymbol}</span>
                      <input 
                        type="number" 
                        placeholder="Enter other sum (e.g. 10000)"
                        value={customFundAmount}
                        onChange={(e) => setCustomFundAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-8 py-3 rounded-2xl text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#175D39] hover:bg-[#175D39] text-slate-800 font-black py-4 px-6 rounded-2xl shadow-lg transition-all text-xs uppercase tracking-wider cursor-pointer"
                  >
                    REFOUND WALLET WITH PAYSTACK CO
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: VIRTUAL NGN BANK TRANSFER DETAILS (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Virtual Account Details for Instant Bank Deposits */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#175D39]" />
                  <h3 className="text-xs font-black text-[#175D39] uppercase tracking-wider block">Instant Bank Transfer Channel</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Make an online bank transfer to your customized virtual account below. Refills reflect instantly via automated credit tracking.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Beneficiary Bank:</span>
                    <span className="text-slate-800 font-black">Wema Bank Plc</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account Number:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[#175D39] font-black tracking-widest">9283748291</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('9283748291');
                          setTransferCopied(true);
                          setTimeout(() => setTransferCopied(false), 2000);
                        }}
                        className="p-1 bg-slate-100 border border-slate-150 shadow-xs rounded-md text-slate-500 hover:text-white cursor-pointer"
                      >
                        {transferCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name:</span>
                    <span className="text-slate-800 font-black truncate max-w-[150px]">CAMPUSRIDE-{userProfile.name?.split(' ')[0].toUpperCase() || 'STUDENT'}</span>
                  </div>
                </div>

                <div className="bg-yellow-950/25 border border-yellow-900/40 p-3 rounded-2xl flex items-start space-x-2.5">
                  <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <span className="text-[10px] text-yellow-500 leading-relaxed font-medium">
                    Deposits via bank transfers are backed by unified central bank Escrow. Fees: ₦0 flat rate.
                  </span>
                </div>
              </div>

              {/* Past Transactions Ledger list */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-[#175D39] uppercase tracking-wider">Payments Transactions Ledger</h3>
                {transactions.length > 0 ? (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {transactions.map((txn, index) => (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold block text-slate-800 truncate max-w-[150px]">{txn.description}</span>
                          <span className="text-[9px] text-gray-500 block font-mono">{txn.time} • {txn.method}</span>
                        </div>
                        <span className={`text-xs font-mono font-black ${txn.type === 'reload' ? 'text-[#175D39]' : 'text-[#175D39]'}`}>
                          {txn.type === 'reload' ? '+' : '-'}{currencySymbol}{txn.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs italic">
                    No historic payments transactions.
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* SIMULATED PAYSTACK MODAL CO-OVERLAY POPUP */}
          <AnimatePresence>
            {showPaystackPopup && (
              <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white text-slate-900 max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-200"
                >
                  {/* Paystack Styled header */}
                  <div className="p-6 bg-gradient-to-r from-teal-500 to-[#175D39] text-white flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold tracking-widest block uppercase opacity-75">Paystack Secure Checkout</span>
                      <h4 className="text-base font-black">Refill {currencySymbol}{(Number(customFundAmount) || fundAmount).toLocaleString()}</h4>
                    </div>
                    <button 
                      onClick={() => setShowPaystackPopup(false)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Checkout inputs form body */}
                  <form onSubmit={triggerTopup} className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cardholder Email</label>
                      <input 
                        type="text" 
                        value={userProfile.email} 
                        disabled 
                        className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Card Number</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="5399 2831 0984 2191"
                          value={paystackCard}
                          onChange={(e) => setPaystackCard(e.target.value)}
                          required
                          className="w-full bg-white border border-gray-300 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-sm font-bold text-gray-500 font-mono">MASTERCARD</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expiry Date</label>
                        <input 
                          type="text" 
                          placeholder="09/29"
                          value={paystackExpiry}
                          onChange={(e) => setPaystackExpiry(e.target.value)}
                          required
                          className="w-full bg-white border border-gray-300 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CVV Pin</label>
                        <input 
                          type="password" 
                          placeholder="***"
                          maxLength={3}
                          value={paystackCvv}
                          onChange={(e) => setPaystackCvv(e.target.value)}
                          required
                          className="w-full bg-white border border-gray-300 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-center gap-1.5 border border-gray-100 text-[10px] text-gray-500">
                      <ShieldCheck className="w-4 h-4 text-[#175D39]" /> SECURE ADVANCED 256-BIT SSL ENCRYPTION
                    </div>

                    <button
                      type="submit"
                      disabled={paystackLoading}
                      className="w-full bg-[#175D39] hover:bg-[#175D39] text-slate-800 font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer"
                    >
                      {paystackLoading ? 'Refilling Comm wallet...' : `PROCEED PAY ${currencySymbol}${(Number(customFundAmount) || fundAmount).toLocaleString()}`}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </motion.div>
      )}

        {/* 5. VIEW CONTEXT: STUDENT PROFILE */}
        {activeView === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl"
          >
          <h1 className="text-2xl font-black text-[#175D39] tracking-tight">STUDENT PROFILE</h1>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-200 pb-6">
              <img 
                referrerPolicy="no-referrer"
                src={userProfile.avatar} 
                alt={userProfile.name} 
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-150 shadow-xs"
              />
              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-lg font-black text-white">{userProfile.name}</h3>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-[#175D39]/10 border border-[#175D39]/20 text-[#175D39] inline-block font-mono tracking-wider">
                  Verified Commuter
                </span>
                <p className="text-xs text-gray-500 font-mono">Joined: June 2026</p>
              </div>
            </div>

            {/* Profile inputs */}
            <form onSubmit={(e) => { e.preventDefault(); alert('Profile successfully saved.'); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Legal Name</label>
                  <input 
                    type="text" 
                    value={userProfile.name}
                    onChange={(e) => onUpdateProfile({ name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registered Email Address</label>
                  <input 
                    type="email" 
                    value={userProfile.email}
                    disabled
                    className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registrar Matriculation ID</label>
                  <input 
                    type="text" 
                    value={userProfile.idNumber}
                    disabled
                    className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-gray-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Enrolled Academic Major</label>
                  <input 
                    type="text" 
                    value={userProfile.major || 'Software Engineering'}
                    onChange={(e) => onUpdateProfile({ major: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-[#175D39] hover:bg-[#175D39] text-slate-950 font-black py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Save Profile Details
              </button>
            </form>

          </div>
        </motion.div>
      )}

        {/* 6. VIEW CONTEXT: APP SETTINGS */}
        {activeView === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl"
          >
          <h1 className="text-2xl font-black text-[#175D39] tracking-tight">APP SETTINGS</h1>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#175D39] uppercase tracking-wider border-b border-slate-200 pb-2">Transit Preferences</h3>
              
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-white">Continuous Live Location Share</span>
                  <span className="text-[10px] text-gray-500 block">Transmit coordinate locks to drivers when pooling is active</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={safetySharing} 
                    onChange={() => setSafetySharing(!safetySharing)} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#175D39]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-white">Same Gender Peer Matching</span>
                  <span className="text-[10px] text-gray-500 block">Strict matching filters to isolate peers of the same gender</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sameGenderOnly} 
                    onChange={() => setSameGenderOnly(!sameGenderOnly)} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#175D39]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-white">Low Balance Wallet Alerts</span>
                  <span className="text-[10px] text-gray-500 block">System alert triggers when digital balance dips below ₦500</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={lowBalanceAlert} 
                    onChange={() => setLowBalanceAlert(!lowBalanceAlert)} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#175D39]"></div>
                </label>
              </div>
            </div>

            {/* Account deletion */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-black text-[#175D39] uppercase tracking-wider block">Danger Zone</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Permanently delete your university commuter account. This clears your digital wallet balance, trips ledger, safety ratings, and registrar linkages completely. This action is irreversible.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAccount && window.confirm('Are you absolutely sure you want to permanently delete your transit account? All remaining funds will be lost.')) {
                    onDeleteAccount();
                  }
                }}
                className="bg-[#175D39]/10 hover:bg-red-100 text-[#175D39] border border-[#175D39]/20 font-black py-3 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Delete Transit Account
              </button>
            </div>

          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* JOIN POOL CONFIRMATION COUNTDOWN MODAL */}
      <AnimatePresence>
        {checkoutPool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 text-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              {/* Pulse countdown badge at top */}
              <div className="flex justify-between items-center mb-4">
                <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  JOIN RESERVATION TIMEOUT
                </span>
                <span className="text-sm font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                  {checkoutTimer}s
                </span>
              </div>

              {/* Title & Description */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-[#175D39] tracking-tight">Confirm Seat Join</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Complete your pool join before the driver matching window closes!
                </p>
              </div>

              {/* Pool specs */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-4">
                {/* Host */}
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-200/60">
                  <img
                    referrerPolicy="no-referrer"
                    src={checkoutPool.hostAvatar}
                    alt={checkoutPool.hostName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-150"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800">{checkoutPool.hostName} (Host)</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{checkoutPool.hostMajor}</span>
                  </div>
                </div>

                {/* Route */}
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#175D39]"></span>
                    <span className="font-semibold">Pickup: <span className="font-bold text-slate-800">{getStopName(checkoutPool.pickupId)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="font-semibold">Destination: <span className="font-bold text-slate-800">{getStopName(checkoutPool.dropoffId)}</span></span>
                  </div>
                </div>

                {/* Fare Split estimation */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Est. Split Price</span>
                    <span className="text-lg font-mono font-black text-[#175D39]">
                      {currencySymbol}{Math.round((checkoutPool.vehicleType === 'Car' ? 350 : checkoutPool.vehicleType === 'Keke' ? 200 : 100) / (checkoutPool.currentRiders.length + 1))}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current Members</span>
                    <span className="text-xs font-bold text-slate-800">
                      {checkoutPool.currentRiders.length} of {checkoutPool.maxRiders}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress visual countdown */}
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-6">
                <motion.div 
                  className="h-full bg-amber-500" 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(checkoutTimer / 30) * 100}%` }}
                  transition={{ ease: 'linear', duration: 1 }}
                />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutPool(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel Join
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleJoinPool(checkoutPool);
                    setCheckoutPool(null);
                  }}
                  className="w-full bg-[#175D39] hover:bg-[#175D39]/90 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Confirm & Join
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
