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
  Send,
  Trash2,
  UserPlus,
  ShieldCheck,
  Briefcase,
  User,
  Download,
  Bell,
  BellRing,
  FileText,
  FileCheck,
  Eye,
  Settings,
  Shield,
  Key,
  Volume2,
  VolumeX,
  Smartphone,
  CheckCircle2,
  Sliders,
  DollarSign,
  Layers,
  ExternalLink
} from 'lucide-react';
import { RideRequest, DriverState, AppNotification } from '../types';

interface AdminCentralProps {
  activeView: string;
  activeRide: RideRequest | null;
  onUpdateRide: (ride: RideRequest | null) => void;
  selectedSchoolId?: string;
  notifications?: AppNotification[];
  onMarkNotificationsRead?: () => void;
  onClearNotifications?: () => void;
  onResetSystem?: () => void;
}

// Initial mock driver roster list for admin control panels
const INITIAL_DRIVERS_ROSTER: DriverState[] = [];

export const AdminCentral: React.FC<AdminCentralProps> = ({
  activeView,
  activeRide,
  onUpdateRide,
  selectedSchoolId,
  notifications = [],
  onMarkNotificationsRead,
  onClearNotifications,
  onResetSystem
}) => {
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const mapImage = selectedSchool.mapImage;

  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [selectedLicenseDriver, setSelectedLicenseDriver] = useState<any | null>(null);
  const [desktopNotifPermission, setDesktopNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(true);
  const isInitialPendingLoad = React.useRef<boolean>(true);

  const [driversRoster, setDriversRoster] = useState<DriverState[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);

  // Request browser desktop notification permission
  const handleRequestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setDesktopNotifPermission(perm);
        if (perm === 'granted') {
          new Notification('🔔 CampusRide Admin Desktop Alerts Activated', {
            body: 'You will now receive instant desktop notifications for new driver applications and urgent rider disputes.',
            icon: '/favicon.svg'
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    } else {
      alert('Desktop notifications are not supported in this browser environment.');
    }
  };

  const handleTestPushNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🚕 Test Driver Application Alert', {
          body: 'John Doe (john.doe@university.edu) submitted a new driver application for review.',
          icon: '/favicon.svg'
        });
      } else {
        alert(`Desktop notifications are currently set to '${Notification.permission}'. Click 'Enable Outside Browser Notifications' first.`);
      }
    } else {
      alert('Desktop notifications are not supported by this browser.');
    }
  };

  // 1. Synchronize Driver Roster from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: DriverState[] = [];
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data() as DriverState;
        const id = data.id || doc.id;
        const email = (data.email || '').toLowerCase().trim();
        if (id && !seenIds.has(id) && (!email || !seenEmails.has(email))) {
          seenIds.add(id);
          if (email) seenEmails.add(email);
          list.push({ ...data, id });
        }
      });
      setDriversRoster(list);
    }, (error) => {
      console.error("Firestore error reading driver roster:", error);
    });
    return () => unsub();
  }, []);

  // 2. Synchronize Pending Drivers from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pendingDrivers'), (snapshot) => {
      const list: any[] = [];
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        const id = data.id || doc.id;
        const email = (data.email || '').toLowerCase().trim();
        if (id && !seenIds.has(id) && (!email || !seenEmails.has(email))) {
          seenIds.add(id);
          if (email) seenEmails.add(email);
          list.push({ ...data, id });
        }
      });
      setPendingDrivers(list);

      if (!isInitialPendingLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const driverName = data.name || 'New Driver Application';
            // Trigger Native Desktop Notification outside browser
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('🚕 New Driver Application Received', {
                  body: `${driverName} (${data.email || ''}) submitted a new driver application with license ${data.licenseDocName || 'submitted'}. Please review in Reviews.`,
                  icon: '/favicon.svg'
                });
              } catch (e) {
                console.warn('Could not trigger desktop notification:', e);
              }
            }
          }
        });
      }
      isInitialPendingLoad.current = false;
    }, (error) => {
      console.error("Firestore error reading pending drivers:", error);
    });
    return () => unsub();
  }, []);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [realRideRequests, setRealRideRequests] = useState<RideRequest[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  // Synchronize All Complaints from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'complaints'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ ...doc.data(), id: doc.id });
      });
      setComplaints(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
      console.error("Firestore error reading complaints:", error);
    });
    return () => unsub();
  }, []);

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      const complaintRef = doc(db, 'complaints', complaintId);
      await updateDoc(complaintRef, { status: 'resolved', resolvedAt: Date.now() });
    } catch (err) {
      console.error('Error resolving complaint:', err);
      alert('Failed to resolve complaint.');
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint record permanently?')) return;
    try {
      await deleteDoc(doc(db, 'complaints', complaintId));
    } catch (err) {
      console.error('Error deleting complaint:', err);
      alert('Failed to delete complaint.');
    }
  };

  // Modal open triggers
  const [showAddDriverModal, setShowAddDriverModal] = useState<boolean>(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState<boolean>(false);

  // New Driver Form State
  const [newDriverName, setNewDriverName] = useState<string>('');
  const [newDriverEmail, setNewDriverEmail] = useState<string>('');
  const [newDriverCarBrand, setNewDriverCarBrand] = useState<string>('');
  const [newDriverCarType, setNewDriverCarType] = useState<'car' | 'keke' | 'shuttle'>('keke');
  const [newDriverPlateNumber, setNewDriverPlateNumber] = useState<string>('');
  const [newDriverVehicleId, setNewDriverVehicleId] = useState<string>('');

  // New Admin Form State
  const [newAdminName, setNewAdminName] = useState<string>('');
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [newAdminDept, setNewAdminDept] = useState<string>('');

  // 3. Synchronize All Users from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        const id = data.id || doc.id;
        const email = (data.email || '').toLowerCase().trim();
        if (id && !seenIds.has(id) && (!email || !seenEmails.has(email))) {
          seenIds.add(id);
          if (email) seenEmails.add(email);
          list.push({ ...data, id });
        }
      });
      setAllUsers(list);
    }, (error) => {
      console.error("Firestore error reading all users:", error);
    });
    return () => unsub();
  }, []);

  // Synchronize All Ride Requests from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rideRequests'), (snapshot) => {
      const list: RideRequest[] = [];
      snapshot.forEach(doc => {
        list.push({ ...doc.data(), id: doc.id } as RideRequest);
      });
      setRealRideRequests(list);
    }, (error) => {
      console.error("Firestore error reading ride requests:", error);
    });
    return () => unsub();
  }, []);

  const downloadDriversCSV = () => {
    const drivers = allUsers.filter(u => u.role === 'driver');
    const headers = ['ID', 'Name', 'Email', 'Role', 'Vehicle Specs', 'License Plate', 'Vehicle ID Code', 'Status', 'Average Rating', 'Trips Completed'];
    const rows = drivers.map(d => [
      d.id || '',
      d.name || '',
      d.email || '',
      d.role || '',
      d.vehicle || d.carBrand || '',
      d.plateNumber || '',
      d.vehicleId || '',
      d.isApproved !== false ? 'Active' : 'Pending',
      d.rating || '5.0',
      d.completedTripsCount || '0'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `campusride_drivers_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadRidersCSV = () => {
    const riders = allUsers.filter(u => u.role === 'student' || u.role === 'rider');
    const headers = ['ID', 'Name', 'Email', 'Role', 'Major/Dept', 'Student ID Number', 'Account Balance', 'Status'];
    const rows = riders.map(r => [
      r.id || '',
      r.name || '',
      r.email || '',
      r.role || '',
      r.major || '',
      r.idNumber || '',
      r.walletBalance !== undefined ? `₦${r.walletBalance}` : (r.balance !== undefined ? `₦${r.balance}` : '₦0.00'),
      r.isApproved !== false ? 'Active' : 'Pending'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `campusride_riders_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSlotCount = (range: string) => {
    let count = 0;
    const [startStr, endStr] = range.split(' - ');
    
    const parseTimeToMinutes = (tStr: string) => {
      const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const startMin = parseTimeToMinutes(startStr);
    const endMin = parseTimeToMinutes(endStr);
    if (startMin === null || endMin === null) return 0;

    realRideRequests.forEach(r => {
      if (r.time) {
        const rideMin = parseTimeToMinutes(r.time);
        if (rideMin !== null) {
          if (rideMin >= startMin && rideMin < endMin) {
            count++;
          }
        }
      } else if (r.createdAt) {
        const date = new Date(r.createdAt);
        const rideMin = date.getHours() * 60 + date.getMinutes();
        if (rideMin >= startMin && rideMin < endMin) {
          count++;
        }
      }
    });
    return count;
  };

  // Custom confirmation modal state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'driver_decline' | 'user_delete';
    item: any;
    message: string;
    comment?: string;
  } | null>(null);

  const [approvedEmailDetails, setApprovedEmailDetails] = useState<any | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, string>>({});
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
      const comment = commentsMap[driver.id] || '';
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
        createdAt: new Date().toISOString(),
        adminComments: comment || null
      };
      
      await setDoc(userRef, dProfile, { merge: true });

      // Add approval notification in driver's notifications collection
      const notifId = 'approval-' + Date.now();
      await setDoc(doc(db, 'users', driver.id, 'notifications', notifId), {
        id: notifId,
        title: 'Driver Registration Approved!',
        message: `Your driver profile was approved by Sarah Jenkins. ${comment ? `Comments: "${comment}"` : 'Welcome to the peer transit network!'}`,
        isRead: false,
        type: 'success',
        timestamp: new Date().toISOString()
      });

      // Save an email log to Firestore
      await setDoc(doc(db, 'sent_emails', 'approved-' + driver.id), {
        to: driver.email,
        name: driver.name,
        subject: '🚀 Congratulations! Your CampusRide Driver Account has been Approved!',
        type: 'approve',
        comments: comment,
        dateSent: new Date().toLocaleString(),
        vehicle: vehicleDetails,
        password: 'Driver123!'
      });

      // Remove from pendingDrivers collection
      await deleteDoc(doc(db, 'pendingDrivers', driver.id));

      // Trigger the Simulated Email modal!
      setApprovedEmailDetails({
        to: driver.email,
        name: driver.name,
        subject: '🚀 Congratulations! Your CampusRide Driver Account has been Approved!',
        type: 'approve',
        comments: comment,
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

  const handleDeclineDriver = (driver: any) => {
    const comment = commentsMap[driver.id] || '';
    setDeleteConfirmTarget({
      type: 'driver_decline',
      item: driver,
      comment: comment,
      message: `Are you sure you want to decline and delete ${driver.name}'s driver registration application?` + 
        (comment ? ` The following admin comments will be emailed: "${comment}"` : '')
    });
  };

  const executeConfirmedDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { type, item, comment } = deleteConfirmTarget;
    setDeleteConfirmTarget(null);

    if (type === 'driver_decline') {
      try {
        const notifId = 'decline-' + Date.now();
        // Create user profile as isApproved = false, and set comments so when they try to log in, they can see why!
        const userRef = doc(db, 'users', item.id);
        await setDoc(userRef, {
          id: item.id,
          name: item.name,
          email: item.email,
          role: 'driver',
          isApproved: false,
          declined: true,
          adminComments: comment || 'Your application was declined by the administrator. Please check your details and reapply.'
        }, { merge: true });

        // Add decline notification
        await setDoc(doc(db, 'users', item.id, 'notifications', notifId), {
          id: notifId,
          title: 'Driver Registration Declined - Please Reapply',
          message: `Your driver profile was declined. Please check your credentials and submit a new application. Reason: ${comment || 'Information mismatch or verification failed.'}`,
          isRead: false,
          type: 'alert',
          timestamp: new Date().toISOString()
        });

        // Save an email log to Firestore
        await setDoc(doc(db, 'sent_emails', 'declined-' + item.id), {
          to: item.email,
          name: item.name,
          subject: '⚠️ Action Required: Reapply for CampusRide Driver Application',
          type: 'decline',
          comments: comment || 'Credentials or registration details mismatch. Please reapply.',
          dateSent: new Date().toLocaleString()
        });

        // Remove from pendingDrivers collection
        await deleteDoc(doc(db, 'pendingDrivers', item.id));

        // Trigger Simulated Email Modal for decline
        setApprovedEmailDetails({
          to: item.email,
          name: item.name,
          subject: '⚠️ Action Required: Reapply for CampusRide Driver Application',
          type: 'decline',
          comments: comment || 'Credentials or registration details mismatch. Please reapply.',
          dateSent: new Date().toLocaleString()
        });

        alert(`Registration for ${item.name} has been declined. Reapplication instruction email has been sent to ${item.email}.`);
        window.dispatchEvent(new Event('storage'));
      } catch (error) {
        console.error("Error declining driver in Firestore:", error);
      }
    } else if (type === 'user_delete') {
      try {
        await deleteDoc(doc(db, 'users', item.id));
        alert(`Permanently deleted ${item.name || 'user'}'s account.`);
      } catch (error) {
        console.error("Error deleting user document:", error);
        alert("Failed to delete user account: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverEmail.trim() || !newDriverCarBrand.trim() || !newDriverPlateNumber.trim()) {
      alert("Please fill in all required driver details.");
      return;
    }

    try {
      const emailKey = newDriverEmail.toLowerCase().trim();
      const existingUser = allUsers.find(u => u.email.toLowerCase() === emailKey);
      if (existingUser) {
        alert(`An account with email "${newDriverEmail}" already exists in the system. Multiple account creation with the same email is not allowed.`);
        return;
      }
      const uid = 'drv-' + Date.now();

      const vehicleDetails = `${newDriverCarBrand.trim()} (${newDriverCarType.toUpperCase()}) • ${newDriverPlateNumber.trim()}${newDriverVehicleId.trim() ? ` [ID: ${newDriverVehicleId.trim()}]` : ''}`;

      const dProfile = {
        id: uid,
        name: newDriverName.trim(),
        email: emailKey,
        role: 'driver',
        vehicle: vehicleDetails,
        rating: 5.0,
        ratingsCount: 0,
        todayEarnings: 0,
        completedTripsCount: 0,
        hoursOnline: 0,
        status: 'Offline',
        avatar: `https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY`,
        isApproved: true,
        carBrand: newDriverCarBrand.trim(),
        plateNumber: newDriverPlateNumber.trim(),
        carType: newDriverCarType,
        vehicleId: newDriverVehicleId.trim() || 'DRV-' + Math.floor(Math.random() * 9000 + 1000),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), dProfile, { merge: true });

      // Save lookup keys for plate number and vehicle ID
      if (dProfile.plateNumber) {
        const plateKey = dProfile.plateNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
        await setDoc(doc(db, 'idLookups', plateKey), { email: emailKey }).catch(console.error);
      }
      if (dProfile.vehicleId) {
        const vehicleKey = dProfile.vehicleId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
        await setDoc(doc(db, 'idLookups', vehicleKey), { email: emailKey }).catch(console.error);
      }

      // Add a registration notification
      const notifId = 'welcome-' + Date.now();
      await setDoc(doc(db, 'users', uid, 'notifications', notifId), {
        id: notifId,
        title: 'Driver Account Created!',
        message: `Welcome, ${newDriverName}! Your administrator created your driver account with verified vehicle authorization: ${vehicleDetails}. You can now log in.`,
        isRead: false,
        type: 'success',
        timestamp: new Date().toISOString()
      });

      // Show mock email
      setApprovedEmailDetails({
        to: emailKey,
        name: newDriverName.trim(),
        subject: '🚀 Welcome to CampusRide! Your Authorized Driver Account is Ready',
        type: 'approve',
        comments: 'Authorized directly by Administrative Operations Command.',
        vehicle: vehicleDetails,
        password: 'Driver123!',
        dateSent: new Date().toLocaleString(),
      });

      // Reset form
      setNewDriverName('');
      setNewDriverEmail('');
      setNewDriverCarBrand('');
      setNewDriverCarType('keke');
      setNewDriverPlateNumber('');
      setNewDriverVehicleId('');
      setShowAddDriverModal(false);

      alert(`Driver ${newDriverName} has been successfully added and approved!`);
    } catch (error) {
      console.error("Error creating driver:", error);
      alert("Failed to create driver: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      alert("Please fill in all required admin details.");
      return;
    }

    try {
      const emailKey = newAdminEmail.toLowerCase().trim();
      const existingUser = allUsers.find(u => u.email.toLowerCase() === emailKey);
      if (existingUser) {
        alert(`An account with email "${newAdminEmail}" already exists in the system. Multiple account creation with the same email is not allowed.`);
        return;
      }
      const uid = 'adm-' + Date.now();

      const adminProfile = {
        id: uid,
        name: newAdminName.trim(),
        email: emailKey,
        role: 'admin',
        enrolledTerm: newAdminDept.trim() || 'Operations Command',
        idNumber: 'ADM-' + Math.floor(Math.random() * 9000 + 1000),
        avatar: `https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY`,
        isVerified: true,
        isApproved: true,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), adminProfile, { merge: true });

      // Save lookup key for admin ID
      if (adminProfile.idNumber) {
        const adminKey = adminProfile.idNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
        await setDoc(doc(db, 'idLookups', adminKey), { email: emailKey }).catch(console.error);
      }

      // Reset form
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminDept('');
      setShowAddAdminModal(false);

      alert(`Admin ${newAdminName} has been successfully registered!`);
    } catch (error) {
      console.error("Error creating admin:", error);
      alert("Failed to create admin: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handlePromoteToAdmin = async (targetUser: any) => {
    const targetName = targetUser.name || targetUser.email || 'User';
    if (!window.confirm(`Are you sure you want to promote ${targetName} (${targetUser.email}) to Administrator? They will be granted full administrative and operational control.`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, {
        role: 'admin',
        isApproved: true,
        enrolledTerm: targetUser.enrolledTerm || 'Operations Command',
        updatedAt: new Date().toISOString()
      });

      // Write in-app notification to the promoted user
      const notifId = 'admin-grant-' + Date.now();
      await setDoc(doc(db, 'users', targetUser.id, 'notifications', notifId), {
        id: notifId,
        title: '🛡️ Administrator Privileges Granted',
        message: 'You have been granted Administrator privileges by the Operations Command team. Refresh or switch roles to access Admin Central.',
        isRead: false,
        type: 'success',
        timestamp: new Date().toISOString()
      });

      // Trigger Desktop push notification if allowed
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🛡️ Administrator Appointed', {
          body: `${targetName} was successfully promoted to System Administrator.`,
          icon: '/favicon.svg'
        });
      }

      alert(`Success: ${targetName} has been promoted to Administrator!`);
    } catch (err) {
      console.error('Error promoting user to admin:', err);
      alert('Failed to promote user to admin in Firestore: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRevokeAdmin = async (targetUser: any) => {
    const targetName = targetUser.name || targetUser.email || 'User';
    if (!window.confirm(`Are you sure you want to remove Administrator privileges from ${targetName}? Their role will be updated back to Student.`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, {
        role: 'student',
        updatedAt: new Date().toISOString()
      });

      const notifId = 'admin-revoke-' + Date.now();
      await setDoc(doc(db, 'users', targetUser.id, 'notifications', notifId), {
        id: notifId,
        title: 'Administrator Privileges Updated',
        message: 'Your system access role has been updated back to Student Rider.',
        isRead: false,
        type: 'info',
        timestamp: new Date().toISOString()
      });

      alert(`Role updated: ${targetName}'s admin privileges have been removed.`);
    } catch (err) {
      console.error('Error revoking admin role:', err);
      alert('Failed to update user role in Firestore: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveUser = (user: any) => {
    setDeleteConfirmTarget({
      type: 'user_delete',
      item: user,
      message: `Are you sure you want to permanently delete the ${(user.role || 'user').toUpperCase()} account for ${user.name} (${user.email})? This action cannot be undone.`
    });
  };

  // Filter roster drivers (only show online drivers: status !== 'Offline')
  const filteredRoster = driversRoster.filter(drv => 
    drv.status !== 'Offline' && (
      drv.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
      (drv.vehicle || '').toLowerCase().includes(driverSearch.toLowerCase())
    )
  );

  // Derived counts and filters for User Directory
  const totalCount = allUsers.length;
  const studentCount = allUsers.filter(u => u.role === 'student' || u.role === 'rider').length;
  const driverCount = allUsers.filter(u => u.role === 'driver').length;
  const adminCount = allUsers.filter(u => u.role === 'admin').length;

  const filteredUsers = allUsers.filter(user => {
    // 1. Role Filter
    if (userFilterRole !== 'all') {
      if (userFilterRole === 'student') {
        if (user.role !== 'student' && user.role !== 'rider') return false;
      } else if (user.role !== userFilterRole) {
        return false;
      }
    }
    // 2. Search Filter
    if (userSearch.trim()) {
      const s = userSearch.toLowerCase().trim();
      const nameMatch = user.name?.toLowerCase().includes(s);
      const emailMatch = user.email?.toLowerCase().includes(s);
      const vehicleMatch = user.vehicle?.toLowerCase().includes(s);
      const idMatch = user.idNumber?.toLowerCase().includes(s);
      const majorMatch = user.major?.toLowerCase().includes(s);
      return nameMatch || emailMatch || vehicleMatch || idMatch || majorMatch;
    }
    return true;
  });

  return (
    <div id="admin-portal-viewport" className="flex-1 overflow-y-auto px-4 py-6 md:p-8 bg-[#F9FAFB]">
      
      {/* Header operations central */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#00875A] tracking-tight">
            {activeView === 'admin_operations' && 'Live Despatch Operations'}
            {activeView === 'admin_users' && 'User Directory & Management'}
            {activeView === 'admin_analytics' && 'Ridership Performance Analytics'}
            {activeView === 'admin_reviews' && 'Driver Verification Queue'}
            {activeView === 'admin_complaints' && 'Rider Dispute & Complaint Lodge'}
          </h1>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-3.5 relative">
          {/* Notification Bell Icon */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2.5 text-gray-500 hover:text-[#00875A] hover:bg-white border border-gray-150 rounded-xl transition duration-150 relative cursor-pointer shadow-sm bg-white flex items-center justify-center"
              title="Admin Alerts & Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-white animate-pulse">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-gray-150 shadow-xl overflow-hidden z-50 text-left"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-2">
                      <BellRing className="w-4 h-4 text-[#00875A]" />
                      <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider">Admin Notifications</h3>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          onMarkNotificationsRead?.();
                          alert('All admin alerts marked as read.');
                        }}
                        className="text-[10px] text-[#00875A] hover:underline font-bold"
                      >
                        Mark read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {notifications && notifications.length > 0 ? (
                      notifications.map((notif, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3.5 transition-colors ${notif.isRead ? 'bg-white opacity-70' : 'bg-[#00875A]/5'}`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="text-left min-w-0 flex-1">
                              <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide truncate">{notif.title}</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-normal break-words">{notif.message}</p>
                              <span className="text-[9px] text-gray-400 font-mono block mt-1">{notif.time || notif.date}</span>
                            </div>
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1"></span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-gray-400 italic">
                        No recent operations alerts.
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-2.5 border-t border-gray-100 bg-gray-50/50 text-center">
                      <button
                        onClick={() => {
                          onClearNotifications?.();
                        }}
                        className="text-[10px] text-rose-600 hover:underline font-bold"
                      >
                        Clear History
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1 mr-2 text-left">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono truncate">Active Campus Rides</span>
                <span className="text-2xl font-extrabold text-primary block my-0.5">{SYSTEM_KPIS.activeRides}</span>
                <span className="text-[9px] text-[#00875A] font-bold bg-[#00875A]/10 px-2.5 py-0.5 rounded-full inline-block">
                  Within nominal limit
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] text-primary flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1 mr-2 text-left">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono truncate">Idle Peer Drivers</span>
                <span className="text-2xl font-extrabold text-[#00875A] block my-0.5">{SYSTEM_KPIS.idleDrivers}</span>
                <span className="text-[9px] text-[#00875A] font-bold bg-[#F9FAFB]/35 px-2.5 py-0.5 rounded-full inline-block">
                  Ready in queue
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1 mr-2 text-left">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono truncate">Revenue Today</span>
                <span className="text-2xl font-extrabold text-[#00875A] block my-0.5">₦{SYSTEM_KPIS.revenueToday}</span>
                <span className="text-[9px] text-[#00875A] font-bold bg-[#00875A]/10 px-2.5 py-0.5 rounded-full inline-block">
                  +14% vs weekday avg
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center shrink-0">
                <span className="text-lg font-black font-sans leading-none">₦</span>
              </div>
            </div>

            {/* Incidents KPI with dynamic trigger */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-[#00875A]/10/20 transition group min-w-0">
              <div className="min-w-0 flex-1 mr-2 text-left">
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block font-mono truncate">Reported Safety Flags</span>
                <span className="text-2xl font-extrabold text-[#00875A] block my-0.5">{incidentsCount}</span>
                <span className="text-[9px] text-red-650 font-bold bg-[#00875A]/10 px-2.5 py-0.5 rounded-full inline-block group-hover:bg-red-100/50">
                  Click to resolve one
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (incidentsCount > 0) {
                    setIncidentsCount(incidentsCount - 1);
                    alert('Incident report marked: Investigated & Resolved.');
                  } else {
                    alert('Congratulations! Zero outstanding active incident reports.');
                  }
                }}
                className="w-10 h-10 rounded-xl bg-[#00875A]/10 text-[#00875A] flex items-center justify-center hover:bg-red-100 transition shrink-0"
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

              {/* Dynamic visual blocks for peak hours */}
              <div className="space-y-2 pt-2">
                {(() => {
                  const slots = [
                    { range: '06:00 AM - 08:00 AM', defaultRatio: 80, defaultLabel: 'Early Peak' },
                    { range: '08:00 AM - 10:00 AM', defaultRatio: 70, defaultLabel: 'Modest' },
                    { range: '10:00 AM - 12:00 PM', defaultRatio: 95, defaultLabel: 'CRITICAL PEAK' },
                    { range: '12:00 PM - 02:00 PM', defaultRatio: 85, defaultLabel: 'High Demand' },
                    { range: '02:00 PM - 04:00 PM', defaultRatio: 60, defaultLabel: 'Standard' },
                    { range: '04:00 PM - 06:00 PM', defaultRatio: 90, defaultLabel: 'High Demand' },
                    { range: '06:00 PM - 08:00 PM', defaultRatio: 75, defaultLabel: 'Evening Peak' },
                  ];

                  const slotData = slots.map(slot => {
                    const count = getSlotCount(slot.range);
                    return { ...slot, count };
                  });

                  const totalRealRides = slotData.reduce((acc, s) => acc + s.count, 0);
                  const maxCount = Math.max(...slotData.map(s => s.count), 0);

                  return slotData.map((slot) => {
                    const ratio = totalRealRides > 0 
                      ? (maxCount > 0 ? Math.round((slot.count / maxCount) * 100) : 0)
                      : slot.defaultRatio;
                    
                    const label = totalRealRides > 0
                      ? (slot.count > 0 
                          ? `${slot.count} Ride${slot.count > 1 ? 's' : ''} (${ratio >= 90 ? 'CRITICAL' : ratio >= 75 ? 'HIGH' : 'ACTIVE'})`
                          : 'No active rides'
                        )
                      : slot.defaultLabel;

                    return {
                      range: slot.range,
                      ratio,
                      label
                    };
                  }).map((item, id) => (
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
                  ));
                })()}
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
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono tracking-wider uppercase flex flex-wrap">
                    <th className="pb-3 font-semibold flex-1 min-w-[150px] inline-block">Driver Profile</th>
                    <th className="pb-3 font-semibold flex-1 min-w-[150px] inline-block">Registered Vehicle Type</th>
                    <th className="pb-3 font-semibold flex-1 min-w-[100px] inline-block">Average Rating</th>
                    <th className="pb-3 font-semibold flex-1 min-w-[120px] inline-block">Trips & Earnings Today</th>
                    <th className="pb-3 font-semibold flex-1 min-w-[120px] inline-block">Duty Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/65">
                  {filteredRoster.map((drv) => (
                    <tr key={drv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition flex flex-wrap py-2 items-center">
                      
                      {/* Driver ID cell */}
                      <td className="py-3 flex-1 min-w-[150px] inline-block whitespace-normal break-words">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            referrerPolicy="no-referrer"
                            src={drv.avatar} 
                            alt="Driver" 
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                          <div className="inline-block whitespace-normal break-words max-w-[110px]">
                            <span className="font-bold text-[#00875A] block break-all">{drv.name}</span>
                            <span className="font-mono text-[9px] text-[#737686] block break-all">{drv.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Vehicle specs */}
                      <td className="py-3 flex-1 min-w-[150px] inline-block whitespace-normal break-words">
                        <span className="font-semibold text-slate-800 inline-block whitespace-normal break-words max-w-[140px]">{drv.vehicle}</span>
                      </td>

                      {/* Rating column */}
                      <td className="py-3 flex-1 min-w-[100px] inline-block whitespace-normal break-words">
                        <div className="inline-block whitespace-normal">
                          <span className="font-mono font-bold text-[#00875A] block">★ {drv.rating ?? 5.0}</span>
                          <span className="text-[10px] text-gray-400 block font-semibold">{drv.ratingsCount ?? 0} reviews</span>
                        </div>
                      </td>

                      {/* Earnings */}
                      <td className="py-3 flex-1 min-w-[120px] inline-block whitespace-normal break-words">
                        <div className="inline-block whitespace-normal">
                          <span className="font-bold text-slate-900 block">₦{(drv.todayEarnings ?? 0).toFixed(2)}</span>
                          <span className="text-[10px] text-gray-450 font-semibold block">{drv.completedTripsCount ?? 0} shifts</span>
                        </div>
                      </td>

                      {/* Roster state toggle button */}
                      <td className="py-3 flex-1 min-w-[120px] inline-block whitespace-normal break-words">
                        <div className="inline-block whitespace-normal">
                          <button
                            onClick={() => handleDriverStatusToggle(drv.id, drv.status)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide border whitespace-normal break-words max-w-[110px] ${
                              drv.status === 'On Trip' ? 'bg-[#F9FAFB] text-[#00875A] border-[#00875A]/20' :
                              drv.status === 'Idle' ? 'bg-[#00875A]/10 text-[#00875A] border-sage-light' :
                              drv.status === 'Break' ? 'bg-[#F9FAFB] text-[#00875A] border-[#00875A]/20' :
                              'bg-gray-100 text-gray-500 border-gray-300'
                            }`}
                          >
                            {drv.status === 'On Trip' ? 'On Trip' : drv.status === 'Idle' ? 'On Duty' : drv.status === 'Break' ? 'On Break' : 'Offline'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

        {/* RENDER VIEW: USER DIRECTORY & MANAGEMENT */}
        {activeView === 'admin_users' && (
          <motion.div
            key="admin_users"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            id="view-admin-users"
            className="space-y-6"
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-150/80 shadow-sm flex items-center space-x-3.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#00875A] shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Total Registered</p>
                  <p className="text-lg font-extrabold text-gray-900 leading-none mt-1">{totalCount}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-150/80 shadow-sm flex items-center space-x-3.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#00875A] shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Student Riders</p>
                  <p className="text-lg font-extrabold text-[#00875A] leading-none mt-1">{studentCount}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-150/80 shadow-sm flex items-center space-x-3.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Verified Drivers</p>
                  <p className="text-lg font-extrabold text-orange-600 leading-none mt-1">{driverCount}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-150/80 shadow-sm flex items-center space-x-3.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#00875A] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Admins Authorized</p>
                  <p className="text-lg font-extrabold text-[#00875A] leading-none mt-1">{adminCount}</p>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, credentials..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00875A] transition"
                  />
                </div>

                {/* Create User Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAddDriverModal(true)}
                    className="bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Verified Driver</span>
                  </button>

                  <button
                    onClick={() => setShowAddAdminModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Add Administrator</span>
                  </button>

                  <button
                    onClick={downloadDriversCSV}
                    className="bg-emerald-50 hover:bg-emerald-100 text-[#00875A] font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition border border-emerald-150 cursor-pointer"
                    title="Export all verified drivers as CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Drivers CSV</span>
                  </button>

                  <button
                    onClick={downloadRidersCSV}
                    className="bg-emerald-50 hover:bg-emerald-100 text-[#00875A] font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition border border-emerald-150 cursor-pointer"
                    title="Export all student student riders as CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Riders CSV</span>
                  </button>
                </div>
              </div>

              {/* Role Filter Tabs */}
              <div className="flex flex-wrap border-b border-gray-150/60 pb-1 gap-1">
                {[
                  { id: 'all', label: 'All Registered', count: totalCount },
                  { id: 'student', label: 'Student Riders', count: studentCount },
                  { id: 'driver', label: 'Verified Drivers', count: driverCount },
                  { id: 'admin', label: 'System Administrators', count: adminCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setUserFilterRole(tab.id)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition duration-200 cursor-pointer ${
                      userFilterRole === tab.id
                        ? 'border-[#00875A] text-[#00875A]'
                        : 'border-transparent text-gray-500 hover:text-gray-950'
                    }`}
                  >
                    {tab.label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      userFilterRole === tab.id ? 'bg-[#00875A]/15 text-[#00875A]' : 'bg-gray-100 text-gray-500'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Users Directory Table & Cards */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">No users found matching filters</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Try refining your keyword query or switching the active tab filter.</p>
                </div>
              ) : (
                <>
                  {/* Desktop view: structured directory table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                          <th className="py-4 px-6">User profile</th>
                          <th className="py-4 px-4">Authorized role</th>
                          <th className="py-4 px-4">Core identifier / details</th>
                          <th className="py-4 px-4">Registration status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-gray-750">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition">
                            {/* Profile details */}
                            <td className="py-4 px-6 flex items-center space-x-3 max-w-[280px]">
                              <img
                                src={user.avatar || `https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY`}
                                referrerPolicy="no-referrer"
                                alt={user.name}
                                className="w-10 h-10 rounded-xl bg-gray-50 object-cover border border-gray-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-gray-950 truncate" title={user.name}>{user.name}</p>
                                <p className="text-[10px] text-gray-500 truncate" title={user.email}>{user.email}</p>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-4 px-4">
                              {user.role === 'admin' && (
                                <span className="bg-emerald-50 text-[#00875A] border border-emerald-150 px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                                  <span>Administrator</span>
                                </span>
                              )}
                              {user.role === 'driver' && (
                                <span className="bg-orange-50 text-orange-700 border border-orange-150 px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1">
                                  <Activity className="w-3.5 h-3.5 text-orange-500" />
                                  <span>Verified Driver</span>
                                </span>
                              )}
                              {(user.role === 'student' || user.role === 'rider') && (
                                <span className="bg-emerald-50 text-[#00875A] border border-emerald-150 px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1">
                                  <User className="w-3.5 h-3.5 text-[#00875A]" />
                                  <span>Student Rider</span>
                                </span>
                              )}
                            </td>

                            {/* Core identifier */}
                            <td className="py-4 px-4 max-w-[250px]">
                              <div className="min-w-0 text-xs text-gray-650">
                                {user.role === 'admin' && (
                                  <span className="truncate block font-medium" title={user.enrolledTerm || 'Operations Command'}>
                                    Dept: {user.enrolledTerm || 'Operations Command'}
                                  </span>
                                )}
                                {user.role === 'driver' && (
                                  <div>
                                    <span className="font-bold text-gray-950 block truncate" title={user.vehicle || 'Not specified'}>
                                      {user.vehicle || 'Not specified'}
                                    </span>
                                    {user.plateNumber && (
                                      <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                        Plate: {user.plateNumber}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {(user.role === 'student' || user.role === 'rider') && (
                                  <div>
                                    <span className="truncate block font-semibold text-gray-800" title={user.major || 'Undergraduate'}>
                                      Major: {user.major || 'Undergraduate'}
                                    </span>
                                    {user.idNumber && (
                                      <span className="text-[10px] font-mono text-gray-500 block">ID: {user.idNumber}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Registration Status */}
                            <td className="py-4 px-4">
                              {user.isApproved !== false ? (
                                <span className="text-emerald-600 font-bold flex items-center text-[11px]">
                                  <CheckCircle className="w-4 h-4 mr-1 shrink-0 text-emerald-500" />
                                  Active & Ready
                                </span>
                              ) : (
                                <span className="text-amber-605 font-bold flex items-center text-[11px]">
                                  <Clock className="w-4 h-4 mr-1 shrink-0 text-amber-500 animate-pulse" />
                                  Pending Review
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {user.role !== 'admin' ? (
                                  <button
                                    onClick={() => handlePromoteToAdmin(user)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#00875A] border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                                    title="Promote user to Administrator"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                                    <span>Make Admin</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRevokeAdmin(user)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                                    title="Revoke Admin status"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                                    <span>Remove Admin</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveUser(user)}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer"
                                  title="Remove User Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile stacked visual card list */}
                  <div className="block md:hidden divide-y divide-gray-100">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 space-y-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 min-w-0">
                            <img
                              src={user.avatar || `https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY`}
                              referrerPolicy="no-referrer"
                              alt={user.name}
                              className="w-10 h-10 rounded-xl bg-gray-50 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-950 truncate">{user.name}</p>
                              <p className="text-[10px] text-gray-550 truncate">{user.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveUser(user)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="bg-slate-50/80 rounded-xl p-3 text-xs text-gray-750 flex flex-col gap-1 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 font-semibold text-[10px] uppercase">Authorized Role:</span>
                            {user.role === 'admin' && (
                              <span className="text-[#00875A] font-bold text-[10px]">Administrator</span>
                            )}
                            {user.role === 'driver' && (
                              <span className="text-orange-700 font-bold text-[10px]">Verified Driver</span>
                            )}
                            {(user.role === 'student' || user.role === 'rider') && (
                              <span className="text-[#00875A] font-bold text-[10px]">Student Rider</span>
                            )}
                          </div>

                          <div className="flex items-start justify-between mt-1">
                            <span className="text-gray-400 font-semibold text-[10px] uppercase shrink-0">Details:</span>
                            <div className="text-right text-[11px] text-gray-800 break-words max-w-[200px]">
                              {user.role === 'admin' && (user.enrolledTerm || 'Operations Command')}
                              {user.role === 'driver' && (
                                <>
                                  <span className="font-semibold block">{user.vehicle || 'Not specified'}</span>
                                  {user.plateNumber && <span className="font-mono text-[9px] bg-gray-200/60 px-1 rounded block mt-0.5">{user.plateNumber}</span>}
                                </>
                              )}
                              {(user.role === 'student' || user.role === 'rider') && (
                                <>
                                  <span className="font-semibold block">{user.major || 'Undergraduate'}</span>
                                  {user.idNumber && <span className="text-[10px] text-gray-500 block">ID: {user.idNumber}</span>}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-400 font-semibold text-[10px] uppercase">Status:</span>
                            {user.isApproved !== false ? (
                              <span className="text-emerald-600 font-bold text-[10px] flex items-center">
                                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold text-[10px] flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1 text-amber-500 animate-pulse" /> Pending
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-gray-200/60">
                            {user.role !== 'admin' ? (
                              <button
                                onClick={() => handlePromoteToAdmin(user)}
                                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#00875A] border border-emerald-200 rounded-lg text-xs font-extrabold flex items-center gap-1 transition"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                                <span>Make Admin</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRevokeAdmin(user)}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-extrabold flex items-center gap-1 transition"
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                <span>Remove Admin</span>
                              </button>
                            )}
                            <span className="text-[10px] font-mono text-gray-400">ID: {user.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
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

                          {/* Driver License Document Card */}
                          <div 
                            onClick={() => setSelectedLicenseDriver(driver)}
                            className="mt-3 pt-2.5 border-t border-gray-200/50 flex items-center justify-between bg-orange-50/40 hover:bg-orange-50/90 p-2.5 rounded-xl border border-orange-200/60 transition cursor-pointer group"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-orange-600 block flex items-center gap-1">
                                <FileText className="w-3 h-3 text-orange-600" /> Driver's License Document
                              </span>
                              <span className="text-xs font-bold text-gray-800 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                                <span className="truncate">{driver.licenseDocName || 'Driver_License_Submitted.pdf'}</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedLicenseDriver(driver); }}
                              className="px-2.5 py-1.5 bg-orange-600 group-hover:bg-orange-700 text-white rounded-lg text-[10px] font-extrabold uppercase font-mono flex items-center gap-1 shrink-0 shadow-xs transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View License</span>
                            </button>
                          </div>

                          <div className="text-[10px] text-gray-450 font-medium pt-1">
                            Registered: {new Date(driver.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>

                      {/* Review Comments input */}
                      <div className="mt-4 pt-3 border-t border-gray-150">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block mb-1">
                          Admin Review Comments (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={commentsMap[driver.id] || ''}
                          onChange={(e) => setCommentsMap({ ...commentsMap, [driver.id]: e.target.value })}
                          placeholder="Provide reasons for rejection or instructions for approved drivers..."
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00875A] focus:border-[#00875A] transition resize-none placeholder-gray-400 font-sans"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveDriver(driver)}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Verify</span>
                        </button>
                        <button
                          onClick={() => handleDeclineDriver(driver)}
                          className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold transition border border-red-100 flex items-center justify-center space-x-1 cursor-pointer"
                          title="Decline & Delete Application"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Decline & Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* RENDER VIEW: COMPLAINTS REVIEW */}
        {activeView === 'admin_complaints' && (
          <motion.div
            key="admin_complaints"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-admin-complaints"
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Rider Incident & Operations Complaints</h3>
                  <p className="text-xs text-gray-400">
                    Monitor active and historical rider disputes. Operational safety agents review logs in real-time to maintain service integrity.
                  </p>
                </div>
                <div className="bg-rose-50 text-rose-700 border border-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center shrink-0">
                  <ShieldAlert className="w-4 h-4 mr-1.5 text-rose-600 animate-pulse" />
                  {complaints.filter(c => c.status === 'pending').length} Unresolved Dispute{complaints.filter(c => c.status === 'pending').length !== 1 ? 's' : ''}
                </div>
              </div>

              {complaints.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">All Operations Clear!</h4>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      No active on-trip passenger complaints or safety incidents are currently recorded in the ledger.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <div 
                      key={complaint.id} 
                      className={`rounded-2xl p-5 border transition-all flex flex-col md:flex-row md:items-start justify-between gap-6 text-left ${
                        complaint.status === 'resolved' 
                          ? 'bg-slate-50 border-slate-200 opacity-75' 
                          : 'bg-rose-50/20 border-rose-100 shadow-xs hover:border-rose-200'
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold font-mono uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                            complaint.status === 'resolved' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {complaint.status === 'resolved' ? 'Resolved' : 'Active Unresolved'}
                          </span>
                          <span className="text-xs font-bold text-slate-500 font-mono">ID: {complaint.id}</span>
                          <span className="text-xs text-slate-400 font-mono">• {new Date(complaint.createdAt).toLocaleString()}</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider font-mono block">Complaint Category</span>
                          <h4 className="text-base font-black text-slate-800 mt-0.5">{complaint.category || 'Dispute'}</h4>
                        </div>

                        <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Incident Details</span>
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed italic">
                            "{complaint.details}"
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {/* Passenger info */}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
                            <img 
                              referrerPolicy="no-referrer"
                              src={complaint.passengerAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"} 
                              alt="Rider" 
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Filer (Passenger)</span>
                              <span className="text-xs font-bold text-slate-800 block truncate">{complaint.passengerName || 'Student Rider'}</span>
                              <span className="text-[9px] text-slate-400 block font-mono truncate">ID: {complaint.passengerId}</span>
                            </div>
                          </div>

                          {/* Driver info */}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase border border-slate-300">
                              {complaint.driverName ? complaint.driverName.charAt(0) : 'D'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Assigned Driver</span>
                              <span className="text-xs font-bold text-slate-800 block truncate">{complaint.driverName || 'David Alao'}</span>
                              <span className="text-[9px] text-slate-400 block font-mono truncate">ID: {complaint.driverId}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col gap-2 shrink-0 md:justify-start justify-end">
                        {complaint.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolveComplaint(complaint.id)}
                            className="bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-100" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteComplaint(complaint.id)}
                          className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-350 font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span>Delete Log</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* RENDER VIEW: ADMIN SETTINGS */}
        {activeView === 'admin_settings' && (
          <motion.div
            key="admin_settings"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.05, ease: 'easeInOut' }}
            id="view-admin-settings"
            className="space-y-6"
          >
            {/* Top Overview Banner */}
            <div className="bg-[#00875A] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-emerald-200" />
                  <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-200">System Command & Control</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">Administrator Settings & Access Delegation</h2>
                <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                  Configure real-time desktop push notifications, promote verified users to system administrators, manage dispatch parameters, and review security logs.
                </p>
              </div>
            </div>

            {/* Grid Section 1: Notifications & Alert Systems */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Native Desktop Browser Notifications */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Outside Browser Notifications</h3>
                      <p className="text-[11px] text-gray-400">Receive alerts even when CampusRide is in background</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase border ${
                    desktopNotifPermission === 'granted' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : desktopNotifPermission === 'denied'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {desktopNotifPermission === 'granted' ? 'Active & Granted' : desktopNotifPermission === 'denied' ? 'Blocked by Browser' : 'Permission Required'}
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    When enabled, your operating system will display instant desktop popups whenever a <strong>new driver application is submitted</strong> or a <strong>rider lodges an urgent dispute</strong>.
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-150 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#00875A]" />
                        Desktop Web Push Status:
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 uppercase">
                        {desktopNotifPermission}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={handleRequestDesktopPermission}
                      className="flex-1 py-2.5 px-4 bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Bell className="w-4 h-4" />
                      <span>{desktopNotifPermission === 'granted' ? 'Re-Verify Desktop Alerts' : 'Enable Outside Browser Alerts'}</span>
                    </button>

                    <button
                      onClick={handleTestPushNotification}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-500" />
                      <span>Test Alert</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sound & Audio Alert Dispatch Config */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Operational Sound Chimes</h3>
                      <p className="text-[11px] text-gray-400">Audio feedback during live dispatch shifts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
                    className={`p-1.5 rounded-xl transition cursor-pointer ${
                      soundAlertsEnabled ? 'bg-emerald-100 text-[#00875A]' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {soundAlertsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>

                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="font-semibold text-gray-700">Driver Application Chime</span>
                    <span className="font-mono text-[11px] text-emerald-700 font-bold">Enabled (High Pitch)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="font-semibold text-gray-700">Dispute Complaint Alert Sound</span>
                    <span className="font-mono text-[11px] text-emerald-700 font-bold">Enabled (Repeated Chime)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="font-semibold text-gray-700">Admin Central Sound Status</span>
                    <span className="font-mono text-[11px] font-bold text-gray-900">{soundAlertsEnabled ? 'ACTIVE' : 'MUTED'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Grid Section 2: Administrator Delegation & Access Control */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-[#00875A]" />
                    <h3 className="text-base font-extrabold text-slate-900">Administrator Privileges & Staff Roster</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Promote standard student riders or drivers to System Administrators to grant them operational authority.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddAdminModal(true)}
                  className="px-4 py-2.5 bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register New Admin</span>
                </button>
              </div>

              {/* List of current admins */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold font-mono uppercase tracking-wider text-gray-400 block">
                  Active Administrators ({allUsers.filter(u => u.role === 'admin').length})
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allUsers.filter(u => u.role === 'admin').map((adminUser) => (
                    <div 
                      key={adminUser.id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-gray-200/80 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#00875A] font-black flex items-center justify-center text-sm border border-emerald-200 shrink-0">
                          {adminUser.name ? adminUser.name.charAt(0) : 'A'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{adminUser.name}</h4>
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-[#00875A] rounded text-[9px] font-extrabold font-mono uppercase">
                              Admin
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{adminUser.email}</p>
                          <span className="text-[10px] text-slate-600 block mt-0.5">
                            Dept: {adminUser.enrolledTerm || 'Operations Command'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeAdmin(adminUser)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-[10px] font-extrabold transition shrink-0 cursor-pointer ml-2"
                        title="Remove Administrator privileges"
                      >
                        Remove Admin
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick User Search & Promotion Box */}
              <div className="mt-6 pt-5 border-t border-gray-150 space-y-3">
                <span className="text-[10px] font-extrabold font-mono uppercase tracking-wider text-gray-400 block">
                  Promote User to Admin
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {allUsers.filter(u => u.role !== 'admin').slice(0, 6).map((candidate) => (
                    <div 
                      key={candidate.id}
                      className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between hover:border-[#00875A]/40 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-gray-800 truncate">{candidate.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">{candidate.email}</p>
                      </div>
                      <button
                        onClick={() => handlePromoteToAdmin(candidate)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#00875A] border border-emerald-200 rounded-lg text-[10px] font-extrabold shrink-0 transition cursor-pointer"
                      >
                        + Make Admin
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid Section 3: Campus System Settings & Dispatch Metrics */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Campus Dispatch Parameters</h3>
                    <p className="text-[11px] text-gray-400">Automated matching radii, pricing models, and system triggers</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-[#00875A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {selectedSchool.shortName} Campus
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase font-mono block">Base Keke Fare</span>
                  <span className="text-lg font-extrabold text-slate-900 block font-mono">₦200.00 / seat</span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Fixed Rate • On-Campus</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase font-mono block">Base Shuttle Fare</span>
                  <span className="text-lg font-extrabold text-slate-900 block font-mono">₦300.00 / seat</span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Fixed Rate • Main Gate Route</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase font-mono block">Car / Sienna Fare</span>
                  <span className="text-lg font-extrabold text-slate-900 block font-mono">₦500.00 / seat</span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Premium Comfort Express</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRIVER LICENSE INSPECTION MODAL */}
      <AnimatePresence>
        {selectedLicenseDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-xl w-full overflow-hidden"
            >
              {/* Inspection Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight">Official Driver's License Inspector</h3>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Verification ID: {selectedLicenseDriver.id.slice(0, 10)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLicenseDriver(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Visual License Card Document Body */}
              <div className="p-6 space-y-5 max-h-[520px] overflow-y-auto">
                
                {/* 1. ACTUAL UPLOADED IMAGE / DOCUMENT PREVIEW CONTAINER */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-700 shadow-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-emerald-400 pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ACTUAL DRIVER LICENSE IMAGE ATTACHED</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                      {selectedLicenseDriver.licenseDocName || 'Uploaded_License.png'}
                    </span>
                  </div>

                  {/* Render Image or Document */}
                  {(selectedLicenseDriver.licenseDocUrl || selectedLicenseDriver.licenseUrl || selectedLicenseDriver.licenseDocDataUrl) ? (
                    <div className="relative group overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center p-2 min-h-[220px]">
                      {(selectedLicenseDriver.licenseDocUrl || selectedLicenseDriver.licenseDocDataUrl)?.startsWith('data:application/pdf') ? (
                        <iframe 
                          src={selectedLicenseDriver.licenseDocUrl || selectedLicenseDriver.licenseDocDataUrl} 
                          className="w-full h-[320px] rounded-xl bg-white"
                          title="Uploaded Driver License PDF Document"
                        />
                      ) : (
                        <img
                          src={selectedLicenseDriver.licenseDocUrl || selectedLicenseDriver.licenseUrl || selectedLicenseDriver.licenseDocDataUrl}
                          alt="Actual Uploaded Driver License Document"
                          className="max-h-[380px] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      )}
                    </div>
                  ) : (
                    /* High fidelity visual license image document representation if no custom base64 string was recorded */
                    <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 rounded-xl p-4 border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between text-amber-300 text-[11px] font-mono">
                        <span className="font-bold flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          FEDERAL REPUBLIC OF NIGERIA • DRIVER'S LICENSE
                        </span>
                        <span className="bg-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-500/30">
                          CLASS B / COMMERCIAL
                        </span>
                      </div>

                      <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 flex items-center space-x-4">
                        <div className="w-20 h-24 bg-amber-100 rounded-lg border-2 border-amber-400 flex flex-col items-center justify-center shrink-0 shadow-inner overflow-hidden relative">
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-300 font-black text-base flex items-center justify-center">
                            {selectedLicenseDriver.name ? selectedLicenseDriver.name.charAt(0) : 'D'}
                          </div>
                          <span className="text-[7px] font-mono font-bold uppercase text-slate-800 mt-1">OFFICIAL PHOTO</span>
                          <span className="text-[6px] font-mono font-black uppercase text-emerald-700 bg-emerald-100 px-1 rounded mt-0.5">BIOMETRIC</span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5 text-xs text-slate-200">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">License Holder Name</span>
                            <span className="font-extrabold text-white font-sans text-sm">{selectedLicenseDriver.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div>
                              <span className="text-slate-400 block">License No:</span>
                              <span className="font-bold text-amber-400">NG-{selectedLicenseDriver.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Veh Plate:</span>
                              <span className="font-bold text-emerald-400">{selectedLicenseDriver.plateNumber}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800 pt-2">
                        <span>Submitted File: <strong className="text-slate-200">{selectedLicenseDriver.licenseDocName || 'Driver_License_Submitted.pdf'}</strong></span>
                        <span className="text-emerald-400 font-bold">VERIFIED VALID DOCUMENT</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SPECIFICATIONS & VEHICLE VERIFICATION SUMMARY */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Driver Email:</span>
                    <span className="font-mono text-slate-900 font-semibold">{selectedLicenseDriver.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Vehicle Specification:</span>
                    <span className="font-bold text-slate-900">{selectedLicenseDriver.carBrand} ({selectedLicenseDriver.carType?.toUpperCase()})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Assigned Vehicle ID / Plate:</span>
                    <span className="font-mono text-[#00875A] font-extrabold">{selectedLicenseDriver.vehicleId || '001'} • {selectedLicenseDriver.plateNumber}</span>
                  </div>
                </div>
              </div>

              {/* Inspector Footer Actions */}
              <div className="bg-gray-50 border-t border-gray-150 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLicenseDriver(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Document View
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const drv = selectedLicenseDriver;
                      setSelectedLicenseDriver(null);
                      handleDeclineDriver(drv);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition border border-red-100 cursor-pointer"
                  >
                    Decline License
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const drv = selectedLicenseDriver;
                      setSelectedLicenseDriver(null);
                      handleApproveDriver(drv);
                    }}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Driver</span>
                  </button>
                </div>
              </div>
            </motion.div>
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
              <div className={`${approvedEmailDetails.type === 'decline' ? 'bg-red-950' : 'bg-slate-900'} text-white px-5 py-3.5 flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-3.5 h-3.5 ${approvedEmailDetails.type === 'decline' ? 'bg-red-500' : 'bg-emerald-500'} rounded-full animate-ping shrink-0`} style={{ animationDuration: '2.5s' }} />
                  <span className={`text-xs font-extrabold tracking-wider uppercase font-mono ${approvedEmailDetails.type === 'decline' ? 'text-red-400' : 'text-emerald-400'}`}>
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
                  <span className="text-slate-900 font-bold">{approvedEmailDetails.to}</span>
                </div>
                <div className="flex">
                  <span className="w-14 text-gray-400">Subject:</span>
                  <span className="text-slate-900 font-bold">{approvedEmailDetails.subject}</span>
                </div>
                <div className="flex">
                  <span className="w-14 text-gray-400">Date:</span>
                  <span className="text-gray-500 font-mono">{approvedEmailDetails.dateSent}</span>
                </div>
              </div>

              {/* Beautiful Email Letter Template Body */}
              <div className="p-6 space-y-4 max-h-[360px] overflow-y-auto font-sans">
                {approvedEmailDetails.type === 'decline' ? (
                  <>
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider font-mono">Verification Status: Declined (Please Reapply)</span>
                    </div>
                    
                    <h4 className="text-base font-extrabold text-slate-900">
                      Dear {approvedEmailDetails.name},
                    </h4>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      We regret to inform you that your peer driver application for CampusRide has been declined by the administrative operations team. 
                      Because your application was declined, <strong>we kindly ask that you reapply</strong> with corrected credentials.
                    </p>

                    <div className="bg-red-50 rounded-2xl p-4 border border-red-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-red-500 block font-mono uppercase">Administrator Feedback & Reason</span>
                      <p className="text-xs text-red-800 font-medium italic leading-relaxed">
                        "{approvedEmailDetails.comments || 'Your vehicle credentials, document quality, or identification details did not pass verification. Please make sure all details match your university ID card.'}"
                      </p>
                    </div>

                    <div className="space-y-2 font-sans">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-800 font-mono">Next Steps:</h5>
                      <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                        <li>An official alert has been logged for your email address: <strong>{approvedEmailDetails.to}</strong>.</li>
                        <li>Log into your account to review the admin's detailed feedback on your dashboard.</li>
                        <li>Verify that your vehicle's brand, license plate number, and category are completely accurate.</li>
                        <li><strong>Submit a brand-new application</strong> with corrected, clear documentation for prompt re-review.</li>
                      </ol>
                    </div>

                    <p className="text-[11px] text-gray-500 italic border-t border-gray-100 pt-3">
                      We appreciate your interest in joining our campus peer transit network and look forward to receiving your corrected application.
                      <br />
                      - CampusRide Transit Admin Team
                    </p>
                  </>
                ) : (
                  <>
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

                    {approvedEmailDetails.comments && (
                      <div className="bg-[#00875A]/5 rounded-2xl p-4 border border-[#00875A]/15 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 block font-mono uppercase">Administrator Verification Comments</span>
                        <p className="text-xs text-slate-700 italic leading-relaxed">
                          "{approvedEmailDetails.comments}"
                        </p>
                      </div>
                    )}

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
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="bg-gray-50 border-t border-gray-150 px-5 py-4 flex items-center justify-end space-x-2">
                <button
                  onClick={() => setApprovedEmailDetails(null)}
                  className={`px-4.5 py-2.5 ${approvedEmailDetails.type === 'decline' ? 'bg-red-950 hover:bg-red-800' : 'bg-slate-900 hover:bg-[#00875A]'} text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer`}
                >
                  <Send className="w-4 h-4" />
                  <span>Acknowledge & Close Mail Log</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIRECT DRIVER CREATION MODAL */}
      <AnimatePresence>
        {showAddDriverModal && (
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
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-[#00875A] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 shrink-0" />
                  <span className="font-extrabold text-sm tracking-tight">Register Authorized Driver</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDriver} className="p-5 space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Directly authorize a trusted campus shuttle, keke, or private driver. This creates their profile as immediately <strong>approved and verified</strong> to bypass the verification queue.
                </p>

                {/* Driver Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Driver Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kola Ibrahim"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] transition"
                  />
                </div>

                {/* Driver Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Driver Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. kolabrahim@campusride.edu"
                    value={newDriverEmail}
                    onChange={(e) => setNewDriverEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] transition"
                  />
                </div>

                {/* Car Brand / Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Vehicle Brand/Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Piaggio Ape (Yellow)"
                      value={newDriverCarBrand}
                      onChange={(e) => setNewDriverCarBrand(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] transition"
                    />
                  </div>

                  {/* Vehicle Type select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Transit Category</label>
                    <select
                      value={newDriverCarType}
                      onChange={(e) => setNewDriverCarType(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] transition"
                    >
                      <option value="keke">Keke (Tricycle)</option>
                      <option value="shuttle">Mini-Shuttle Bus</option>
                      <option value="car">Standard Sedan Car</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* License Plate */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">License Plate Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LA-339-KK"
                      value={newDriverPlateNumber}
                      onChange={(e) => setNewDriverPlateNumber(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] transition font-mono uppercase"
                    />
                  </div>

                  {/* Vehicle ID code */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Transit Code/ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. TR-KEKE-552"
                      value={newDriverVehicleId}
                      onChange={(e) => setNewDriverVehicleId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] transition font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Action Row */}
                <div className="pt-4 border-t border-gray-150 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDriverModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00875A] hover:bg-[#00875A]/90 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Create & Approve</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SYSTEM ADMINISTRATOR CREATION MODAL */}
      <AnimatePresence>
        {showAddAdminModal && (
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
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-[#00875A]" />
                  <span className="font-extrabold text-sm tracking-tight">Add System Administrator</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="p-5 space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Promote a trusted user or create a new dedicated administrative command profile to help manage dispatching, reviews, and directory lists.
                </p>

                {/* Admin Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Administrator Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prof. Joseph Adebayo"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                {/* Admin Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Administrator Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. adebayo.j@campusride.edu"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                {/* Admin Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Department / Command Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Security & Transit Ops"
                    value={newAdminDept}
                    onChange={(e) => setNewAdminDept(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                {/* Action Row */}
                <div className="pt-4 border-t border-gray-150 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Authorize Admin</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION MODAL (IFRAME-SAFE & HIGHLY POLISHED) */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-red-100 shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header section with red alert styling */}
              <div className="bg-red-650 bg-rose-600 text-white px-5 py-4 flex items-center space-x-3">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-rose-200 animate-pulse" />
                </div>
                <div>
                  <span className="font-extrabold text-sm tracking-tight block">Confirm Destructive Action</span>
                  <span className="text-[10px] text-rose-200 uppercase font-mono tracking-wider">Warning: Irreversible Operation</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-100/60 rounded-2xl flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-950 font-medium leading-relaxed">
                    {deleteConfirmTarget.message}
                  </p>
                </div>

                <p className="text-[11px] text-gray-500 leading-normal">
                  Proceeding will instantly remove this record from both the user interface and the persistent database records. This cannot be undone.
                </p>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel & Keep
                  </button>
                  <button
                    type="button"
                    onClick={executeConfirmedDelete}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm & Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
