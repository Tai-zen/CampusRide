import { useState, useEffect, useRef } from 'react';
import { UserRole, AppNotification, Transaction, RideRequest, UserProfile, DriverState } from './types';
import { AuthScreens } from './components/AuthScreens';
import { SchoolSelection, UNIVERSITIES } from './components/SchoolSelection';
import { Sidebar } from './components/Sidebar';
import { StudentPortal } from './components/StudentPortal';
import { DriverPortal } from './components/DriverPortal';
import { AdminCentral } from './components/AdminCentral';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Wallet, X, CheckCircle } from 'lucide-react';
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

const showNativeNotification = async (title: string, body: string) => {
  const enabled = localStorage.getItem('app_notifications_enabled') !== 'false';
  if (!enabled) return;

  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          reg.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200],
            tag: 'campusride-update',
            renotify: true
          } as any);
          return;
        }
      } catch (err) {
        console.error('Error showing notification via Service Worker:', err);
      }
    }
    new Notification(title, { body });
  }
};

export default function App() {
  const isSigningUpRef = useRef<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; uid?: string } | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>('run');
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [showTopNotifications, setShowTopNotifications] = useState<boolean>(false);
  
  // Dark mode support state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('campusride_darkmode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('campusride_darkmode', String(isDarkMode));
    const layout = document.getElementById('application-layout-context');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      if (layout) layout.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (layout) layout.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Register Service Worker & Request Notification Permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return 'Notification' in window ? Notification.permission : 'denied';
  });
  const [dismissedNotificationBanner, setDismissedNotificationBanner] = useState<boolean>(() => {
    return localStorage.getItem('campusride_dismissed_notif_banner') === 'true';
  });

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          showNativeNotification("Notifications Enabled! 🔔", "You will now receive ride and pool updates outside the browser.");
        }
      } catch (err) {
        console.error("Error requesting notification permission:", err);
      }
    }
  };

  const handleDismissNotificationBanner = () => {
    setDismissedNotificationBanner(true);
    localStorage.setItem('campusride_dismissed_notif_banner', 'true');
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // High fidelity application databases in memory synced with Firestore
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_STUDENT_PROFILE);
  const [driverProfile, setDriverProfile] = useState<DriverState>(INITIAL_DRIVER_PROFILE);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [driverPastRides, setDriverPastRides] = useState<RideRequest[]>([]);
  const [studentPastRides, setStudentPastRides] = useState<RideRequest[]>([]);

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

            // Block unapproved drivers from logging in/entering via auth state
            if (profile.role === 'driver' && !profile.isApproved) {
              if (isSigningUpRef.current) {
                console.log("Driver signup in progress, not blocking in onAuthStateChanged yet");
                return;
              }
              console.log("Blocking unapproved driver from logging in");
              await auth.signOut();
              localStorage.removeItem('campusride_custom_session');
              setCurrentUser(null);
              setLoadingAuth(false);
              return;
            }

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

            // Self-heal: ensure lookup keys exist in idLookups
            try {
              if (profile.role === 'student' && profile.idNumber) {
                const key = profile.idNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
                const lookupRef = doc(db, 'idLookups', key);
                const lookupSnap = await getDoc(lookupRef);
                if (!lookupSnap.exists()) {
                  await setDoc(lookupRef, { email: profile.email });
                }
              } else if (profile.role === 'driver') {
                if (profile.plateNumber) {
                  const key = profile.plateNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
                  const lookupRef = doc(db, 'idLookups', key);
                  const lookupSnap = await getDoc(lookupRef);
                  if (!lookupSnap.exists()) {
                    await setDoc(lookupRef, { email: profile.email });
                  }
                }
                if (profile.vehicleId) {
                  const key = profile.vehicleId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
                  const lookupRef = doc(db, 'idLookups', key);
                  const lookupSnap = await getDoc(lookupRef);
                  if (!lookupSnap.exists()) {
                    await setDoc(lookupRef, { email: profile.email });
                  }
                }
              } else if (profile.role === 'admin' && profile.idNumber) {
                const key = profile.idNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
                const lookupRef = doc(db, 'idLookups', key);
                const lookupSnap = await getDoc(lookupRef);
                if (!lookupSnap.exists()) {
                  await setDoc(lookupRef, { email: profile.email });
                }
              }
            } catch (healErr) {
              console.warn("Self-healing lookup warning:", healErr);
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
              // Save lookup key for student ID
              const lookupKey = defaultProfile.idNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
              await setDoc(doc(db, 'idLookups', lookupKey), { email: defaultProfile.email }).catch(console.error);

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

  // 0. Real-time synchronization of schools custom configuration (e.g. logos)
  const [customLogos, setCustomLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const logos: Record<string, string> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.logoImage) {
          logos[docSnap.id] = data.logoImage;
        }
      });
      setCustomLogos(logos);
    }, (error) => {
      console.warn("Firestore schools metadata listener error", error);
    });
    return () => unsubSchools();
  }, []);

  useEffect(() => {
    Object.keys(customLogos).forEach(schoolId => {
      const school = UNIVERSITIES.find(u => u.id === schoolId);
      if (school) {
        school.logoImage = customLogos[schoolId];
      }
    });
  }, [customLogos]);

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

    // 2. Real-time Notifications sync with Native Web Push Notification Support
    let isInitialNotifLoad = true;
    const unsubNotifs = onSnapshot(collection(db, 'users', uid, 'notifications'), (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as AppNotification);
      });
      setNotifications(list.sort((a, b) => b.id.localeCompare(a.id)));

      if (!isInitialNotifLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = change.doc.data() as AppNotification;
            if (!n.isRead) {
              showNativeNotification(n.title, n.message);
            }
          }
        });
      }
      isInitialNotifLoad = false;
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
        let latestRide: RideRequest | null = null;
        const past: RideRequest[] = [];
        snapshot.forEach(doc => {
          const r = doc.data() as RideRequest;
          if (!latestRide || (r.createdAt || 0) > (latestRide.createdAt || 0)) {
            latestRide = r;
          }
          if (r.status === 'completed' || r.status === 'canceled') {
            past.push(r);
          }
        });
        if (latestRide) {
          if (latestRide.status !== 'canceled') {
            if (latestRide.status !== 'completed' || !latestRide.passengerRated) {
              active = latestRide;
            }
          }
        }
        setActiveRide(active);
        setStudentPastRides(past.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      }, (error) => {
        console.error("Firestore error reading student active ride", error);
      });
    } else if (currentRole === 'driver') {
      const q = query(collection(db, 'rideRequests'), where('driverId', '==', uid));
      unsubRide = onSnapshot(q, (snapshot) => {
        let active: RideRequest | null = null;
        const past: RideRequest[] = [];
        snapshot.forEach(doc => {
          const r = doc.data() as RideRequest;
          if (r.status !== 'completed' && r.status !== 'canceled') {
            active = r;
          } else if (r.status === 'completed' && !r.driverConcluded) {
            active = r;
          } else {
            past.push(r);
          }
        });
        setActiveRide(active);
        // Sort past rides by createdAt descending, default to 0 if not present
        setDriverPastRides(past.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
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

    // Support logging in by Student ID or plate number or vehicle ID securely
    if (!targetEmail.includes('@')) {
      const lookupKey = loginId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
      try {
        const lookupDoc = await getDoc(doc(db, 'idLookups', lookupKey));
        if (lookupDoc.exists()) {
          targetEmail = lookupDoc.data().email;
        } else {
          // Fallback check: hardcode the admin email if they input the admin ID number
          if (loginId.toUpperCase() === 'ADM-2026-0001') {
            targetEmail = 'wywsk64571@minitts.net';
          } else {
            // Secondary fallback query
            const q = query(collection(db, 'users'), where('idNumber', '==', loginId.trim()));
            const querySnapshot = await getDocs(q).catch(() => ({ empty: true, docs: [] as any }));
            if (!querySnapshot.empty) {
              targetEmail = querySnapshot.docs[0].data().email;
            } else {
              const qPlate = query(collection(db, 'users'), where('plateNumber', '==', loginId.trim()));
              const snapshotPlate = await getDocs(qPlate).catch(() => ({ empty: true, docs: [] as any }));
              if (!snapshotPlate.empty) {
                targetEmail = snapshotPlate.docs[0].data().email;
              } else {
                throw new Error(`No account found with this ID or Plate Number: "${loginId}".`);
              }
            }
          }
        }
      } catch (err: any) {
        if (loginId.toUpperCase() === 'ADM-2026-0001') {
          targetEmail = 'wywsk64571@minitts.net';
        } else {
          throw new Error(err.message || `Failed to resolve ID/Plate "${loginId}".`);
        }
      }
    }

    // Sign in or sign up with Firebase Auth
    let userCredential;
    if (targetEmail === 'wywsk64571@minitts.net') {
      try {
        userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password);
          } catch (signUpErr: any) {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }
    } else {
      userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
    }

    const uid = userCredential.user.uid;

    // Auto-seed admin user document if logging in as admin for first time
    if (targetEmail === 'wywsk64571@minitts.net') {
      try {
        const adminDoc = await getDoc(doc(db, 'users', uid));
        if (!adminDoc.exists()) {
          // Create admin profile
          await setDoc(doc(db, 'users', uid), {
            id: uid,
            name: 'Sarah Jenkins',
            email: 'wywsk64571@minitts.net',
            role: 'admin',
            avatar: INITIAL_ADMIN_PROFILE.avatar,
            idNumber: 'ADM-2026-0001',
            isVerified: true
          });
        }
      } catch (err) {
        console.warn("Seeding admin warning", err);
      }
    }

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
        await auth.signOut();
        const feedback = profile.adminComments ? `\n\nAdministrator review feedback: "${profile.adminComments}"` : "";
        if (profile.declined) {
          throw new Error(`Your driver application has been declined by the administrator.${feedback}\n\nPlease submit a new application with accurate credentials or contact Transit Operations.`);
        } else {
          throw new Error(`Your driver profile is currently pending administrative verification and approval. Once verified, you will receive an email confirmation and can log in.${feedback}`);
        }
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
    driverInfo?: { carBrand: string; plateNumber: string; carType: string; vehicleId?: string; licenseDocName?: string; carModel?: string; maxCapacity?: number }, 
    idNumber?: string,
    gender?: string
  ) => {
    if (!password) {
      throw new Error("Password is required for registration.");
    }
    
    isSigningUpRef.current = true;
    try {
      const emailKey = email.toLowerCase().trim();

      // Check if there is already an approved driver profile in Firestore with this email
      let existingDriverDocId: string | null = null;
      let existingDriverData: any = null;
      try {
        const qUser = query(collection(db, 'users'), where('email', '==', emailKey));
        const userSnap = await getDocs(qUser);
        if (!userSnap.empty) {
          // Find if there is a driver profile
          const match = userSnap.docs.find(d => d.data().role === 'driver');
          if (match) {
            existingDriverDocId = match.id;
            existingDriverData = match.data();
          }
        }
      } catch (err) {
        console.warn("Could not check existing driver email match in Firestore:", err);
      }

      // Create user in Firebase Auth
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, emailKey, password);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          throw new Error(`An account with email "${email}" already exists. Multiple account creation with the same email is not allowed.`);
        }
        throw authErr;
      }
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
        isApproved: role === 'driver' ? (existingDriverData ? true : false) : true,
        gender: gender || 'Male'
      };

      if (role === 'student') {
        const studentId = idNumber || 'RUN/2022/10432';
        const studentProfile = {
          ...INITIAL_STUDENT_PROFILE,
          ...profileData,
          idNumber: studentId,
          walletBalance: 2500,
          tripsThisWeek: 0,
          carpoolRides: 0,
          savedThisMonth: 0,
          isVerified: true
        };
        try {
          await setDoc(doc(db, 'users', uid), studentProfile);
          
          // Save lookup key for student ID
          const lookupKey = studentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
          await setDoc(doc(db, 'idLookups', lookupKey), { email: emailKey });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `users/${uid}`);
        }
        setUserProfile(studentProfile);
      } else if (role === 'driver') {
        const finalPlateNumber = existingDriverData?.plateNumber || driverInfo?.plateNumber || '4P-928X';
        const finalVehicleId = existingDriverData?.vehicleId || driverInfo?.vehicleId || 'DRV-2024-8839';
        const finalCarBrand = existingDriverData?.carBrand || driverInfo?.carBrand || 'Toyota Sienna';
        const finalCarType = existingDriverData?.carType || driverInfo?.carType || 'car';
        const finalCarModel = driverInfo?.carModel || existingDriverData?.carModel || 'Sienna';
        const finalMaxCapacity = driverInfo?.maxCapacity || existingDriverData?.maxCapacity || (finalCarModel === 'Sienna' ? 7 : 4);
        
        const vehicleDetails = driverInfo 
          ? `${driverInfo.carBrand} (${driverInfo.carType.toUpperCase()}) • Max ${finalMaxCapacity} Seats • ${driverInfo.plateNumber}${driverInfo.vehicleId ? ` [ID: ${driverInfo.vehicleId}]` : ''}` 
          : (existingDriverData?.vehicle || 'Toyota Sienna (Silver) • Max 7 Seats • 4P-928X');

        const licenseDocName = driverInfo?.licenseDocName || existingDriverData?.licenseDocName || 'Driver_License_Submitted.pdf';
        const licenseDocUrl = driverInfo?.licenseDocUrl || existingDriverData?.licenseDocUrl || '';

        const dProfile = {
          ...INITIAL_DRIVER_PROFILE,
          ...existingDriverData, // Merge existing admin-created profile data if any
          ...profileData,
          vehicle: vehicleDetails,
          todayEarnings: existingDriverData?.todayEarnings || 0,
          completedTripsCount: existingDriverData?.completedTripsCount || 0,
          status: 'Offline',
          isApproved: existingDriverDocId ? true : false,
          carBrand: finalCarBrand,
          carModel: finalCarModel,
          maxCapacity: finalMaxCapacity,
          plateNumber: finalPlateNumber,
          carType: finalCarType,
          vehicleId: finalVehicleId,
          licenseDocName,
          licenseDocUrl,
        };
        try {
          await setDoc(doc(db, 'users', uid), dProfile);
          
          // Save lookup keys for plate number and vehicle ID
          if (finalPlateNumber) {
            const plateKey = finalPlateNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
            await setDoc(doc(db, 'idLookups', plateKey), { email: emailKey });
          }
          if (finalVehicleId) {
            const vehicleKey = finalVehicleId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
            await setDoc(doc(db, 'idLookups', vehicleKey), { email: emailKey });
          }

          // Clean up the temporary driver doc if we linked one
          if (existingDriverDocId && existingDriverDocId !== uid) {
            await deleteDoc(doc(db, 'users', existingDriverDocId)).catch(console.error);
          }
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `users/${uid}`);
        }
        setDriverProfile(dProfile);

        // Save to pending drivers only if they are not already approved
        if (!dProfile.isApproved) {
          try {
            await setDoc(doc(db, 'pendingDrivers', uid), {
              id: uid,
              name,
              email: emailKey,
              carBrand: finalCarBrand,
              carType: finalCarType,
              plateNumber: finalPlateNumber,
              vehicleId: finalVehicleId,
              licenseDocName,
              licenseDocUrl,
              createdAt: new Date().toISOString()
            });
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.WRITE, `pendingDrivers/${uid}`);
          }
        }
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
      try {
        await setDoc(doc(db, 'users', uid, 'notifications', welcomeNotif.id), welcomeNotif);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${uid}/notifications/${welcomeNotif.id}`);
      }

      if (role === 'driver') {
        await auth.signOut();
        isSigningUpRef.current = false;
        return;
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
      if (activeRide.status !== 'completed' && activeRide.status !== 'canceled') {
        try {
          await updateDoc(doc(db, 'rideRequests', activeRide.id), { status: 'canceled' });
        } catch (e) {
          console.error("Error setting active ride to canceled in Firestore:", e);
        }
      }
      setActiveRide(null);
    } else {
      setActiveRide(null);
    }
  };

  const handleMarkNotificationsRead = async () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
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
    setNotifications([]);
    const uidsToClear = new Set<string>();
    const activeUid = getActiveUid();
    if (activeUid) uidsToClear.add(activeUid);
    if (driverProfile?.id) uidsToClear.add(driverProfile.id);
    if (userProfile?.id) uidsToClear.add(userProfile.id);

    for (const uid of Array.from(uidsToClear)) {
      try {
        const notifSnap = await getDocs(collection(db, 'users', uid, 'notifications'));
        if (!notifSnap.empty) {
          const batch = writeBatch(db);
          notifSnap.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      } catch (error) {
        console.warn(`Error deleting notifications for ${uid}:`, error);
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

  const handleResetSystemToStateZero = async () => {
    try {
      // 1. Delete all rideRequests from Firestore
      const rideRequestsSnap = await getDocs(collection(db, 'rideRequests'));
      const rideBatch = writeBatch(db);
      let rideCount = 0;
      rideRequestsSnap.forEach(docSnap => {
        rideBatch.delete(docSnap.ref);
        rideCount++;
      });
      if (rideCount > 0) {
        await rideBatch.commit();
      }

      // 2. Clear all local storage keys related to pools and pooling states
      localStorage.removeItem('campusride_active_pools');
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('campusride_joined_pool_id_') || 
          key.startsWith('campusride_pooling_state_') || 
          key.startsWith('campusride_chat_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // 3. Reset Firestore Users:
      // Update any user in Firestore to a clean slate (Offline, empty ride request, ₦2500 walletBalance)
      const usersSnap = await getDocs(collection(db, 'users'));
      const userBatch = writeBatch(db);
      let userCount = 0;
      usersSnap.forEach(userDocSnap => {
        const data = userDocSnap.data();
        if (data.role === 'student') {
          userBatch.update(userDocSnap.ref, {
            walletBalance: 2500,
            tripsThisWeek: 0,
            carpoolRides: 0,
            savedThisMonth: 0,
            activeRide: null,
            joinedPoolId: null
          });
          userCount++;
        } else if (data.role === 'driver') {
          userBatch.update(userDocSnap.ref, {
            status: 'Offline',
            todayEarnings: 0,
            completedTripsCount: 0,
            hoursOnline: 0,
            activeRide: null
          });
          userCount++;
        }
      });
      if (userCount > 0) {
        await userBatch.commit();
      }

      // 4. Update the local states in App.tsx
      setActiveRide(null);
      setNotifications([]);
      setTransactions([]);
      setDriverPastRides([]);
      setStudentPastRides([]);

      // Reset local student/driver profile state if current user is logged in
      const uid = getActiveUid();
      if (uid) {
        const freshDoc = await getDoc(doc(db, 'users', uid));
        if (freshDoc.exists()) {
          const profile = freshDoc.data();
          if (profile.role === 'student') {
            setUserProfile(profile as UserProfile);
          } else if (profile.role === 'driver') {
            setDriverProfile(profile as DriverState);
          }
        }
      }

      alert("System successfully reset to State Zero: all ride requests and active pools are deleted, and accounts are set to default offline / zero states.");
    } catch (err: any) {
      console.error("Error resetting system to state zero:", err);
      alert("Failed to reset database: " + (err.message || err));
    }
  };

  // 1. If checking cached auth, render null (bypassing initial syncing splash UI)
  if (loadingAuth) {
    return null;
  }

  // Unauthenticated: Show Login/SignUp screen (Backdrop, logo, quick actions)
  if (!currentUser) {
    return <AuthScreens onLogin={handleLogin} onSignUp={handleSignUp} onGoogleSignIn={handleGoogleSignIn} />;
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

  const getViewTitle = () => {
    if (currentRole === 'student') {
      switch (activeView) {
        case 'booking': return 'Request Ride';
        case 'browse_pools': return 'Browse Active Pools';
        case 'dashboard': return 'Activity Dashboard';
        case 'notifications': return 'Notifications';
        case 'profile': return 'Student Profile';
        case 'settings': return 'App Settings';
        default: return 'Request Ride';
      }
    } else if (currentRole === 'driver') {
      switch (activeView) {
        case 'driver_dashboard': return 'Driver Dashboard';
        case 'driver_past_rides': return 'Completed Trips';
        case 'driver_settings': return 'Driver Settings';
        case 'notifications': return 'Driver Notifications';
        default: return 'Driver Console';
      }
    } else {
      switch (activeView) {
        case 'admin_dashboard': return 'Admin Central';
        case 'admin_operations': return 'Admin Operations';
        case 'admin_users': return 'User Directory';
        case 'admin_analytics': return 'Performance Hub';
        case 'admin_reviews': return 'Driver Reviews';
        case 'admin_complaints': return 'Rider Complaints';
        case 'admin_settings': return 'Admin Settings';
        default: return 'Administrator';
      }
    }
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
        onResetSystem={handleResetSystemToStateZero}
      />

      {/* Main Viewport Content block */}
      <main id="main-viewport-body" className="flex-1 flex flex-col relative min-w-0 pb-20 md:pb-0">
        
        {/* Native Web Push Notifications Consent Banner */}
        {notificationPermission === 'default' && !dismissedNotificationBanner && (
          <div className="bg-gradient-to-r from-[#BE5912] to-orange-500 text-white p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 animate-fade-in relative z-20">
            <div className="flex items-start md:items-center space-x-3 text-left">
              <div className="bg-white/15 p-2 rounded-xl text-white mt-0.5 md:mt-0 flex-shrink-0 animate-pulse">
                <Bell className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  Enable System Notifications
                  <span className="bg-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest font-mono">Outside Browser</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-orange-50 max-w-2xl leading-relaxed">
                  Stay updated instantly! Receive real-time alerts for driver arrivals, newly formed ride pools, and group chats—even when you close this tab or put it in the background.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={handleDismissNotificationBanner}
                className="hover:bg-white/10 text-white/85 hover:text-white font-bold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                className="bg-white text-[#BE5912] hover:bg-orange-50 font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />
                Enable Alerts
              </button>
            </div>
          </div>
        )}
        
        {/* Render portal based on Active Switching Role context */}
        {currentRole === 'student' && (
          <StudentPortal 
            activeView={activeView}
            userProfile={userProfile}
            notifications={notifications}
            transactions={transactions}
            activeRide={activeRide}
            studentPastRides={studentPastRides}
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
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            onResetSystem={handleResetSystemToStateZero}
          />
        )}

        {currentRole === 'driver' && (
          <DriverPortal 
            activeView={activeView}
            driverProfile={driverProfile}
            activeRide={activeRide}
            driverPastRides={driverPastRides}
            notifications={notifications}
            onUpdateDriverProfile={handleUpdateDriverProfile}
            onUpdateRide={handleUpdateRide}
            onAddNotification={handleAddNotification}
            onAddTransaction={handleAddTransaction}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onClearNotifications={handleClearNotifications}
            selectedSchoolId={selectedSchoolId}
            onNavigate={setActiveView}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            onResetSystem={handleResetSystemToStateZero}
          />
        )}

        {currentRole === 'admin' && (
          <AdminCentral 
            activeView={activeView}
            activeRide={activeRide}
            onUpdateRide={handleUpdateRide}
            selectedSchoolId={selectedSchoolId}
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onClearNotifications={handleClearNotifications}
            onResetSystem={handleResetSystemToStateZero}
          />
        )}
      </main>
    </div>
  );
}
