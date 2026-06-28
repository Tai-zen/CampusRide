import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  AppNotification, 
  Transaction, 
  RideRequest 
} from '../types';
import { 
  ADVERT_CARDS 
} from '../data';
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
  DollarSign, 
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
  CircleAlert,
  ArrowUpRight,
  ShieldAlert,
  HelpCircle,
  Eye,
  Trash2,
  Send,
  Copy
} from 'lucide-react';

const loadPaystackScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.id = 'paystack-inline-js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
  // Dynamic School Setup
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const campusStops = selectedSchool.stops;
  const mapImage = selectedSchool.mapImage;

  // Booking Form State
  const [pickup, setPickup] = useState<string>('');
  const [dropoff, setDropoff] = useState<string>('');

  useEffect(() => {
    if (campusStops.length >= 2) {
      setPickup(campusStops[0].id);
      setDropoff(campusStops[1].id);
    }
  }, [selectedSchoolId]);

  const [vehicleType, setVehicleType] = useState<'Car' | 'Keke' | 'Shuttle'>('Car');
  const [verifyPeer, setVerifyPeer] = useState<boolean>(true);
  const [estimateLoading, setEstimateLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fund Wallet States
  const [fundAmount, setFundAmount] = useState<number>(2500);
  const [customFundAmount, setCustomFundAmount] = useState<string>('');
  const [fundMethod, setFundMethod] = useState<string>('Paystack Unified (Card/Transfer)');
  const [fundingSuccess, setFundingSuccess] = useState<boolean>(false);
  const [paystackLoading, setPaystackLoading] = useState<boolean>(false);

  // Send Money to Driver States
  const [sendTargetDriver, setSendTargetDriver] = useState<string>('david');
  const [directTransferAmount, setDirectTransferAmount] = useState<string>('');
  const [transferMethod, setTransferMethod] = useState<'wallet' | 'paystack'>('wallet');
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<boolean>(false);
  const [clipboardCopied, setClipboardCopied] = useState<boolean>(false);
  const [virtualSimulateLoading, setVirtualSimulateLoading] = useState<boolean>(false);

  // Settings Toggles
  const [pushRide, setPushRide] = useState<boolean>(true);
  const [pushPromo, setPushPromo] = useState<boolean>(false);
  const [shareLocation, setShareLocation] = useState<boolean>(true);
  const [twoFactor, setTwoFactor] = useState<boolean>(true);

  // Account Deletion States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteIdInput, setDeleteIdInput] = useState<string>('');
  const [simulateOutstandingDebt, setSimulateOutstandingDebt] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Get Stop Name Helper
  const getStopName = (stopId: string) => {
    const stop = campusStops.find(s => s.id === stopId);
    return stop ? stop.name : stopId;
  };

  // Get Stop Name from string or ID
  const resolveStopName = (input: string) => {
    if (input.includes('stop-')) {
      return getStopName(input);
    }
    return input;
  };

  // Ride Cost Estimation Helper
  const getRideCost = () => {
    let base = 4.50;
    if (vehicleType === 'Keke') base = 5.75;
    if (vehicleType === 'Shuttle') base = 2.50;
    
    // Add premium if peer verified is toggled
    if (verifyPeer) base += 0.50;
    return base;
  };

  // Handle Request Ride Submit
  const handleRequestRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (pickup === dropoff) {
      alert('Pickup and Dropoff locations cannot be identical.');
      return;
    }

    const calculatedCost = getRideCost();
    if (userProfile.walletBalance < calculatedCost) {
      alert(`Insufficient digital wallet balance to complete request. This ride costs $${calculatedCost.toFixed(2)}, but you only have $${userProfile.walletBalance.toFixed(2)}. Please reload funds.`);
      onNavigate('payments');
      return;
    }

    setEstimateLoading(true);

    // Simulate dispatch timing
    setTimeout(() => {
      setEstimateLoading(false);
      const newRide: RideRequest = {
        id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
        passengerId: userProfile.id,
        passengerName: userProfile.name,
        passengerAvatar: userProfile.avatar,
        passengerRating: 4.8,
        passengerType: 'Student',
        pickup: getStopName(pickup),
        dropoff: getStopName(dropoff),
        status: 'requested',
        vehicleType: vehicleType,
        verifyPeer: verifyPeer,
        cost: calculatedCost,
        etaMinutes: 4,
        date: 'Jun 19, 2026',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onUpdateRide(newRide);
      
      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Ride Request Uploaded',
        message: `Your transit request from ${getStopName(pickup)} to ${getStopName(dropoff)} has been added to live queues. Dispatching nearest peer driver...`,
        date: 'Jun 19, 2026',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: 'info'
      });
    }, 1200);
  };

  // Simulate Ride States (Interactive feedback looping)
  const advanceSimulatedRide = () => {
    if (!activeRide) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (activeRide.status === 'requested') {
      onUpdateRide({
        ...activeRide,
        status: 'accepted',
        driverId: 'd-202',
        driverName: 'David Moore',
        driverAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY',
        driverVehicle: 'Toyota Camry (Silver) • 4P-928X',
        driverRating: 4.9,
        etaMinutes: 3,
      });

      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Driver Assigned',
        message: `Toyota Camry Silver driven by David Moore has accepted your trip. ETA: 3 minutes.`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'success'
      });
    } else if (activeRide.status === 'accepted') {
      onUpdateRide({
        ...activeRide,
        status: 'arriving',
        etaMinutes: 1,
      });

      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Driver Arrived at Pickup!',
        message: `David Moore has arrived at ${activeRide.pickup}. Please proceed to the designated campus stop immediately.`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'alert'
      });
    } else if (activeRide.status === 'arriving') {
      onUpdateRide({
        ...activeRide,
        status: 'in_transit',
        etaMinutes: 5,
      });

      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Transit in Progress',
        message: `Your ride has commenced. Heading to ${activeRide.dropoff}. Travel safely.`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'info'
      });
    } else if (activeRide.status === 'in_transit') {
      // Complete Ride: deduct funds, save transaction, increment trip metrics, reset ride
      const fare = activeRide.cost;
      onUpdateProfile({
        walletBalance: userProfile.walletBalance - fare,
        tripsThisWeek: userProfile.tripsThisWeek + 1,
        carpoolRides: activeRide.verifyPeer ? userProfile.carpoolRides + 1 : userProfile.carpoolRides,
        savedThisMonth: userProfile.savedThisMonth,
      });

      const newTxn: Transaction = {
        id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        description: `Ride fare: ${activeRide.pickup} to ${activeRide.dropoff}`,
        amount: -fare,
        date: 'Jun 19, 2026',
        time: timeString,
        method: 'Campus Wallet',
        type: 'charge',
        status: 'Completed',
      };

      onAddTransaction(newTxn);

      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Ride Completed & Receipt Generated',
        message: `Successfully completed ride from ${activeRide.pickup} to ${activeRide.dropoff}. Paid ₦${fare.toFixed(2)} via digital wallet. Thank you for commuting with CampusRide!`,
        date: 'Jun 19, 2026',
        time: timeString,
        isRead: false,
        type: 'receipt'
      });

      // Show receipt popup or alert
      alert(`Trip Completed!\nFrom: ${activeRide.pickup}\nTo: ${activeRide.dropoff}\nFare: ₦${fare.toFixed(2)} deducted from Wallet.`);
      onUpdateRide(null);
      onNavigate('dashboard');
    }
  };

  // Automatic trip progression loop for the student's booking view
  React.useEffect(() => {
    if (!activeRide) return;

    let timeoutId: NodeJS.Timeout;

    if (activeRide.status === 'requested') {
      timeoutId = setTimeout(() => {
        advanceSimulatedRide();
      }, 4000); // 4 seconds to assign driver
    } else if (activeRide.status === 'accepted') {
      timeoutId = setTimeout(() => {
        advanceSimulatedRide();
      }, 5000); // 5 seconds to arrive at stop
    } else if (activeRide.status === 'arriving') {
      timeoutId = setTimeout(() => {
        advanceSimulatedRide();
      }, 4000); // 4 seconds to start ride
    } else if (activeRide.status === 'in_transit') {
      timeoutId = setTimeout(() => {
        advanceSimulatedRide();
      }, 6000); // 6 seconds to complete ride
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeRide?.status]);

  const handleCustomFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let amount = 0;
    if (customFundAmount) {
      amount = parseFloat(customFundAmount);
    } else {
      amount = fundAmount;
    }

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount to fund your digital wallet.');
      return;
    }

    setPaystackLoading(true);

    try {
      // 1. Load the Paystack inline script
      const isLoaded = await loadPaystackScript();
      if (!isLoaded) {
        throw new Error('Failed to load Paystack script');
      }

      // 2. Setup Paystack configurations
      const userEmail = userProfile.email || 'student@campusride.ng';
      const reference = 'RELOAD-' + Date.now();
      const publicKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_d3000b9576da669fe0e5d1798df67b45cbdf20a8';

      // 3. Initiate PaystackPop
      const handler = (window as any).PaystackPop.setup({
        key: publicKey,
        email: userEmail,
        amount: Math.round(amount * 105), // convert to kobo (adding subtle convenience processing rate if needed or literal NGN1 = 100 kobo)
        currency: 'NGN',
        ref: reference,
        callback: (response: any) => {
          setPaystackLoading(false);
          // Paystack transaction completed! We credit the wallet balance
          onUpdateProfile({ walletBalance: userProfile.walletBalance + amount });

          const newTxn: Transaction = {
            id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
            description: `Paystack Wallet Reload (Ref: ${response.reference})`,
            amount: amount,
            date: 'Jun 19, 2026',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'Paystack checkout',
            type: 'reload',
            status: 'Completed',
          };

          onAddTransaction(newTxn);

          onAddNotification({
            id: `notif-${Date.now()}`,
            title: 'Digital Wallet Funded via Paystack',
            message: `Successfully reloaded ₦${amount.toFixed(2)} using Paystack checkout (Ref: ${response.reference}). New balance: ₦${(userProfile.walletBalance + amount).toFixed(2)}.`,
            date: 'Jun 19, 2026',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
            type: 'success'
          });

          setFundingSuccess(true);
          setCustomFundAmount('');
          setTimeout(() => {
            setFundingSuccess(false);
          }, 4000);
        },
        onClose: () => {
          setPaystackLoading(false);
          alert('Paystack secure payment session was closed.');
        }
      });

      handler.openIframe();
    } catch (err: any) {
      console.warn('Paystack loader error, activating fallback: ', err.message);
      // Fallback checkout simulation if script fails or is blocked
      const confirmSimulation = window.confirm(
        'Paystack inline payment script could not initialize. Proceed with the Sandbox Simulator payments route instead?'
      );

      setPaystackLoading(false);

      if (confirmSimulation) {
        onUpdateProfile({ walletBalance: userProfile.walletBalance + amount });

        const newTxn: Transaction = {
          id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
          description: `Simulated Paystack Wallet Reload`,
          amount: amount,
          date: 'Jun 19, 2026',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'Paystack sandbox',
          type: 'reload',
          status: 'Completed',
        };

        onAddTransaction(newTxn);

        onAddNotification({
          id: `notif-${Date.now()}`,
          title: 'Digital Wallet Funded (Sandbox Sim)',
          message: `Successfully reloaded ₦${amount.toFixed(2)} via simulated Paystack checkout. New balance: ₦${(userProfile.walletBalance + amount).toFixed(2)}.`,
          date: 'Jun 19, 2026',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          type: 'receipt'
        });

        setFundingSuccess(true);
        setCustomFundAmount('');
        setTimeout(() => {
          setFundingSuccess(false);
        }, 4000);
      }
    }
  };

  const handleVirtualTransferSimulation = () => {
    setVirtualSimulateLoading(true);
    setTimeout(() => {
      setVirtualSimulateLoading(false);
      const randomAmount = 2500;
      onUpdateProfile({ walletBalance: userProfile.walletBalance + randomAmount });

      const newTxn: Transaction = {
        id: `TXN-VIRT-${Math.floor(1000 + Math.random() * 9000)}`,
        description: 'Paystack Dedicated Virtual Account Bank Deposit',
        amount: randomAmount,
        date: 'Jun 19, 2026',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: 'Direct Bank Transfer',
        type: 'reload',
        status: 'Completed',
      };

      onAddTransaction(newTxn);

      onAddNotification({
        id: `notif-virt-${Date.now()}`,
        title: 'Virtual Account Deposit Credited',
        message: `Your Paystack Dedicated Virtual Account has been credited with ₦${randomAmount.toFixed(2)} via Bank Transfer. New balance: ₦${(userProfile.walletBalance + randomAmount).toFixed(2)}.`,
        date: 'Jun 19, 2026',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: 'success'
      });

      alert(`Webhook Credit Successful! ₦${randomAmount.toFixed(2)} deposited instantly to your Digital Wallet via Paystack Dedicated Virtual Account.`);
    }, 1500);
  };

  const handleSendMoneyToDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(directTransferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }

    let driverNameStr = 'Selected Driver';
    if (sendTargetDriver === 'david') {
      driverNameStr = 'David Moore';
    } else if (sendTargetDriver === 'evelyn') {
      driverNameStr = 'Evelyn Carter';
    } else if (activeRide?.driverName) {
      driverNameStr = activeRide.driverName;
    } else if (driverProfile?.name) {
      driverNameStr = driverProfile.name;
    }

    if (transferMethod === 'wallet') {
      if (userProfile.walletBalance < amount) {
        alert(`Insufficient balance in your digital wallet to send ₦${amount.toFixed(2)}. Please fund your wallet first.`);
        return;
      }

      setTransferLoading(true);
      setTimeout(() => {
        setTransferLoading(false);
        // Deduct from student
        onUpdateProfile({ walletBalance: userProfile.walletBalance - amount });

        // Add charge transaction
        const newTxn: Transaction = {
          id: `TXN-SND-${Math.floor(10000 + Math.random() * 90000)}`,
          description: `Wallet Transfer to Peer Driver (${driverNameStr})`,
          amount: -amount,
          date: 'Jun 19, 2026',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'Digital Wallet',
          type: 'charge',
          status: 'Completed',
        };
        onAddTransaction(newTxn);

        // Credit real logged in driver if matched
        if (driverProfile && onUpdateDriverProfile) {
          onUpdateDriverProfile({
            todayEarnings: driverProfile.todayEarnings + amount
          });
        }

        onAddNotification({
          id: `notif-snd-${Date.now()}`,
          title: `Sent Money to ${driverNameStr}`,
          message: `Successfully transferred ₦${amount.toFixed(2)} to driver ${driverNameStr} instantly.`,
          date: 'Jun 19, 2026',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          type: 'receipt'
        });

        setTransferSuccess(true);
        setDirectTransferAmount('');
        setTimeout(() => setTransferSuccess(false), 4000);
      }, 1000);
    } else {
      // Direct payment via Paystack!
      setTransferLoading(true);
      try {
        const isLoaded = await loadPaystackScript();
        if (!isLoaded) {
          throw new Error('Paystack Script blocked');
        }

        const publicKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_d3000b9576da669fe0e5d1798df67b45cbdf20a8';
        const reference = 'SNDDRV-' + Date.now();

        const handler = (window as any).PaystackPop.setup({
          key: publicKey,
          email: userProfile.email || 'student@campusride.ng',
          amount: Math.round(amount * 100),
          currency: 'NGN',
          ref: reference,
          callback: (response: any) => {
            setTransferLoading(false);

            // Add charge transaction
            const newTxn: Transaction = {
              id: `TXN-SND-${Math.floor(10000 + Math.random() * 90000)}`,
              description: `Paystack Direct Transfer to Driver (${driverNameStr})`,
              amount: -amount,
              date: 'Jun 19, 2026',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'Paystack Checkout',
              type: 'charge',
              status: 'Completed',
            };
            onAddTransaction(newTxn);

            // Credit real logged in driver if matched
            if (driverProfile && onUpdateDriverProfile) {
              onUpdateDriverProfile({
                todayEarnings: driverProfile.todayEarnings + amount
              });
            }

            onAddNotification({
              id: `notif-snd-${Date.now()}`,
              title: `Direct Sent to ${driverNameStr}`,
              message: `Successfully transferred ₦${amount.toFixed(2)} to driver ${driverNameStr} via Paystack Gate (Ref: ${response.reference}).`,
              date: 'Jun 19, 2026',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isRead: false,
              type: 'success'
            });

            setTransferSuccess(true);
            setDirectTransferAmount('');
            setTimeout(() => setTransferSuccess(false), 4000);
          },
          onClose: () => {
            setTransferLoading(false);
            alert('Transfer session closed.');
          }
        });
        handler.openIframe();
      } catch (err: any) {
        console.warn('Paystack direct error, fallback: ', err.message);
        const confirmSimulation = window.confirm(
          `Paystack blocked. Proceed with Simulated Direct Paystack Bank transfer to ${driverNameStr} (₦${amount.toFixed(2)})?`
        );
        setTransferLoading(false);
        if (confirmSimulation) {
          // Add transaction
          const newTxn: Transaction = {
            id: `TXN-SND-${Math.floor(10000 + Math.random() * 90000)}`,
            description: `Simulated Paystack Transfer to Driver (${driverNameStr})`,
            amount: -amount,
            date: 'Jun 19, 2026',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'Paystack Direct Sim',
            type: 'charge',
            status: 'Completed',
          };
          onAddTransaction(newTxn);

          // Credit real logged in driver if matched
          if (driverProfile && onUpdateDriverProfile) {
            onUpdateDriverProfile({
              todayEarnings: driverProfile.todayEarnings + amount
            });
          }

          onAddNotification({
            id: `notif-snd-${Date.now()}`,
            title: `Direct Transfer Complete`,
            message: `Successfully sent ₦${amount.toFixed(2)} to driver ${driverNameStr} via Sandbox Sim.`,
            date: 'Jun 19, 2026',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
            type: 'receipt'
          });

          setTransferSuccess(true);
          setDirectTransferAmount('');
          setTimeout(() => setTransferSuccess(false), 4000);
        }
      }
    }
  };

  // Filter Transactions by search query
  const filteredTxns = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="student-portal-viewport" className="flex-1 overflow-y-auto px-4 py-6 md:p-8 bg-[#f8f9ff]">
      
      {/* Dynamic Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-100 pb-5">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">Verified Student Access</span>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight flex items-center">
            {activeView === 'booking' && 'Request Campus Ride'}
            {activeView === 'dashboard' && 'Rider Activity Dashboard'}
            {activeView === 'notifications' && 'Notifications Inbox'}
            {activeView === 'payments' && 'Wallet & Transactions'}
            {activeView === 'profile' && 'Institutional Student ID'}
            {activeView === 'settings' && 'App Configuration'}
            {activeRide && <span className="ml-2 bg-[#ffddb8] text-[#855300] text-[10px] px-2 py-0.5 rounded-full uppercase font-bold animate-pulse">Ride Live</span>}
          </h1>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-3 text-xs">
          <button 
            onClick={() => onNavigate('payments')} 
            className="bg-white border border-gray-200 shadow-xs hover:border-primary px-3 py-1.5 rounded-xl text-[#0b1c30] font-bold flex items-center space-x-1"
          >
            <Wallet className="w-4 h-4 text-primary" />
            <span>₦{userProfile.walletBalance.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW: BOOKING (REQUEST RIDE & MAPS) */}
      {activeView === 'booking' && (
        <div id="view-student-booking" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Interactive Simulated Map Canvas / Display Block */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative">
              
              {/* Floating Overlay Header Status */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-100/60 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-[#0b1c30]">
                    {!activeRide ? 'Idle • Selecting pickup stop' : `Status: ${activeRide.status.toUpperCase()}`}
                  </span>
                </div>
                {activeRide && (
                  <span className="text-[11px] font-mono font-bold text-primary bg-[#e5eeff] px-2.5 py-1 rounded-lg">
                    {activeRide.status === 'requested' ? 'Locating peers' : activeRide.status === 'arriving' ? 'Driver Arrived!' : activeRide.status === 'in_transit' ? 'In transit' : 'Assigned'}
                  </span>
                )}
              </div>

              {/* MAP IMAGE BASE */}
              <div className="relative h-[480px] bg-slate-100">
                <img 
                  referrerPolicy="no-referrer"
                  src={mapImage} 
                  alt="Transit Map" 
                  className="w-full h-full object-cover"
                />
                
                {/* Simulated SVG Route Overlay overlay (Decorative & Highly functional) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Draw mock path if active ride */}
                  {activeRide && (
                    <>
                      <path 
                        d="M 220 320 Q 380 220 520 180" 
                        fill="none" 
                        stroke="#004ac6" 
                        strokeWidth="4" 
                        strokeDasharray="6,4"
                        className="animate-[dash_10s_linear_infinite]"
                      />
                      {/* Driver Marker */}
                      {activeRide.status !== 'requested' && (
                        <circle cx="340" cy="240" r="10" fill="#fea619" stroke="white" strokeWidth="2" className="animate-bounce" />
                      )}
                    </>
                  )}
                </svg>

                {/* Simulated Markup pin flags */}
                <div className="absolute top-[320px] left-[220px] bg-emerald-500 text-white p-1 rounded-full shadow-lg border border-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="absolute top-[180px] left-[520px] bg-red-500 text-white p-1 rounded-full shadow-lg border border-white">
                  <MapPin className="w-4 h-4" />
                </div>

                {/* Quick Map tooltips */}
                <div className="absolute top-[290px] left-[230px] bg-white text-[9px] font-bold px-2 py-0.5 rounded shadow border border-gray-100 text-[#0b1c30]">
                  {resolveStopName(pickup)}
                </div>
                <div className="absolute top-[150px] left-[530px] bg-white text-[9px] font-bold px-2 py-0.5 rounded shadow border border-gray-100 text-[#0b1c30]">
                  {resolveStopName(dropoff)}
                </div>
              </div>

              {/* Live ETA Tracker Footer Banner */}
              {activeRide && activeRide.status !== 'requested' && (
                <div className="bg-[#0b1c30] text-white p-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-800">
                  <div className="flex items-center space-x-3">
                    <img 
                      referrerPolicy="no-referrer"
                      src={activeRide.driverAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY'} 
                      alt="Driver photograph" 
                      className="w-11 h-11 rounded-full object-cover border-2 border-primary/40 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold font-mono text-[#ffddb8]">ACTIVE DRIVER</span>
                      <h4 className="text-sm font-bold">{activeRide.driverName}</h4>
                      <p className="text-[10px] text-gray-400">{activeRide.driverVehicle}</p>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-mono">ESTIMATED ARRIVAL</span>
                      <span className="text-base font-extrabold text-white">
                        {activeRide.etaMinutes > 0 ? `${activeRide.etaMinutes} mins` : 'Arrived at Stop'}
                      </span>
                    </div>
                    <div className="h-8 w-[1px] bg-gray-700 hidden sm:block"></div>
                    <div>
                      <span className="text-[10px] text-[#ffddb8] block font-bold font-mono">VERIFIED ACCOUNT</span>
                      <span className="text-xs bg-[#e5eeff]/10 text-sky-200 px-2 py-0.5 rounded font-bold">★ {activeRide.driverRating} rating</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ADVERTS / PROMOTIONS CARD (AS SPECIFIED IN ADV LIST) */}
            {ADVERT_CARDS.map(card => (
              <div 
                key={card.id} 
                className="bg-[#dbe1ff]/30 text-[#00174b] p-6 rounded-3xl border border-[#b4c5ff]/40 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-lg">
                  <span className="bg-[#004ac6] text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full font-mono">
                    {card.tag}
                  </span>
                  <h3 className="text-lg font-extrabold tracking-tight">{card.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>
                </div>
                <img 
                  referrerPolicy="no-referrer"
                  src={card.image} 
                  alt="Advertisement Banner background" 
                  className="w-full md:w-36 h-24 rounded-2xl object-cover border border-[#c3c6d7] shrink-0 shadow-sm"
                />
              </div>
            ))}
          </div>

          {/* Main Booking Panel over interactive Map */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Trip Details (Visible during Active Rides) */}
            {activeRide && (
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                    <h3 className="text-sm font-extrabold text-[#0b1c30]">Live Trip Status</h3>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    activeRide.status === 'requested' ? 'bg-amber-100 text-amber-850' :
                    activeRide.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                    activeRide.status === 'arriving' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-emerald-100 text-emerald-800 animate-pulse'
                  }`}>
                    {activeRide.status === 'requested' && 'Matching...'}
                    {activeRide.status === 'accepted' && 'Driver En Route'}
                    {activeRide.status === 'arriving' && 'Driver Arrived'}
                    {activeRide.status === 'in_transit' && 'In Transit'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">From:</span>
                    <span className="font-semibold text-[#0b1c30]">{activeRide.pickup}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium font-mono">To:</span>
                    <span className="font-semibold text-[#0b1c30]">{activeRide.dropoff}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium font-mono">Estimated Fare:</span>
                    <span className="font-bold text-primary">₦{activeRide.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Vehicle Option:</span>
                    <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[10px] uppercase">{activeRide.vehicleType}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel your active commute request?')) {
                        onUpdateRide(null);
                        onAddNotification({
                          id: `notif-${Date.now()}`,
                          title: 'Trip Canceled',
                          message: 'You have canceled your active commute request.',
                          date: 'Jun 19, 2026',
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          isRead: false,
                          type: 'alert'
                        });
                      }
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 hover:border-red-200 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1"
                  >
                    Cancel Commute
                  </button>
                </div>
              </div>
            )}

            {/* REQUEST RIDE FORM (Disabled if there is an active ride) */}
            <div className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-opacity duration-300 ${activeRide && 'opacity-60 pointer-events-none'}`}>
              <div className="flex items-center space-x-2.5 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Car className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-extrabold text-[#0b1c30]">Book a Ride</h2>
              </div>

              <form onSubmit={handleRequestRide} className="space-y-4">
                {/* Pickup stop selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#737686] uppercase tracking-wider block">Pickup Campus Stop</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <select
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-[#f8f9ff] border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#0b1c30] cursor-pointer"
                    >
                      {campusStops.map(stop => (
                        <option key={stop.id} value={stop.id}>{stop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dropoff stop selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#737686] uppercase tracking-wider block font-mono">Destination Stop</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-500">
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <select
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-[#f8f9ff] border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#0b1c30] cursor-pointer"
                    >
                      {campusStops.map(stop => (
                        <option key={stop.id} value={stop.id}>{stop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Vehicle Selection Tab buttons (Car, Keke, Shuttle) */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-[#737686] uppercase tracking-wider block">Vehicle Category</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVehicleType('Car')}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all ${vehicleType === 'Car' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Car (₦4.50)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('Keke')}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all ${vehicleType === 'Keke' ? 'bg-[#855300] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Keke (₦5.75)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('Shuttle')}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all ${vehicleType === 'Shuttle' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Shuttle (₦2.50)
                    </button>
                  </div>
                </div>

                {/* Peer verification option */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <div>
                      <span className="text-[11px] font-bold text-[#0b1c30] block leading-none">Verify Peer ID</span>
                      <span className="text-[9px] text-gray-400">Restricts to confirmed .edu accounts</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifyPeer}
                      onChange={(e) => setVerifyPeer(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Estimated Fare:</span>
                  <span className="text-lg font-extrabold text-[#0b1c30]">₦{getRideCost().toFixed(2)}</span>
                </div>

                <button
                  id="student-request-ride-btn"
                  type="submit"
                  disabled={estimateLoading}
                  className="w-full py-3 bg-primary hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs tracking-wider uppercase transition shadow-md shadow-blue-100 flex items-center justify-center space-x-2"
                >
                  {estimateLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                  <span>{estimateLoading ? 'Checking Queues...' : 'Confirm Request'}</span>
                </button>
              </form>
            </div>

            {/* QUICK PREVIEW IF CURRENTLY VACANT */}
            {!activeRide && (
              <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-sm">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Available Peer Drivers Nearby</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#f8f9ff] text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-bold">David Moore</span>
                    </div>
                    <span className="text-gray-500 font-mono">Camry (4 mins)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#f8f9ff] text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-bold">Evelyn Carter</span>
                    </div>
                    <span className="text-gray-500 font-mono">Elantra (8 mins)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: DASHBOARD (BENTO STATS & CURRENT ACTIVITY) */}
      {activeView === 'dashboard' && (
        <div id="view-student-activity-dashboard" className="space-y-6">
          
          {/* Active Ride Alert Panel if ongoing */}
          {activeRide && (
            <div className="bg-[#e5eeff] border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 animate-pulse">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#00174b]">Active Trip Commencing</h3>
                  <p className="text-xs text-gray-500">
                    Your ride from <span className="font-semibold text-primary">{activeRide.pickup}</span> to <span className="font-semibold text-primary">{activeRide.dropoff}</span> is in state <span className="font-bold underline">{activeRide.status.replace('_', ' ')}</span>.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('booking')} 
                className="text-xs font-bold text-white bg-primary px-4 py-2 rounded-xl hover:bg-blue-700 transition"
              >
                View Live Map Tracking
              </button>
            </div>
          )}

          {/* Bento Grid Metrics Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Stat Box 1: Trips This Week */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#737686] uppercase tracking-wider block font-mono">Trips This Week</span>
                <span className="text-3xl font-extrabold text-[#0b1c30] block">{userProfile.tripsThisWeek}</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full inline-flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  +18% from last registrar term
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#e5eeff] text-primary flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            {/* Stat Box 2: Carpool Rides */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#737686] uppercase tracking-wider block font-mono">Carpool Shares</span>
                <span className="text-3xl font-extrabold text-[#0b1c30] block">{userProfile.carpoolRides}</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full inline-flex items-center">
                  <Users className="w-3 h-3 mr-0.5" />
                  5 peer verification points earned
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Stat Box 3: Saved This Month */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#737686] uppercase tracking-wider block font-mono">Financial Savings</span>
                <span className="text-3xl font-extrabold text-[#0b1c30] block">₦{userProfile.savedThisMonth.toFixed(2)}</span>
                <span className="text-[10px] text-primary font-bold bg-blue-50 px-2.5 py-0.5 rounded-full inline-flex items-center">
                  Campus Commuter Rate Active
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Recent Trips Log Table */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0b1c30]">Recent Institutional Travels</h3>
                  <p className="text-xs text-gray-400">Past trip logs completed securely under verified protocols.</p>
                </div>
                <button 
                  onClick={() => onNavigate('booking')}
                  className="text-xs font-bold text-primary hover:underline flex items-center"
                >
                  <span>Request another</span>
                  <Plus className="w-4 h-4 ml-0.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-mono tracking-wider uppercase">
                      <th className="pb-3 font-semibold">Route & Vehicle</th>
                      <th className="pb-3 font-semibold">Date / Time</th>
                      <th className="pb-3 font-semibold">Peer Driver</th>
                      <th className="pb-3 font-semibold text-right">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.filter(t => t.type === 'charge').slice(0, 4).map((txn) => (
                      <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition duration-150">
                        <td className="py-3">
                          <span className="font-bold text-[#0b1c30] block">{txn.description.replace('Ride fare: ', '')}</span>
                          <span className="text-[10px] text-gray-400">{txn.method}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-gray-600 block">{txn.date}</span>
                          <span className="text-[10px] text-gray-400">{txn.time}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-mono bg-[#e5eeff] text-primary px-2.5 py-0.5 rounded text-[10px] font-semibold inline-block">
                            DAVID M. (Toyota Camry)
                          </span>
                        </td>
                        <td className="py-3 text-right font-extrabold text-[#0b1c30]">
                          ₦{Math.abs(txn.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Banner / App Tip */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[#0b1c30] flex items-center">
                <Info className="w-4 h-4 text-primary mr-1.5" />
                Commuter Guidelines
              </h3>
              
              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-[#0b1c30] block mb-1">Peer Safety Protocols</span>
                  Verify the license plate match on your screen with the incoming vehicle prior to entering.
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-[#0b1c30] block mb-1">Late Cancellations</span>
                  Cancellations requested details after a peer driver accepts the invite are subject to a standard ₦1.50 transit penalty.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: NOTIFICATIONS INBOX */}
      {activeView === 'notifications' && (
        <div id="view-student-notifications" className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-gray-150 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#0b1c30]">Notifications & Alerts</h2>
              <p className="text-xs text-gray-400">Real-time dispatcher logs, transit advisories, and digital balance logs.</p>
            </div>
            
            <button
              onClick={onMarkNotificationsRead}
              className="text-xs px-3.5 py-2 bg-[#e5eeff] text-primary hover:bg-blue-100 rounded-xl font-bold transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${notif.isRead ? 'bg-white border-gray-100 text-gray-500' : 'bg-blue-50/40 border-[#b4c5ff]/40 shadow-xs text-slate-800'}`}
              >
                {/* Visual Category Icon */}
                <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
                  notif.type === 'receipt' ? 'bg-[#e5eeff] text-primary' : 
                  notif.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                  notif.type === 'alert' ? 'bg-red-50 text-red-600' : 
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {notif.type === 'receipt' && <CreditCard className="w-5 h-5" />}
                  {notif.type === 'success' && <CheckCircle className="w-5 h-5" />}
                  {notif.type === 'alert' && <AlertTriangle className="w-5 h-5" />}
                  {notif.type === 'info' && <Info className="w-5 h-5" />}
                </div>

                {/* Notification Text block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className={`text-sm font-extrabold ${notif.isRead ? 'text-slate-700' : 'text-[#0b1c30]'}`}>
                      {notif.title}
                    </h4>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 block font-mono">{notif.date}</span>
                      <span className="text-[9px] text-gray-400 block font-mono">{notif.time}</span>
                    </div>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER VIEW: PAYMENTS & WALLET */}
      {activeView === 'payments' && (
        <div id="view-student-payments" className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Column 1: Wallet Card & Paystack Virtual Account Details */}
            <div className="space-y-6">
              {/* Wallet Balance reloading card */}
              <div className="bg-[#0b1c30] text-white rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-blue-900/15">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffddb8]/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                  <div>
                    <div className="flex items-center space-x-2.5 mb-2.5">
                      <div className="w-6 h-6 rounded-md bg-[#fea619] text-[#2a1700] flex items-center justify-center">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#ffddb8] uppercase tracking-widest font-mono">Digital Student Wallet</span>
                    </div>
                    <h3 className="text-[11px] text-sky-200 uppercase font-mono tracking-wider">Available Balance</h3>
                    <span className="text-4xl font-extrabold block tracking-tight">₦{userProfile.walletBalance.toFixed(2)}</span>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[11px] text-gray-400 font-mono block">Paystack Secure Checkout Active</span>
                    <div className="flex space-x-2">
                      <span className="bg-[#e5eeff]/10 px-2 py-0.5 rounded text-[10px] font-bold">Auto-Reload Active</span>
                      <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">Verified Account Secure</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paystack Virtual Account details */}
              <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-xs">
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0b1c30]">Paystack Virtual Account</h4>
                    <p className="text-[9px] text-emerald-600 font-mono font-bold tracking-wide">AUTOMATIC CREDIT SERVICES</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Make a transfer to your personalized Paystack dedicated virtual bank account to credit your wallet instantly.
                </p>

                <div className="bg-[#f8f9ff] rounded-2xl p-4 space-y-3 border border-gray-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Bank Name</span>
                    <span className="font-bold text-[#0b1c30]">Wema Bank (Paystack)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Account Name</span>
                    <span className="font-bold text-[#0b1c30] truncate max-w-[130px]">CR - {userProfile.name || 'Student Account'}</span>
                  </div>
                  <div className="flex justify-between items-start text-xs border-t border-gray-100 pt-2">
                    <span className="text-gray-400 font-medium mt-1">Account Number</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono font-extrabold text-[#0b1c30] text-sm tracking-widest">9920194830</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('9920194830');
                          setClipboardCopied(true);
                          setTimeout(() => setClipboardCopied(false), 2500);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition text-gray-500"
                        title="Copy Account Number"
                        type="button"
                      >
                        {clipboardCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleVirtualTransferSimulation}
                  disabled={virtualSimulateLoading}
                  className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-50"
                  type="button"
                >
                  {virtualSimulateLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                  <span>{virtualSimulateLoading ? 'Simulating Credit Webhook...' : 'Simulate Bank Transfer (₦2,500)'}</span>
                </button>
              </div>
            </div>

            {/* Column 2: Reload digital funds form panel with Paystack */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0b1c30] text-base">Paystack Checkout Reload</h3>
                  <p className="text-[10px] text-primary font-bold font-mono tracking-wide">ONLINE INSTANT CREDITING</p>
                </div>
              </div>

              {fundingSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200 font-medium mb-3.5 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Wallet reload complete! Balance updated instantly.</span>
                </div>
              )}

              <form onSubmit={handleCustomFundSubmit} className="space-y-4">
                
                {/* Preconfigured buttons */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider block mb-2 font-mono uppercase">Select Reload Amount</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1000, 2500, 5000, 10000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setFundAmount(val);
                          setCustomFundAmount('');
                        }}
                        className={`py-2 text-[11px] font-extrabold rounded-xl border transition ${fundAmount === val && !customFundAmount ? 'bg-primary text-white border-primary shadow-xs' : 'bg-transparent text-[#0b1c30] border-gray-200 hover:border-gray-400'}`}
                      >
                        ₦{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block font-mono">Or Enter Custom Naira Reload</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737686]">
                      <span className="text-xs font-bold font-mono">₦</span>
                    </div>
                    <input
                      type="number"
                      value={customFundAmount}
                      onChange={(e) => setCustomFundAmount(e.target.value)}
                      placeholder="e.g. 3500"
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#0b1c30]"
                    />
                  </div>
                </div>

                {/* Gateway config */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Payment Gateway Channel</label>
                  <select
                    value={fundMethod}
                    onChange={(e) => setFundMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#0b1c30] cursor-pointer"
                  >
                    <option value="Paystack Unified (Card/Transfer)">Paystack Checkout (Unified Card/USSD/Bank)</option>
                    <option value="Paystack Sandbox Link">Paystack Sandbox Quick link</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={paystackLoading}
                  className="w-full py-3 bg-primary hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-xs shadow-blue-105"
                >
                  {paystackLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>{paystackLoading ? 'Initializing Paystack Gateway...' : `Proceed with ₦${(customFundAmount ? parseFloat(customFundAmount) : fundAmount).toLocaleString()} Paystack`}</span>
                </button>
              </form>
            </div>

            {/* Column 3: Send Money to Driver via Paystack */}
            <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0b1c30] text-base">Send Peer Commuter Funds</h3>
                  <p className="text-[10px] text-orange-600 font-bold font-mono tracking-wide">DIRECT DISPATCH TRANSFERS</p>
                </div>
              </div>

              {transferSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200 font-medium mb-3.5 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Transfer successful! Earnings credited instantly.</span>
                </div>
              )}

              <form onSubmit={handleSendMoneyToDriver} className="space-y-4">
                {/* Select target driver */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Target Driver to Credit</label>
                  <select
                    value={sendTargetDriver}
                    onChange={(e) => setSendTargetDriver(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f8f9ff] border border-gray-155 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 focus:bg-white text-[#0b1c30] cursor-pointer"
                  >
                    {activeRide?.driverName && (
                      <option value="active">Active Assigned Driver: {activeRide.driverName}</option>
                    )}
                    <option value="david">David Moore (Toyota Camry • Online)</option>
                    <option value="evelyn">Evelyn Carter (Hyundai Elantra • Online)</option>
                    {driverProfile?.name && driverProfile.name !== activeRide?.driverName && (
                      <option value="self_driver">Registered Account: {driverProfile.name}</option>
                    )}
                  </select>
                </div>

                {/* Amount to send */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#737686] uppercase tracking-wider block">Naira Transfer Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737686]">
                      <span className="text-xs font-bold font-mono">₦</span>
                    </div>
                    <input
                      type="number"
                      required
                      value={directTransferAmount}
                      onChange={(e) => setDirectTransferAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 focus:bg-white text-[#0b1c30]"
                    />
                  </div>
                </div>

                {/* Transfer Method option selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Select Dispatch Channel</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferMethod('wallet')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${transferMethod === 'wallet' ? 'border-orange-600 bg-orange-50/20 text-[#0b1c30]' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                    >
                      <span className="text-xs font-extrabold block">Virtual Wallet balance</span>
                      <span className="text-[9px] text-gray-400 block mt-1">Deduct from ₦{userProfile.walletBalance.toFixed(2)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferMethod('paystack')}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${transferMethod === 'paystack' ? 'border-orange-600 bg-orange-50/20 text-[#0b1c30]' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                    >
                      <span className="text-xs font-extrabold block">Paystack Direct Gateway</span>
                      <span className="text-[9px] text-[#fea619] block font-mono font-bold mt-1">Unified Card Payments</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={transferLoading}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-xs shadow-orange-100"
                >
                  {transferLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {transferLoading ? 'Transmitting Peer Settlement...' : 
                     transferMethod === 'wallet' ? 'Confirm Instant Wallet Transfer' : 
                     `Pay direct ₦${directTransferAmount || '0'} via Paystack`}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Transaction Historial Table */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b1c30]">Wallet Transaction Ledger</h3>
                <p className="text-xs text-gray-400">Chronological list of charges, transit reloads, and shared commuting rebates.</p>
              </div>

              {/* Search bar inside Table */}
              <div className="relative max-w-xs w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ledger ID, route, etc..."
                  className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] border border-gray-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white text-[#0b1c30]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredTxns.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-medium">
                  No transaction match records found on file.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-450 tracking-wider uppercase font-mono">
                      <th className="pb-3 font-semibold">Transaction ID</th>
                      <th className="pb-3 font-semibold">Description</th>
                      <th className="pb-3 font-semibold">Date / Time</th>
                      <th className="pb-3 font-semibold">Fulfillment Method</th>
                      <th className="pb-3 font-semibold text-right">Fund Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map((txn) => (
                      <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="py-3 font-mono text-[10px] font-bold text-gray-400">
                          {txn.id}
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-[#0b1c30] block">{txn.description}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase inline-block mt-0.5 ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-gray-600 block">{txn.date}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{txn.time}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-slate-600 font-semibold">{txn.method}</span>
                        </td>
                        <td className={`py-3 text-right font-extrabold text-[#0b1c30] ${txn.amount > 0 ? 'text-emerald-600' : 'text-[#0b1c30]'}`}>
                          {txn.amount > 0 ? `+₦${txn.amount.toFixed(2)}` : `-₦${Math.abs(txn.amount).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: STUDENT PROFILE CARD */}
      {activeView === 'profile' && (
        <div id="view-student-profile" className="max-w-xl mx-auto bg-white rounded-3xl overflow-hidden border border-gray-150 shadow-md">
          
          {/* Header Backdrop Accent */}
          <div className="h-28 bg-[#0b1c30] relative p-6 flex items-end">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-900 opacity-60"></div>
            <div className="relative z-10 flex items-center space-x-2 text-white">
              <ShieldCheck className="w-5 h-5 text-[#ffddb8]" />
              <span className="text-[10px] uppercase font-bold text-[#ffddb8] tracking-widest font-mono">Institutional Credentials Record</span>
            </div>
          </div>

          {/* User Details Form block */}
          <div className="p-6 relative space-y-6">
            
            {/* Absolute positioned Avatar */}
            <div className="absolute -top-12 right-6">
              <img 
                referrerPolicy="no-referrer"
                src={userProfile.avatar} 
                alt="Alexis" 
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
              />
            </div>

            <div>
              <span className="bg-emerald-500/15 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center">
                <Check className="w-3.5 h-3.5 mr-1" />
                Verified Student Commuter
              </span>
              <h2 className="text-xl font-extrabold text-[#0b1c30] mt-2 tracking-tight">{userProfile.name}</h2>
              <p className="text-xs text-gray-500 font-medium">{userProfile.email}</p>
            </div>

            {/* Profile detail values spreadsheet */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono block">Student ID Card Number</span>
                <span className="text-xs font-bold text-[#0b1c30] leading-normal font-mono">{userProfile.idNumber}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono block">Enrolled Term State</span>
                <span className="text-xs font-bold text-[#0b1c30] leading-normal truncate block">{userProfile.enrolledTerm}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono block">Verified Major Department</span>
                <span className="text-xs font-bold text-[#0b1c30] leading-normal truncate block">{userProfile.major || 'B.S. Software Engineering'}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono block">Peer Account Status</span>
                <span className="text-xs font-bold text-emerald-600 leading-normal flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Active / Good Standing
                </span>
              </div>
            </div>

            {/* Registrar notice footer */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-[#b4c5ff]/30 text-[11px] text-[#004ac6] leading-relaxed flex items-start space-x-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                CampusRide profiles are synchronized with the University Directory. Any change to enrolled term states or department majors requires registrar adjustment.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: SETTINGS */}
      {activeView === 'settings' && (
        <div id="view-student-settings" className="max-w-xl mx-auto bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-6">
          
          <div>
            <h2 className="text-lg font-extrabold text-[#0b1c30]">Portal Configuration Settings</h2>
            <p className="text-xs text-gray-400">Configure notifications, locations privacy, and administrative security.</p>
          </div>

          <div className="space-y-4">
            
            {/* Setting 1 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#0b1c30] block">Push Notification Alerts</span>
                <span className="text-[10px] text-gray-400">Receive alerts when peer drivers arrive at stops</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushRide}
                  onChange={(e) => setPushRide(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Setting 2 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#0b1c30] block">Promotional & Campaign Alerts</span>
                <span className="text-[10px] text-gray-400">Receive coupons, environmental points reports, etc.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushPromo}
                  onChange={(e) => setPushPromo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Setting 3 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#0b1c30] block">Real-time Location Share</span>
                <span className="text-[10px] text-gray-400">Enable peer drivers to trace coordinate proximity</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareLocation}
                  onChange={(e) => setShareLocation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Setting 4 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#0b1c30] block">Two-Factor PIN authorization</span>
                <span className="text-[10px] text-gray-400">Ask for credential confirmation prior to loading funds</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Danger Zone: Account Deletion Section */}
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-150/60 space-y-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">Danger Zone</span>
              </div>
              <p className="text-[11px] text-[#737686] leading-normal">
                Deleting your account will purge your student transit profile, digital wallet, and ride history. This action is permanent and irreversible.
              </p>

              {/* Debt simulator toggle for testing */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-red-100 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-700 block">Reviewer Debt Tester</span>
                  <span className="text-[9px] text-gray-400">Force simulate a pending ₦1,500.00 transit fee</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateOutstandingDebt}
                    onChange={(e) => setSimulateOutstandingDebt(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              {!showDeleteConfirm ? (
                <button
                  id="btn-delete-account-trigger"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteIdInput('');
                    setDeleteError('');
                  }}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Request Account Deletion</span>
                </button>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-red-100 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-red-700">Confirm Account Deletion</span>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 underline font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {(simulateOutstandingDebt || userProfile.walletBalance < 0) ? (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-[11px] text-red-700 space-y-1.5">
                      <div className="flex items-center space-x-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Action Blocked: Outstanding Balance</span>
                      </div>
                      <p>
                        Your wallet currently has outstanding fees or negative transit dues of <strong className="font-semibold">₦{simulateOutstandingDebt ? '1,500.00' : Math.abs(userProfile.walletBalance).toFixed(2)}</strong>. 
                        Please visit your <span className="font-semibold underline cursor-pointer" onClick={() => onNavigate('payments')}>Payments & Wallet</span> screen to top up and settle your pending dues before deleting your profile.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-[11px] text-gray-500 leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 text-amber-800">
                        To verify this permanent action, type your student ID: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{userProfile.idNumber}</strong> in the input field below.
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Type ID to delete</label>
                        <input
                          type="text"
                          value={deleteIdInput}
                          onChange={(e) => {
                            setDeleteIdInput(e.target.value);
                            setDeleteError('');
                          }}
                          placeholder={userProfile.idNumber}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-red-500 focus:bg-white transition uppercase font-mono"
                        />
                      </div>

                      {deleteError && (
                        <p className="text-[10px] font-bold text-red-500">{deleteError}</p>
                      )}

                      <button
                        onClick={() => {
                          if (deleteIdInput.trim().toUpperCase() !== userProfile.idNumber.toUpperCase()) {
                            setDeleteError('Identification string mismatch. Please type your correct ID.');
                            return;
                          }
                          if (onDeleteAccount) {
                            onDeleteAccount();
                          } else {
                            alert('Account successfully deleted.');
                            window.location.reload();
                          }
                        }}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Permanently Terminate My Profile</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <button 
              onClick={() => alert('Administrative PIN updated successfully.')}
              className="px-4 py-2 bg-[#0b1c30] hover:bg-[#213145] text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Update Security PIN
            </button>
            <button 
              onClick={() => alert('Help ticket created. Dispatchers will contact peer email shortly.')}
              className="text-xs font-bold text-primary hover:underline flex items-center"
            >
              <HelpCircle className="w-4 h-4 mr-0.5" />
              <span>Contact Parking Systems Support</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
