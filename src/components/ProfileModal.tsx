import React, { useState, useEffect } from 'react';
import { User, Heart, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Profile } from '../types';

interface ProfileModalProps {
  profile?: Profile | null; // If null, we are adding. If provided, we are editing.
  token: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ProfileModal({ profile, token, onClose, onSave }: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState('Female');
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(60);
  const [activityLevel, setActivityLevel] = useState('moderately_active');
  const [pregnancyStatus, setPregnancyStatus] = useState('none');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [lifestylePreferences, setLifestylePreferences] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(profile.age);
      setGender(profile.gender);
      setHeight(profile.height);
      setWeight(profile.weight);
      setActivityLevel(profile.activity_level);
      setPregnancyStatus(profile.pregnancy_status || 'none');
      setMedicalHistory(profile.medical_history || '');
      setAllergies(profile.allergies || '');
      setLifestylePreferences(profile.lifestyle_preferences || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body = {
      id: profile?.id,
      name,
      age,
      gender,
      height,
      weight,
      activity_level: activityLevel,
      pregnancy_status: pregnancyStatus,
      medical_history: medicalHistory,
      allergies,
      lifestyle_preferences: lifestylePreferences,
    };

    const endpoint = profile ? '/api/profile/update' : '/api/profile/add';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#FBF9F6] rounded-[2.5rem] border border-stone-200/80 shadow-2xl overflow-y-auto max-h-[90vh] p-6 md:p-10">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 transition-colors"
          id="profile-modal-close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-900">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-serif font-medium text-emerald-950">
              {profile ? 'Edit Family Member Profile' : 'Add Family Member'}
            </h3>
            <p className="text-sm text-stone-500">
              {profile ? 'Update biometrics and preferences.' : 'Track health and report analysis for another relative.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl" id="profile-error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 ml-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grandma, David, Jane"
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all"
                id="profile-name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 ml-1">Age (Years)</label>
              <input
                type="number"
                required
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value))}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all"
                id="profile-age"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 ml-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-3 text-stone-800 focus:outline-none focus:ring-2"
                id="profile-gender"
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
                onChange={(e) => setHeight(parseFloat(e.target.value))}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none"
                id="profile-height"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 ml-1">Weight (kg)</label>
              <input
                type="number"
                required
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none"
                id="profile-weight"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 ml-1">Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-3 text-stone-800 focus:outline-none"
                id="profile-activity"
              >
                <option value="sedentary">Sedentary (No regular workout)</option>
                <option value="lightly_active">Lightly Active (1-3 days/wk)</option>
                <option value="moderately_active">Moderately Active (3-5 days/wk)</option>
                <option value="very_active">Very Active (Heavy sports/6-7 days/wk)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 ml-1">Pregnancy / Lactation Status</label>
              <select
                value={pregnancyStatus}
                onChange={(e) => setPregnancyStatus(e.target.value)}
                disabled={gender.toLowerCase() === 'male'}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-3 text-stone-800 focus:outline-none disabled:bg-stone-100"
                id="profile-pregnancy"
              >
                <option value="none">Not Applicable</option>
                <option value="pregnant">Currently Pregnant</option>
                <option value="lactating">Currently Lactating / Nursing</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-500 flex items-center gap-1 ml-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" /> Existing Medical History
            </label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="e.g. Type 2 Diabetes, High Blood Pressure, Thyroid, etc. (Separate with commas)"
              rows={2}
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all placeholder:text-stone-300"
              id="profile-medical-history"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 flex items-center gap-1 ml-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Allergies
              </label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Lactose, Gluten"
                rows={2}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none placeholder:text-stone-300"
                id="profile-allergies"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 flex items-center gap-1 ml-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600" /> Lifestyle &amp; Dietary Preferences
              </label>
              <textarea
                value={lifestylePreferences}
                onChange={(e) => setLifestylePreferences(e.target.value)}
                placeholder="e.g. Vegetarian, Keto, Gluten-Free, Intermittent Fasting"
                rows={2}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none placeholder:text-stone-300"
                id="profile-lifestyle"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-200/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 font-medium text-stone-600 transition-colors cursor-pointer"
              id="profile-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-emerald-900 text-white font-medium hover:bg-emerald-800 transition-all shadow disabled:bg-stone-300 flex items-center gap-1 cursor-pointer"
              id="profile-save-btn"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
