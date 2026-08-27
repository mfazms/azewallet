'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Moon, Sun, User as UserIcon, Monitor, ChevronRight, Camera, Calendar } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { signOut, updateUserPhotoURL } from '@/lib/firebase/auth';
import { uploadProfilePhoto } from '@/lib/firebase/storage';
import { updateUserProfile } from '@/lib/firebase/firestore';
import type { ThemeMode } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, setProfile } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUpdatingPayday, setIsUpdatingPayday] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out', err);
      setIsSigningOut(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const photoURL = await uploadProfilePhoto(user.uid, file);
      await updateUserPhotoURL(user.uid, photoURL);
      // Wait for auth listener to pick up change, or manually trigger reload if needed.
      // The auth listener in AppShell will automatically update useAuthStore when Firebase detects profile change.
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaydayChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user || !profile) return;
    const newDate = parseInt(e.target.value, 10);
    setIsUpdatingPayday(true);
    try {
      await updateUserProfile(user.uid, { budgetCycleStart: newDate });
      setProfile({ ...profile, budgetCycleStart: newDate });
    } catch (err) {
      console.error('Error updating payday:', err);
    } finally {
      setIsUpdatingPayday(false);
    }
  };

  const displayName = profile?.displayName || user?.displayName || 'User';

  return (
    <div className="page-container">
      <div className="settings-page">
        <header className="settings-header">
          <h1 className="text-h1">Settings</h1>
        </header>

        {/* Profile Card */}
        <div className="settings-profile solid-card">
          <label className="settings-avatar" style={{ cursor: 'pointer', position: 'relative' }}>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
              disabled={isUploading}
            />
            {profile?.photoURL || user?.photoURL ? (
              <img 
                src={profile?.photoURL || user?.photoURL || ''} 
                alt="Profile" 
                style={{ opacity: isUploading ? 0.5 : 1, width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span style={{ opacity: isUploading ? 0.5 : 1 }}>{displayName.charAt(0).toUpperCase()}</span>
            )}
            <div className="settings-avatar-overlay">
              <Camera size={20} color="#fff" />
            </div>
          </label>
          <div className="settings-profile-info">
            <h2 className="text-h3">{displayName}</h2>
            <p className="text-caption">{user?.email}</p>
          </div>
          <button className="settings-edit-btn">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Preferences Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Preferences</h3>
          <div className="settings-group solid-card">
            
            {/* Theme Toggle */}
            <div className="settings-item">
              <div className="settings-item-icon"><Moon size={18} /></div>
              <span className="settings-item-label">Theme</span>
              <div className="theme-toggle">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
                  <button
                    key={t}
                    className={`theme-btn ${theme === t ? 'theme-btn-active' : ''}`}
                    onClick={() => setTheme(t)}
                    aria-label={`Set theme to ${t}`}
                  >
                    {t === 'light' ? <Sun size={14} /> : t === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-divider" />

            {/* Payday Setting */}
            <div className="settings-item">
              <div className="settings-item-icon"><Calendar size={18} /></div>
              <span className="settings-item-label">Payday (Cycle Start)</span>
              <select
                value={profile?.budgetCycleStart || 1}
                onChange={handlePaydayChange}
                disabled={isUpdatingPayday}
                className="theme-btn"
                style={{ 
                  background: 'var(--color-input-bg)', 
                  border: 'none', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '4px 8px',
                  color: 'var(--color-text)',
                  fontSize: '15px'
                }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-divider" />

            {/* Account Settings (Placeholder) */}
            <button className="settings-item settings-item-action">
              <div className="settings-item-icon"><UserIcon size={18} /></div>
              <span className="settings-item-label">Account details</span>
              <ChevronRight size={18} className="settings-item-arrow" />
            </button>

          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section">
          <div className="settings-group solid-card">
            <button
              className="settings-item settings-item-action settings-logout"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <div className="settings-item-icon" style={{ background: 'var(--color-expense-bg)', color: 'var(--color-expense)' }}>
                <LogOut size={18} />
              </div>
              <span className="settings-item-label" style={{ color: 'var(--color-expense)' }}>
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          </div>
        </div>
      </div>

      
    </div>
  );
}
