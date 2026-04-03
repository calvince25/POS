import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden"
      style={{
        backgroundImage: 'url("/login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Logo & Title */}
      <div className="relative z-10 mb-6 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-14 h-14 bg-[#2271b1] text-white flex items-center justify-center shadow-lg mb-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v18H3zM12 8v8m-4-4h8"/>
          </svg>
        </motion.div>
        <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">RestoPOS</h1>
        <p className="text-[11px] text-white/60 mt-0.5 tracking-widest uppercase">Management System</p>
      </div>

      {/* Login Card — WordPress sharp style */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[320px] bg-white border border-[#dcdcde] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#3c434a]">Username or ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-3 py-2 bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]/30 outline-none text-sm transition-all rounded-sm text-[#1d2327]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#3c434a]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]/30 outline-none text-sm transition-all rounded-sm text-[#1d2327]"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-[#d63638] bg-red-50 border-l-4 border-[#d63638] p-2 rounded-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-[#3c434a] font-medium cursor-pointer">
              <input type="checkbox" className="rounded-sm border-slate-300 text-[#2271b1] focus:ring-[#2271b1]" />
              <span>Remember Me</span>
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#2271b1] hover:bg-[#135e96] disabled:opacity-60 text-white px-4 py-1.5 rounded-sm text-sm font-bold shadow-sm active:scale-95 transition-all"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>
      </motion.div>

      <div className="relative z-10 mt-5 flex space-x-4">
        <span className="text-xs text-white/40">Powered by RestoPOS</span>
      </div>
    </div>
  );
};

export default Login;
