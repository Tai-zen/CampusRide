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
  ChevronRight,
  TrendingUp,
  LineChart,
  Grid,
  Menu,
  X,
  RefreshCw,
  Gauge
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

  const navigateTo = (view: string) => {
    onNavigate(view);
    setIsOpen(false);
  };

  // Define Navigation Items based on active role
  const getNavItems = () => {
    if (currentRole === 'student') {
      return [
        { id: 'booking', label: 'Request Ride', icon: Car, badge: null },
        { id: 'dashboard', label: 'Activity Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'notifications', label: 'Notifications Inbox', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
        { id: 'payments', label: 'Wallet & Payments', icon: Wallet, badge: null },
        { id: 'profile', label: 'Student Profile', icon: User, badge: null },
        { id: 'settings', label: 'App Settings', icon: Settings, badge: null },
      ];
    } else if (currentRole === 'driver') {
      return [
        { id: 'driver_dashboard', label: 'Shift Dashboard', icon: Gauge, badge: null },
        { id: 'driver_earnings', label: 'Earnings Ledger', icon: Wallet, badge: null },
        { id: 'driver_settings', label: 'Driver Settings', icon: Settings, badge: null },
      ];
    } else {
      return [
        { id: 'admin_operations', label: 'Operations Command', icon: ShieldAlert, badge: 'Live' },
        { id: 'admin_analytics', label: 'Performance Hub', icon: LineChart, badge: null },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Top Header (Sticky) */}
      <header id="mobile-navigation-bar" className="md:hidden w-full h-16 bg-white border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 p-1 flex items-center justify-center shrink-0">
            <img 
              referrerPolicy="no-referrer"
              src={selectedSchool.logoImage} 
              alt={`${selectedSchool.name} Logo`} 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-[#0b1c30] text-xs leading-tight block">{selectedSchool.name}</span>
            <span className="text-[9px] text-primary font-bold uppercase tracking-wider font-mono">CampusRide Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick toggle mobile indicator */}
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${currentRole === 'student' ? 'bg-[#e5eeff] text-primary' : currentRole === 'driver' ? 'bg-[#ffddb8] text-[#855300]' : 'bg-[#dce9ff] text-[#0b1c30]'}`}>
            {currentRole}
          </span>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#0b1c30]/40 z-40 md:hidden backdrop-blur-xs" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Rail Navigation (Container) */}
      <aside 
        id="side-rail-navigation"
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-100 flex flex-col justify-between transform transition-transform duration-300 md:translate-x-0 md:static md:h-screen shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        
        {/* Upper Branding Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center shadow-sm shrink-0">
              <img 
                referrerPolicy="no-referrer"
                src={selectedSchool.logoImage} 
                alt={`${selectedSchool.name} Logo`} 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-sm text-[#0b1c30] leading-tight block">
                {selectedSchool.name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#737686] font-bold block mt-0.5">CampusRide Transit</span>
            </div>
          </div>

          {/* User Status Profile Card */}
          <div className="bg-[#f8f9ff] p-3 rounded-xl border border-gray-100 flex items-center space-x-3">
            <img 
              referrerPolicy="no-referrer"
              src={userProfile.avatar} 
              alt={userProfile.name} 
              className="w-10 h-10 rounded-full object-cover border border-[#c3c6d7] shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[#0b1c30] truncate">{userProfile.name}</h4>
              <div className="flex flex-col space-y-0.5">
                <span className="text-[10px] font-extrabold text-[#004ac6] uppercase font-mono tracking-wider">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-blue-100' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-[#f8f9ff]'
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
                    isActive ? 'bg-white/25 text-white' : 'bg-primary-container text-[#0b1c30]'
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
            className="w-full h-11 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition bg-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
