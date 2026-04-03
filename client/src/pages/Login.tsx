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
      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/50 backdrop-brightness-75" />

      <div className="relative z-10 mb-8 flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 bg-[#2271b1] text-white flex items-center justify-center shadow-2xl mb-4 rounded-xl border border-white/20"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM12 8v8m-4-4h8"/></svg>
        </motion.div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg">RestoPOS</h1>
        <p className="text-[10px] font-black tracking-[0.3em] text-white/60 uppercase">Professional Management Terminal</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[360px] bg-white/10 backdrop-blur-2xl border border-white/20 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl relative overflow-hidden"
      >
        {/* Subtle Shine Effect */}
        <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-12 pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Username or ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your credentials"
              className="w-full px-4 py-3 bg-white/10 border border-white/10 focus:border-[#2271b1] focus:ring-2 focus:ring-[#2271b1]/20 outline-none text-sm transition-all rounded-xl text-white placeholder:text-white/30"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/10 border border-white/10 focus:border-[#2271b1] focus:ring-2 focus:ring-[#2271b1]/20 outline-none text-sm transition-all rounded-xl text-white placeholder:text-white/30"
                required
              />
              <button 
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                 {showPassword ? (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                 ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[11px] font-bold text-white bg-red-500/30 border border-red-500/50 backdrop-blur-md rounded-lg p-3 text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2271b1] hover:bg-[#135e96] text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "System Access Log In"}
            </button>
            
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center space-x-2 text-[10px] text-white/60 font-black uppercase tracking-tighter cursor-pointer group">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 text-[#2271b1] focus:ring-[#2271b1]" />
                <span className="group-hover:text-white transition-colors">Remember Session</span>
              </label>
              <button 
                type="button"
                className="text-[10px] text-white/60 hover:text-white font-black uppercase tracking-tighter transition-colors"
              >
                Help?
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      <div className="relative z-10 mt-10 flex items-center space-x-6">
        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Lost Password</button>
        <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
        <button onClick={() => navigate('/')} className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">← Exit Terminal</button>
      </div>
    </div>
  );
};

export default Login;
