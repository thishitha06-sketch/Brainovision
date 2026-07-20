import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.tsx';
import PortalAuth from './components/PortalAuth.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProfileModal from './components/ProfileModal.tsx';
import { Profile } from './types.ts';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  
  // UI Dialog Controls
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfileTarget, setEditProfileTarget] = useState<Profile | null>(null);

  // Load session from localStorage on boot (Remember Login)
  useEffect(() => {
    const savedToken = localStorage.getItem('nirva_token');
    const savedUser = localStorage.getItem('nirva_user');
    const savedProfile = localStorage.getItem('nirva_profile');

    if (savedToken && savedUser && savedProfile) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setActiveProfile(JSON.parse(savedProfile));
      } catch (err) {
        console.error('Error hydrating session from localStorage', err);
        handleLogout();
      }
    }
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: any, newProfile: any) => {
    setToken(newToken);
    setUser(newUser);
    setActiveProfile(newProfile);
    setShowAuth(false);

    localStorage.setItem('nirva_token', newToken);
    localStorage.setItem('nirva_user', JSON.stringify(newUser));
    localStorage.setItem('nirva_profile', JSON.stringify(newProfile));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveProfile(null);
    setShowAuth(false);
    setShowProfileModal(false);
    setEditProfileTarget(null);

    localStorage.removeItem('nirva_token');
    localStorage.removeItem('nirva_user');
    localStorage.removeItem('nirva_profile');
  };

  const handleTriggerEditProfile = (profile: Profile) => {
    setEditProfileTarget(profile);
    setShowProfileModal(true);
  };

  const handleTriggerAddProfile = () => {
    setEditProfileTarget(null);
    setShowProfileModal(true);
  };

  const handleProfileSaveSuccess = async () => {
    setShowProfileModal(false);
    setEditProfileTarget(null);

    // Refresh active profiles list from server
    if (token) {
      try {
        const res = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.profiles && data.profiles.length > 0) {
          // If we edited active profile, or added a profile, keep the matching active one or switch to first
          const updatedActive = data.profiles.find((p: Profile) => p.id === activeProfile?.id);
          const newActive = updatedActive || data.profiles[data.profiles.length - 1];
          setActiveProfile(newActive);
          localStorage.setItem('nirva_profile', JSON.stringify(newActive));
        }
      } catch (err) {
        console.error('Error reloading profiles after save', err);
      }
    }
  };

  return (
    <div className="min-h-screen text-stone-800" id="nirva-app-root">
      
      {/* RENDER LOGGED-IN PORTAL VS LANDING PAGE */}
      {token && user && activeProfile ? (
        <Dashboard
          user={user}
          initialProfile={activeProfile}
          token={token}
          onLogout={handleLogout}
          onEditProfile={handleTriggerEditProfile}
          onAddProfile={handleTriggerAddProfile}
        />
      ) : (
        <LandingPage onOpenPortal={() => setShowAuth(true)} />
      )}

      {/* Auth Portal Modal Dialog */}
      {showAuth && (
        <PortalAuth
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Profile Modification Modal Dialog */}
      {showProfileModal && (
        <ProfileModal
          profile={editProfileTarget}
          token={token!}
          onClose={() => {
            setShowProfileModal(false);
            setEditProfileTarget(null);
          }}
          onSave={handleProfileSaveSuccess}
        />
      )}

    </div>
  );
}
