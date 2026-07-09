import React, { useState } from 'react';
import { UserRole } from '../types';
import { KeyRound, Mail, UserPlus, LogIn, Car } from 'lucide-react';
import { LOGIN_BG_IMAGE } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface AuthScreensProps {
  onLogin: (role: UserRole, email: string, password?: string) => Promise<void> | void;
  onSignUp: (role: UserRole, name: string, email: string, password?: string, driverInfo?: { carBrand: string; plateNumber: string; carType: string; vehicleId?: string }, idNumber?: string) => Promise<void> | void;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({ onLogin, onSignUp }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [idNumber, setIdNumber] = useState<string>('');
  const [carBrand, setCarBrand] = useState<string>('');
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [carType, setCarType] = useState<'car' | 'keke' | 'shuttle'>('car');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setError('');
  };

  const validateEmail = (inputEmail: string) => {
    const emailLower = inputEmail.toLowerCase().trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower);
  };

  const validatePasswordFormat = (pwd: string): { isValid: boolean; reason?: string } => {
    if (pwd.includes(' ')) {
      return { isValid: false, reason: 'Password must not contain spaces.' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { isValid: false, reason: 'Password must contain at least one capital letter (A-Z).' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { isValid: false, reason: 'Password must contain at least one number (0-9).' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return { isValid: false, reason: 'Password must contain at least one special character or symbol.' };
    }
    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all standard credentials.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please use a valid email address.');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your full name.');
      return;
    }

    if (!isLogin && selectedRole === 'student' && !idNumber) {
      setError('A Student ID number is required (e.g. RUN/XXX/XX/XXXXX).');
      return;
    }

    if (!isLogin && selectedRole === 'driver') {
      if (!carBrand) {
        setError('Please enter your vehicle brand and color.');
        return;
      }
      if (!plateNumber) {
        setError('Please enter your vehicle plate number.');
        return;
      }
      if (!vehicleId) {
        setError('Please enter your vehicle ID.');
        return;
      }
    }

    if (!isLogin) {
      if (!confirmPassword) {
        setError('Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const pwdVal = validatePasswordFormat(password);
      if (!pwdVal.isValid) {
        setError(pwdVal.reason || '');
        return;
      }
    }

    // Auto-detect and permit back-end admin logins if they use an admin-associated email address
    let finalRole = selectedRole;
    if (isLogin && email.toLowerCase().includes('admin')) {
      finalRole = 'admin';
    }

    setLoading(true);
    if (isLogin) {
      Promise.resolve(onLogin(finalRole, email, password))
        .catch((err: any) => {
          setError(err.message || 'An error occurred during sign in.');
        })
        .finally(() => setLoading(false));
    } else {
      Promise.resolve(onSignUp(finalRole, name, email, password, { carBrand, plateNumber, carType, vehicleId }, idNumber))
        .catch((err: any) => {
          setError(err.message || 'An error occurred during sign up.');
        })
        .finally(() => setLoading(false));
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen flex flex-col md:flex-row bg-[#F2F2F2] text-[#175D39] font-sans antialiased overflow-hidden">
      
      {/* Visual Side Banner (Super clean, spacious and empty at the bottom as requested) */}
      <div 
        id="auth-visual-banner"
        className="hidden md:flex md:w-1/2 bg-cover bg-center relative flex-col justify-between p-12 text-white overflow-hidden"
        style={{ backgroundImage: `url(${LOGIN_BG_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#175D39]/95 via-[#175D39]/70 to-[#175D39]/40"></div>
        
        {/* Top Branding Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#175D39] flex items-center justify-center shadow-lg text-white">
            <Car className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-2xl">Campus<span className="text-sky-300">Ride</span></span>
            <div className="text-[10px] tracking-wider uppercase font-semibold text-sky-200">University Transit Portal</div>
          </div>
        </motion.div>

        {/* Dynamic & Empty Middle/Bottom Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative z-10 max-w-lg mb-20"
        >
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
            Intelligent Transit for Campus Commuters
          </h1>
          <p className="mt-4 text-sky-100 text-base leading-relaxed font-light">
            Real-time peer-to-peer verification, instant micro-deposits, and active dispatcher operations.
          </p>
        </motion.div>

        {/* Empty lower layout for minimalist discipline */}
        <div className="relative z-10 text-[11px] text-sky-300/60 font-mono tracking-wider">
          PARKING & TRANSIT INFRASTUCTURE • 2026
        </div>
      </div>

      {/* Action / Input Side */}
      <div id="auth-input-panel" className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 bg-white relative overflow-y-auto">
        
        {/* Small screen top header */}
        <div className="md:hidden flex items-center justify-center space-x-2 mb-8 border-b border-gray-100 pb-4">
          <div className="w-8 h-8 rounded-lg bg-[#175D39] flex items-center justify-center shadow-md">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-xl text-[#175D39]">Campus<span className="text-primary font-extrabold">Ride</span></span>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8">
          
          <motion.div 
            key={`${isLogin ? 'login' : 'register'}-${selectedRole}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl font-extrabold text-[#175D39] tracking-tight">
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className="mt-2 text-sm text-[#737686]">
              {isLogin 
                ? (selectedRole === 'student'
                    ? 'Sign in to request rides, view active shuttles, and commute across campus.'
                    : 'Sign in to accept ride requests, manage your shift schedule, and view earnings.')
                : (selectedRole === 'student'
                    ? 'Join as a rider to search class routes, verify peer IDs, and request quick transits.'
                    : 'Register as a driver to list your vehicle, help peers commute, and complete trips.')
              }
            </p>
          </motion.div>

          {/* Tab Selector for Role (No Admin tab as requested, with beautifully animated sliding marker) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">I'm a</span>
            
            <div className="relative grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl z-0 overflow-hidden">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className="relative py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center z-10 cursor-pointer"
              >
                {selectedRole === 'student' && (
                  <motion.div 
                    layoutId="activeRoleBg"
                    className="absolute inset-0 bg-primary rounded-lg shadow-sm -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`transition-colors duration-200 ${selectedRole === 'student' ? 'text-white' : 'text-gray-600'}`}>
                  Rider
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('driver')}
                className="relative py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center z-10 cursor-pointer"
              >
                {selectedRole === 'driver' && (
                  <motion.div 
                    layoutId="activeRoleBg"
                    className="absolute inset-0 bg-[#175D39] rounded-lg shadow-sm -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`transition-colors duration-200 ${selectedRole === 'driver' ? 'text-white' : 'text-gray-600'}`}>
                  Driver
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#175D39]/10 text-red-700 text-xs p-3.5 rounded-xl border border-[#175D39]/20 font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition"
                />
              </div>
            </div>

            <AnimatePresence>
              {!isLogin && selectedRole === 'student' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">ID Card Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="RUN/XXX/XX/XXXXX"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition uppercase font-mono"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isLogin && selectedRole === 'driver' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden border-l-2 border-[#175D39] pl-3 py-1"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Vehicle Type</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                      {(['keke', 'shuttle', 'car'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCarType(type)}
                          className={`py-2 text-[10px] font-bold rounded-lg capitalize transition-colors ${carType === type ? 'bg-[#175D39] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 bg-transparent'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Vehicle Color & Model</label>
                    <input
                      type="text"
                      value={carBrand}
                      onChange={(e) => setCarBrand(e.target.value)}
                      placeholder="e.g. Silver Toyota Camry"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-600 focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Plate Number</label>
                    <input
                      type="text"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="e.g. 4P-928X"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-600 focus:bg-white transition uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Vehicle ID</label>
                    <input
                      type="text"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      placeholder="e.g. VID-2026-KLM"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-600 focus:bg-white transition uppercase font-mono"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition"
                />
              </div>
              {!isLogin && (
                <p className="text-[10px] text-gray-400 font-medium leading-normal mt-1 block">
                  Password rules: Must contain numbers, symbols, capital letters, and no spaces.
                </p>
              )}
            </div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 mt-4 rounded-xl text-white font-bold tracking-wide text-sm flex items-center justify-center space-x-2 shadow-lg transition-colors cursor-pointer ${
                loading ? 'opacity-70 cursor-not-allowed bg-gray-500' :
                selectedRole === 'student' 
                  ? 'bg-primary hover:bg-[#175D39]' 
                  : 'bg-[#175D39] hover:bg-[#175D39]/90'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
              )}
              <span>
                {loading ? 'Processing...' : 
                 isLogin ? `Log In as ${selectedRole === 'student' ? 'Rider' : 'Driver'}` : `Create ${selectedRole === 'student' ? 'Rider' : 'Driver'} Account`}
              </span>
            </motion.button>
          </form>

          <div id="auth-switcher-footer" className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-xs text-gray-600 font-medium hover:underline inline-flex items-center space-x-1"
            >
              <span>{isLogin ? "Don't have a commuter profile?" : 'Already registered?'}</span>
              <span className="text-primary font-bold">{isLogin ? 'Sign up here' : 'Log in here'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
