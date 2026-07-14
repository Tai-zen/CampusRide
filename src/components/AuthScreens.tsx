import React, { useState } from 'react';
import { UserRole } from '../types';
import { KeyRound, Mail, UserPlus, LogIn, Car, ClipboardCheck, Clock, Check } from 'lucide-react';
import { LOGIN_BG_IMAGE } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface AuthScreensProps {
  onLogin: (role: UserRole, email: string, password?: string) => Promise<void> | void;
  onSignUp: (role: UserRole, name: string, email: string, password?: string, driverInfo?: { carBrand: string; plateNumber: string; carType: string; vehicleId?: string }, idNumber?: string) => Promise<void> | void;
  onGoogleSignIn?: () => Promise<void> | void;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({ onLogin, onSignUp, onGoogleSignIn }) => {
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
  const [driverSuccessDetails, setDriverSuccessDetails] = useState<{ name: string; email: string; vehicleId: string } | null>(null);

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
    if (isLogin && (email.toLowerCase().includes('admin') || email.toLowerCase().trim() === 'wywsk64571@minitts.net')) {
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
        .then(() => {
          if (finalRole === 'driver') {
            setDriverSuccessDetails({
              name,
              email: email.toLowerCase().trim(),
              vehicleId: vehicleId || 'DRV-2024-8839'
            });
          }
        })
        .catch((err: any) => {
          setError(err.message || 'An error occurred during sign up.');
        })
        .finally(() => setLoading(false));
    }
  };

  return (
    <div id="auth-screen-container" className={`min-h-screen flex flex-col md:flex-row bg-[#F9FAFB] ${selectedRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'} font-sans antialiased overflow-hidden`}>
      
      {/* Visual Side Banner (Super clean, spacious and empty at the bottom as requested) */}
      <div 
        id="auth-visual-banner"
        className="hidden md:flex md:w-1/2 bg-cover bg-center relative flex-col justify-between p-12 text-white overflow-hidden"
        style={{ backgroundImage: `url(${LOGIN_BG_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#00875A]/95 via-[#00875A]/70 to-[#00875A]/40"></div>
        
        {/* Top Branding Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center space-x-3"
        >
          <div className={`w-10 h-10 rounded-xl transition-colors duration-500 ${selectedRole === 'driver' ? 'bg-orange-500' : 'bg-[#00875A]'} flex items-center justify-center shadow-lg text-white`}>
            <Car className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-2xl">Campus<span className="text-emerald-300">Ride</span></span>
            <div className="text-[10px] tracking-wider uppercase font-semibold text-emerald-200">University Transit Portal</div>
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
          <p className="mt-4 text-emerald-100 text-base leading-relaxed font-light">
            Real-time peer-to-peer verification, instant micro-deposits, and active dispatcher operations.
          </p>
        </motion.div>

        {/* Empty lower layout for minimalist discipline */}
        <div className="relative z-10 text-[11px] text-emerald-300/60 font-mono tracking-wider">
          PARKING & TRANSIT INFRASTUCTURE • 2026
        </div>
      </div>

      {/* Action / Input Side */}
      <div id="auth-input-panel" className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 bg-white relative overflow-y-auto">
        
        {/* Small screen top header */}
        <div className="md:hidden flex items-center justify-center space-x-2 mb-8 border-b border-gray-100 pb-4">
          <div className={`w-8 h-8 rounded-lg transition-colors duration-500 ${selectedRole === 'driver' ? 'bg-orange-500' : 'bg-[#00875A]'} flex items-center justify-center shadow-md`}>
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className={`font-bold tracking-tight text-xl transition-colors duration-500 ${selectedRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'}`}>Campus<span className={`${selectedRole === 'driver' ? 'text-orange-500' : 'text-primary'} font-extrabold`}>Ride</span></span>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8">
          {driverSuccessDetails ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 text-slate-800"
            >
              {/* Success Icon Header */}
              <div className="flex flex-col items-center text-center space-y-3 pb-2">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Application Received!
                </h2>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                  Your CampusRide driver account has been created successfully. It is currently awaiting administrative verification.
                </p>
              </div>

              {/* Application Details Card */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Profile Details</span>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-100 flex items-center uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                    Pending Approval
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                  <div>
                    <div className="text-slate-400 font-medium">Driver Name</div>
                    <div className="text-slate-800 font-bold mt-0.5">{driverSuccessDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Email Address</div>
                    <div className="text-slate-800 font-bold mt-0.5 truncate" title={driverSuccessDetails.email}>{driverSuccessDetails.email}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Vehicle ID</div>
                    <div className="text-slate-800 font-mono font-bold mt-0.5">{driverSuccessDetails.vehicleId}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Access Status</div>
                    <div className="text-amber-600 font-bold mt-0.5">Awaiting Activation</div>
                  </div>
                </div>
              </div>

              {/* Workflow Process */}
              <div className="space-y-3 pt-2 text-left">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Verification Process</h3>
                
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Account Created</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">Your profile credentials have been safely created in the secure directory.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Administrator Review</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">The Admin will review your vehicle and license details in the "Reviews" operations panel.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <div className="font-bold text-slate-400">Instant Activation</div>
                      <p className="text-slate-400 text-[11px] mt-0.5">Upon approval, your login lock is lifted and you can sign in to begin accepting ride requests.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA / Action Button */}
              <div className="pt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const savedEmail = driverSuccessDetails.email;
                    setDriverSuccessDetails(null);
                    setIsLogin(true);
                    setSelectedRole('driver');
                    setError('');
                    setEmail(savedEmail); // Auto-fill the email for convenience
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold tracking-wide text-xs uppercase rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-orange-600/10 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <>
          
          <motion.div 
            key={`${isLogin ? 'login' : 'register'}-${selectedRole}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className={`text-3xl font-extrabold tracking-tight transition-colors duration-500 ${selectedRole === 'driver' ? 'text-orange-600' : 'text-[#00875A]'}`}>
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
                    className="absolute inset-0 bg-orange-600 rounded-lg shadow-sm -z-10"
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
                  className={error.startsWith('SUCCESS:')
                    ? "bg-emerald-50 text-emerald-800 text-xs p-4 rounded-xl border border-emerald-100 font-medium whitespace-pre-line leading-relaxed"
                    : "bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-100 font-medium"
                  }
                >
                  {error.startsWith('SUCCESS:') ? error.replace('SUCCESS:', '').trim() : error}
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
                      className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white transition ${selectedRole === 'driver' ? 'focus:border-orange-500' : 'focus:border-primary'}`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                {isLogin ? 'ID Number (Registered ID / Email)' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type={isLogin ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isLogin ? "e.g. RUN/2022/10432 or email" : "name@domain.com"}
                  className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white transition ${selectedRole === 'driver' ? 'focus:border-orange-500' : 'focus:border-primary'}`}
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
                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white transition uppercase font-mono ${selectedRole === 'driver' ? 'focus:border-orange-500' : 'focus:border-primary'}`}
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
                  className="space-y-4 overflow-hidden border-l-2 border-orange-500 pl-3 py-1"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Vehicle Type</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                      {(['keke', 'shuttle', 'car'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCarType(type)}
                          className={`py-2 text-[10px] font-bold rounded-lg capitalize transition-colors ${carType === type ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 bg-transparent'}`}
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
                  <button type="button" className={`text-xs font-semibold hover:underline bg-transparent border-none cursor-pointer ${selectedRole === 'driver' ? 'text-orange-600' : 'text-primary'}`}>
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
                  className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white transition ${selectedRole === 'driver' ? 'focus:border-orange-500' : 'focus:border-primary'}`}
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
                      className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white transition ${selectedRole === 'driver' ? 'focus:border-orange-500' : 'focus:border-primary'}`}
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
                  ? 'bg-primary hover:bg-[#00875A]' 
                  : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/10'
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

          {isLogin && onGoogleSignIn && (
            <div className="mt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full mt-2 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48c0,-0.61 -0.06,-1.2 -0.16,-1.72Z" fill="#4285f4" />
                    <path d="M12,20.6c2.59,0 4.77,-0.86 6.36,-2.3l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.06,0.98c-2.37,0 -4.38,-1.6 -5.1,-3.75H3.5v2.66c1.58,3.14 4.83,5.3 8.5,5.3Z" fill="#34a853" />
                    <path d="M6.9,13.1c-0.18,-0.55 -0.28,-1.13 -0.28,-1.73s0.1,-1.18 0.28,-1.73V6.98H3.5a8.88,8.88 0 0,0 0,7.84L6.9,13.1Z" fill="#fbbc05" />
                    <path d="M12,6.38c1.41,0 2.68,0.49 3.68,1.44l2.76,-2.76C16.77,3.52 14.59,3 12,3c-3.67,0 -6.92,2.16 -8.5,5.3l3.4,2.66c0.72,-2.15 2.73,-3.75 5.1,-3.75Z" fill="#ea4335" />
                  </g>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
