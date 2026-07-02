import { useState, useEffect } from 'react';
import { UserRole, AppNotification, Transaction, RideRequest, UserProfile, DriverState } from './types';
import { AuthScreens } from './components/AuthScreens';
import { SchoolSelection } from './components/SchoolSelection';
import { Sidebar } from './components/Sidebar';
import { StudentPortal } from './components/StudentPortal';
import { DriverPortal } from './components/DriverPortal';
import { AdminCentral } from './components/AdminCentral';
import { 
  INITIAL_STUDENT_PROFILE, 
  INITIAL_DRIVER_PROFILE,
  INITIAL_ADMIN_PROFILE,
  INITIAL_NOTIFICATIONS, 
  INITIAL_TRANSACTIONS 
} from './data';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; uid?: string } | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [activeView, setActiveView] = useState<string>('booking');
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  
  // High fidelity application databases in memory
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_STUDENT_PROFILE);
  const [driverProfile, setDriverProfile] = useState<DriverState>(INITIAL_DRIVER_PROFILE);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);

  // Helper to get active user ID
  const getActiveUid = () => {
    return currentUser?.uid;
  };

  const loadUserSpecificData = (uid: string, role: UserRole) => {
    // 1. Profile
    if (role === 'student') {
      const stored = localStorage.getItem(`campusride_user_profile_${uid}`);
      if (stored) {
        setUserProfile(JSON.parse(stored));
      } else {
        const defaultProfile = { 
          ...INITIAL_STUDENT_PROFILE, 
          id: uid, 
          walletBalance: 2500,
          name: currentUser?.name || 'Student Commuter',
          email: currentUser?.email || 'student@campusride.edu'
        };
        localStorage.setItem(`campusride_user_profile_${uid}`, JSON.stringify(defaultProfile));
        setUserProfile(defaultProfile);
      }
    } else if (role === 'driver') {
      const stored = localStorage.getItem(`campusride_driver_profile_${uid}`);
      if (stored) {
        setDriverProfile(JSON.parse(stored));
      } else {
        const defaultProfile = { 
          ...INITIAL_DRIVER_PROFILE, 
          id: uid,
          name: currentUser?.name || 'Driver Partner',
          vehicle: 'Toyota Corolla (Silver) • RUN-918-LA',
          status: 'Offline'
        };
        localStorage.setItem(`campusride_driver_profile_${uid}`, JSON.stringify(defaultProfile));
        setDriverProfile(defaultProfile);
      }
    }

    // 2. Notifications
    const storedNotifs = localStorage.getItem(`campusride_notifications_${uid}`);
    if (storedNotifs) {
      setNotifications(JSON.parse(storedNotifs));
    } else {
      localStorage.setItem(`campusride_notifications_${uid}`, JSON.stringify(INITIAL_NOTIFICATIONS));
      setNotifications(INITIAL_NOTIFICATIONS);
    }

    // 3. Transactions
    const storedTxns = localStorage.getItem(`campusride_transactions_${uid}`);
    if (storedTxns) {
      setTransactions(JSON.parse(storedTxns));
    } else {
      localStorage.setItem(`campusride_transactions_${uid}`, JSON.stringify(INITIAL_TRANSACTIONS));
      setTransactions(INITIAL_TRANSACTIONS);
    }

    // 4. Active Ride
    const storedRide = localStorage.getItem(`campusride_active_ride_${uid}`);
    if (storedRide) {
      setActiveRide(JSON.parse(storedRide));
    } else {
      setActiveRide(null);
    }

    // 5. Selected School ID
    const schoolId = localStorage.getItem(`campusride_selected_school_${uid}`);
    setSelectedSchoolId(schoolId);
  };

  // Authentication State Listener & Syncer
  useEffect(() => {
    const customSessionStr = localStorage.getItem('campusride_custom_session');
    if (customSessionStr) {
      try {
        const session = JSON.parse(customSessionStr);
        setCurrentUser({ email: session.email, name: session.name, uid: session.uid });
        setCurrentRole(session.role);
        
        // Load user profiles
        // We defer loadUserSpecificData slightly or run it directly
        // Define a fast lookup for profiles
        const uid = session.uid;
        const role = session.role;
        if (role === 'student') {
          const stored = localStorage.getItem(`campusride_user_profile_${uid}`);
          setUserProfile(stored ? JSON.parse(stored) : { ...INITIAL_STUDENT_PROFILE, id: uid, walletBalance: 2500, name: session.name, email: session.email });
        } else if (role === 'driver') {
          const stored = localStorage.getItem(`campusride_driver_profile_${uid}`);
          setDriverProfile(stored ? JSON.parse(stored) : { ...INITIAL_DRIVER_PROFILE, id: uid, name: session.name, vehicle: 'Toyota Corolla (Silver) • RUN-918-LA' });
        }
        
        const storedNotifs = localStorage.getItem(`campusride_notifications_${uid}`);
        setNotifications(storedNotifs ? JSON.parse(storedNotifs) : INITIAL_NOTIFICATIONS);

        const storedTxns = localStorage.getItem(`campusride_transactions_${uid}`);
        setTransactions(storedTxns ? JSON.parse(storedTxns) : INITIAL_TRANSACTIONS);

        const storedRide = localStorage.getItem(`campusride_active_ride_${uid}`);
        setActiveRide(storedRide ? JSON.parse(storedRide) : null);

        const schoolId = localStorage.getItem(`campusride_selected_school_${uid}`);
        setSelectedSchoolId(schoolId);

      } catch (e) {
        console.error("Failed to parse custom session", e);
        localStorage.removeItem('campusride_custom_session');
      }
    }
    setLoadingAuth(false);
  }, []);

  // Authentication Callbacks
  const handleLogin = async (role: UserRole, email: string, password?: string) => {
    if (!password) {
      throw new Error("Password is required.");
    }
    
    const emailKey = email.toLowerCase().trim();
    const storedAuthStr = localStorage.getItem('campusride_auth');
    const authData = storedAuthStr ? JSON.parse(storedAuthStr) : {};

    // Auto-seed admin if it matches and isn't present
    if (emailKey === 'admin@campusride.edu' && !authData[emailKey]) {
      authData[emailKey] = {
        email: 'admin@campusride.edu',
        password: password, // Accept inputted password or Admin123!
        uid: 'admin-uid-101',
        role: 'admin',
        name: 'Sarah Jenkins'
      };
      localStorage.setItem('campusride_auth', JSON.stringify(authData));
    }

    const userEntry = authData[emailKey];
    if (userEntry) {
      if (userEntry.password === password) {
        const session = {
          email: userEntry.email,
          uid: userEntry.uid,
          role: role, // Log in with selected role role
          name: userEntry.name
        };
        localStorage.setItem('campusride_custom_session', JSON.stringify(session));
        setCurrentUser({ email: session.email, name: session.name, uid: session.uid });
        setCurrentRole(role);
        
        // Load data
        loadUserSpecificData(session.uid, role);
      } else {
        throw new Error("Incorrect password for this user.");
      }
    } else {
      throw new Error("No account found with this email. Please sign up first.");
    }
  };

  const handleSignUp = async (
    role: UserRole, 
    name: string, 
    email: string, 
    password?: string, 
    driverInfo?: { carBrand: string; plateNumber: string; carType: string; vehicleId?: string }, 
    idNumber?: string
  ) => {
    if (!password) {
      throw new Error("Password is required for registration.");
    }
    
    const emailKey = email.toLowerCase().trim();
    const storedAuthStr = localStorage.getItem('campusride_auth');
    const authData = storedAuthStr ? JSON.parse(storedAuthStr) : {};

    if (authData[emailKey]) {
      throw new Error("An account with this email already exists.");
    }

    const newUid = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Save authentication details locally
    authData[emailKey] = {
      email: emailKey,
      password: password,
      uid: newUid,
      role: role,
      name: name
    };
    localStorage.setItem('campusride_auth', JSON.stringify(authData));

    // Save profile details locally
    const profileData: any = {
      id: newUid,
      email,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    if (role === 'student') {
      const studentProfile = {
        ...INITIAL_STUDENT_PROFILE,
        ...profileData,
        idNumber: idNumber || 'RUN/2022/10432',
        walletBalance: 2500, // starting balance gift ₦2500
        tripsThisWeek: 0,
        carpoolRides: 0,
        savedThisMonth: 0,
      };
      localStorage.setItem(`campusride_user_profile_${newUid}`, JSON.stringify(studentProfile));
      setUserProfile(studentProfile);
    } else if (role === 'driver') {
      const vehicleDetails = driverInfo 
        ? `${driverInfo.carBrand} (${driverInfo.carType.toUpperCase()}) • ${driverInfo.plateNumber}${driverInfo.vehicleId ? ` [ID: ${driverInfo.vehicleId}]` : ''}` 
        : 'Toyota Camry (Silver) • 4P-928X';

      const dProfile = {
        ...INITIAL_DRIVER_PROFILE,
        ...profileData,
        vehicle: vehicleDetails,
        todayEarnings: 0,
        completedTripsCount: 0,
        status: 'Idle',
      };
      localStorage.setItem(`campusride_driver_profile_${newUid}`, JSON.stringify(dProfile));
      setDriverProfile(dProfile);
    }

    // Add Welcome notification
    const welcomeNotif: AppNotification = {
      id: `m-notif-${Date.now()}`,
      title: 'Welcome to CampusRide!',
      message: 'Your account has been successfully created and linked to the registrar directory.',
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      type: 'success',
    };
    const notifs = [welcomeNotif];
    localStorage.setItem(`campusride_notifications_${newUid}`, JSON.stringify(notifs));
    setNotifications(notifs);

    // Initial Empty Transactions
    localStorage.setItem(`campusride_transactions_${newUid}`, JSON.stringify([]));
    setTransactions([]);

    // Store custom session
    const session = {
      email: emailKey,
      uid: newUid,
      role,
      name
    };
    localStorage.setItem('campusride_custom_session', JSON.stringify(session));
    setCurrentUser({ email, name, uid: newUid });
    setCurrentRole(role);
  };

  const handleLogout = async () => {
    localStorage.removeItem('campusride_custom_session');
    setCurrentUser(null);
    setSelectedSchoolId(null);
    setActiveRide(null);
  };

  const handleDeleteAccount = async () => {
    const uid = getActiveUid();
    if (uid) {
      // Find and remove auth entry
      const emailKey = currentUser?.email.toLowerCase().trim();
      if (emailKey) {
        const storedAuthStr = localStorage.getItem('campusride_auth');
        if (storedAuthStr) {
          const authData = JSON.parse(storedAuthStr);
          delete authData[emailKey];
          localStorage.setItem('campusride_auth', JSON.stringify(authData));
        }
      }

      // Remove specific data
      localStorage.removeItem(`campusride_user_profile_${uid}`);
      localStorage.removeItem(`campusride_driver_profile_${uid}`);
      localStorage.removeItem(`campusride_notifications_${uid}`);
      localStorage.removeItem(`campusride_transactions_${uid}`);
      localStorage.removeItem(`campusride_active_ride_${uid}`);
      localStorage.removeItem(`campusride_selected_school_${uid}`);
      
      localStorage.removeItem('campusride_custom_session');
      setCurrentUser(null);
      setSelectedSchoolId(null);
      setActiveRide(null);
      alert('Your student transit account has been successfully deleted. Thank you for using CampusRide.');
    }
  };

  // State mutation wrappers (Pass triggers to kids)
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    const uid = getActiveUid();
    if (uid) {
      const newProfile = { ...userProfile, ...updates };
      setUserProfile(newProfile);
      localStorage.setItem(`campusride_user_profile_${uid}`, JSON.stringify(newProfile));
    }
  };

  const handleUpdateDriverProfile = async (updates: Partial<DriverState>) => {
    const uid = getActiveUid();
    if (uid) {
      const newProfile = { ...driverProfile, ...updates };
      setDriverProfile(newProfile as DriverState);
      localStorage.setItem(`campusride_driver_profile_${uid}`, JSON.stringify(newProfile));
    }
  };

  const handleAddTransaction = async (txn: Transaction) => {
    const uid = getActiveUid();
    if (uid) {
      const list = [txn, ...transactions];
      setTransactions(list);
      localStorage.setItem(`campusride_transactions_${uid}`, JSON.stringify(list));
    }
  };

  const handleAddNotification = async (notif: AppNotification) => {
    const uid = getActiveUid();
    if (uid) {
      const list = [notif, ...notifications];
      setNotifications(list);
      localStorage.setItem(`campusride_notifications_${uid}`, JSON.stringify(list));
    }
  };

  const handleUpdateRide = async (ride: RideRequest | null) => {
    const uid = getActiveUid();
    if (uid) {
      if (ride) {
        setActiveRide(ride);
        localStorage.setItem(`campusride_active_ride_${uid}`, JSON.stringify(ride));
        localStorage.setItem('campusride_global_active_ride', JSON.stringify(ride));
      } else {
        setActiveRide(null);
        localStorage.removeItem(`campusride_active_ride_${uid}`);
        localStorage.removeItem('campusride_global_active_ride');
      }
    } else {
      if (ride) {
        setActiveRide(ride);
        localStorage.setItem('campusride_global_active_ride', JSON.stringify(ride));
      } else {
        setActiveRide(null);
        localStorage.removeItem('campusride_global_active_ride');
      }
    }
  };

  const handleMarkNotificationsRead = async () => {
    const uid = getActiveUid();
    if (uid) {
      const updated = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updated);
      localStorage.setItem(`campusride_notifications_${uid}`, JSON.stringify(updated));
    }
  };

  const handleSelectSchool = (schoolId: string | null) => {
    setSelectedSchoolId(schoolId);
    const uid = getActiveUid();
    if (uid && schoolId) {
      localStorage.setItem(`campusride_selected_school_${uid}`, schoolId);
    }
  };

  const handleChangeRole = (role: UserRole) => {
    setCurrentRole(role);
    const uid = getActiveUid();
    if (uid) {
      const customSessionStr = localStorage.getItem('campusride_custom_session');
      if (customSessionStr) {
        const session = JSON.parse(customSessionStr);
        session.role = role;
        localStorage.setItem('campusride_custom_session', JSON.stringify(session));
      }
      loadUserSpecificData(uid, role);
    }
  };

  // 1. If checking cached auth, show loader
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#175D39] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500 animate-pulse">Syncing CampusRide locally...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Login/SignUp screen (Backdrop, logo, quick actions)
  if (!currentUser) {
    return <AuthScreens onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  // School Selection Screen after login
  if (!selectedSchoolId) {
    return <SchoolSelection onSelectSchool={handleSelectSchool} onBack={handleLogout} />;
  }

  // Determine which visual details are supplied to sidebar
  const activeSidebarProfile = {
    name: currentRole === 'student' ? userProfile.name : currentRole === 'driver' ? driverProfile.name : INITIAL_ADMIN_PROFILE.name,
    avatar: currentRole === 'student' ? userProfile.avatar : currentRole === 'driver' ? driverProfile.avatar : INITIAL_ADMIN_PROFILE.avatar,
    email: currentRole === 'student' ? userProfile.email : currentRole === 'driver' ? INITIAL_DRIVER_PROFILE.avatar : INITIAL_ADMIN_PROFILE.department,
    walletBalance: userProfile.walletBalance,
    idNumber: currentRole === 'student' ? userProfile.idNumber : currentRole === 'driver' ? 'DRV-2024-8839' : 'ADM-2026-0001',
    plateNumber: currentRole === 'driver' ? (driverProfile.vehicle ? (driverProfile.vehicle.includes(' • ') ? driverProfile.vehicle.split(' • ')[1] : '4P-928X') : '4P-928X') : '',
  };

  return (
    <div id="application-layout-context" className="flex flex-col md:flex-row min-h-screen bg-[#F2F2F2] text-[#175D39] font-sans antialiased overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentRole={currentRole}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        notifications={notifications}
        onChangeRole={handleChangeRole}
        userProfile={activeSidebarProfile}
        selectedSchoolId={selectedSchoolId || undefined}
      />

      {/* Main Viewport Content block */}
      <main id="main-viewport-body" className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        
        {/* Render portal based on Active Switching Role context */}
        {currentRole === 'student' && (
          <StudentPortal 
            activeView={activeView}
            userProfile={userProfile}
            notifications={notifications}
            transactions={transactions}
            activeRide={activeRide}
            onNavigate={setActiveView}
            onUpdateProfile={handleUpdateProfile}
            onAddTransaction={handleAddTransaction}
            onAddNotification={handleAddNotification}
            onUpdateRide={handleUpdateRide}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            driverProfile={driverProfile}
            onUpdateDriverProfile={handleUpdateDriverProfile}
            selectedSchoolId={selectedSchoolId}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {currentRole === 'driver' && (
          <DriverPortal 
            activeView={activeView}
            driverProfile={driverProfile}
            activeRide={activeRide}
            onUpdateDriverProfile={handleUpdateDriverProfile}
            onUpdateRide={handleUpdateRide}
            onAddNotification={handleAddNotification}
            onAddTransaction={handleAddTransaction}
            selectedSchoolId={selectedSchoolId}
          />
        )}

        {currentRole === 'admin' && (
          <AdminCentral 
            activeView={activeView}
            activeRide={activeRide}
            onUpdateRide={handleUpdateRide}
            selectedSchoolId={selectedSchoolId}
          />
        )}
      </main>
    </div>
  );
}
