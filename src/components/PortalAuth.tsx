import React, { useState } from 'react';
import { Leaf, Lock, Mail, User, Shield, HelpCircle, ArrowRight } from 'lucide-react';

interface PortalAuthProps {
  onSuccess: (token: string, user: any, profile: any) => void;
  onClose: () => void;
}

export default function PortalAuth({ onSuccess, onClose }: PortalAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState('Female');
  const [height, setHeight] = useState('165');
  const [weight, setWeight] = useState('60');
  const [activityLevel, setActivityLevel] = useState('moderately_active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin
      ? { email, password }
      : { email, password, name, age, gender, height, weight, activityLevel };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onSuccess(data.token, data.user, data.profile);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-[#FBF9F6] rounded-[2rem] border border-stone-200/80 shadow-2xl overflow-hidden p-6 md:p-10">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 transition-colors"
          id="auth-close-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center text-white mx-auto mb-3">
            <Leaf className="w-5 h-5" />
          </div>
          <h2 className="text-3xl font-medium text-emerald-950 tracking-tight">
            {isLogin ? 'Access Your Health Portal' : 'Begin Your Health Journey'}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            {isLogin
              ? 'Sign in to access your analysis, timelines, and chat.'
              : 'Create your primary family member profile and account.'}
          </p>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl" id="auth-error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 ml-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all placeholder:text-stone-300"
                placeholder="you@example.com"
                id="auth-email-input"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 ml-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all placeholder:text-stone-300"
                placeholder="••••••••"
                id="auth-password-input"
              />
            </div>
          </div>

          {/* Registration Fields */}
          {!isLogin && (
            <div className="space-y-4 pt-2 border-t border-stone-200/50 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-500 ml-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all placeholder:text-stone-300"
                      placeholder="Jane Doe"
                      id="auth-name-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-500 ml-1">Age</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all"
                    placeholder="30"
                    id="auth-age-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-500 ml-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-2 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10"
                    id="auth-gender-select"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-500 ml-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2"
                    id="auth-height-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-500 ml-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2"
                    id="auth-weight-input"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500 ml-1">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10"
                  id="auth-activity-select"
                >
                  <option value="sedentary">Sedentary (Little/no exercise)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                  <option value="very_active">Very Active (6-7 days/week)</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-900 text-white font-medium text-lg py-3.5 rounded-xl mt-4 hover:bg-emerald-800 transition-all shadow-md hover:shadow-lg disabled:bg-stone-300 flex items-center justify-center gap-2 cursor-pointer"
            id="auth-submit-btn"
          >
            {loading ? 'Processing...' : isLogin ? 'Access Portal' : 'Register Account'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          <span className="text-stone-500">
            {isLogin ? "New to Nirva Health? " : "Already have an account? "}
          </span>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-800 font-semibold hover:underline"
            id="auth-toggle-mode-btn"
          >
            {isLogin ? 'Register Here' : 'Log In Here'}
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-stone-400 mt-8 pt-4 border-t border-stone-200/50">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-800" /> Secure HIPAA Storage
          </span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> 256-bit Encryption
          </span>
        </div>

      </div>
    </div>
  );
}
