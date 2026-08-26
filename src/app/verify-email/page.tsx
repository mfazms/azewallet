'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { resendVerificationEmail, signOut } from '@/lib/firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);

  // Poll for verification status
  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          router.push('/onboarding');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      // ignore
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        router.push('/onboarding');
      }
    }
    setChecking(false);
  };

  return (
    <div className="auth-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-container"
      >
        <div className="auth-header">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="verify-icon"
          >
            <Mail size={40} />
          </motion.div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent a verification link to<br />
            <strong>{user?.email || 'your email'}</strong>
          </p>
        </div>

        <button className="btn-primary" onClick={handleCheckNow} disabled={checking}>
          {checking ? 'Checking...' : 'I\'ve verified my email'}
        </button>

        <button
          className="btn-secondary"
          onClick={handleResend}
          disabled={isResending}
        >
          <RefreshCw size={18} />
          {isResending ? 'Sending...' : resent ? 'Email sent!' : 'Resend verification email'}
        </button>

        <button
          className="btn-ghost"
          onClick={async () => { await signOut(); router.push('/login'); }}
          style={{ marginTop: '0.5rem' }}
        >
          Sign in with different account
        </button>
      </motion.div>

      
    </div>
  );
}
