'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff, Loader2, Zap, X } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // <--- NEW STATE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- SIGN UP LOGIC ---
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        
        await createUserWithEmailAndPassword(auth, email, password);
      }
      
      router.push('/'); // Redirect on success
    } catch (err) {
      const msg = err.message
        .replace('Firebase: ', '')
        .replace('auth/', '')
        .replace(/-/g, ' ')
        .replace('operation not allowed', 'Email/Password sign-in is not enabled in Firebase Console.');
      
      setError(msg.charAt(0).toUpperCase() + msg.slice(1));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (err) {
      setError('Google Sign-In failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4 font-sans">
      
      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 p-10 transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-300/50">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isLogin ? 'Enter your credentials to access your workspace.' : 'Start analyzing your resume in seconds.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-black/5 focus:border-slate-400 outline-none transition-all"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-black/5 focus:border-slate-400 outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field (Only for Sign Up) */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
            <div className="relative">
                <input
                type={showConfirmPassword ? 'text' : 'password'} 
                required={!isLogin}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-black/5 outline-none transition-all pr-10 ${
                    !isLogin && confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-slate-400'
                }`}
                />
                {/* --- NEW TOGGLE BUTTON FOR CONFIRM PASSWORD --- */}
                <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
             
             {!isLogin && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><X className="w-3 h-3"/> Passwords do not match</p>
             )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center animate-pulse">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400">
            <span className="px-3 bg-white/50 backdrop-blur-sm">Or continue with</span>
          </div>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 font-bold transition-all flex items-center justify-center gap-3 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
            <path d="M12 4.66c1.61 0 3.06.55 4.21 1.64l3.16-3.16C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>

        {/* Toggle Login/Signup */}
        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">
            {isLogin ? "New to ResumeLens? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}