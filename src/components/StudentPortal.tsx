import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, setDoc, doc, getDoc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { isSupabaseConfigured, uploadFile, uploadLogoFromUrl } from '../lib/supabase';
import { 
  UserProfile, 
  AppNotification, 
  Transaction, 
  RideRequest,
  RideStatus
} from '../types';
import { UNIVERSITIES } from './SchoolSelection';
import { CampusMap } from './CampusMap';
import { 
  Car, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Lock, 
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
  LogOut,
  UploadCloud,
  Server,
  AlertCircle,
  ImageIcon
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
  currentRiders: { name: string; avatar: string; major: string; rating: number; gender: string; confirmedStart?: boolean }[];
  maxRiders: number;
  baseFare: number;
  status: 'active' | 'closed' | 'transit';
  driverAcceptCountdown?: number;
  driverAccepted?: boolean;
  createdAt?: number;
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
  onClearNotifications?: () => void;
  driverProfile?: any;
  onUpdateDriverProfile?: (updates: any) => void;
  selectedSchoolId?: string;
  onDeleteAccount?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

// Interface for dynamic pooling simulation
interface PoolMember {
  name: string;
  avatar: string;
  major: string;
  gender: string;
  rating: number;
  confirmedStart?: boolean;
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
  onClearNotifications,
  driverProfile,
  onUpdateDriverProfile,
  selectedSchoolId,
  onDeleteAccount,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  // Current School Details
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const campusStops = selectedSchool.stops;

  // Supabase Media & Logo Upload states
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [supabaseSuccess, setSupabaseSuccess] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setSupabaseError(null);
    setSupabaseSuccess(null);

    try {
      const bucketName = 'campus-ride';
      const filePath = `avatars/student_${userProfile.id || Date.now()}_${Date.now()}_${file.name}`;
      
      const publicUrl = await uploadFile(bucketName, filePath, file);
      
      // Update profile in Firestore
      await onUpdateProfile({ avatar: publicUrl });
      
      setSupabaseSuccess('Profile picture uploaded successfully and synchronized with Firestore!');
    } catch (err: any) {
      console.error(err);
      setSupabaseError(err.message || 'An error occurred during file upload.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setSupabaseError(null);
    setSupabaseSuccess(null);

    try {
      const bucketName = 'campus-ride';
      const filePath = `logos/university_${selectedSchoolId || 'run'}_${Date.now()}_${file.name}`;
      
      const publicUrl = await uploadFile(bucketName, filePath, file);
      
      // Save/link in Firestore under schools collection
      if (selectedSchoolId) {
        await setDoc(doc(db, 'schools', selectedSchoolId), {
          logoImage: publicUrl,
          updatedAt: Date.now()
        }, { merge: true });
      }
      
      setSupabaseSuccess('University logo uploaded successfully to Supabase Storage and updated in Firestore!');
    } catch (err: any) {
      console.error(err);
      setSupabaseError(err.message || 'An error occurred during logo upload.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleMirrorDefaultLogo = async () => {
    if (!selectedSchool.logoImage) return;
    setUploadingLogo(true);
    setSupabaseError(null);
    setSupabaseSuccess(null);

    try {
      const bucketName = 'campus-ride';
      const publicUrl = await uploadLogoFromUrl(bucketName, selectedSchool.logoImage);
      
      // Save in Firestore under schools collection
      if (selectedSchoolId) {
        await setDoc(doc(db, 'schools', selectedSchoolId), {
          logoImage: publicUrl,
          updatedAt: Date.now()
        }, { merge: true });
      }
      
      setSupabaseSuccess('Successfully mirrored and saved the official university logo to Supabase Storage!');
    } catch (err: any) {
      console.error(err);
      setSupabaseError(err.message || 'An error occurred during logo mirroring.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Booking details
  const [pickup, setPickup] = useState<string>('');
  const [dropoff, setDropoff] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'Car' | 'Keke' | 'Shuttle'>('Car');
  const [selectedVehicleId, setSelectedVehicleId] = useState<'Corolla' | 'Sienna' | 'Shuttle' | 'Keke'>('Corolla');

  const VEHICLES = [
    { id: 'Corolla', name: 'Car (Corolla)', type: 'Car', capacity: 6, soloPrice: 600, poolPrice: 150, description: 'Corolla Sedan with AC', icon: 'Car' },
    { id: 'Sienna', name: 'Car (Sienna)', type: 'Car', capacity: 6, soloPrice: 600, poolPrice: 150, description: 'Sienna Minivan with AC', icon: 'Car' },
    { id: 'Shuttle', name: 'Shuttle', type: 'Shuttle', capacity: 10, soloPrice: 600, poolPrice: 150, description: 'Campus Coaster Shuttle', icon: 'Users' },
    { id: 'Keke', name: 'Keke', type: 'Keke', capacity: 3, soloPrice: 400, poolPrice: 150, description: 'Direct campus tricycle', icon: 'Zap' },
  ] as const;

  const activeVehicleConfig = VEHICLES.find(v => v.id === selectedVehicleId) || VEHICLES[0];

  useEffect(() => {
    const config = VEHICLES.find(v => v.id === selectedVehicleId);
    if (config) {
      setVehicleType(config.type);
    }
  }, [selectedVehicleId]);

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
  const [joinedPoolId, setJoinedPoolId] = useState<string | null>(() => {
    const uid = userProfile?.id;
    if (uid) {
      const stored = localStorage.getItem(`campusride_joined_pool_id_${uid}`);
      if (stored) return stored;
      const storedRide = localStorage.getItem(`campusride_active_ride_${uid}`);
      if (storedRide) {
        try {
          const parsed = JSON.parse(storedRide);
          if (parsed && parsed.id) return parsed.id;
        } catch (e) {}
      }
    }
    return null;
  });
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

  // Load scheduled rides on mount
  useEffect(() => {
    const stored = localStorage.getItem('campusride_global_scheduled_rides');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as any[];
        const myRides = parsed.filter(r => r.passengerId === userProfile.id);
        setScheduledRides(myRides);
      } catch (e) {
        console.error("Error parsing stored scheduled rides", e);
      }
    }
  }, [userProfile.id]);

  // Set default currency symbol
  const currencySymbol = "₦";

  // Ride Pricing Multipliers & Tiers
  // Dynamic prices based on active vehicle config
  const basePrice = rideMode === 'solo' ? activeVehicleConfig.soloPrice : activeVehicleConfig.poolPrice;
  const priceTiers: Record<string, number> = {
    tier1: activeVehicleConfig.soloPrice, // If pool was created and no one joins (1 rider), pays full amount for solo
    tier2: Math.round(activeVehicleConfig.soloPrice / 2), // If just 1 person joins (2 riders total), it's shared among both of them
    tier3: Math.round(activeVehicleConfig.soloPrice / 3), // Shared among 3
    tier4: Math.round(activeVehicleConfig.soloPrice / 4), // Shared among 4
    tier5: Math.round(activeVehicleConfig.soloPrice / 5),
    tier6: Math.round(activeVehicleConfig.soloPrice / 6),
    tier7: Math.round(activeVehicleConfig.soloPrice / 7),
    tier8: Math.round(activeVehicleConfig.soloPrice / 8),
    tier9: Math.round(activeVehicleConfig.soloPrice / 9),
    tier10: Math.round(activeVehicleConfig.soloPrice / 10),
  };

  // Local state for interactive ride flow
  const [poolingState, setPoolingState] = useState<'idle' | 'forming' | 'matched' | 'transit' | 'arrived' | 'rated'>(() => {
    const uid = userProfile?.id;
    if (uid) {
      const stored = localStorage.getItem(`campusride_pooling_state_${uid}`);
      if (stored && stored !== 'idle') return stored as any;
      
      const storedRide = localStorage.getItem(`campusride_active_ride_${uid}`);
      if (storedRide) {
        try {
          const parsed = JSON.parse(storedRide);
          if (parsed && parsed.status) {
            if (parsed.status === 'requested' || parsed.status === 'searching') return 'forming';
            if (parsed.status === 'accepted' || parsed.status === 'arriving') return 'matched';
            if (parsed.status === 'in_transit') return 'transit';
            if (parsed.status === 'completed') return 'arrived';
          }
        } catch (e) {}
      }
    }
    return 'idle';
  });
  const [isMatchingDriver, setIsMatchingDriver] = useState<boolean>(() => {
    const uid = userProfile?.id;
    if (uid) {
      const stored = localStorage.getItem(`campusride_is_matching_driver_${uid}`);
      if (stored !== null) return stored === 'true';

      const storedRide = localStorage.getItem(`campusride_active_ride_${uid}`);
      if (storedRide) {
        try {
          const parsed = JSON.parse(storedRide);
          if (parsed && (parsed.status === 'requested' || parsed.status === 'searching')) {
            return true;
          }
        } catch (e) {}
      }
    }
    return false;
  });
  const [searchFailed, setSearchFailed] = useState<boolean>(false);
  const [lobbyMembers, setLobbyMembers] = useState<PoolMember[]>([
    {
      name: userProfile.name || 'Temi Adeyemi',
      avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      major: userProfile.major || 'Software Eng',
      gender: 'Female',
      rating: 4.8
    }
  ]);

  // Chat room state
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string; isUser: boolean; senderId?: string }[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Complaint state variables
  const [isComplaintFormOpen, setIsComplaintFormOpen] = useState<boolean>(false);
  const [complaintCategory, setComplaintCategory] = useState<string>('Driver Behavior');
  const [complaintDetails, setComplaintDetails] = useState<string>('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState<boolean>(false);
  const [complaintSuccessMsg, setComplaintSuccessMsg] = useState<string>('');

  const handleSendComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDetails.trim()) return;

    setIsSubmittingComplaint(true);
    setComplaintSuccessMsg('');
    try {
      const complaintId = `COMP-${Date.now()}`;
      const newComplaint = {
        id: complaintId,
        rideId: activeRide?.id || joinedPoolId || 'N/A',
        passengerId: userProfile.id,
        passengerName: userProfile.name,
        passengerAvatar: userProfile.avatar,
        driverId: activeRide?.driverId || 'N/A',
        driverName: activeRide?.driverName || 'David Alao',
        category: complaintCategory,
        details: complaintDetails,
        status: 'pending',
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'complaints', complaintId), newComplaint);
      setComplaintSuccessMsg('Your complaint has been logged and sent to the admin team for immediate review.');
      setComplaintDetails('');
      setTimeout(() => {
        setIsComplaintFormOpen(false);
        setComplaintSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Failed to submit complaint. Please check your network connection and try again.');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Live simulation states
  const [simStep, setSimStep] = useState<number>(0);
  const [liveDistance, setLiveDistance] = useState<number>(0); // 0 to 100% of route
  const [etaRemaining, setEtaRemaining] = useState<number>(5);
  const [verificationCode] = useState<string>(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sosActivated, setSosActivated] = useState<boolean>(false);
  const [ratingScore, setRatingScore] = useState<number>(0);
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

  // Trust-based payment states for riders
  const [showPaymentSelection, setShowPaymentSelection] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'transfer_details'>('select');
  const [isSimulatingRedirect, setIsSimulatingRedirect] = useState<boolean>(false);
  const [rideTransferCopied, setRideTransferCopied] = useState<boolean>(false);
  
  // Messenger-style chat overlay states
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState<boolean>(false);
  const floatingChatBottomRef = useRef<HTMLDivElement>(null);

  // Persist local pooling state changes
  useEffect(() => {
    if (!userProfile.id) return;
    localStorage.setItem(`campusride_joined_pool_id_${userProfile.id}`, joinedPoolId || '');
    localStorage.setItem(`campusride_pooling_state_${userProfile.id}`, poolingState);
    localStorage.setItem(`campusride_is_matching_driver_${userProfile.id}`, isMatchingDriver ? 'true' : 'false');
  }, [joinedPoolId, poolingState, isMatchingDriver, userProfile.id]);

  // Scroll to bottom of floating chat
  useEffect(() => {
    if (isChatOverlayOpen && floatingChatBottomRef.current) {
      setTimeout(() => {
        floatingChatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [chatMessages, isChatOverlayOpen]);

  // Trigger payment method popup when ride gets accepted (matched)
  useEffect(() => {
    const activeReq = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);
    if (poolingState === 'matched' && activeReq && !activeReq.paymentMethod) {
      setShowPaymentSelection(true);
      setPaymentStep('select');
    }
  }, [poolingState, activeRide?.id, activeRide?.paymentMethod, joinedPoolId, activePools]);

  const getDriverBankDetails = () => {
    const ride = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);
    if (ride?.driverId) {
      const stored = localStorage.getItem(`campusride_driver_profile_${ride.driverId}`);
      if (stored) {
        try {
          const profile = JSON.parse(stored);
          if (profile.bankAccountNumber) {
            return {
              bankName: profile.bankName || 'Access Bank Nigeria',
              accountNumber: profile.bankAccountNumber || '2088392102',
              accountName: profile.bankAccountName || profile.name || 'David Alao'
            };
          }
        } catch (e) {}
      }
    }
    return {
      bankName: 'Access Bank Nigeria',
      accountNumber: '2088392102',
      accountName: ride?.driverName || 'David Alao'
    };
  };

  const handleSelectCashPayment = () => {
    const ride = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);
    if (!ride) return;
    const updatedRide: RideRequest = {
      ...ride,
      paymentMethod: 'cash',
      paymentConfirmedByRider: true,
      paymentValidatedByDriver: false,
      riderPaid: true
    };
    onUpdateRide(updatedRide);
    setShowPaymentSelection(false);
    
    // Add chat message indicating payment method selection to Firestore
    const chatId = ride.id;
    if (chatId) {
      const messagesColl = collection(db, 'rideRequests', chatId, 'messages');
      addDoc(messagesColl, {
        sender: 'System',
        text: `${userProfile.name || 'Rider'} has selected Cash Payment for this ride (₦${ride.cost}). Please pay the driver physically upon arrival.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderId: 'system',
        createdAt: Date.now()
      }).catch(e => console.error("Error writing payment system message", e));
    }

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Cash Payment Selected',
      message: `You selected Cash Payment for your ride. Please hand ₦${ride.cost} to your driver upon arrival.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'success'
    });
  };

  const handleConfirmTransferPayment = () => {
    const ride = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);
    if (!ride) return;
    const updatedRide: RideRequest = {
      ...ride,
      paymentMethod: 'transfer',
      paymentConfirmedByRider: true,
      paymentValidatedByDriver: false,
      riderPaid: true
    };
    onUpdateRide(updatedRide);
    setShowPaymentSelection(false);

    // Add chat message indicating payment method selection to Firestore
    const chatId = ride.id;
    if (chatId) {
      const messagesColl = collection(db, 'rideRequests', chatId, 'messages');
      addDoc(messagesColl, {
        sender: 'System',
        text: `${userProfile.name || 'Rider'} has completed the bank transfer of ₦${ride.cost} and is waiting for driver validation.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderId: 'system',
        createdAt: Date.now()
      }).catch(e => console.error("Error writing payment system message", e));
    }

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Transfer Payment Confirmed',
      message: `Your transfer of ₦${ride.cost} has been submitted for validation. The driver will confirm receipt on their device.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'success'
    });
  };

  const handleSelectWalletPayment = () => {
    const ride = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);
    if (!ride) return;
    if (userProfile.walletBalance < ride.cost) {
      alert("Insufficient wallet balance! Please reload your wallet or choose another payment method.");
      return;
    }
    
    // Deduct balance
    const updatedBalance = userProfile.walletBalance - ride.cost;
    onUpdateProfile({ walletBalance: updatedBalance });

    // Add transaction
    const newTxn: Transaction = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      description: `Ride Payment: ${ride.pickup} to ${ride.dropoff}`,
      amount: -ride.cost,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: 'Wallet Balance',
      type: 'charge',
      status: 'Completed',
    };
    onAddTransaction(newTxn);

    const updatedRide: RideRequest = {
      ...ride,
      paymentMethod: 'wallet',
      paymentConfirmedByRider: true,
      paymentValidatedByDriver: true,
      riderPaid: true
    };
    onUpdateRide(updatedRide);
    setShowPaymentSelection(false);

    // Add chat message indicating payment completed to Firestore
    const chatId = ride.id;
    if (chatId) {
      const messagesColl = collection(db, 'rideRequests', chatId, 'messages');
      addDoc(messagesColl, {
        sender: 'System',
        text: `${userProfile.name || 'Rider'} has completed the payment of ₦${ride.cost} via student wallet.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderId: 'system',
        createdAt: Date.now()
      }).catch(e => console.error("Error writing payment system message", e));
    }

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Wallet Payment Completed',
      message: `₦${ride.cost} has been successfully deducted from your wallet for your ride.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'success'
    });
  };

  const handleCopyDetailsAndRedirect = () => {
    const details = getDriverBankDetails();
    navigator.clipboard.writeText(details.accountNumber).then(() => {
      setRideTransferCopied(true);
      setTimeout(() => setRideTransferCopied(false), 2000);
      
      // Simulate redirection to external app
      setIsSimulatingRedirect(true);
      setTimeout(() => {
        setIsSimulatingRedirect(false);
        alert(`Account Number (${details.accountNumber}) copied to clipboard! Opening banking app portal...`);
      }, 1200);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // Helper to resolve stop name from ID
  const getStopName = (stopId: string) => {
    const stop = campusStops.find(s => s.id === stopId);
    return stop ? stop.name : stopId;
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, poolingState]);

  // Synchronize active pools & lobby members & active driver states across tabs/sessions
  useEffect(() => {
    const syncPools = () => {
      const stored = localStorage.getItem('campusride_active_pools');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ActivePool[];
          setActivePools(parsed);
          
          if (joinedPoolId) {
            const myPool = parsed.find(p => p.id === joinedPoolId);
            if (myPool) {
              setLobbyMembers(myPool.currentRiders.map(r => ({
                name: r.name,
                avatar: r.avatar,
                major: r.major,
                gender: r.gender,
                rating: r.rating,
                confirmedStart: r.confirmedStart
              })));

              // If pool has been accepted by a driver, transition matching states
              if (myPool.driverAccepted && myPool.status === 'closed' && poolingState === 'forming') {
                setPoolingState('matched');
                setIsMatchingDriver(false);
              }
            } else {
              // Pool cancel or deleted
              setJoinedPoolId(null);
              setPoolingState('idle');
              setIsMatchingDriver(false);
            }
          }
        } catch (e) {
          console.error("Error parsing stored active pools", e);
        }
      }
    };

    syncPools();
    window.addEventListener('storage', syncPools);
    const interval = setInterval(syncPools, 1500);
    return () => {
      window.removeEventListener('storage', syncPools);
      clearInterval(interval);
    };
  }, [joinedPoolId, poolingState]);

  // Synchronize real-time chat messages from Firestore with localStorage fallback
  useEffect(() => {
    const chatId = joinedPoolId || (activeRide ? activeRide.id : null);
    if (!chatId) {
      setChatMessages([]);
      return;
    }

    // Load initial welcome or localStorage messages first as a visual layout placeholder
    const loadLocalFallback = () => {
      const stored = localStorage.getItem(`campusride_chat_${chatId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
      return [
        { sender: 'System', text: `Welcome to the active transit chat room! Discuss route details safely with your companions and driver.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
      ];
    };
    setChatMessages(loadLocalFallback());

    // Subscribe to Firestore nested messages subcollection
    const messagesColl = collection(db, 'rideRequests', chatId, 'messages');
    const unsubscribe = onSnapshot(messagesColl, (snapshot) => {
      if (!snapshot.empty) {
        const msgs = snapshot.docs.map(docVal => {
          const data = docVal.data();
          return {
            sender: data.sender || 'System',
            text: data.text || '',
            time: data.time || '',
            isUser: data.senderId === userProfile.id,
            senderId: data.senderId || '',
            createdAt: data.createdAt || 0
          };
        });
        // Sort by createdAt ascending
        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setChatMessages(msgs);
      } else {
        setChatMessages(loadLocalFallback());
      }
    }, (err) => {
      console.error("Firestore onSnapshot error, using local fallback:", err);
      setChatMessages(loadLocalFallback());
    });

    return () => {
      unsubscribe();
    };
  }, [joinedPoolId, activeRide?.id, userProfile.id]);

  // Sync poolingState reactively based on Firestore activeRide status
  useEffect(() => {
    if (activeRide) {
      if (activeRide.status === 'requested' || activeRide.status === 'searching') {
        setPoolingState('forming');
      } else if (activeRide.status === 'accepted' || activeRide.status === 'arriving') {
        // If they have selected cash, or confirmed transfer, proceed to transit page!
        if (activeRide.paymentMethod === 'cash' || (activeRide.paymentMethod === 'transfer' && activeRide.paymentConfirmedByRider) || activeRide.paymentMethod === 'wallet') {
          setPoolingState('transit');
        } else {
          setPoolingState('matched');
        }
      } else if (activeRide.status === 'in_transit') {
        setPoolingState('transit');
      } else if (activeRide.status === 'completed') {
        if (activeRide.passengerRated) {
          setPoolingState('idle');
        } else {
          setPoolingState('arrived');
        }
      }
    } else {
      if (poolingState === 'forming' || poolingState === 'matched' || poolingState === 'transit') {
        setPoolingState('idle');
      }
    }
  }, [activeRide?.status, activeRide?.paymentMethod, activeRide?.paymentConfirmedByRider, activeRide?.passengerRated]);

  // Precise 1-minute countdown timer linked to actual requested/created timestamp
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const handleTick = () => {
      const activeReq = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);

      if (poolingState === 'forming' && isMatchingDriver && activeReq) {
        if (activeReq.status === 'accepted' || activeReq.status === 'arriving' || activeReq.status === 'in_transit') {
          setPoolingState('matched');
          setIsMatchingDriver(false);
          setDriverTimer(60);
          onUpdateRide(activeReq);
          return;
        }

        const createdAt = activeReq.createdAt || Date.now();
        const elapsed = Math.floor((Date.now() - createdAt) / 1000);
        const remaining = Math.max(0, 60 - elapsed);
        setDriverTimer(remaining);

        if (remaining <= 0) {
          // Timeout occurred! Set searchFailed to true to offer retry
          setSearchFailed(true);
          onUpdateRide(null);
          setIsMatchingDriver(false);
        }
      } else {
        setDriverTimer(60);
      }

      // Check seat checkout countdown timer if modal open
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
    };

    interval = setInterval(handleTick, 1000);
    return () => clearInterval(interval);
  }, [poolingState, isMatchingDriver, activeRide, activePools, joinedPoolId, checkoutPool]);

  // Live path/trip progress simulation (purely visual progress, no auto-complete)
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    if (poolingState === 'transit') {
      progressInterval = setInterval(() => {
        setLiveDistance(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
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
        passengerId: userProfile.id,
        passengerName: userProfile.name,
        passengerAvatar: userProfile.avatar,
        passengerRating: userProfile.rating || 4.8
      };

      // Get current global scheduled rides, append new one, and save
      const stored = localStorage.getItem('campusride_global_scheduled_rides');
      const allRides = stored ? JSON.parse(stored) : [];
      const updatedRides = [newSchedule, ...allRides];
      localStorage.setItem('campusride_global_scheduled_rides', JSON.stringify(updatedRides));

      setScheduledRides(updatedRides.filter(r => r.passengerId === userProfile.id));
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
      const reqId = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
      const newRequest: RideRequest = {
        id: reqId,
        passengerId: userProfile.id || 'std-123',
        passengerName: userProfile.name || 'Temi Adeyemi',
        passengerAvatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        passengerRating: 4.8,
        passengerType: 'Student',
        pickup: getStopName(pickup),
        dropoff: getStopName(dropoff),
        status: 'requested',
        vehicleType: vehicleType,
        verifyPeer: verifyPeer,
        cost: priceTiers.tier1,
        etaMinutes: 4,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now()
      };

      setLobbyMembers([
        {
          name: userProfile.name || 'Temi Adeyemi',
          avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          major: userProfile.major || 'Software Eng',
          gender: 'Female',
          rating: 4.8,
          confirmedStart: true
        }
      ]);
      const initialMsgs = [
        { sender: 'System', text: `Solo booking initiated. Route: ${getStopName(pickup)} ➔ ${getStopName(dropoff)}. Matching with active drivers on campus... 60-second acceptance window initialized.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
      ];
      localStorage.setItem(`campusride_chat_${reqId}`, JSON.stringify(initialMsgs));
      setChatMessages(initialMsgs);
      
      onUpdateRide(newRequest);
      setPoolingState('forming');
      setIsMatchingDriver(true);

      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Searching for Driver',
        message: `Your Solo ride request is live! Active campus drivers have 60 seconds to accept.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
        isRead: false,
        type: 'info'
      });
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
        vehicleType: activeVehicleConfig.id as any, // Preserve exact model (Corolla, Sienna, Shuttle, Keke)
        currentRiders: [
          {
            name: userProfile.name || 'Temi Adeyemi',
            avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            major: userProfile.major || 'Software Eng',
            rating: 4.8,
            gender: 'Female',
            confirmedStart: true
          }
        ],
        maxRiders: activeVehicleConfig.capacity,
        baseFare: activeVehicleConfig.poolPrice,
        status: 'active',
        driverAcceptCountdown: 60,
        driverAccepted: false,
        createdAt: Date.now()
      };

      const updatedPools = [newPool, ...activePools];
      setActivePools(updatedPools);
      localStorage.setItem('campusride_active_pools', JSON.stringify(updatedPools));
      setJoinedPoolId(newPoolId);

      setLobbyMembers(newPool.currentRiders.map(r => ({
        name: r.name,
        avatar: r.avatar,
        major: r.major,
        gender: r.gender,
        rating: r.rating,
        confirmedStart: r.confirmedStart
      })));
      
      const initialMsgs = [
        { sender: 'System', text: `You initiated a live pool. Route: ${getStopName(pickup)} ➔ ${getStopName(dropoff)}. Looking for companions...`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: false }
      ];
      localStorage.setItem(`campusride_chat_${newPoolId}`, JSON.stringify(initialMsgs));
      setChatMessages(initialMsgs);
      setPoolingState('forming');
      setIsMatchingDriver(false);
    }
  };

  // Chat message submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const currentInput = chatInput;
    const chatId = joinedPoolId || (activeRide ? activeRide.id : null);
    if (!chatId) return;

    setChatInput('');

    try {
      const messagesColl = collection(db, 'rideRequests', chatId, 'messages');
      await addDoc(messagesColl, {
        sender: userProfile.name || 'Me',
        text: currentInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderId: userProfile.id,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error("Error saving chat message to Firestore:", err);
      // Fallback
      const newMsg = {
        sender: userProfile.name || 'Me',
        text: currentInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: true,
        senderId: userProfile.id
      };
      const stored = localStorage.getItem(`campusride_chat_${chatId}`);
      let msgs = [];
      if (stored) {
        try { msgs = JSON.parse(stored); } catch (e) {}
      }
      localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify([...msgs, newMsg]));
    }
  };

  // Quick reply messages
  const sendQuickReply = async (text: string) => {
    const chatId = joinedPoolId || (activeRide ? activeRide.id : null);
    if (!chatId) return;

    try {
      const messagesColl = collection(db, 'rideRequests', chatId, 'messages');
      await addDoc(messagesColl, {
        sender: userProfile.name || 'Me',
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderId: userProfile.id,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error("Error saving quick reply to Firestore:", err);
      // Fallback
      const newMsg = {
        sender: userProfile.name || 'Me',
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: true,
        senderId: userProfile.id
      };
      const stored = localStorage.getItem(`campusride_chat_${chatId}`);
      let msgs = [];
      if (stored) {
        try { msgs = JSON.parse(stored); } catch (e) {}
      }
      localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify([...msgs, newMsg]));
    }
  };

  // Trigger driver transit start
  const handleStartTransit = () => {
    setPoolingState('matched');
    const chatId = joinedPoolId || (activeRide ? activeRide.id : null);
    const newMsg = {
      sender: 'David Alao (Driver)',
      text: 'Hello everyone! I accepted your pool request. Heading to your pickup location now. ETA: 2 minutes.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    };

    if (chatId) {
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
    } else {
      setChatMessages(prev => [...prev, newMsg]);
    }

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
    const updated = activePools.filter(p => p.id !== poolId);
    setActivePools(updated);
    localStorage.setItem('campusride_active_pools', JSON.stringify(updated));

    if (joinedPoolId === poolId) {
      setJoinedPoolId(null);
      setPoolingState('idle');
      setLobbyMembers([]);
      setLiveDistance(0);
      setIsMatchingDriver(false);
      onUpdateRide(null);
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
  };

  // Leave a pool joined by the user
  const handleLeavePool = (poolId: string) => {
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
      setIsMatchingDriver(false);
      onUpdateRide(null);
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
  };

  // Cancel an active ride (solo or pool)
  const handleCancelRide = () => {
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
    setIsMatchingDriver(false);
    onUpdateRide(null);

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Ride Cancelled',
      message: 'Your active ride has been successfully cancelled.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'warning'
    });
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

    const newUserRider = {
      name: userProfile.name || 'Temi Adeyemi',
      avatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      major: userProfile.major || 'Software Eng',
      rating: 4.8,
      gender: 'Female',
      confirmedStart: false
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
    
    const storedChat = localStorage.getItem(`campusride_chat_${pool.id}`);
    let msgs = [];
    if (storedChat) {
      try {
        msgs = JSON.parse(storedChat);
      } catch (err) {}
    }
    const joinMsg = { 
      sender: 'System', 
      text: `You joined ${pool.hostName}'s pool! Route: ${getStopName(pool.pickupId)} ➔ ${getStopName(pool.dropoffId)}. Currently sharing with ${updatedRiders.length} companions. Current Split Fare: ${currencySymbol}${finalJoinFare}/seat.`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      isUser: false 
    };
    const updatedMsgs = [...msgs, joinMsg];
    localStorage.setItem(`campusride_chat_${pool.id}`, JSON.stringify(updatedMsgs));
    setChatMessages(updatedMsgs);
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

  // Confirm rider is ready to start the ride pool
  const handleConfirmStartRide = () => {
    if (!joinedPoolId) return;
    const updated = activePools.map(pool => {
      if (pool.id === joinedPoolId) {
        const updatedRiders = pool.currentRiders.map(r => {
          if (r.name === (userProfile.name || 'Temi Adeyemi')) {
            return { ...r, confirmedStart: true };
          }
          return r;
        });
        return { ...pool, currentRiders: updatedRiders };
      }
      return pool;
    });
    setActivePools(updated);
    localStorage.setItem('campusride_active_pools', JSON.stringify(updated));
    alert("You have confirmed that you are ready to start the ride! Waiting for the host to match a driver.");
  };

  // Host initiates the driver match request (1 minute countdown starts)
  const handleInitiateDriverMatch = () => {
    const finalFare = Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1']);

    const newRequest: RideRequest = {
      id: joinedPoolId || `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
      passengerId: userProfile.id || 'std-123',
      passengerName: userProfile.name || 'Temi Adeyemi',
      passengerAvatar: userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      passengerRating: 4.8,
      passengerType: 'Student',
      pickup: getStopName(pickup),
      dropoff: getStopName(dropoff),
      status: 'requested',
      vehicleType: vehicleType,
      verifyPeer: verifyPeer,
      cost: finalFare,
      etaMinutes: 4,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };

    if (joinedPoolId) {
      const updated = activePools.map(p => {
        if (p.id === joinedPoolId) {
          return { ...p, driverAcceptCountdown: 60, createdAt: Date.now() };
        }
        return p;
      });
      setActivePools(updated);
      localStorage.setItem('campusride_active_pools', JSON.stringify(updated));
    }

    onUpdateRide(newRequest);
    setIsMatchingDriver(true);

    const matchMsg = {
      sender: 'System',
      text: `Matching with active drivers on campus... 60-second acceptance window initialized.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    };

    const chatId = joinedPoolId || newRequest.id;
    if (chatId) {
      const stored = localStorage.getItem(`campusride_chat_${chatId}`);
      let msgs = [];
      if (stored) {
        try {
          msgs = JSON.parse(stored);
        } catch (err) {}
      }
      const updated = [...msgs, matchMsg];
      localStorage.setItem(`campusride_chat_${chatId}`, JSON.stringify(updated));
      setChatMessages(updated);
    } else {
      setChatMessages(prev => [...prev, matchMsg]);
    }

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Searching for Driver',
      message: `Your ride pool match request is live! Active campus drivers have 60 seconds to accept.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'info'
    });
  };

  // Complete / End the ride on student's side
  const handleEndRide = async () => {
    if (!activeRide) return;
    
    const finalFare = activeRide.cost;
    
    // Increment trips count
    onUpdateProfile({
      tripsThisWeek: userProfile.tripsThisWeek + 1,
      savedThisMonth: userProfile.savedThisMonth + Math.max(0, (basePrice - finalFare))
    });

    const updatedRide: RideRequest = {
      ...activeRide,
      status: 'completed'
    };

    await onUpdateRide(updatedRide);
    setPoolingState('arrived');

    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Ride Completed!',
      message: `Your ride from ${getStopName(pickup)} to ${getStopName(dropoff)} has been successfully completed.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      isRead: false,
      type: 'receipt'
    });
  };

  // Complete Rating
  const handleRateSubmit = async () => {
    // Average the rating and update driverProfile directly in Firestore
    if (activeRide) {
      if (activeRide.driverId && ratingScore > 0) {
        const driverId = activeRide.driverId;
        try {
          const driverDocRef = doc(db, 'users', driverId);
          const driverDocSnap = await getDoc(driverDocRef);
          
          let currentRating = 5.0;
          let currentCount = 0;
          
          if (driverDocSnap.exists()) {
            const driverData = driverDocSnap.data();
            currentRating = driverData.rating ?? 5.0;
            currentCount = driverData.ratingsCount ?? 0;
          }
          
          const newCount = currentCount + 1;
          const newRating = Number(((currentRating * currentCount + ratingScore) / newCount).toFixed(2));
          
          // Update the driver's profile in Firestore directly!
          await updateDoc(driverDocRef, {
            rating: newRating,
            ratingsCount: newCount
          });

          // Add a review doc to the driver's reviews subcollection
          const reviewId = `rev-${Date.now()}`;
          await setDoc(doc(db, 'users', driverId, 'reviews', reviewId), {
            id: reviewId,
            passengerName: activeRide.passengerName || 'Anonymous Rider',
            passengerAvatar: activeRide.passengerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            rating: ratingScore,
            comment: reviewText.trim() || 'Rider rated the travel experience.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: 'Today',
            createdAt: Date.now()
          });

          // Clear review feedback state
          setReviewText('');

          // Add a notification to the driver
          const notifId = `notif-${Date.now()}`;
          await setDoc(doc(db, 'users', driverId, 'notifications', notifId), {
            id: notifId,
            title: 'New Trip Rating Received',
            message: `A passenger rated your recent ride ${ratingScore} Stars. Your average rating is now ★ ${newRating}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: 'Today',
            isRead: false,
            type: 'success'
          });

        } catch (err) {
          console.error("Error updating driver rating:", err);
        }
      }

      // Mark the ride as passenger rated in Firestore so onSnapshot ignores it
      try {
        await updateDoc(doc(db, 'rideRequests', activeRide.id), {
          passengerRated: true
        });
      } catch (e) {
        console.error("Error marking passengerRated in Firestore:", e);
      }
    }

    setPoolingState('idle');
    onUpdateRide(null); // Clear active ride to allow new bookings
    alert(`Thank you for rating your ride! You rated the driver ${ratingScore} stars.`);
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

  const activeReq = activeRide || (joinedPoolId ? activePools.find(p => p.id === joinedPoolId) : null);

  return (
    <div id="student-portal-viewport" className="flex-1 flex flex-col bg-slate-50 text-slate-800">
      <AnimatePresence mode="wait">
        
        {/* 1. VIEW CONTEXT: RIDE BOOKING / LOBBY / TRANSIT (ACTIVE VIEW = BOOKING) */}
        {activeView === 'booking' && (
          <motion.div
            key="booking"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 lg:p-8"
          >
          
          {/* LEFT SIDE OR MAIN BOOKING SECTION (12 COLS ON LARGE) */}
          <div className="lg:col-span-12 flex flex-col space-y-6">
            <CampusMap
              schoolId={selectedSchool.id}
              pickupId={pickup}
              dropoffId={dropoff}
              poolingState={poolingState}
              isMatchingDriver={isMatchingDriver}
              liveDistance={liveDistance}
              onSelectPickup={(stopId) => setPickup(stopId)}
              onSelectDropoff={(stopId) => setDropoff(stopId)}
            />

            {/* IF IDLE, RENDER BOOKING FORM */}
            {poolingState === 'idle' && (
              <>
                {/* Main Form Booking details */}
                <div className="bg-white p-6 rounded-3xl shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black tracking-tight text-[#00875A]">
                      BOOK OR SCHEDULE A RIDE
                    </h2>
                    
                    {/* Schedule vs Now Selector */}
                    <div className="relative flex bg-slate-100 p-1 rounded-xl z-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setBookingMode('now')}
                        className="relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer z-10"
                      >
                        {bookingMode === 'now' && (
                          <motion.div 
                            layoutId="activeBookingModeBg"
                            className="absolute inset-0 bg-[#00875A] rounded-lg shadow-sm -z-10"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className={`transition-colors duration-200 ${bookingMode === 'now' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                          Book Now
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode('schedule')}
                        className="relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer z-10"
                      >
                        {bookingMode === 'schedule' && (
                          <motion.div 
                            layoutId="activeBookingModeBg"
                            className="absolute inset-0 bg-[#00875A] rounded-lg shadow-sm -z-10"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className={`transition-colors duration-200 ${bookingMode === 'schedule' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                          Schedule Ride
                        </span>
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
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00875A]" />
                          <select
                            value={pickup}
                            onChange={(e) => setPickup(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-150 shadow-xs hover:border-[#00875A] text-slate-800 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00875A]/50 appearance-none cursor-pointer"
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
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md hover:border-[#00875A] text-[#00875A] flex items-center justify-center cursor-pointer transition-colors"
                          title="Swap Route"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropoff Spot Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Destination Stop</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00875A]" />
                          <select
                            value={dropoff}
                            onChange={(e) => setDropoff(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-150 shadow-xs hover:border-[#00875A] text-slate-800 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00875A]/50 appearance-none cursor-pointer"
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
                      <div className="grid grid-cols-2 gap-3 p-4 bg-[#F9FAFB] rounded-2xl border border-slate-200 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00875A]" />
                            <input
                              type="date"
                              required
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00875A]"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Select Time</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00875A]" />
                            <input
                              type="time"
                              required
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00875A]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Choose Mode tab selection: Create a Pool vs Go Solo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ride Mode Choice</label>
                      <div className="relative grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl z-0 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setRideMode('create')}
                          className="relative py-3 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer z-10"
                        >
                          {rideMode === 'create' && (
                            <motion.div 
                              layoutId="activeRideModeBg"
                              className="absolute inset-0 bg-[#00875A] rounded-xl shadow-md -z-10"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <Users className={`w-4 h-4 transition-colors duration-200 ${rideMode === 'create' ? 'text-white' : 'text-slate-400'}`} />
                          <span className={`transition-colors duration-200 ${rideMode === 'create' ? 'text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                            Create Pool
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRideMode('solo')}
                          className="relative py-3 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer z-10"
                        >
                          {rideMode === 'solo' && (
                            <motion.div 
                              layoutId="activeRideModeBg"
                              className="absolute inset-0 bg-[#00875A] rounded-xl shadow-md -z-10"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <Car className={`w-4 h-4 transition-colors duration-200 ${rideMode === 'solo' ? 'text-white' : 'text-slate-400'}`} />
                          <span className={`transition-colors duration-200 ${rideMode === 'solo' ? 'text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                            Go Solo
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Option 1: CREATE POOL VIEW DETAILS */}
                    {rideMode === 'create' && (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Vehicle Type Select */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Choose Transit Vibe</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {VEHICLES.map((v) => {
                              const isSelected = selectedVehicleId === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setSelectedVehicleId(v.id)}
                                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-slate-100 border-[#00875A] text-[#00875A] shadow-sm font-bold' 
                                      : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                                  }`}
                                >
                                  {v.id === 'Keke' ? (
                                    <Zap className="w-5 h-5 stroke-[2]" />
                                  ) : v.id === 'Shuttle' ? (
                                    <Users className="w-5 h-5 stroke-[2]" />
                                  ) : (
                                    <Car className="w-5 h-5 stroke-[2]" />
                                  )}
                                  <span className="text-[11px] font-bold truncate max-w-full text-center leading-tight">{v.name}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold">Cap: {v.capacity}</span>
                                  <span className="text-[10px] font-mono font-black text-[#00875A] bg-[#00875A]/5 px-1.5 py-0.5 rounded-md">{currencySymbol}{v.poolPrice}/seat</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dynamic Pooling Info display */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dynamic Pooling Tiers</span>
                            <span className="text-[10px] font-mono text-[#00875A] font-bold">FLAT RATE FOR ALL COMMUTERS</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-100/40 p-2.5 rounded-xl border border-slate-200 text-left flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold block">Flat Rate Per Seat</span>
                                <span className="text-xs text-slate-400">Paid by each commuter</span>
                              </div>
                              <span className="text-base font-mono font-black text-[#00875A] bg-[#00875A]/10 px-2 py-0.5 rounded-lg">{currencySymbol}{activeVehicleConfig.poolPrice}</span>
                            </div>
                            <div className="bg-[#00875A]/5 p-2.5 rounded-xl border border-[#00875A]/20 text-left flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-[#00875A] font-extrabold block">Lobby Capacity</span>
                                <span className="text-xs text-slate-500">Max seats available</span>
                              </div>
                              <span className="text-base font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">{activeVehicleConfig.capacity} Seats</span>
                            </div>
                          </div>
                        </div>

                        {/* Toggle safety companions option */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-[#00875A]/15 flex items-center justify-center border border-[#00875A]/30">
                              <ShieldCheck className="w-5 h-5 text-[#00875A]" />
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
                            <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00875A]"></div>
                          </label>
                        </div>

                        {/* CTA button */}
                        <button
                          type="submit"
                          className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all transform active:scale-[0.99] duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                          <Users className="w-5 h-5" />
                          {bookingMode === 'schedule' ? 'Schedule Pool Ride' : 'Form Live Ride Pool'}
                        </button>
                      </div>
                    )}

                    {/* Option 2: FIND POOL VIEW DETAILS */}
                    {rideMode === 'find' && (
                      <div className="space-y-4 animate-fadeIn text-left">
                        <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-slate-200">
                          <p className="text-xs font-bold text-[#00875A] uppercase tracking-wide flex items-center gap-1.5 mb-1">
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
                                    <span className="text-[9px] bg-[#00875A]/10 text-[#00875A] px-1.5 py-0.5 rounded-md font-bold">★ {simPool.rating}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium font-sans">{simPool.major} • heading to {simPool.dropoff}</p>
                                  <p className="text-[10px] text-slate-500 font-bold font-mono uppercase mt-0.5 text-slate-600">{simPool.vehicleType} Vehicle</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Est. Cost</span>
                                  <span className="text-sm font-mono font-black text-[#00875A]">{currencySymbol}{simPool.fare}/seat</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
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
                                  className="bg-[#00875A] hover:bg-[#00875A]/95 text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer shadow-sm transition-colors"
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
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {VEHICLES.map((v) => {
                              const isSelected = selectedVehicleId === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setSelectedVehicleId(v.id)}
                                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-slate-100 border-[#00875A] text-[#00875A] shadow-sm font-bold' 
                                      : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-500'
                                  }`}
                                >
                                  {v.id === 'Keke' ? (
                                    <Zap className="w-5 h-5 stroke-[2]" />
                                  ) : v.id === 'Shuttle' ? (
                                    <Users className="w-5 h-5 stroke-[2]" />
                                  ) : (
                                    <Car className="w-5 h-5 stroke-[2]" />
                                  )}
                                  <span className="text-[11px] font-bold truncate max-w-full text-center leading-tight">{v.name}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold">Cap: {v.capacity}</span>
                                  <span className="text-[10px] font-mono font-black text-[#00875A] bg-[#00875A]/5 px-1.5 py-0.5 rounded-md">{currencySymbol}{v.soloPrice}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Flat Fare Receipt preview */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-600 uppercase block tracking-wider">Direct Solo Fare</span>
                            <span className="text-[10px] text-slate-500">No companions, straight direct delivery in {activeVehicleConfig.name}.</span>
                          </div>
                          <span className="text-lg font-mono font-black text-slate-800">{currencySymbol}{activeVehicleConfig.soloPrice}</span>
                        </div>

                        {/* Solo CTA Button */}
                        <button
                          type="submit"
                          className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all transform active:scale-[0.99] duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
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
                    <h3 className="text-sm font-black text-[#00875A] uppercase tracking-wider flex items-center gap-1.5">
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
                              <Calendar className="w-3 h-3 text-[#00875A]" /> {ride.date} • <Clock className="w-3 h-3 text-[#00875A]" /> {ride.time}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <span className="text-xs font-mono font-black text-[#00875A]">{currencySymbol}{ride.fare}</span>
                             <button
                              type="button"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this scheduled ride?')) {
                                  const stored = localStorage.getItem('campusride_global_scheduled_rides');
                                  if (stored) {
                                    try {
                                      const allRides = JSON.parse(stored) as any[];
                                      const updated = allRides.filter(r => r.id !== ride.id);
                                      localStorage.setItem('campusride_global_scheduled_rides', JSON.stringify(updated));
                                    } catch (e) {}
                                  }
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
                    <span className="bg-[#00875A]/15 text-[#00875A] text-xs font-bold border border-[#00875A]/30 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      {isMatchingDriver ? 'MATCHING WITH DRIVER' : 'POOL FORMING LOBBY'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Route: {getStopName(pickup)} ➔ {getStopName(dropoff)}</span>
                  </div>

                  {/* Ticking Driver Accept Countdown Bar */}
                  {isMatchingDriver && (
                    <div className="bg-amber-50 border border-amber-150 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                        <div>
                          <span className="text-xs font-black text-amber-800 block uppercase tracking-wide">Waiting for Driver to Accept</span>
                          <span className="text-[10px] text-amber-700 block font-semibold">Driver has 1 minute to accept before timeout</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xl font-mono font-black text-[#00875A] bg-[#00875A]/10 px-2 py-0.5 rounded-md">
                          {driverTimer}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Search Failed Retry State */}
                  {searchFailed && (
                    <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex flex-col space-y-4 shadow-sm animate-fadeIn">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="text-xs font-black text-rose-800 block uppercase tracking-wide">No Drivers Accepted</span>
                          <span className="text-[11px] text-rose-700 block font-semibold mt-1 leading-normal">
                            We couldn't connect you with an active driver on campus within the 60-second window. Would you like to retry the matchmaking search or return to the lobby?
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSearchFailed(false);
                            handleInitiateDriverMatch();
                          }}
                          className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold py-2.5 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                          Retry Search
                        </button>
                        <button
                          onClick={() => {
                            setSearchFailed(false);
                            if (!joinedPoolId) {
                              setPoolingState('idle');
                            }
                          }}
                          className="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                        >
                          {!joinedPoolId ? 'Cancel Request' : 'Return to Lobby'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isMatchingDriver && !searchFailed && (
                    <div className="text-center py-6">
                      <h3 className="text-2xl font-black text-[#00875A] tracking-tight">Searching for Companions...</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Connecting campus commuters traveling in your direction to minimize your transport fares live.</p>
                    </div>
                  )}

                  {/* Non-host confirmation button */}
                  {(() => {
                    const pool = activePools.find(p => p.id === joinedPoolId);
                    const isHost = pool ? pool.hostName === (userProfile.name || 'Temi Adeyemi') : true;
                    const myMemberObj = lobbyMembers.find(m => m.name === (userProfile.name || 'Temi Adeyemi'));
                    if (joinedPoolId && !isHost && myMemberObj && !myMemberObj.confirmedStart) {
                      return (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col items-center text-center gap-2 mb-4 animate-fadeIn">
                          <span className="text-xs font-bold text-amber-800">Ready to start the ride?</span>
                          <p className="text-[10px] text-amber-600">The pool host is waiting for all members to confirm before requesting a driver.</p>
                          <button
                            onClick={handleConfirmStartRide}
                            className="bg-[#00875A] hover:bg-[#00875A]/90 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-transform transform active:scale-95 shadow-md cursor-pointer"
                          >
                            Confirm Start Ride
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Occupancy Seating Tracker progress bar (just like user's wireframe) */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seating Capacity Filled</span>
                      <span className="text-sm font-mono font-black text-[#00875A]">{lobbyMembers.length}/{activeVehicleConfig.capacity} SEATS</span>
                    </div>

                    {/* Seating progress bar indicators */}
                    <div className="grid gap-2.5 h-3" style={{ gridTemplateColumns: `repeat(${activeVehicleConfig.capacity}, minmax(0, 1fr))` }}>
                      {Array.from({ length: activeVehicleConfig.capacity }).map((_, idx) => {
                        const seatNum = idx + 1;
                        const isFilled = lobbyMembers.length >= seatNum;
                        const isNextWaiting = lobbyMembers.length === idx;
                        return (
                          <div 
                            key={idx}
                            className={`rounded-full transition-all duration-300 ${
                              isFilled ? 'bg-[#00875A]' : 'bg-slate-200'
                            } ${isNextWaiting ? 'animate-pulse bg-slate-300' : ''}`}
                          ></div>
                        );
                      })}
                    </div>

                    {/* Pricing ticker based on joined members */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-500">Current Cost per Seat:</span>
                      <span className="font-mono font-black text-lg text-[#00875A] flex items-center gap-1">
                        {currencySymbol}{activeVehicleConfig.poolPrice}
                        <span className="text-[10px] text-gray-500 font-medium font-sans">/seat</span>
                      </span>
                    </div>
                  </div>

                  {/* Joined Pool Members Cards */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Commuters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lobbyMembers.map((member, idx) => {
                        const pool = activePools.find(p => p.id === joinedPoolId);
                        const isHost = pool ? pool.hostName === member.name : idx === 0;
                        const isConfirmed = member.confirmedStart || isHost;
                        return (
                          <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              <img 
                                referrerPolicy="no-referrer"
                                src={member.avatar} 
                                alt={member.name} 
                                className="w-10 h-10 rounded-full object-cover border border-slate-150 shadow-xs shadow-sm shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold block text-slate-800 truncate">{member.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono tracking-wide uppercase truncate block">{member.major} • {member.gender}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[10px] font-mono text-amber-500 bg-[#00875A]/5 border border-amber-500/10 px-1.5 py-0.5 rounded-lg">
                                ★ {member.rating}
                              </span>
                              {isHost ? (
                                <span className="text-[9px] bg-sage-light/30 text-sage-dark px-1.5 py-0.5 rounded-md font-bold uppercase">Host</span>
                              ) : isConfirmed ? (
                                <span className="text-[9px] bg-sage-light/30 text-sage-dark px-1.5 py-0.5 rounded-md font-bold uppercase flex items-center gap-0.5">
                                  ✓ Ready
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-150 text-slate-500 px-1.5 py-0.5 rounded-md font-bold uppercase animate-pulse">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Placeholder spots */}
                      {Array.from({ length: Math.max(0, activeVehicleConfig.capacity - lobbyMembers.length) }).map((_, idx) => (
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
                      onClick={() => {
                        handleDeletePool(joinedPoolId);
                      }}
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

                  {(() => {
                    const pool = activePools.find(p => p.id === joinedPoolId);
                    const isHost = pool ? pool.hostName === (userProfile.name || 'Temi Adeyemi') : true;
                    const allOthersConfirmed = lobbyMembers.slice(1).every(m => m.confirmedStart);
                    const canMatch = !joinedPoolId || isHost;
                    const matchEnabled = lobbyMembers.length === 1 || allOthersConfirmed;

                    if (!canMatch) {
                      return (
                        <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-center text-[10px] text-gray-500 font-bold flex items-center justify-center">
                          Waiting for host to start ride
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={handleInitiateDriverMatch}
                        disabled={!matchEnabled || isMatchingDriver || searchFailed}
                        className={`w-full font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isMatchingDriver
                            ? 'bg-amber-100 border border-amber-200 text-amber-800 font-mono animate-pulse'
                            : searchFailed
                              ? 'bg-rose-100 border border-rose-200 text-rose-800 font-mono cursor-not-allowed'
                              : matchEnabled
                                ? 'bg-[#00875A] text-white hover:bg-[#00875A]/90'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {isMatchingDriver ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                            <span>Searching ({driverTimer}s)</span>
                          </>
                        ) : searchFailed ? (
                          'Search Expired'
                        ) : matchEnabled ? (
                          'Match Driver Now'
                        ) : (
                          'Waiting for Riders'
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* IF MATCHED WITH DRIVER */}
            {poolingState === 'matched' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold border px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider ${
                    activeRide?.status === 'arriving'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-emerald-100 text-[#00875A] border-emerald-300'
                  }`}>
                    {activeRide?.status === 'arriving' ? 'DRIVER HAS ARRIVED' : 'WAITING FOR DRIVER ARRIVAL'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {activeRide?.status === 'arriving' ? 'Driver is at Stop' : 'ETA: 2 Minutes'}
                  </span>
                </div>

                {/* Implications & Safety Alerts Box */}
                <div className="bg-amber-500/5 border border-amber-500/25 p-4 rounded-2xl space-y-2 text-left">
                  <span className="text-xs font-extrabold text-[#BE5912] uppercase block tracking-wider">Ride Guidelines & Cancellation Policy</span>
                  <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-1 leading-relaxed">
                    <li><strong>Match Vehicle Plate:</strong> Verify vehicle corresponds to <span className="font-mono bg-slate-100 px-1 py-0.5 rounded font-black text-slate-800">RUN-918-LA</span> before boarding.</li>
                    <li><strong>Logistics Liability:</strong> Cancellations after driver accepts cause gridlocks. Avoid repetitive cancellations to maintain a high rating.</li>
                    <li><strong>Payment Timing:</strong> Please wait for driver arrival confirmation, then select your payment option on this screen to release lock.</li>
                  </ul>
                </div>

                {/* Driver Profile Summary */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 text-left">
                    <img 
                      referrerPolicy="no-referrer"
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" 
                      alt="David Alao" 
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-150 shadow-xs shadow-md"
                    />
                    <div>
                      <h3 className="text-base font-black text-[#00875A] flex items-center gap-1.5">
                        David Alao 
                        <span className="text-xs font-mono text-amber-500 bg-[#00875A]/10 border border-amber-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          ★ 4.9
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-bold font-mono">Toyota Corolla (Silver) • RUN-918-LA</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 text-left">Mobile: +234 812 345 6789</p>
                    </div>
                  </div>
                  
                  {/* Security PIN code to unlock ride */}
                  <div className="bg-white border border-slate-150 shadow-xs px-4 py-3 rounded-2xl text-center shrink-0">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">BOARDING PIN</span>
                    <span className="text-lg font-mono font-black tracking-widest text-[#00875A]">{verificationCode}</span>
                  </div>
                </div>

                {/* Trust Payment Method Card */}
                <div className="space-y-4">
                  <div className="p-4 bg-[#00875A]/5 rounded-2xl border border-[#00875A]/15 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-left">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        activeRide?.paymentMethod 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-amber-100 text-amber-600 animate-bounce'
                      }`}>
                        {activeRide?.paymentMethod === 'transfer' ? <ArrowRightLeft className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">PAYMENT METHOD</span>
                        <span className="text-xs font-extrabold text-slate-700">
                          {activeRide?.paymentMethod === 'transfer' 
                            ? 'Bank Transfer' 
                            : activeRide?.paymentMethod === 'cash' 
                              ? 'Handover Cash'
                              : activeRide?.paymentMethod === 'wallet'
                                ? 'Student Wallet'
                                : 'Select Option to Proceed'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {activeRide?.paymentMethod ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold font-mono ${
                            activeRide?.paymentValidatedByDriver
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700 animate-pulse'
                          }`}>
                            {activeRide?.paymentValidatedByDriver ? 'Paid & Confirmed' : 'Awaiting Validation'}
                          </span>
                          <button
                            onClick={() => {
                              setPaymentStep('select');
                              setShowPaymentSelection(true);
                            }}
                            className="text-[10px] text-[#00875A] hover:underline font-extrabold cursor-pointer"
                          >
                            Change Method
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => {
                              setPaymentStep('select');
                              setShowPaymentSelection(true);
                            }}
                            className="bg-[#00875A] hover:bg-[#00875A]/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-sm animate-pulse"
                          >
                            Pay Fare (₦{activeRide?.cost})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeRide?.paymentMethod === 'transfer' && (
                    <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-150 text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider">Driver Bank Details (Transfer)</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold font-mono ${
                          activeRide.paymentValidatedByDriver
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : activeRide.paymentConfirmedByRider
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {activeRide.paymentValidatedByDriver
                            ? '✓ Confirmed by Driver'
                            : activeRide.paymentConfirmedByRider
                              ? 'Awaiting Driver Confirmation'
                              : 'Pending Transfer Submission'}
                        </span>
                      </div>

                      <div className="bg-white border border-blue-100 p-3 rounded-xl space-y-2 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Bank Name:</span>
                          <span className="font-extrabold text-slate-800">{getDriverBankDetails().bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Account Number:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-[#00875A] text-sm tracking-wider">{getDriverBankDetails().accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(getDriverBankDetails().accountNumber);
                                setRideTransferCopied(true);
                                setTimeout(() => setRideTransferCopied(false), 2000);
                              }}
                              className="p-1 hover:bg-[#00875A]/10 text-[#00875A] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Copy account number"
                            >
                              {rideTransferCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Account Name:</span>
                          <span className="font-bold text-slate-800 uppercase">{getDriverBankDetails().accountName}</span>
                        </div>
                      </div>

                      {!activeRide.paymentConfirmedByRider && (
                        <button
                          type="button"
                          onClick={handleConfirmTransferPayment}
                          className="w-full bg-[#00875A] hover:bg-[#00875A]/95 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm Transfer Sent
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-left">Your Ride Pool Members</span>
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
                    disabled={!activeRide?.riderPaid || activeRide?.status === 'accepted'}
                    onClick={() => {
                      setPoolingState('transit');
                    }}
                    className={`w-full font-black py-3.5 px-4 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                      activeRide?.riderPaid && activeRide?.status === 'arriving'
                        ? 'bg-[#00875A] hover:bg-[#00875A]/90 text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    {activeRide?.status === 'accepted' 
                      ? 'Wait For Arrival' 
                      : activeRide?.riderPaid 
                        ? 'Ready to Commute' 
                        : 'Pay to Board'}
                  </button>
                </div>

                {/* COMPLAINT SUBMISSION MODULE */}
                <div className="mt-4 border-t border-slate-150 pt-4 text-left">
                  {!isComplaintFormOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsComplaintFormOpen(true)}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 py-3 px-4 rounded-2xl transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                      File An On-Trip Complaint
                    </button>
                  ) : (
                    <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4 text-left space-y-3.5">
                      <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                        <span className="text-xs font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Lodge Active Trip Dispute
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsComplaintFormOpen(false)}
                          className="text-xs font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {complaintSuccessMsg ? (
                        <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-200 animate-pulse">
                          {complaintSuccessMsg}
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-rose-850 uppercase tracking-wider font-mono">Dispute Category</label>
                            <select
                              value={complaintCategory}
                              onChange={(e) => setComplaintCategory(e.target.value)}
                              className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-700"
                            >
                              <option value="Driver Behavior">Unprofessional Driver Behavior</option>
                              <option value="Dangerous Driving">Dangerous Driving or Speeding</option>
                              <option value="Route Deviation">Incorrect or Unauthorized Route Deviation</option>
                              <option value="Vehicle Condition">Unsanitary or Damaged Vehicle Condition</option>
                              <option value="Overcharging Dispute">Fare Dispute / Overcharging</option>
                              <option value="Other">Other Operational Safety Concerns</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-rose-850 uppercase tracking-wider font-mono">Incident Details</label>
                            <textarea
                              value={complaintDetails}
                              onChange={(e) => setComplaintDetails(e.target.value)}
                              placeholder="Provide specific details about what is happening on this ride. This is sent directly to administrators in real time."
                              rows={3}
                              className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 outline-none text-slate-700 placeholder-slate-400 leading-relaxed font-semibold"
                              required
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleSendComplaint(e as any)}
                            disabled={isSubmittingComplaint || !complaintDetails.trim()}
                            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-900/10 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                          >
                            {isSubmittingComplaint ? 'Submitting Dispute...' : 'Transmit Dispute to Admin'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IF IN TRANSIT tracking map */}
            {poolingState === 'transit' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6">
                <div className="flex justify-between items-center">
                  <span className="bg-[#00875A]/15 text-blue-400 text-xs font-bold border border-[#00875A]/30 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-mono tracking-wider">
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
                        ? 'bg-[#00875A] text-white border-[#00875A] animate-pulse' 
                        : 'bg-transparent text-[#00875A] border-[#00875A]/30 hover:bg-[#00875A]/10'
                    }`}
                  >
                    {sosActivated ? 'SOS ON' : 'Trigger SOS'}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={handleEndRide}
                    className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-black py-3.5 px-4 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Conclude & End Ride
                  </button>
                </div>

                {/* COMPLAINT SUBMISSION MODULE */}
                <div className="mt-4 border-t border-slate-150 pt-4 text-left">
                  {!isComplaintFormOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsComplaintFormOpen(true)}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 py-3 px-4 rounded-2xl transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                      File An On-Trip Complaint
                    </button>
                  ) : (
                    <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4 text-left space-y-3.5">
                      <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                        <span className="text-xs font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Lodge Active Trip Dispute
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsComplaintFormOpen(false)}
                          className="text-xs font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {complaintSuccessMsg ? (
                        <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-200 animate-pulse">
                          {complaintSuccessMsg}
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-rose-850 uppercase tracking-wider font-mono">Dispute Category</label>
                            <select
                              value={complaintCategory}
                              onChange={(e) => setComplaintCategory(e.target.value)}
                              className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-700"
                            >
                              <option value="Driver Behavior">Unprofessional Driver Behavior</option>
                              <option value="Dangerous Driving">Dangerous Driving or Speeding</option>
                              <option value="Route Deviation">Incorrect or Unauthorized Route Deviation</option>
                              <option value="Vehicle Condition">Unsanitary or Damaged Vehicle Condition</option>
                              <option value="Overcharging Dispute">Fare Dispute / Overcharging</option>
                              <option value="Other">Other Operational Safety Concerns</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-rose-850 uppercase tracking-wider font-mono">Incident Details</label>
                            <textarea
                              value={complaintDetails}
                              onChange={(e) => setComplaintDetails(e.target.value)}
                              placeholder="Provide specific details about what is happening on this ride. This is sent directly to administrators in real time."
                              rows={3}
                              className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 outline-none text-slate-700 placeholder-slate-400 leading-relaxed font-semibold"
                              required
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleSendComplaint(e as any)}
                            disabled={isSubmittingComplaint || !complaintDetails.trim()}
                            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-900/10 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                          >
                            {isSubmittingComplaint ? 'Submitting Dispute...' : 'Transmit Dispute to Admin'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IF ARRIVED / TRIP FINISHED - RENDER RATING & REVIEW SCREEN */}
            {(poolingState === 'arrived' || poolingState === 'rated') && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6 text-center">
                <div className="w-16 h-16 bg-[#00875A]/10 border border-[#00875A]/20 text-[#00875A] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-2xl font-black text-[#00875A] tracking-tight">Trip Completed!</h3>
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
                    <span className="font-mono text-[#00875A] font-black">{currencySymbol}{Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1'])}</span>
                  </div>
                  <div className="h-px bg-gray-850"></div>
                  <div className="flex justify-between text-xs bg-sage-dark/10 p-2 rounded-lg border border-sage-light/30">
                    <span className="text-sage-medium font-bold">Total Cash Saved:</span>
                    <span className="font-mono text-sage-medium font-black">+{currencySymbol}{basePrice - Math.round(priceTiers[`tier${lobbyMembers.length as 1|2|3|4}` || 'tier1'])}</span>
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
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                  />

                  <button
                    onClick={handleRateSubmit}
                    className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Finish & Close Trip
                  </button>
                </div>
              </div>
            )}
            
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
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#00875A] tracking-tight uppercase">Browse Active Pools</h1>
              <p className="text-xs text-slate-500">
                Join matching commutes created by fellow students to split fares and ride safely.
              </p>
            </div>
            <button
              onClick={() => {
                setRideMode('create');
                onNavigate('booking');
              }}
              className="px-5 py-3 bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00875A]/10"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Start New Pool</span>
            </button>
          </div>

          {/* Filters Widget Panel */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <Search className="w-4 h-4 text-[#00875A]" />
              <span>Search Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pickup filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pickup Stop</label>
                <select
                  value={browseFilterPickup}
                  onChange={(e) => setBrowseFilterPickup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00875A]"
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
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00875A]"
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
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00875A]"
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
                  className="text-[10px] font-bold text-[#00875A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" /> Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Pools Grid */}
          {activePools.filter(pool => {
            const elapsed = pool.createdAt ? Math.floor((Date.now() - pool.createdAt) / 1000) : 0;
            const remaining = Math.max(0, (pool.driverAcceptCountdown ?? 60) - elapsed);
            if (remaining <= 0) return false;
            if (pool.status === 'closed' || pool.status === 'transit') return false;
            if (browseFilterPickup !== 'all' && pool.pickupId !== browseFilterPickup) return false;
            if (browseFilterDropoff !== 'all' && pool.dropoffId !== browseFilterDropoff) return false;
            if (browseFilterVehicle !== 'all' && pool.vehicleType !== browseFilterVehicle) return false;
            return true;
          }).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePools.filter(pool => {
                const elapsed = pool.createdAt ? Math.floor((Date.now() - pool.createdAt) / 1000) : 0;
                const remaining = Math.max(0, (pool.driverAcceptCountdown ?? 60) - elapsed);
                if (remaining <= 0) return false;
                if (pool.status === 'closed' || pool.status === 'transit') return false;
                if (browseFilterPickup !== 'all' && pool.pickupId !== browseFilterPickup) return false;
                if (browseFilterDropoff !== 'all' && pool.dropoffId !== browseFilterDropoff) return false;
                if (browseFilterVehicle !== 'all' && pool.vehicleType !== browseFilterVehicle) return false;
                return true;
              }).map((pool) => {
                const elapsed = pool.createdAt ? Math.floor((Date.now() - pool.createdAt) / 1000) : 0;
                const remainingSeconds = Math.max(0, (pool.driverAcceptCountdown ?? 60) - elapsed);
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
                        {remainingSeconds}s
                      </span>
                    </div>

                    {/* Route Line */}
                    <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-[#00875A] shrink-0" />
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
                        <span className={isFull ? 'text-red-500' : 'text-[#00875A]'}>
                          {pool.currentRiders.length}/{pool.maxRiders} Seats Filled
                        </span>
                      </div>
                      {/* Grid representation of filled seats */}
                      <div className="grid grid-cols-4 gap-1.5 h-2">
                        {Array.from({ length: pool.maxRiders }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`rounded-full h-full ${
                              idx < pool.currentRiders.length ? 'bg-[#00875A]' : 'bg-slate-150'
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
                          ? 'bg-sage-bg/30 border border-sage-light text-[#00875A]'
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
                          <span className="text-base font-extrabold text-[#00875A] font-mono">
                            {currencySymbol}{splitFareMax}
                          </span>
                          <span className="text-[9px] text-slate-400 line-through font-mono">
                            {currencySymbol}{baseF}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-sage-medium font-bold block bg-sage-bg/30 px-2 py-0.5 rounded-md uppercase tracking-wider border border-sage-light/40 font-sans">
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
                            : 'bg-[#00875A] hover:bg-[#00875A]/95 text-white shadow-md shadow-sage-medium/10'
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
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-[#00875A]">
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
                  className="px-4 py-2.5 bg-[#00875A] hover:bg-[#00875A]/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
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
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          <h1 className="text-2xl font-black text-[#00875A] tracking-tight">RIDER PORTAL SUMMARY</h1>
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Pooling savings (Month)</span>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">+{currencySymbol}{(transactions.filter(t => t.type === 'charge').reduce((acc, t) => acc + Math.round(Math.abs(t.amount) * 1.5), 0)).toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
              <p className="text-[10px] text-emerald-600 mt-0.5">Saved split cost by sharing rides</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Trips completed</span>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">{transactions.filter(t => t.type === 'charge').length}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Reliable campus commutes logged</p>
            </div>
          </div>

          {/* Interactive Custom SVG Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-[#00875A] uppercase tracking-wider">Weekly Transit Outlay</h3>
                <p className="text-xs text-gray-500">Breakdown of transport expenses on campus (split vs. solo)</p>
              </div>
              <span className="text-xs bg-slate-100 border border-slate-150 shadow-xs px-3 py-1 rounded-xl font-mono">Last 7 Days</span>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-[200px] w-full flex items-end justify-between pt-6 px-4">
              {(() => {
                const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const currentDayIdx = new Date().getDay();
                
                // Last 7 days chart array
                const chartData = Array.from({ length: 7 }, (_, i) => {
                  const idx = (currentDayIdx - 6 + i + 7) % 7;
                  return { day: daysOfWeek[idx], split: 0, solo: 0 };
                });

                // Match active charges
                const charges = transactions.filter(t => t.type === 'charge');
                if (charges.length === 0) {
                  // Default mock-fallback only if they don't have any actual charges yet, so the chart is styled beautifully
                  chartData[0] = { day: 'Mon', split: 350, solo: 700 };
                  chartData[1] = { day: 'Tue', split: 175, solo: 700 };
                  chartData[2] = { day: 'Wed', split: 117, solo: 700 };
                  chartData[3] = { day: 'Thu', split: 350, solo: 700 };
                  chartData[4] = { day: 'Fri', split: 88,  solo: 700 };
                  chartData[5] = { day: 'Sat', split: 0,   solo: 0 };
                  chartData[6] = { day: 'Sun', split: 117, solo: 700 };
                } else {
                  charges.forEach(txn => {
                    const amt = Math.abs(txn.amount);
                    // Distribute charges deterministically across past days using a hash to create a realistic chart
                    const hashIdx = Math.abs(txn.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 7;
                    chartData[hashIdx].split += amt;
                    chartData[hashIdx].solo += Math.round(amt * 2.5);
                  });
                }

                const maxVal = Math.max(...chartData.map(d => d.solo), 700);

                return chartData.map((data, idx) => {
                  const splitHeight = data.split > 0 ? (data.split / maxVal) * 150 : 0;
                  const soloHeight = data.solo > 0 ? (data.solo / maxVal) * 150 : 0;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-gray-950 text-white text-[10px] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-slate-200 flex flex-col pointer-events-none z-10 whitespace-nowrap shadow-xl">
                        <span className="font-extrabold text-[#00875A]">Split: {currencySymbol}{data.split}</span>
                        <span className="text-slate-500 line-through">Solo: {currencySymbol}{data.solo}</span>
                      </div>

                      <div className="w-12 h-[150px] flex items-end justify-center gap-1">
                        {/* Solo Ride Bar Indicator (Backdrop) */}
                        <div 
                          className="w-3.5 bg-slate-200 hover:bg-slate-400 rounded-t-sm transition-all duration-300"
                          style={{ height: `${soloHeight}px` }}
                        ></div>
                        {/* Active Pool Split Bar */}
                        <div 
                          className="w-3.5 bg-gradient-to-t from-[#00875A] to-emerald-600 rounded-t-sm transition-all duration-300"
                          style={{ height: `${splitHeight}px` }}
                        ></div>
                      </div>
                      <span className="text-xs font-mono text-gray-500 mt-2 block">{data.day}</span>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-center items-center gap-6 pt-4 border-t border-slate-200 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gradient-to-r from-[#00875A] to-[#00875A] rounded-xs"></span>
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
            <h3 className="text-sm font-black text-[#00875A] uppercase tracking-wider">Past Completed Rides</h3>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((txn, index) => (
                  <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-800">{txn.description}</span>
                        <span className="text-[10px] text-gray-500 block font-mono">{txn.date} • {txn.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-slate-800 block">-{currencySymbol}{txn.amount}</span>
                      <span className="text-[9px] bg-[#00875A]/10 text-[#00875A] px-2 py-0.5 rounded-full uppercase font-mono tracking-wide font-bold">Paid</span>
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
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-[#00875A] tracking-tight">NOTIFICATIONS INBOX</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  onMarkNotificationsRead();
                  alert('All messages marked as read.');
                }}
                className="text-xs text-[#00875A] hover:underline font-bold cursor-pointer"
              >
                Mark all as read
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear your notification history?")) {
                    onClearNotifications?.();
                  }
                }}
                className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
              >
                Clear all history
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif, index) => (
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
                          ? 'bg-[#00875A]/10 text-sage-medium' 
                          : notif.type === 'receipt' 
                            ? 'bg-[#00875A]/10 text-blue-450' 
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        <BellRing className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider">{notif.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wide shrink-0">{notif.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic bg-white border border-slate-150 rounded-2xl">
                No notifications or alert updates. Check back later!
              </div>
            )}
          </div>
        </motion.div>
      )}

        {/* 4. VIEW CONTEXT: WALLET & PAYMENTS SCREEN */}
        {false && activeView === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6"
          >
          <h1 className="text-2xl font-black text-[#00875A] tracking-tight">WALLET & PAYMENTS</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: VIRTUAL CARD & FUNDING CHANNELS (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Sleek Virtual Debit Card Mockup */}
              <div className="bg-gradient-to-br from-[#F9FAFB] via-[#00875A] to-black rounded-3xl p-6 sm:p-8 border border-slate-150 shadow-xs relative overflow-hidden shadow-xl ring-1 ring-[#00875A]/10 min-h-[220px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-[#00875A]/5 blur-3xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">CAMPUS TRANSIT PASS</span>
                    <h3 className="text-lg font-black text-white">{userProfile.name || 'Temi Adeyemi'}</h3>
                  </div>
                  <span className="bg-[#00875A]/10 text-[#00875A] text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-[#00875A]/20 uppercase">
                    STUDENT COMMUTER
                  </span>
                </div>

                <div className="my-6 relative z-10">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-wider font-mono">DIGITAL BALANCE</span>
                  <div className="text-3xl sm:text-4xl font-black text-[#00875A] font-mono mt-0.5 tracking-tight">
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
                <h3 className="text-sm font-black text-[#00875A] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-[#00875A]" /> Reload Comm commuter wallet
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
                            ? 'bg-gradient-to-b from-gray-900 to-slate-950 border-[#00875A] text-[#00875A]' 
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
                        className="w-full bg-slate-50 border border-slate-200 px-8 py-3 rounded-2xl text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#00875A] hover:bg-[#00875A] text-slate-800 font-black py-4 px-6 rounded-2xl shadow-lg transition-all text-xs uppercase tracking-wider cursor-pointer"
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
                  <ArrowRightLeft className="w-5 h-5 text-[#00875A]" />
                  <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider block">Instant Bank Transfer Channel</h3>
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
                      <span className="text-[#00875A] font-black tracking-widest">9283748291</span>
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
                <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider">Payments Transactions Ledger</h3>
                {transactions.length > 0 ? (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {transactions.map((txn, index) => (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold block text-slate-800 truncate max-w-[150px]">{txn.description}</span>
                          <span className="text-[9px] text-gray-500 block font-mono">{txn.time} • {txn.method}</span>
                        </div>
                        <span className={`text-xs font-mono font-black ${txn.type === 'reload' ? 'text-[#00875A]' : 'text-[#00875A]'}`}>
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
                  <div className="p-6 bg-gradient-to-r from-teal-500 to-[#00875A] text-white flex justify-between items-center">
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
                      <ShieldCheck className="w-4 h-4 text-[#00875A]" /> SECURE ADVANCED 256-BIT SSL ENCRYPTION
                    </div>

                    <button
                      type="submit"
                      disabled={paystackLoading}
                      className="w-full bg-[#00875A] hover:bg-[#00875A] text-slate-800 font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer"
                    >
                      {paystackLoading ? 'Refilling Comm wallet...' : `PROCEED PAY ${currencySymbol}${(Number(customFundAmount) || fundAmount).toLocaleString()}`}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* TRUST-BASED RIDE PAYMENT SELECTION MODAL */}
          <AnimatePresence>
            {showPaymentSelection && activeReq && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white text-slate-800 max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
                >
                  {/* Header */}
                  <div className="p-6 bg-[#00875A] text-white flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold tracking-widest block uppercase opacity-85">Campus Ride Trust Payment</span>
                      <h4 className="text-lg font-black">Choose Payment Method</h4>
                    </div>
                    <button 
                      onClick={() => setShowPaymentSelection(false)}
                      className="p-1 hover:bg-white/10 rounded-lg text-white"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-6">
                    {paymentStep === 'select' ? (
                      <div className="space-y-4">
                        <div className="text-center pb-2">
                          <p className="text-sm text-slate-600">
                            Your driver <span className="font-extrabold text-[#00875A]">{activeReq.driverName || 'David Alao'}</span> has accepted your request. How would you like to pay for this trip?
                          </p>
                          <div className="mt-3 inline-block bg-[#00875A]/10 border border-[#00875A]/20 px-4 py-1.5 rounded-full">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Fare: </span>
                            <span className="text-base font-black text-[#00875A]">{currencySymbol}{activeReq.cost}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {/* Wallet Option */}
                          <button
                            type="button"
                            onClick={handleSelectWalletPayment}
                            className="p-4 border border-slate-200 hover:border-[#00875A] bg-slate-50 hover:bg-[#00875A]/5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 group w-full text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 w-full">
                              <div className="flex justify-between items-baseline gap-2">
                                <h5 className="font-black text-sm text-[#00875A] group-hover:text-[#00875A]">Deduct from Wallet</h5>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">Bal: ₦{userProfile.walletBalance.toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Instantly pay ₦{activeReq.cost} using your secure preloaded student wallet balance.
                              </p>
                            </div>
                          </button>

                          {/* Cash Option */}
                          <button
                            type="button"
                            onClick={handleSelectCashPayment}
                            className="p-4 border border-slate-200 hover:border-[#00875A] bg-slate-50 hover:bg-[#00875A]/5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 group w-full text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h5 className="font-black text-sm text-[#00875A] group-hover:text-[#00875A]">Pay physically with Cash</h5>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Hand over physical cash of {currencySymbol}{activeReq.cost} to the driver after you safely reach your destination.
                              </p>
                            </div>
                          </button>

                          {/* Transfer Option */}
                          <button
                            type="button"
                            onClick={() => setPaymentStep('transfer_details')}
                            className="p-4 border border-slate-200 hover:border-[#00875A] bg-slate-50 hover:bg-[#00875A]/5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 group w-full text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                              <ArrowRightLeft className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h5 className="font-black text-sm text-[#00875A] group-hover:text-[#00875A]">Instant Bank Transfer</h5>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Transfer to the driver's university account. You'll get the bank details and can launch your bank app with copied details.
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Transfer Details Step
                      <div className="space-y-5">
                        <div className="bg-[#00875A]/5 border border-[#00875A]/15 p-4 rounded-2xl text-center">
                          <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Amount to Transfer</span>
                          <span className="text-3xl font-black text-[#00875A] tracking-tight">{currencySymbol}{activeReq.cost}</span>
                        </div>

                        {/* Bank Details Display */}
                        <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4 text-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1.5">Driver's Bank Account Details</span>
                          
                          {/* Bank Name */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Bank Name:</span>
                            <span className="font-extrabold text-slate-800">{getDriverBankDetails().bankName}</span>
                          </div>

                          {/* Account Number */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Account Number:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-[#00875A] text-sm tracking-wider">{getDriverBankDetails().accountNumber}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(getDriverBankDetails().accountNumber);
                                  setRideTransferCopied(true);
                                  setTimeout(() => setRideTransferCopied(false), 2000);
                                }}
                                className="p-1 hover:bg-[#00875A]/10 text-[#00875A] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="Copy account number"
                              >
                                {rideTransferCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Account Name */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Account Name:</span>
                            <span className="font-bold text-slate-800 uppercase">{getDriverBankDetails().accountName}</span>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {/* Copy & Redirect Button */}
                          <button
                            type="button"
                            onClick={handleCopyDetailsAndRedirect}
                            disabled={isSimulatingRedirect}
                            className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isSimulatingRedirect ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Launching Banking App...</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-4 h-4" />
                                <span>Copy details & pay with Bank App</span>
                              </>
                            )}
                          </button>

                          {/* Go back and choose cash */}
                          <button
                            type="button"
                            onClick={() => setPaymentStep('select')}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            ← Back to payment methods
                          </button>
                        </div>

                        {/* Confirmation Box (The Trust confirmation) */}
                        <div className="pt-4 border-t border-slate-200 text-center space-y-3">
                          <p className="text-[11px] text-slate-500 leading-relaxed italic">
                            Transfer is trust-based on campus. Once you have sent the transfer, click the button below. The driver is required to validate that they received the payment on their screen.
                          </p>
                          <button
                            type="button"
                            onClick={handleConfirmTransferPayment}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            I Have Made the Transfer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl"
          >
          <h1 className="text-2xl font-black text-[#00875A] tracking-tight">STUDENT PROFILE</h1>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-200 pb-6">
              <img 
                referrerPolicy="no-referrer"
                src={userProfile.avatar} 
                alt={userProfile.name} 
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-150 shadow-xs"
              />
              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-lg font-black text-slate-800">{userProfile.name}</h3>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-[#00875A]/10 border border-[#00875A]/20 text-[#00875A] inline-block font-mono tracking-wider">
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
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-slate-800 focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-[#00875A] hover:bg-[#00875A] text-slate-950 font-black py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
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
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl"
          >
          <h1 className="text-2xl font-black text-[#00875A] tracking-tight">APP SETTINGS</h1>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            
            {/* Supabase Media & Profile Picture Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider border-b border-slate-200 pb-2">Supabase Storage Configuration</h3>
              
              {/* Supabase Status Banner */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                isSupabaseConfigured 
                  ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                  : 'bg-amber-50/50 border-amber-150 text-amber-800'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${isSupabaseConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-left">
                      Supabase Storage Connection: {isSupabaseConfigured ? 'ACTIVE' : 'NOT CONFIGURATED'}
                    </span>
                    <span className="text-[10px] text-gray-500 block text-left leading-relaxed">
                      {isSupabaseConfigured 
                        ? 'Connected securely! High fidelity file transfers are fully validated.' 
                        : 'Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your workspace Secrets configuration to enable media uploads.'}
                    </span>
                  </div>
                </div>
                {isSupabaseConfigured && (
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono self-start sm:self-auto">
                    ONLINE
                  </span>
                )}
              </div>

              {supabaseError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{supabaseError}</span>
                </div>
              )}

              {supabaseSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-start gap-2 text-left">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{supabaseSuccess}</span>
                </div>
              )}

              {isSupabaseConfigured && (
                <div className="grid grid-cols-1 gap-4">
                  {/* Avatar Upload Block */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="relative shrink-0">
                        <img 
                          referrerPolicy="no-referrer"
                          src={userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                          alt="Student Avatar" 
                          className="w-12 h-12 rounded-full object-cover border border-slate-300"
                        />
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block text-slate-800 font-sans">Commuter Profile Picture</span>
                        <span className="text-[10px] text-gray-500 block leading-relaxed font-sans">
                          Replace your current profile avatar on the student portal database.
                        </span>
                      </div>
                    </div>

                    <label className="w-full h-10 bg-white border border-slate-200 hover:border-[#00875A] rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs">
                      <UploadCloud className="w-4 h-4 text-slate-500" />
                      <span>{uploadingAvatar ? 'Uploading...' : 'Choose Picture'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                        disabled={uploadingAvatar} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider border-b border-slate-200 pb-2">Transit Preferences</h3>
              
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-slate-800">Continuous Live Location Share</span>
                  <span className="text-[10px] text-gray-500 block">Transmit coordinate locks to drivers when pooling is active</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={safetySharing} 
                    onChange={() => setSafetySharing(!safetySharing)} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00875A]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-slate-800">Dark Mode Theme</span>
                  <span className="text-[10px] text-gray-500 block">Switch the application layout to a gorgeous, high-contrast dark night mode</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isDarkMode} 
                    onChange={onToggleDarkMode} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00875A]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-slate-800">Same Gender Peer Matching</span>
                  <span className="text-[10px] text-gray-500 block">Strict matching filters to isolate peers of the same gender</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sameGenderOnly} 
                    onChange={() => setSameGenderOnly(!sameGenderOnly)} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00875A]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold block text-slate-800">Low Balance Wallet Alerts</span>
                  <span className="text-[10px] text-gray-500 block">System alert triggers when digital balance dips below ₦500</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={lowBalanceAlert} 
                    onChange={() => setLowBalanceAlert(!lowBalanceAlert)} 
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00875A]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 gap-3">
                <div className="text-left">
                  <span className="text-xs font-bold block text-slate-800">System Notification Permissions</span>
                  <span className="text-[10px] text-gray-500 block">Receive real-time alerts outside the browser when drivers arrive or riders join your pool</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {'Notification' in window ? (
                    Notification.permission === 'granted' ? (
                      <span className="bg-emerald-100 text-emerald-850 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                        ✓ Enabled
                      </span>
                    ) : Notification.permission === 'denied' ? (
                      <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                        Blocked
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const p = await Notification.requestPermission();
                          if (p === 'granted') {
                            alert("System notifications enabled successfully!");
                            window.location.reload();
                          } else {
                            alert("Notification permission was not granted.");
                          }
                        }}
                        className="bg-[#00875A] hover:bg-[#00875A]/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-xs font-mono"
                      >
                        Enable
                      </button>
                    )
                  ) : (
                    <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                      Not Supported
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Account deletion */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider block">Danger Zone</h3>
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
                className="bg-[#00875A]/10 hover:bg-red-100 text-[#00875A] border border-[#00875A]/20 font-black py-3 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
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
                <h3 className="text-xl font-black text-[#00875A] tracking-tight">Confirm Seat Join</h3>
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
                    <span className="w-2 h-2 rounded-full bg-[#00875A]"></span>
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
                    <span className="text-lg font-mono font-black text-[#00875A]">
                      {currencySymbol}{(() => {
                        const vCfg = VEHICLES.find(v => v.type === checkoutPool.vehicleType) || VEHICLES[0];
                        return Math.round(vCfg.soloPrice / (checkoutPool.currentRiders.length + 1));
                      })()}
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
                  className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Confirm & Join
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* FLOATING MESSENGER-STYLE CHAT OVERLAY ON THE LEFT */}
      {(() => {
        const chatId = joinedPoolId || (activeRide ? activeRide.id : null);
        if (!chatId) return null;

        const counterPartyName = activeRide?.driverName || "Campus Transit Pool";
        const counterPartyAvatar = activeRide?.driverAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80";
        const isDriverAssigned = !!activeRide?.driverName;

        return (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            className="fixed bottom-20 left-6 md:bottom-6 md:left-80 z-50 flex flex-col-reverse items-start select-none"
            style={{ touchAction: 'none' }}
            id="floating-messenger-draggable-wrapper"
          >
            {/* 1. The Floating Circle Bubble (Messenger Style) */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsChatOverlayOpen(!isChatOverlayOpen)}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl border cursor-grab active:cursor-grabbing transition-colors duration-200 ${
                isChatOverlayOpen 
                  ? 'bg-rose-600 border-rose-500 hover:bg-rose-700' 
                  : 'bg-[#00875A] border-[#00875A]/20 hover:bg-[#00875A]/95'
              }`}
              style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)' }}
              id="floating-messenger-bubble"
            >
              {isChatOverlayOpen ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <div className="relative">
                  {isDriverAssigned ? (
                    <img 
                      src={counterPartyAvatar} 
                      alt={counterPartyName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <MessageSquare className="w-6 h-6 text-white" />
                  )}
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
                  id="floating-messenger-panel"
                >
                  {/* Header */}
                  <div className="p-4 bg-[#00875A] text-white flex items-center justify-between">
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
                          {isDriverAssigned ? 'Active Trip Driver' : 'Ride Pool Chat'}
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
                        <p className="text-[11px] text-slate-400">No messages yet. Send a greeting!</p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`max-w-[85%] flex flex-col ${
                            msg.isUser ? 'self-end items-end' : 'self-start items-start'
                          }`}
                        >
                          <div className="flex items-center space-x-1 mb-0.5 text-[9px] text-slate-400">
                            <span className="font-extrabold">{msg.sender}</span>
                            <span>•</span>
                            <span className="font-mono">{msg.time}</span>
                          </div>
                          <div className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed shadow-2xs ${
                            msg.sender === 'System' 
                              ? 'bg-[#00875A]/5 text-slate-600 border border-slate-150 italic text-center w-full font-mono'
                              : msg.isUser 
                                ? 'bg-[#00875A] text-white rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={floatingChatBottomRef} />
                  </div>

                  {/* Quick Replies Swiper Row */}
                  <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar">
                    {['On my way!', 'I am at the stop', 'Wait for me', 'Awesome, thanks!'].map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          sendQuickReply(phrase);
                          // Auto scroll bottom
                          setTimeout(() => {
                            floatingChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-[#00875A] border border-slate-150 text-slate-500 hover:text-white rounded-lg text-[9px] font-bold transition-all shrink-0 cursor-pointer"
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
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A]/20"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="p-2 bg-[#00875A] hover:bg-[#00875A]/90 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition duration-150 cursor-pointer shrink-0"
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
