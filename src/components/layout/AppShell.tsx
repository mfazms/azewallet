'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useAppStore } from '@/stores';
import { initializeTheme } from '@/stores';
import { onAuthChange, getUserProfile, handleGoogleRedirectResult } from '@/lib/firebase/auth';
import BottomTabBar from './BottomTabBar';
import Toast from '@/components/ui/Toast';
import TransactionComposer from '@/features/transactions/TransactionComposer';

// Pages that don't need auth
const publicPaths = ['/login', '/signup', '/forgot-password', '/verify-email'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setProfile, setLoading, setInitialized, user, profile, isInitialized } = useAuthStore();
  const { isTransactionSheetOpen, setTransactionSheetOpen } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Initialize theme
  useEffect(() => {
    initializeTheme();
    setMounted(true);
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile
        const userProfile = await getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
      setInitialized(true);
    });

    // Handle Google redirect result
    handleGoogleRedirectResult();

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading, setInitialized]);

  // Route protection
  useEffect(() => {
    if (!isInitialized) return;

    const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

    if (!user && !isPublicPath) {
      router.replace('/login');
    } else if (user && !user.emailVerified && pathname !== '/verify-email' && !pathname.startsWith('/login')) {
      // Email not verified — redirect to verification page
      // Exception for Google sign-in users who are auto-verified
      const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
      if (!isGoogleUser) {
        router.replace('/verify-email');
      }
    } else if (user && user.emailVerified && profile && !profile.isOnboardingComplete && pathname !== '/onboarding') {
      router.replace('/onboarding');
    } else if (user && isPublicPath && pathname !== '/verify-email') {
      router.replace('/dashboard');
    }
  }, [user, profile, isInitialized, pathname, router]);

  // Show loading while initializing
  if (!mounted || !isInitialized) {
    return (
      <div className="app-loading">
        <div className="app-loading-content">
          <div className="app-loading-logo">💰</div>
          <div className="app-loading-spinner" />
        </div>

        
      </div>
    );
  }

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname === '/onboarding';
  const showTabBar = !isPublicPath && !isOnboarding && user;

  return (
    <>
      <main>{children}</main>

      {showTabBar && <BottomTabBar />}

      {/* Transaction Composer Bottom Sheet */}
      <TransactionComposer
        isOpen={isTransactionSheetOpen}
        onClose={() => setTransactionSheetOpen(false)}
      />

      {/* Toast Notifications */}
      <Toast />
    </>
  );
}
