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
    <div className="min-h-screen bg-[#f0f0f1] dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#2271b1] text-white flex items-center justify-center shadow-lg mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM12 8v8m-4-4h8"/></svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1d2327] dark:text-white tracking-tight">RestoPOS</h1>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[320px] bg-white dark:bg-slate-900 border border-[#dcdcde] dark:border-slate-800 p-6 shadow-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#3c434a] dark:text-slate-400">Username or ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#8c8f94] dark:border-slate-700 focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-none text-sm transition-all rounded-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#3c434a] dark:text-slate-400">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#8c8f94] dark:border-slate-700 focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-none text-sm transition-all rounded-sm"
                required
              />
              <button 
                type="button"
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                 {showPassword ? (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                 ) : (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-[#d63638] bg-red-50 border-l-4 border-[#d63638] p-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2 text-xs text-[#3c434a] font-medium cursor-pointer">
              <input type="checkbox" className="rounded-sm border-slate-300 text-[#2271b1] focus:ring-[#2271b1]" />
              <span>Remember Me</span>
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#2271b1] hover:bg-[#135e96] text-white px-4 py-1.5 rounded-sm text-sm font-bold shadow-sm active:scale-95 transition-all"
            >
              {isLoading ? "..." : "Log In"}
            </button>
          </div>
        </form>
      </motion.div>

      <div className="mt-6 flex space-x-4">
        <button className="text-xs text-[#2271b1] hover:text-[#135e96]">Lost your password?</button>
        <span className="text-slate-300">|</span>
        <button onClick={() => navigate('/')} className="text-xs text-[#2271b1] hover:text-[#135e96]">← Go to Dashboard</button>
      </div>
    </div>
  );
};

export default Login;
