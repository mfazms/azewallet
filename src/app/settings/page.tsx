'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Moon, Sun, User as UserIcon, Monitor, ChevronRight } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { signOut } from '@/lib/firebase/auth';
import type { ThemeMode } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const displayName = profile?.displayName || user?.displayName || 'User';

  return (
    <div className="page-container">
      <div className="settings-page">
        <header className="settings-header">
          <h1 className="text-h1">Settings</h1>
        </header>

        {/* Profile Card */}
        <div className="settings-profile solid-card">
          <div className="settings-avatar">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
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
