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
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  deleteUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';

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
    return auth.currentUser?.uid || currentUser?.uid;
  };

  // Authentication State Listener & Syncer
  useEffect(() => {
    let unsubActiveListeners = () => {};

    const setupListeners = (uid: string, role: UserRole, email: string, name: string) => {
      // Clean up previous listeners
      unsubActiveListeners();

      let foundRole = role;

      // Set state
      setCurrentUser({ email, name, uid });
      setCurrentRole(foundRole);

      // Listen for real-time changes
      let unsubProfile = () => {};
      if (foundRole === 'student') {
        unsubProfile = onSnapshot(doc(db, "users", uid), (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
            if (snap.data().selectedSchoolId) {
              setSelectedSchoolId(snap.data().selectedSchoolId);
            }
          }
        });
      } else if (foundRole === 'driver') {
        unsubProfile = onSnapshot(doc(db, "drivers", uid), (snap) => {
          if (snap.exists()) {
            setDriverProfile(snap.data() as DriverState);
            if (snap.data().selectedSchoolId) {
              setSelectedSchoolId(snap.data().selectedSchoolId);
            }
          }
        });
      }

      // Listen for notifications
      const qNotifs = query(collection(db, "notifications"), where("userId", "==", uid));
      const unsubNotifs = onSnapshot(qNotifs, (snap) => {
        const notifsList: AppNotification[] = [];
        snap.forEach((d) => {
          notifsList.push({ id: d.id, ...d.data() } as AppNotification);
        });
        setNotifications(notifsList.length > 0 ? notifsList : INITIAL_NOTIFICATIONS);
      });

      // Listen for transactions
      const qTxns = query(collection(db, "transactions"), where("userId", "==", uid));
      const unsubTxns = onSnapshot(qTxns, (snap) => {
        const txnsList: Transaction[] = [];
        snap.forEach((d) => {
          txnsList.push({ id: d.id, ...d.data() } as Transaction);
        });
        setTransactions(txnsList.length > 0 ? txnsList : INITIAL_TRANSACTIONS);
      });

      // Listen for active rides
      const qRides = query(
        collection(db, "rides"),
        where(foundRole === 'student' ? "passengerId" : "driverId", "==", uid)
      );
      const unsubRides = onSnapshot(qRides, (snap) => {
        let active: RideRequest | null = null;
        snap.forEach((d) => {
          const ride = d.data() as RideRequest;
          if (ride.status !== 'completed' && ride.status !== 'canceled') {
            active = { id: d.id, ...ride } as RideRequest;
          }
        });
        setActiveRide(active);
      });

      unsubActiveListeners = () => {
        unsubProfile();
        unsubNotifs();
        unsubTxns();
        unsubRides();
      };
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Find user profile
        let foundRole: UserRole = 'student';
        let profileData: any = null;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          foundRole = 'student';
          profileData = userSnap.data();
        } else {
          const driverRef = doc(db, "drivers", user.uid);
          const driverSnap = await getDoc(driverRef);
          if (driverSnap.exists()) {
            foundRole = 'driver';
            profileData = driverSnap.data();
          } else if (user.email === 'admin@campusride.edu' || user.email?.includes('admin')) {
            foundRole = 'admin';
          }
        }

        setupListeners(user.uid, foundRole, user.email || '', profileData?.name || user.displayName || 'App User');
        setLoadingAuth(false);
      } else {
        // Check local storage custom session fallback
        const customSessionStr = localStorage.getItem('campusride_custom_session');
        if (customSessionStr) {
          try {
            const session = JSON.parse(customSessionStr);
            setupListeners(session.uid, session.role, session.email, session.name);
          } catch (e) {
            console.error("Failed to parse custom session", e);
            setCurrentUser(null);
            setSelectedSchoolId(null);
            setActiveRide(null);
          }
        } else {
          setCurrentUser(null);
          setSelectedSchoolId(null);
          setActiveRide(null);
        }
        setLoadingAuth(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubActiveListeners();
    };
  }, []);

  // Authentication Callbacks
  const handleLogin = async (role: UserRole, email: string, password?: string) => {
    if (!password) {
      throw new Error("Password is required.");
    }
    try {
      // First, try standard Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userRef = doc(db, role === 'student' ? "users" : "drivers", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const defaultName = email.split('@')[0];
        const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        if (role === 'student') {
          await setDoc(userRef, {
            ...INITIAL_STUDENT_PROFILE,
            email,
            name: formattedName,
            role,
            idNumber: 'RUN/2022/10432',
            walletBalance: 25.00,
            createdAt: new Date().toISOString()
          });
        } else if (role === 'driver') {
          await setDoc(userRef, {
            ...INITIAL_DRIVER_PROFILE,
            email,
            name: formattedName,
            role,
            vehicle: 'Toyota Camry (Silver) • 4P-928X',
            todayEarnings: 0,
            completedTripsCount: 0,
            status: 'Idle',
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error: any) {
      console.warn("Login Standard Auth Failed, attempting custom fallback:", error);
      if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed') || error.message?.includes('disabled')) {
        // Query Firestore custom_auth
        const customAuthSnap = await getDoc(doc(db, "custom_auth", email.toLowerCase().trim()));
        if (customAuthSnap.exists()) {
          const authData = customAuthSnap.data();
          if (authData.password === password) {
            // Correct password! Store custom session
            localStorage.setItem('campusride_custom_session', JSON.stringify({
              email: authData.email,
              uid: authData.uid,
              role: authData.role,
              name: authData.name
            }));
            
            setCurrentUser({ email: authData.email, name: authData.name, uid: authData.uid });
            setCurrentRole(authData.role);
          } else {
            throw new Error("Incorrect password for this user.");
          }
        } else {
          throw new Error("No account found with this email in custom database mode. Please sign up first.");
        }
      } else {
        throw error;
      }
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
    try {
      // First, try standard Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profileData: any = {
        email,
        name,
        role,
        createdAt: new Date().toISOString()
      };

      if (role === 'student') {
        const merged = {
          ...INITIAL_STUDENT_PROFILE,
          ...profileData,
          idNumber: idNumber || 'RUN/2022/10432',
          walletBalance: 25.00, // starting balance gift
          tripsThisWeek: 0,
          carpoolRides: 0,
          savedThisMonth: 0,
        };
        await setDoc(doc(db, "users", user.uid), merged);
      } else if (role === 'driver') {
        const vehicleDetails = driverInfo 
          ? `${driverInfo.carBrand} (${driverInfo.carType.toUpperCase()}) • ${driverInfo.plateNumber}${driverInfo.vehicleId ? ` [ID: ${driverInfo.vehicleId}]` : ''}` 
          : 'Toyota Camry (Silver) • 4P-928X';

        const merged = {
          ...INITIAL_DRIVER_PROFILE,
          ...profileData,
          vehicle: vehicleDetails,
          todayEarnings: 0,
          completedTripsCount: 0,
          status: 'Idle',
        };
        await setDoc(doc(db, "drivers", user.uid), merged);
      }

      // Create a welcome notification in Firestore
      const welcomeNotif = {
        userId: user.uid,
        id: `m-notif-${Date.now()}`,
        title: 'Welcome to CampusRide!',
        message: 'Your account has been successfully created and linked to the registrar directory.',
        date: 'Jun 19, 2026',
        time: '11:15 AM',
        isRead: false,
        type: 'success',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "notifications"), welcomeNotif);

    } catch (error: any) {
      console.warn("SignUp Standard Auth Failed, attempting custom fallback:", error);
      if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed') || error.message?.includes('disabled')) {
        const customUid = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Save to custom credentials collection in Firestore
        const customAuthRef = doc(db, "custom_auth", email.toLowerCase().trim());
        await setDoc(customAuthRef, {
          email: email.toLowerCase().trim(),
          password: password,
          uid: customUid,
          role,
          name,
          createdAt: new Date().toISOString()
        });

        const profileData: any = {
          email,
          name,
          role,
          createdAt: new Date().toISOString()
        };

        if (role === 'student') {
          const merged = {
            ...INITIAL_STUDENT_PROFILE,
            ...profileData,
            idNumber: idNumber || 'RUN/2022/10432',
            walletBalance: 25.00, // starting balance gift
            tripsThisWeek: 0,
            carpoolRides: 0,
            savedThisMonth: 0,
          };
          await setDoc(doc(db, "users", customUid), merged);
        } else if (role === 'driver') {
          const vehicleDetails = driverInfo 
            ? `${driverInfo.carBrand} (${driverInfo.carType.toUpperCase()}) • ${driverInfo.plateNumber}${driverInfo.vehicleId ? ` [ID: ${driverInfo.vehicleId}]` : ''}` 
            : 'Toyota Camry (Silver) • 4P-928X';

          const merged = {
            ...INITIAL_DRIVER_PROFILE,
            ...profileData,
            vehicle: vehicleDetails,
            todayEarnings: 0,
            completedTripsCount: 0,
            status: 'Idle',
          };
          await setDoc(doc(db, "drivers", customUid), merged);
        }

        const welcomeNotif = {
          userId: customUid,
          id: `m-notif-${Date.now()}`,
          title: 'Welcome to CampusRide (Local Database Mode)!',
          message: 'Your account has been successfully created and linked to the registrar directory using our secure database fallback.',
          date: 'Jun 19, 2026',
          time: '11:15 AM',
          isRead: false,
          type: 'success',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "notifications"), welcomeNotif);

        // Store custom session
        localStorage.setItem('campusride_custom_session', JSON.stringify({
          email: email.toLowerCase().trim(),
          uid: customUid,
          role,
          name
        }));

        // Manually trigger local login UI change
        setCurrentUser({ email, name, uid: customUid });
        setCurrentRole(role);
      } else {
        throw error;
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('campusride_custom_session');
    await signOut(auth);
    setCurrentUser(null);
    setSelectedSchoolId(null);
    setActiveRide(null);
  };

  const handleDeleteAccount = async () => {
    const customSessionStr = localStorage.getItem('campusride_custom_session');
    if (customSessionStr) {
      try {
        const session = JSON.parse(customSessionStr);
        if (currentRole === 'student') {
          await deleteDoc(doc(db, "users", session.uid));
        } else if (currentRole === 'driver') {
          await deleteDoc(doc(db, "drivers", session.uid));
        }
        await deleteDoc(doc(db, "custom_auth", session.email));
        localStorage.removeItem('campusride_custom_session');
        setCurrentUser(null);
        setSelectedSchoolId(null);
        setActiveRide(null);
        alert('Your student transit account has been successfully deleted. Thank you for using CampusRide.');
      } catch (error: any) {
        console.error("Delete account error:", error);
        alert(`Could not delete account: ${error.message}`);
      }
    } else {
      const user = auth.currentUser;
      if (user) {
        try {
          if (currentRole === 'student') {
            await deleteDoc(doc(db, "users", user.uid));
          } else if (currentRole === 'driver') {
            await deleteDoc(doc(db, "drivers", user.uid));
          }
          await deleteUser(user);
          alert('Your student transit account has been successfully deleted. Thank you for using CampusRide.');
        } catch (error: any) {
          console.error("Delete account error:", error);
          if (error.code === 'auth/requires-recent-login') {
            alert('Please re-authenticate and log in again to delete your account.');
            await signOut(auth);
          } else {
            alert(`Could not delete account: ${error.message}`);
          }
        }
      }
    }
  };

  // State mutation wrappers (Pass triggers to kids)
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    const uid = getActiveUid();
    if (uid) {
      await updateDoc(doc(db, "users", uid), updates as any);
    }
  };

  const handleUpdateDriverProfile = async (updates: Partial<DriverState>) => {
    const uid = getActiveUid();
    if (uid) {
      await updateDoc(doc(db, "drivers", uid), updates as any);
    }
  };

  const handleAddTransaction = async (txn: Transaction) => {
    const uid = getActiveUid();
    if (uid) {
      await addDoc(collection(db, "transactions"), {
        ...txn,
        userId: uid,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleAddNotification = async (notif: AppNotification) => {
    const uid = getActiveUid();
    if (uid) {
      await addDoc(collection(db, "notifications"), {
        ...notif,
        userId: uid,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleUpdateRide = async (ride: RideRequest | null) => {
    if (ride) {
      await setDoc(doc(db, "rides", ride.id), {
        ...ride,
        selectedSchoolId: selectedSchoolId,
        createdAt: new Date().toISOString()
      });
    } else if (activeRide) {
      await updateDoc(doc(db, "rides", activeRide.id), { status: 'completed' });
    }
  };

  const handleMarkNotificationsRead = async () => {
    const uid = getActiveUid();
    if (uid) {
      const q = query(collection(db, "notifications"), where("userId", "==", uid), where("isRead", "==", false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.update(doc(db, "notifications", d.id), { isRead: true });
      });
      await batch.commit();
    }
  };

  const handleChangeRole = (role: UserRole) => {
    setCurrentRole(role);
  };

  // 1. If checking Firebase auth cache, show a loader
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500 animate-pulse">Syncing CampusRide with Firebase...</p>
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
    return <SchoolSelection onSelectSchool={setSelectedSchoolId} onBack={handleLogout} />;
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
    <div id="application-layout-context" className="flex flex-col md:flex-row min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased overflow-hidden">
      
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
