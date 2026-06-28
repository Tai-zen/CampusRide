import { UserProfile, DriverState, RideRequest, Transaction, AppNotification } from './types';

export const INITIAL_STUDENT_PROFILE: UserProfile = {
  id: 'u-101',
  name: '',
  email: '',
  role: 'student',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZAeU3AaKhGBOYd8WMMUOl8a1m-xWN35t0rtWjLanUleuFZFHDp1c7WY9NLhM3pYbj2P7WUN3LNb6nUbqSDLYMSuFD2oOAm38lvRS5LU4HXxClTVCnj3gr5GNw1_TapyvZgtt3Ilgpk3CPGXRWcZK_PWKrcSc6DmaNnSJiptAiQTXXYbsKwdI7gIxemY3OT3h2nlNCHSaiqU6lnU5TAfInxGhQJsNf0mvu15eYhrMNIpjN9uk4-WTaYEPMfjRlIgdc3E2QvlCvJDI',
  idNumber: '',
  enrolledTerm: 'Fall Semester, Year 2',
  major: 'B.S. Software Engineering',
  walletBalance: 0.00,
  isVerified: false,
  tripsThisWeek: 0,
  carpoolRides: 0,
  savedThisMonth: 0.00,
};

export const INITIAL_DRIVER_PROFILE: DriverState = {
  id: 'd-202',
  name: '',
  vehicle: '',
  rating: 5.0,
  ratingsCount: 0,
  todayEarnings: 0.00,
  completedTripsCount: 0,
  hoursOnline: 0,
  status: 'Offline',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwF-7RkJYmJLhwPyGL113SVjQjkGzPYiyCbockhwN_N-tmnr2TGTNX51wlUftwSlOTqZndRT9aYqxb4Xoe6vY-oG4ObF-GVwq7b-BBpT-mcv6b7NOqLnhKEJK_XDbLSLeLkdRLSCnWMA3zzhCNHZiq3lpbXnMqZymUvkZe2-A3zW6Kwue6jeQxFf825_Vo5NZcTIr0uB7XnuLmVmEHWZf6d6fnvwKxXn6TZk4OyjyYrejK4iTXYRpZKFXWxlmtq5nSa1DMrwkdNY',
};

export const INITIAL_ADMIN_PROFILE = {
  id: 'a-303',
  name: 'Sarah Jenkins',
  role: 'admin',
  title: 'Lead Transit Dispatcher',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhJimTqyA00WnkKTEMBymrx5zv08hLitcVNgkOgPtYdQuUBbsdg0W05d5gjieAWl5Xt3WT4jFYJlUZY3dDPqNL18dxo--iTl54RqziNcc3ObaYQA2kS_XG8TQmGeArk8WN6T0pzHs3y_vNoHhz1Eav5hXoPjZYFFIkVnO-512lzJFtTNL1YU6MXlK1gg31Invcs2SL9tQUwRzOxUva_RBHcur5PlXRJMD0xqNkSPBSogufnGLLqpWNUYqE2txyk7x7DE8wDaAUAgA',
  department: 'University Parking & Transit Operations',
};

export const CAMPUS_STOPS = [
  { id: 'stop-1', name: 'Student Union' },
  { id: 'stop-2', name: 'Science Hill Hub' },
  { id: 'stop-3', name: 'Engineering Quad Gateway' },
  { id: 'stop-4', name: 'Main Campus Library' },
  { id: 'stop-5', name: 'Graduate Housing Towers' },
  { id: 'stop-6', name: 'Downtown Student Commons' },
  { id: 'stop-7', name: 'Athletics & Recreation Center' },
  { id: 'stop-8', name: 'West Gate Parking Lot' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const MOCK_RECENT_TRIPS: RideRequest[] = [];

export const MOCK_INCOMING_REQUEST: RideRequest = {
  id: 'req-3091',
  passengerId: 'u-105',
  passengerName: 'Sarah Martinez',
  passengerAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-Cdw8CNopc8k2r2bChzvHe7QZaaNgVPTLiGVgUTgp--dffDncXZ8bU7hizu37qrlVeyhQdVbv3kihVg1LraTeO1kDBTXWUTydpgInuRRr6KgcMf80v4Etlk0ixvdHwGMd1pjRAggczT6nH3Ti71NEpOUiZZMUofg7cAEVyhtFJgXIAu_KWkyoQ1MNsW0wXbjHSUOpXEH2KfQKhDcOLk1VhacmpIBEpbNkM9L1NDmr5MdxBTYTqutaSAlGgZaJiNcn9MpBzKOrS4',
  passengerRating: 4.9,
  passengerType: 'Student',
  pickup: 'Engineering Quad Gateway',
  dropoff: 'Graduate Housing Towers',
  status: 'requested',
  vehicleType: 'Keke',
  verifyPeer: true,
  cost: 7.25,
  etaMinutes: 8,
  date: 'Jun 19, 2026',
  time: '11:15 AM',
};

export const ADVERT_CARDS = [
  {
    id: 'adv-1',
    tag: 'CAMPUS SAFETY',
    title: 'Ride Confidently with Commuter Verification',
    description: 'Ensure a secure commute trip by verifying your peer or student companion with ID card pins.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzWuclf_igFpHNLaaY95lZgmoRuL9HfNUJ2NBbNay4iI4lpWscE5YzOk3R4dIo5wMKoNSUT7K0iDkUR-Vi998FeQbMZV52g9zOLbsRJ7cZ3x32jXQqjgKTq_cno0Vw97QEffvAU2MF2xSVeftvpFcc_D7C63vbiBnD_EhLZztZOE7y_XYOR1-uNqJwFeT7LI9XpVRw_1I6gAp-v56x6vLuiQC2BZ7Xo9fY3Nc3xZ40mHaEIBXSjhhwKTbhyVff1eZ4wE7ErbW4aR4',
  },
];

export const SYSTEM_KPIS = {
  activeRides: 142,
  idleDrivers: 18,
  revenueToday: 4280,
  reportedIncidents: 2,
};

export const HOTLINK_MAP_STUDENT = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFf8Ynl_a5V5MjIUSy7jPFq6l93wbIfzj-exNibt_LXLUh8GWNuh6KFAFWDpEXHOfiQF7pQanp0nvupSTAhFyJbZ6E9MZSPYwROimnSHmxAWlwq42FLTHUZSvCOvDwYSwowjvtr3yw86A2A_Zf5oQWW54K32vb3_6DoBUtR7nySxsmx9iwMwY9IHWFatEpt86iaCiizyjVEAKliRZJVanLhGSvehnH_F0s9lbkiokfvqH0LL8iXGwZUA2F_u3Brjb9erGTOXcGyVA';
export const HOTLINK_MAP_ADMIN = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGdqITs0V8FtUmIn9Pu3Nw4ljHuKsmyTM0eN5MsW7oT07CkaHebJsd_0nGZOxRdMs16uZ5-TntRrLnVT3ujgum12N_fj1BmKcyalqv1BinQBI79B1JjTsZw35KIlCNaEwqeQwVzH3zH3DPDlDLMtysTsBJ4WNept0gDL43eV-g_7lu1Msgynw5zUyRrCfJ4UAjPg1TaCiGesLwL9I1LwgADC5WD2jFWZi3EUSdUenTv8p_RwjpUP1rcix1tajYsLRnxQBmYJivQW8';
export const LOGIN_BG_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-iPhYTrGBYvqvXgpMCfyFAeyhlmPMHGzFoYLYaDtbEQaamCaxm2nfWVU-h7DVtKeM6MHy1t82aNRidCfjI8jdJ72bPzEdy5c2V1M3sfUCH30EfCGvv7n7a2njEZZWe4cfecMAMP9NtOo4K8kDD-7pNnjdiI3SOuGd8N2MrmHsCxXFMs3jPjaPZFNG3IR7DC_rTm6qqjp2iCFNmv0QdgJiMn3SmJAL2MEh9E44oh5Ytttpy5WdhmAEEFOa5nSBhQj5ndk-5ZmIwCE';
export const CAMPAIGN_BANNER_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzWuclf_igFpHNLaaY95lZgmoRuL9HfNUJ2NBbNay4iI4lpWscE5YzOk3R4dIo5wMKoNSUT7K0iDkUR-Vi998FeQbMZV52g9zOLbsRJ7cZ3x32jXQqjgKTq_cno0Vw97QEffvAU2MF2xSVeftvpFcc_D7C63vbiBnD_EhLZztZOE7y_XYOR1-uNqJwFeT7LI9XpVRw_1I6gAp-v56x6vLuiQC2BZ7Xo9fY3Nc3xZ40mHaEIBXSjhhwKTbhyVff1eZ4wE7ErbW4aR4';
