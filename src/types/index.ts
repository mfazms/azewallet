// ============================================
// Core Type Definitions
// ============================================

export type TransactionType = 'expense' | 'income' | 'transfer' | 'transfer_in' | 'transfer_out';
export type AccountType = 'bank' | 'credit_card' | 'ewallet' | 'cash' | 'investment' | 'other';
export type GoalType = 'save' | 'debt' | 'purchase';
export type Currency = 'IDR' | 'USD' | 'EUR' | 'JPY' | 'SGD' | 'MYR';
export type Language = 'id' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';

// ============================================
// User
// ============================================

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  preferredLanguage: Language;
  preferredCurrency: Currency;
  monthlyIncome: number;
  paydayDate: number; // 1-31
  budgetCycleStart: number; // 1-31
  theme: ThemeMode;
  isOnboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Account
// ============================================

export interface Account {
  id: string;
  name: string;
  bankName: string;
  type: AccountType;
  last4: string;
  color: string;
  gradient: string;
  icon: string;
  balance: number;
  currency: Currency;
  // Credit card specific
  creditLimit?: number;
  creditUsed?: number;
  creditAvailable?: number;
  statementDate?: number;
  dueDate?: number;
  // Meta
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Transaction
// ============================================

export interface Transaction {
  id: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  category: string;
  categoryIcon: string;
  accountId: string;
  accountName: string;
  // Transfer specific
  toAccountId?: string;
  toAccountName?: string;
  // Details
  merchant: string;
  note: string;
  imageUrl: string | null;
  // Timestamps
  createdAtUTC: string;
  timezone: string;
  // Soft delete
  deletedAt: string | null;
  updatedAt: string;
}

// ============================================
// Category
// ============================================

export interface Category {
  id: string;
  name: string;
  nameId: string; // Bahasa Indonesia name
  icon: string;
  color: string;
  budgetAmount: number;
  order: number;
}

// ============================================
// Budget
// ============================================

export interface Budget {
  id: string;
  month: number; // 1-12
  year: number;
  totalBudget: number;
  cycleStart: number; // day of month
  categories: BudgetCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  spentAmount: number;
}

// ============================================
// Goal
// ============================================

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate: string;
  monthlyContribution: number;
  linkedAccountId: string | null;
  icon: string;
  color: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Recurring
// ============================================

export interface Recurring {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  category: string;
  categoryIcon: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  nextOccurrence: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Dashboard Summary (cached doc for fast Home load)
// ============================================

export interface DashboardSummary {
  // Safe to Spend
  safeToSpendToday: number;
  dailySoftLimit: number;
  // Today
  todaySpent: number;
  todayTransactionCount: number;
  // Monthly
  monthlySpent: number;
  monthlyIncome: number;
  monthlyBudget: number;
  // Cycle info
  cycleStartDate: string;
  cycleEndDate: string;
  daysRemainingInCycle: number;
  // Accounts
  totalBalance: number;
  // Main goal
  mainGoalId: string | null;
  mainGoalTitle: string | null;
  mainGoalProgress: number;
  // Forecast
  forecastedMonthlySpend: number;
  isOnTrack: boolean;
  // Timestamps
  lastUpdated: string;
}

// ============================================
// Default Categories (Indonesia-relevant)
// ============================================

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Beverage', nameId: 'Makanan & Minuman', icon: '🍱', color: '#FF6B6B', budgetAmount: 0, order: 1 },
  { name: 'Transport', nameId: 'Transportasi', icon: '🚗', color: '#4ECDC4', budgetAmount: 0, order: 2 },
  { name: 'Groceries', nameId: 'Belanja Harian', icon: '🛒', color: '#45B7D1', budgetAmount: 0, order: 3 },
  { name: 'Bills & Utilities', nameId: 'Tagihan & Utilitas', icon: '📄', color: '#96CEB4', budgetAmount: 0, order: 4 },
  { name: 'Shopping', nameId: 'Belanja', icon: '🛍️', color: '#FFEAA7', budgetAmount: 0, order: 5 },
  { name: 'Entertainment', nameId: 'Hiburan', icon: '🎮', color: '#DDA0DD', budgetAmount: 0, order: 6 },
  { name: 'Health', nameId: 'Kesehatan', icon: '💊', color: '#98D8C8', budgetAmount: 0, order: 7 },
  { name: 'Education', nameId: 'Pendidikan', icon: '📚', color: '#F7DC6F', budgetAmount: 0, order: 8 },
  { name: 'Family', nameId: 'Keluarga', icon: '👨‍👩‍👧', color: '#BB8FCE', budgetAmount: 0, order: 9 },
  { name: 'Digital Services', nameId: 'Layanan Digital', icon: '📱', color: '#85C1E9', budgetAmount: 0, order: 10 },
  { name: 'Travel', nameId: 'Perjalanan', icon: '✈️', color: '#F8C471', budgetAmount: 0, order: 11 },
  { name: 'Vehicle', nameId: 'Kendaraan', icon: '⛽', color: '#A3E4D7', budgetAmount: 0, order: 12 },
  { name: 'Others', nameId: 'Lainnya', icon: '📦', color: '#AEB6BF', budgetAmount: 0, order: 13 },
];

// Default Indonesian bank/payment suggestions
export const DEFAULT_ACCOUNT_SUGGESTIONS = [
  { name: 'BCA', type: 'bank' as AccountType, gradient: 'linear-gradient(135deg, #003D79, #0066CC)', icon: '🏦' },
  { name: 'BRI', type: 'bank' as AccountType, gradient: 'linear-gradient(135deg, #00529C, #0073E6)', icon: '🏦' },
  { name: 'Mandiri', type: 'bank' as AccountType, gradient: 'linear-gradient(135deg, #003366, #0055A5)', icon: '🏦' },
  { name: 'BNI', type: 'bank' as AccountType, gradient: 'linear-gradient(135deg, #E65100, #FF8F00)', icon: '🏦' },
  { name: 'Jago', type: 'bank' as AccountType, gradient: 'linear-gradient(135deg, #FFD600, #FF9100)', icon: '🏦' },
  { name: 'SeaBank', type: 'bank' as AccountType, gradient: 'linear-gradient(135deg, #00BFA5, #1DE9B6)', icon: '🏦' },
  { name: 'GoPay', type: 'ewallet' as AccountType, gradient: 'linear-gradient(135deg, #00880F, #00C853)', icon: '💳' },
  { name: 'OVO', type: 'ewallet' as AccountType, gradient: 'linear-gradient(135deg, #4527A0, #7C4DFF)', icon: '💳' },
  { name: 'DANA', type: 'ewallet' as AccountType, gradient: 'linear-gradient(135deg, #1565C0, #42A5F5)', icon: '💳' },
  { name: 'ShopeePay', type: 'ewallet' as AccountType, gradient: 'linear-gradient(135deg, #EE4D2D, #FF7043)', icon: '💳' },
  { name: 'Cash', type: 'cash' as AccountType, gradient: 'linear-gradient(135deg, #546E7A, #90A4AE)', icon: '💵' },
];
