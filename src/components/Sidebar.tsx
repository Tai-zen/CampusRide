import React, { useState } from 'react';
import { UserRole, AppNotification } from '../types';
import { UNIVERSITIES } from './SchoolSelection';
import { 
  Car, 
  LayoutDashboard, 
  Bell, 
  Wallet, 
  User, 
  Settings, 
  LogOut, 
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  LineChart,
  Grid,
  Menu,
  X,
  RefreshCw,
  Gauge,
  Compass,
  Calendar,
  Users
} from 'lucide-react';

interface SidebarProps {
  currentRole: UserRole;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onChangeRole: (role: UserRole) => void;
  userProfile: {
    name: string;
    avatar: string;
    email: string;
    walletBalance: number;
    idNumber: string;
    plateNumber?: string;
  };
  selectedSchoolId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeView,
  onNavigate,
  onLogout,
  notifications,
  onChangeRole,
  userProfile,
  selectedSchoolId
}) => {
  const selectedSchool = UNIVERSITIES.find(u => u.id === selectedSchoolId) || UNIVERSITIES[0];
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getPendingReviewCount = () => {
    try {
      const stored = localStorage.getItem('campusride_pending_drivers');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {}
    return 0;
  };
  const pendingReviewsCount = getPendingReviewCount();

  const navigateTo = (view: string) => {
    onNavigate(view);
    setIsOpen(false);
  };

  // Define Navigation Items based on active role
  const getNavItems = () => {
    if (currentRole === 'student') {
      return [
        { id: 'booking', label: 'Request Ride', icon: Car, badge: null },
        { id: 'browse_pools', label: 'Browse Active Pools', icon: Compass, badge: null },
        { id: 'dashboard', label: 'Activity Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'profile', label: 'Student Profile', icon: User, badge: null },
        { id: 'settings', label: 'App Settings', icon: Settings, badge: null },
      ];
    } else if (currentRole === 'driver') {
      return [
        { id: 'driver_dashboard', label: 'Shift Dashboard', icon: Gauge, badge: null },
        { id: 'driver_earnings', label: 'Shift Earnings Ledger', icon: TrendingUp, badge: null },
        { id: 'driver_scheduled', label: 'Scheduled Rides', icon: Calendar, badge: null },
        { id: 'driver_settings', label: 'Driver Settings', icon: Settings, badge: null },
      ];
    } else {
      return [
        { id: 'admin_operations', label: 'Operations Command', icon: ShieldAlert, badge: 'Live' },
        { id: 'admin_users', label: 'User Directory', icon: Users, badge: null },
        { id: 'admin_analytics', label: 'Performance Hub', icon: LineChart, badge: null },
        { id: 'admin_reviews', label: 'Reviews', icon: Grid, badge: pendingReviewsCount > 0 ? `${pendingReviewsCount} New` : null },
        { id: 'admin_complaints', label: 'Rider Complaints', icon: AlertTriangle, badge: null },
      ];
    }
  };

  const navItems = getNavItems();

  const getMobileLabel = (id: string, label: string) => {
    switch (id) {
      case 'booking': return 'Request';
      case 'browse_pools': return 'Pools';
      case 'dashboard': return 'Activity';
      case 'notifications': return 'Alerts';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      case 'driver_dashboard': return 'Dashboard';
      case 'driver_earnings': return 'Earnings';
      case 'driver_scheduled': return 'Scheduled';
      case 'driver_settings': return 'Settings';
      case 'admin_operations': return 'Ops';
      case 'admin_users': return 'Users';
      case 'admin_analytics': return 'Analytics';
      case 'admin_reviews': return 'Reviews';
      case 'admin_complaints': return 'Complaints';
      default: return label.split(' ')[0];
    }
  };

  return (
    <>
      {/* Mobile Top Header (Sticky) */}
      <header id="mobile-navigation-bar" className="md:hidden w-full h-16 bg-white border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className={`w-9 h-9 rounded-lg p-0.5 flex items-center justify-center overflow-hidden shrink-0 border ${currentRole === 'driver' ? 'bg-orange-50 border-orange-100 dark:bg-slate-800 dark:border-slate-700' : 'bg-emerald-50 border-emerald-100 dark:bg-slate-800 dark:border-slate-700'}`}>
            <img 
              referrerPolicy="no-referrer"
              src={selectedSchool.logoImage} 
              alt={`${selectedSchool.name} Logo`} 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-[#00875A] text-xs leading-tight block">{selectedSchool.name}</span>
            <span className="text-[9px] text-primary font-bold uppercase tracking-wider font-mono">CampusRide Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Quick toggle mobile indicator */}
          <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full font-mono bg-[#F9FAFB] ${currentRole === 'student' ? 'text-[#00875A]' : currentRole === 'driver' ? 'text-orange-600' : 'text-amber-700'}`}>
            {currentRole}
          </span>
          <button 
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navbar */}
      <nav id="mobile-bottom-navbar" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-150 z-50 flex items-center justify-around px-1 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 relative transition-all cursor-pointer ${
                isActive ? (currentRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]') : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <IconComponent className={`w-5 h-5 transition-transform duration-200 ${isActive ? `scale-110 ${currentRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'}` : 'text-gray-400'}`} />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] font-black h-3.5 min-w-[14px] px-1 rounded-full flex items-center justify-center border border-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] mt-1 tracking-tight text-center truncate max-w-[64px] ${isActive ? `font-bold ${currentRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'}` : 'font-medium text-gray-500'}`}>
                {getMobileLabel(item.id, item.label)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Side Rail Navigation (Container) - Desktop Only */}
      <aside 
        id="side-rail-navigation"
        className="hidden md:flex md:flex-col w-72 bg-white border-r border-gray-100 h-screen shrink-0 justify-between static"
      >
        
        {/* Upper Branding Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className={`w-11 h-11 rounded-xl p-0.5 flex items-center justify-center overflow-hidden shrink-0 border ${currentRole === 'driver' ? 'bg-orange-50 border-orange-100 dark:bg-slate-800 dark:border-slate-700' : 'bg-emerald-50 border-emerald-100 dark:bg-slate-800 dark:border-slate-700'}`}>
              <img 
                referrerPolicy="no-referrer"
                src={selectedSchool.logoImage} 
                alt={`${selectedSchool.name} Logo`} 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-sm text-[#00875A] leading-tight block">
                {selectedSchool.name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#737686] font-bold block mt-0.5">CampusRide Transit</span>
            </div>
          </div>

          {/* User Status Profile Card */}
          <div className={`p-3 rounded-xl border flex items-center space-x-3 ${currentRole === 'driver' ? 'bg-orange-50/50 border-orange-100 dark:bg-slate-800 dark:border-slate-700' : 'bg-emerald-50/50 border-emerald-100 dark:bg-slate-800 dark:border-slate-700'}`}>
            <img 
              referrerPolicy="no-referrer"
              src={userProfile.avatar} 
              alt={userProfile.name} 
              className="w-10 h-10 rounded-full object-cover border border-[#c3c6d7] shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className={`text-sm font-bold truncate ${currentRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'}`}>{userProfile.name}</h4>
              <div className="flex flex-col space-y-0.5">
                <span className={`text-[10px] font-extrabold uppercase font-mono tracking-wider ${currentRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'}`}>
                  {currentRole === 'student' ? 'Rider' : currentRole === 'driver' ? 'Driver' : 'Admin'}
                </span>
                <span className="text-[11px] text-gray-500 font-mono tracking-wide truncate">
                  {currentRole === 'student' 
                    ? `ID: ${userProfile.idNumber || 'STD-2026-6218'}` 
                    : currentRole === 'driver' 
                      ? `Plate: ${userProfile.plateNumber || '4P-928X'}` 
                      : `ID: ${userProfile.idNumber || 'ADM-2026-0001'}`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mid Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2">
          </div>

          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                  isActive 
                    ? `${currentRole === 'driver' ? 'bg-orange-600 shadow-orange-500/20' : 'bg-primary shadow-sage-medium/20'} text-white shadow-md` 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-[#F9FAFB]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold truncate max-w-[80px] ${
                    isActive ? 'bg-white/20 text-white' : `${currentRole === 'driver' ? 'bg-orange-50 text-orange-600' : 'bg-primary-container text-[#00875A]'}`
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Lower Portal Switcher & Action Panel */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
          {/* Log Out Button */}
          <button
            onClick={onLogout}
            className={`w-full h-11 border rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition bg-white cursor-pointer ${
              currentRole === 'driver' 
                ? 'border-gray-200 hover:border-orange-500/20 hover:bg-orange-50 text-orange-600' 
                : 'border-gray-200 hover:border-[#00875A]/20 hover:bg-[#00875A]/10 text-[#00875A]'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
