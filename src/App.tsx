import { useState, useEffect, useRef } from 'react';
import { UserRole, AppNotification, Transaction, RideRequest, UserProfile, DriverState } from './types';
import { AuthScreens } from './components/AuthScreens';
import { SchoolSelection, UNIVERSITIES } from './components/SchoolSelection';
import { Sidebar } from './components/Sidebar';
import { StudentPortal } from './components/StudentPortal';
import { DriverPortal } from './components/DriverPortal';
import { AdminCentral } from './components/AdminCentral';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Wallet } from 'lucide-react';
import { 
  INITIAL_STUDENT_PROFILE, 
  INITIAL_DRIVER_PROFILE,
  INITIAL_ADMIN_PROFILE,
  INITIAL_NOTIFICATIONS, 
  INITIAL_TRANSACTIONS 
} from './data';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';

export default function App() {
  const isSigningUpRef = useRef<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; uid?: string } | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [showTopNotifications, setShowTopNotifications] = useState<boolean>(false);
  
  // High fidelity application databases in memory synced with Firestore
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_STUDENT_PROFILE);
  const [driverProfile, setDriverProfile] = useState<DriverState>(INITIAL_DRIVER_PROFILE);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);

  // Helper to get active user ID
  const getActiveUid = () => {
    return currentUser?.uid;
  };

  // Authentication State Listener & Syncer with Firebase Auth & Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const uid = firebaseUser.uid;
          const userDocRef = doc(db, 'users', uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const profile = userDoc.data();
            setCurrentUser({
              email: firebaseUser.email || profile.email,
              name: profile.name,
              uid: uid
            });
            setCurrentRole(profile.role);
            if (profile.role === 'student') {
              setUserProfile(profile as UserProfile);
              setActiveView('booking');
            } else if (profile.role === 'driver') {
              setDriverProfile(profile as DriverState);
              setActiveView('driver_dashboard');
            } else if (profile.role === 'admin') {
              setActiveView('admin_operations');
            }

            const schoolId = localStorage.getItem(`campusride_selected_school_${uid}`);
            setSelectedSchoolId(schoolId);
          } else {
            // Profile doc doesn't exist (Google sign-in for the first time or registration is in progress)
            if (isSigningUpRef.current) {
              console.log("Registration is in progress. Skipping default student profile seeding to avoid race conditions.");
              return;
            }

            const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
            if (isGoogle) {
              // Seed a default student profile ONLY for Google Sign-in
              const defaultProfile = { 
                ...INITIAL_STUDENT_PROFILE, 
                id: uid, 
                walletBalance: 2500,
                name: firebaseUser.displayName || 'Student Commuter',
                email: firebaseUser.email || 'student@campusride.edu',
                idNumber: 'RUN/2022/10432',
                isVerified: true,
                role: 'student' as UserRole
              };
              await setDoc(userDocRef, defaultProfile);
              setCurrentUser({
                email: firebaseUser.email || defaultProfile.email,
                name: defaultProfile.name,
                uid: uid
              });
              setCurrentRole('student');
              setUserProfile(defaultProfile);
              setActiveView('booking');
            } else {
              console.log("No user profile exists yet and registration is pending profile creation.");
            }
          }
        } catch (error) {
          console.error("Error checking user profile in Firestore:", error);
        }
      } else {
        setCurrentUser(null);
        setSelectedSchoolId(null);
        setActiveRide(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization of Firestore collections under current logged-in user
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;

    // 1. Real-time User Profile sync
    const unsubProfile = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.role === 'student') {
          setUserProfile(data as UserProfile);
        } else if (data.role === 'driver') {
          setDriverProfile(data as DriverState);
        }
      }
    }, (error) => {
      console.error("Firestore error reading profile", error);
    });

    // 2. Real-time Notifications sync
    const unsubNotifs = onSnapshot(collection(db, 'users', uid, 'notifications'), (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as AppNotification);
      });
      setNotifications(list.sort((a, b) => b.id.localeCompare(a.id)));
    }, (error) => {
      console.error("Firestore error reading notifications", error);
    });

    // 3. Real-time Transactions sync
    const unsubTxns = onSnapshot(collection(db, 'users', uid, 'transactions'), (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Transaction);
      });
      setTransactions(list.sort((a, b) => b.id.localeCompare(a.id)));
    }, (error) => {
      console.error("Firestore error reading transactions", error);
    });

    // 4. Real-time Active Ride sync
    let unsubRide;
    if (currentRole === 'student') {
      const q = query(collection(db, 'rideRequests'), where('passengerId', '==', uid));
      unsubRide = onSnapshot(q, (snapshot) => {
        let active: RideRequest | null = null;
        snapshot.forEach(doc => {
          const r = doc.data() as RideRequest;
          if (r.status !== 'completed' && r.status !== 'canceled') {
            active = r;
          }
        });
        setActiveRide(active);
      }, (error) => {
        console.error("Firestore error reading student active ride", error);
      });
    } else if (currentRole === 'driver') {
      const q = query(collection(db, 'rideRequests'), where('driverId', '==', uid));
      unsubRide = onSnapshot(q, (snapshot) => {
        let active: RideRequest | null = null;
        snapshot.forEach(doc => {
          const r = doc.data() as RideRequest;
          if (r.status !== 'completed' && r.status !== 'canceled') {
            active = r;
          }
        });
        setActiveRide(active);
      }, (error) => {
        console.error("Firestore error reading driver active ride", error);
      });
    }

    return () => {
      unsubProfile();
      unsubNotifs();
      unsubTxns();
      if (unsubRide) unsubRide();
    };
  }, [currentUser?.uid, currentRole]);

  // Authentication Callbacks
  const handleLogin = async (role: UserRole, loginId: string, password?: string) => {
    if (!password) {
      throw new Error("Password is required.");
    }
    
    let targetEmail = loginId.toLowerCase().trim();

    // Support logging in by Student ID or plate number or vehicle ID
    if (!targetEmail.includes('@')) {
      const q = query(collection(db, 'users'), where('idNumber', '==', loginId.trim()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        targetEmail = querySnapshot.docs[0].data().email;
      } else {
        const qPlate = query(collection(db, 'users'), where('plateNumber', '==', loginId.trim()));
        const snapshotPlate = await getDocs(qPlate);
        if (!snapshotPlate.empty) {
          targetEmail = snapshotPlate.docs[0].data().email;
        } else {
          // Fallback check: hardcode the admin email if they input the admin ID number
          if (loginId.toUpperCase() === 'ADM-2026-0001') {
            targetEmail = 'admin@campusride.edu';
          } else {
            throw new Error(`No account found with this ID Number: "${loginId}".`);
          }
        }
      }
    }

    // Auto-seed admin if logging in as admin for first time
    if (targetEmail === 'admin@campusride.edu') {
      try {
        const adminDoc = await getDoc(doc(db, 'users', 'admin-uid-101'));
        if (!adminDoc.exists()) {
          // Create admin profile
          await setDoc(doc(db, 'users', 'admin-uid-101'), {
            id: 'admin-uid-101',
            name: 'Sarah Jenkins',
            email: 'admin@campusride.edu',
            role: 'admin',
            avatar: INITIAL_ADMIN_PROFILE.avatar,
            idNumber: 'ADM-2026-0001',
            isVerified: true
          });
          // Also try to create auth account if it doesn't exist
          try {
            await createUserWithEmailAndPassword(auth, 'admin@campusride.edu', password);
          } catch (ae) {
            // ignore if auth account already exists
          }
        }
      } catch (err) {
        console.warn("Seeding admin warning", err);
      }
    }

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
    const uid = userCredential.user.uid;

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error("Account exists, but no user profile document found.");
    }

    const profile = userDoc.data();
    let targetRole = role;

    if (profile.role === 'admin') {
      targetRole = 'admin';
    } else if (profile.role === 'student') {
      if (role !== 'student') {
        throw new Error("This account is registered as a Rider. Please select the Rider (Student) role to log in.");
      }
    } else if (profile.role === 'driver') {
      if (role !== 'driver') {
        throw new Error("This account is registered as a Driver. Please select the Driver role to log in.");
      }
      if (!profile.isApproved) {
        throw new Error("Your driver profile is currently pending administrative verification and approval. Once verified, you will receive an email confirmation and can log in.");
      }
    }

    const session = {
      email: profile.email,
      uid: uid,
      role: targetRole,
      name: profile.name
    };
    localStorage.setItem('campusride_custom_session', JSON.stringify(session));
    setCurrentUser({ email: session.email, name: session.name, uid: session.uid });
    setCurrentRole(targetRole);
    
    if (targetRole === 'student') {
      setActiveView('booking');
    } else if (targetRole === 'driver') {
      setActiveView('driver_dashboard');
    } else {
      setActiveView('admin_operations');
    }

    const schoolId = localStorage.getItem(`campusride_selected_school_${uid}`);
    setSelectedSchoolId(schoolId);
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
    
    isSigningUpRef.current = true;
    try {
      const emailKey = email.toLowerCase().trim();

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, emailKey, password);
      const uid = userCredential.user.uid;

      const profileData: any = {
        id: uid,
        email: emailKey,
        name,
        role,
        avatar: role === 'student' 
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZAeU3AaKhGBOYd8WMMUOl8a1m-xWN35t0rtWjLanUleuFZFHDp1c7WY9NLhM3pYbj2P7WUN3LNb6nUbqSDLYMSuFD2oOAm38lvRS5LU4HXxClTVCnj3gr5GNw1_TapyvZgtt3Ilgpk3CPGXRWcZK_PWKrcSc6DmaNnSJiptAiQTXXYbsKwdI7gIxemY3OT3h2nlNCHSaiqU6lnU5TAfInxGhQJsNf0mvu15eYhrMNIpjN9uk4-WTaYEPMfjRlIgdc3E2QvlCvJDI'
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY',
        createdAt: new Date().toISOString(),
        isApproved: role === 'driver' ? false : true
      };

      if (role === 'student') {
        const studentProfile = {
          ...INITIAL_STUDENT_PROFILE,
          ...profileData,
          idNumber: idNumber || 'RUN/2022/10432',
          walletBalance: 2500,
          tripsThisWeek: 0,
          carpoolRides: 0,
          savedThisMonth: 0,
          isVerified: true
        };
        await setDoc(doc(db, 'users', uid), studentProfile);
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
          status: 'Offline',
          isApproved: false,
          carBrand: driverInfo?.carBrand || 'Toyota Camry',
          plateNumber: driverInfo?.plateNumber || '4P-928X',
          carType: driverInfo?.carType || 'car',
          vehicleId: driverInfo?.vehicleId || 'DRV-2024-8839',
        };
        await setDoc(doc(db, 'users', uid), dProfile);
        setDriverProfile(dProfile);

        // Save to pending drivers
        await setDoc(doc(db, 'pendingDrivers', uid), {
          id: uid,
          name,
          email: emailKey,
          carBrand: driverInfo?.carBrand || 'Toyota Camry',
          carType: driverInfo?.carType || 'car',
          plateNumber: driverInfo?.plateNumber || '4P-928X',
          vehicleId: driverInfo?.vehicleId || 'DRV-2024-8839',
          createdAt: new Date().toISOString()
        });
      }

      // Welcome Notification
      const welcomeNotif: AppNotification = {
        id: `m-notif-${Date.now()}`,
        title: 'Welcome to CampusRide!',
        message: role === 'driver' 
          ? 'Your registration is pending administrator approval. An email will be sent once active.'
          : 'Your account has been successfully created and linked to the registrar directory.',
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: 'success',
      };
      await setDoc(doc(db, 'users', uid, 'notifications', welcomeNotif.id), welcomeNotif);

      if (role === 'driver') {
        throw new Error("SUCCESS: Your driver registration was successful! Your credentials have been submitted to the university administrator for verification and approval under 'Reviews'. Once approved, you will receive an email notification and can log in.");
      }

      const session = {
        email: emailKey,
        uid: uid,
        role,
        name
      };
      localStorage.setItem('campusride_custom_session', JSON.stringify(session));
      setCurrentUser({ email, name, uid });
      setCurrentRole(role);

      if (role === 'student') {
        setActiveView('booking');
      } else {
        setActiveView('admin_operations');
      }
    } finally {
      isSigningUpRef.current = false;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google sign in failed", err);
      alert("Failed to complete Google Sign In. If this is in a local sandboxed preview, please use standard email login.");
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
    const uid = getActiveUid();
    if (uid) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        await signOut(auth);
        localStorage.removeItem('campusride_custom_session');
        setCurrentUser(null);
        setSelectedSchoolId(null);
        setActiveRide(null);
        alert('Your student transit account has been successfully deleted. Thank you for using CampusRide.');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      }
    }
  };

  // State mutation wrappers (Pass triggers to kids)
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    const uid = getActiveUid();
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', uid), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const handleUpdateDriverProfile = async (updates: Partial<DriverState>) => {
    const uid = getActiveUid();
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', uid), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const handleAddTransaction = async (txn: Transaction) => {
    const uid = getActiveUid();
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid, 'transactions', txn.id), txn);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${uid}/transactions/${txn.id}`);
      }
    }
  };

  const handleAddNotification = async (notif: AppNotification) => {
    const uid = getActiveUid();
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid, 'notifications', notif.id), notif);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${uid}/notifications/${notif.id}`);
      }
    }
  };

  const handleUpdateRide = async (ride: RideRequest | null) => {
    if (ride) {
      try {
        await setDoc(doc(db, 'rideRequests', ride.id), ride);
        setActiveRide(ride);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `rideRequests/${ride.id}`);
      }
    } else if (activeRide) {
      // Clear ride by archiving/cancelling in Firestore or setting local to null if state transition is handled
      setActiveRide(null);
    } else {
      setActiveRide(null);
    }
  };

  const handleMarkNotificationsRead = async () => {
    const uid = getActiveUid();
    if (uid) {
      try {
        const batch = writeBatch(db);
        notifications.forEach(notif => {
          const ref = doc(db, 'users', uid, 'notifications', notif.id);
          batch.update(ref, { isRead: true });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/notifications`);
      }
    }
  };

  const handleClearNotifications = async () => {
    const uid = getActiveUid();
    if (uid) {
      try {
        const batch = writeBatch(db);
        notifications.forEach(notif => {
          const ref = doc(db, 'users', uid, 'notifications', notif.id);
          batch.delete(ref);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}/notifications`);
      }
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
    }
  };

  // 1. If checking cached auth, show loader
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500 animate-pulse">Syncing CampusRide with Firestore...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Login/SignUp screen (Backdrop, logo, quick actions)
  if (!currentUser) {
    return <AuthScreens onLogin={handleLogin} onSignUp={handleSignUp} onGoogleSignIn={handleGoogleSignIn} />;
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
    <div id="application-layout-context" className={`flex flex-col md:flex-row min-h-screen bg-[#F9FAFB] ${currentRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'} font-sans antialiased`}>
      
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
      <main id="main-viewport-body" className="flex-1 flex flex-col relative min-w-0 pb-20 md:pb-0">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-100 h-16 px-6 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-xs">
          <div className="flex items-center space-x-2 md:space-x-4">
            <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-slate-800">
              {activeView === 'booking' && 'Request Ride'}
              {activeView === 'browse_pools' && 'Browse Active Pools'}
              {activeView === 'dashboard' && 'Activity Dashboard'}
              {activeView === 'notifications' && 'Notifications Inbox'}
              {activeView === 'profile' && 'Student Profile'}
              {activeView === 'settings' && 'App Settings'}
              {activeView === 'driver_dashboard' && 'Shift Dashboard'}
              {activeView === 'driver_scheduled' && 'Scheduled Rides'}
              {activeView === 'driver_settings' && 'Driver Settings'}
              {activeView === 'admin_operations' && 'Operations Command'}
              {activeView === 'admin_analytics' && 'Performance Hub'}
              {activeView === 'admin_reviews' && 'Reviews Hub'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-3">
            
            {/* Top Navbar Notification Button with Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowTopNotifications(!showTopNotifications)}
                className="relative p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#00875A] rounded-xl border border-gray-150 transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-white animate-pulse">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Float Dropdown Panel */}
              <AnimatePresence>
                {showTopNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setShowTopNotifications(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 text-slate-800"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#00875A]">Notifications</span>
                        <div className="flex space-x-3 text-[10px] font-bold">
                          <button 
                            onClick={() => {
                              handleMarkNotificationsRead();
                              alert('All marked as read.');
                            }}
                            className="text-[#00875A] hover:underline cursor-pointer"
                          >
                            Mark Read
                          </button>
                          <span className="text-slate-300">|</span>
                          <button 
                            onClick={() => {
                              if (confirm("Are you sure you want to clear your notification history?")) {
                                handleClearNotifications();
                                setShowTopNotifications(false);
                              }
                            }}
                            className="text-rose-600 hover:underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={`p-4 text-left transition-colors hover:bg-slate-50 ${!n.isRead ? 'bg-amber-500/5' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 block leading-snug">{n.title}</span>
                                <span className="text-[9px] text-slate-400 font-mono shrink-0">{n.time}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-xs text-slate-400 italic">
                            Your inbox is clear! No active alerts.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

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
            onClearNotifications={handleClearNotifications}
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
            notifications={notifications}
            onUpdateDriverProfile={handleUpdateDriverProfile}
            onUpdateRide={handleUpdateRide}
            onAddNotification={handleAddNotification}
            onAddTransaction={handleAddTransaction}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onClearNotifications={handleClearNotifications}
            selectedSchoolId={selectedSchoolId}
            onNavigate={setActiveView}
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
