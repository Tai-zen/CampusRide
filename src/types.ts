export type UserRole = 'student' | 'driver' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  idNumber: string;
  enrolledTerm?: string;
  major?: string;
  walletBalance: number;
  isVerified: boolean;
  tripsThisWeek: number;
  carpoolRides: number;
  savedThisMonth: number;
}

export interface DriverState {
  id: string;
  name: string;
  email?: string;
  vehicle: string;
  rating: number;
  ratingsCount: number;
  todayEarnings: number;
  completedTripsCount: number;
  hoursOnline: number;
  status: 'On Trip' | 'Idle' | 'Break' | 'Offline';
  avatar: string;
}

export type RideStatus = 'requested' | 'accepted' | 'arriving' | 'in_transit' | 'completed' | 'canceled';

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerAvatar: string;
  passengerRating: number;
  passengerType: 'Student' | 'Staff' | 'Faculty';
  pickup: string;
  dropoff: string;
  status: RideStatus;
  vehicleType: 'Car' | 'Keke' | 'Shuttle';
  verifyPeer?: boolean;
  driverId?: string;
  driverName?: string;
  driverAvatar?: string;
  driverVehicle?: string;
  driverRating?: number;
  cost: number;
  etaMinutes: number;
  date: string;
  time: string;
  createdAt?: number;
  paymentMethod?: 'cash' | 'transfer';
  paymentConfirmedByRider?: boolean;
  paymentValidatedByDriver?: boolean;
  riderPaid?: boolean;
  passengerRated?: boolean;
  driverConcluded?: boolean;
  driverCredited?: boolean;
}

export type TransactionType = 'charge' | 'reload';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  time: string;
  method: string;
  type: TransactionType;
  status: 'Completed' | 'Pending' | 'Canceled';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  date: string;
  isRead: boolean;
  type: 'info' | 'success' | 'receipt' | 'alert';
}
