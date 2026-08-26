import { create } from 'zustand';
import { User } from 'firebase/auth';
import type {
  UserProfile, Account, Transaction, Category,
  Budget, Goal, DashboardSummary, ThemeMode,
} from '@/types';

// ============================================
// Auth Store
// ============================================

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));

// ============================================
// App Store (UI state, accounts, transactions)
// ============================================

interface AppState {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Dashboard Summary (cached)
  dashboardSummary: DashboardSummary | null;
  setDashboardSummary: (summary: DashboardSummary | null) => void;

  // Accounts
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;

  // Transactions
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;

  // Categories
  categories: Category[];
  setCategories: (categories: Category[]) => void;

  // Budget
  currentBudget: Budget | null;
  setCurrentBudget: (budget: Budget | null) => void;

  // Goals
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;

  // UI State
  isTransactionSheetOpen: boolean;
  setTransactionSheetOpen: (open: boolean) => void;

  // Toast
  toast: { message: string; action?: () => void; actionLabel?: string } | null;
  showToast: (message: string, action?: () => void, actionLabel?: string) => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },

  // Dashboard Summary
  dashboardSummary: null,
  setDashboardSummary: (dashboardSummary) => set({ dashboardSummary }),

  // Accounts
  accounts: [],
  setAccounts: (accounts) => set({ accounts }),

  // Transactions
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  // Categories
  categories: [],
  setCategories: (categories) => set({ categories }),

  // Budget
  currentBudget: null,
  setCurrentBudget: (currentBudget) => set({ currentBudget }),

  // Goals
  goals: [],
  setGoals: (goals) => set({ goals }),

  // UI State
  isTransactionSheetOpen: false,
  setTransactionSheetOpen: (isTransactionSheetOpen) => set({ isTransactionSheetOpen }),

  // Toast
  toast: null,
  showToast: (message, action, actionLabel) => {
    set({ toast: { message, action, actionLabel } });
    // Auto-hide after 5 seconds
    setTimeout(() => set({ toast: null }), 5000);
  },
  hideToast: () => set({ toast: null }),
}));

// ============================================
// Theme Helper
// ============================================

function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }

  // Store preference
  localStorage.setItem('theme', theme);
}

// Initialize theme from localStorage or system preference
export function initializeTheme() {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('theme') as ThemeMode | null;
  const theme = stored || 'system';

  applyTheme(theme);
  useAppStore.getState().setTheme(theme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useAppStore.getState().theme === 'system') {
      applyTheme('system');
    }
  });
}
