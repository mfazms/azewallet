import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import type { UserProfile } from '@/types';

const googleProvider = new GoogleAuthProvider();

// ============================================
// Sign Up with Email/Password
// ============================================

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Update profile with display name
  await updateProfile(user, { displayName });

  // Send verification email (mandatory before dashboard access)
  await sendEmailVerification(user);

  // Create initial user document in Firestore
  await createUserDocument(user, displayName);

  return user;
}

// ============================================
// Sign In with Email/Password
// ============================================

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ============================================
// Sign In with Google
// ============================================

export async function signInWithGoogle(): Promise<User | null> {
  try {
    // Try popup first (works on most browsers)
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;

    // Create user document if first login
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserDocument(user, user.displayName || 'User');
    }

    return user;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    // If popup blocked (common on mobile Safari), fallback to redirect
    if (firebaseError.code === 'auth/popup-blocked' || firebaseError.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
      return null; // Will handle on redirect return
    }
    throw error;
  }
}

// Handle redirect result (call on app init)
export async function handleGoogleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await createUserDocument(result.user, result.user.displayName || 'User');
      }
      return result.user;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// Password Reset
// ============================================

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ============================================
// Resend Verification Email
// ============================================

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await sendEmailVerification(user);
  }
}

// ============================================
// Sign Out
// ============================================

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ============================================
// Auth State Listener
// ============================================

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ============================================
// Create User Document in Firestore
// ============================================

async function createUserDocument(user: User, displayName: string): Promise<void> {
  const userProfile: Omit<UserProfile, 'uid'> = {
    email: user.email || '',
    displayName: displayName,
    photoURL: user.photoURL || null,
    preferredLanguage: 'en',
    preferredCurrency: 'IDR',
    monthlyIncome: 0,
    paydayDate: 25,
    budgetCycleStart: 25,
    theme: 'system',
    isOnboardingComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', user.uid), {
    ...userProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Get User Profile from Firestore
// ============================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return { uid, ...userDoc.data() } as UserProfile;
  }
  return null;
}
