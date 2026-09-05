import {
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, getDocs,
  writeBatch, serverTimestamp, Timestamp,
  limit, startAfter, DocumentSnapshot, addDoc,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Account, Transaction, Category, Budget,
  Goal, Recurring, DashboardSummary, UserProfile,
} from '@/types';

// ============================================
// Helper: Get user-scoped collection reference
// ============================================

function userCollection(uid: string, collectionName: string) {
  return collection(db, 'users', uid, collectionName);
}

function userDoc(uid: string, collectionName: string, docId: string) {
  return doc(db, 'users', uid, collectionName, docId);
}

// ============================================
// User Profile
// ============================================

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ============================================
// Accounts CRUD
// ============================================

export async function createAccount(uid: string, account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = doc(userCollection(uid, 'accounts'));
  await setDoc(ref, {
    ...account,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAccounts(uid: string): Promise<Account[]> {
  const q = query(userCollection(uid, 'accounts'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account));
}

export async function updateAccount(uid: string, accountId: string, data: Partial<Account>): Promise<void> {
  await updateDoc(userDoc(uid, 'accounts', accountId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAccount(uid: string, accountId: string): Promise<void> {
  await deleteDoc(userDoc(uid, 'accounts', accountId));
}

// ============================================
// Transactions CRUD
// ============================================

export async function createTransaction(
  uid: string,
  transaction: Omit<Transaction, 'id' | 'updatedAt'>
): Promise<string> {
  const ref = doc(userCollection(uid, 'transactions'));
  await setDoc(ref, {
    ...transaction,
    updatedAt: serverTimestamp(),
  });

  // Update dashboard summary after transaction
  await recalculateDashboardSummary(uid);

  // Update account balance
  await updateAccountBalance(uid, transaction);

  return ref.id;
}

export async function getTransactions(
  uid: string,
  options?: {
    limitCount?: number;
    afterDoc?: DocumentSnapshot; // No longer applies easily with in-memory filtering, but we'll ignore for MVP
    categoryFilter?: string;
    accountFilter?: string;
    typeFilter?: string;
  }
): Promise<Transaction[]> {
  // Fetch all transactions ordered by date (no composite index required)
  const q = query(
    userCollection(uid, 'transactions'),
    orderBy('createdAtUTC', 'desc')
  );

  const snapshot = await getDocs(q);
  let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));

  // Apply filters in memory to avoid Firestore index errors
  results = results.filter(t => !t.deletedAt); // Handle soft deletes
  
  if (options?.categoryFilter) {
    results = results.filter(t => t.category === options.categoryFilter);
  }
  if (options?.accountFilter) {
    results = results.filter(t => t.accountId === options.accountFilter);
  }
  if (options?.typeFilter) {
    results = results.filter(t => t.type === options.typeFilter);
  }
  
  if (options?.limitCount) {
    results = results.slice(0, options.limitCount);
  }

  return results;
}

export async function updateTransaction(
  uid: string,
  transactionId: string,
  data: Partial<Transaction>
): Promise<void> {
  const txRef = userDoc(uid, 'transactions', transactionId);
  const oldTxSnap = await getDoc(txRef);
  
  if (oldTxSnap.exists()) {
    const oldTx = oldTxSnap.data() as Transaction;
    const oldImpact = oldTx.type === 'expense' ? oldTx.amount : oldTx.type === 'income' ? -oldTx.amount : 0;
    
    const newType = data.type || oldTx.type;
    const newAmount = data.amount !== undefined ? data.amount : oldTx.amount;
    const newImpact = newType === 'expense' ? -newAmount : newType === 'income' ? newAmount : 0;
    
    const balanceChange = oldImpact + newImpact;
    
    if (balanceChange !== 0) {
      const accountId = data.accountId || oldTx.accountId;
      const accountRef = userDoc(uid, 'accounts', accountId);
      const accSnap = await getDoc(accountRef);
      if (accSnap.exists()) {
        const currentBalance = accSnap.data().balance || 0;
        await updateDoc(accountRef, {
          balance: currentBalance + balanceChange,
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  await updateDoc(txRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  await recalculateDashboardSummary(uid);
}

// Soft delete with undo support
export async function softDeleteTransaction(uid: string, transactionId: string): Promise<void> {
  const txRef = userDoc(uid, 'transactions', transactionId);
  const oldTxSnap = await getDoc(txRef);
  
  if (oldTxSnap.exists()) {
    const oldTx = oldTxSnap.data() as Transaction;
    // Revert the transaction's impact
    const oldImpact = oldTx.type === 'expense' ? oldTx.amount : oldTx.type === 'income' ? -oldTx.amount : 0;
    
    if (oldImpact !== 0) {
      const accountRef = userDoc(uid, 'accounts', oldTx.accountId);
      const accSnap = await getDoc(accountRef);
      if (accSnap.exists()) {
        const currentBalance = accSnap.data().balance || 0;
        await updateDoc(accountRef, {
          balance: currentBalance + oldImpact,
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  await updateDoc(txRef, {
    deletedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  await recalculateDashboardSummary(uid);
}

// Restore soft-deleted transaction (undo)
export async function restoreTransaction(uid: string, transactionId: string): Promise<void> {
  await updateDoc(userDoc(uid, 'transactions', transactionId), {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
  await recalculateDashboardSummary(uid);
}

// ============================================
// Categories CRUD
// ============================================

export async function createCategory(uid: string, category: Omit<Category, 'id'>): Promise<string> {
  const ref = doc(userCollection(uid, 'categories'));
  await setDoc(ref, category);
  return ref.id;
}

export async function getCategories(uid: string): Promise<Category[]> {
  const q = query(userCollection(uid, 'categories'), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
}

// ============================================
// Budgets CRUD
// ============================================

export async function createBudget(uid: string, budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = doc(userCollection(uid, 'budgets'));
  await setDoc(ref, {
    ...budget,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCurrentBudget(uid: string): Promise<Budget | null> {
  const now = new Date();
  const q = query(
    userCollection(uid, 'budgets'),
    where('month', '==', now.getMonth() + 1),
    where('year', '==', now.getFullYear()),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as Budget;
}

export async function updateBudget(uid: string, budgetId: string, data: Partial<Budget>): Promise<void> {
  await updateDoc(userDoc(uid, 'budgets', budgetId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Goals CRUD
// ============================================

export async function createGoal(uid: string, goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = doc(userCollection(uid, 'goals'));
  await setDoc(ref, {
    ...goal,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getGoals(uid: string): Promise<Goal[]> {
  const q = query(userCollection(uid, 'goals'), orderBy('priority', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
}

export async function updateGoal(uid: string, goalId: string, data: Partial<Goal>): Promise<void> {
  await updateDoc(userDoc(uid, 'goals', goalId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  await deleteDoc(userDoc(uid, 'goals', goalId));
}

// ============================================
// Recurring CRUD
// ============================================

export async function getRecurring(uid: string): Promise<Recurring[]> {
  const q = query(
    userCollection(uid, 'recurring'),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Recurring));
  return items.sort((a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime());
}

// ============================================
// Dashboard Summary
// ============================================

export async function getDashboardSummary(uid: string): Promise<DashboardSummary | null> {
  const summaryDoc = await getDoc(doc(db, 'users', uid, 'dashboardSummary', 'current'));
  if (summaryDoc.exists()) {
    return summaryDoc.data() as DashboardSummary;
  }
  return null;
}

export async function updateDashboardSummary(
  uid: string,
  data: Partial<DashboardSummary>
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'dashboardSummary', 'current'), {
    ...data,
    lastUpdated: serverTimestamp(),
  }, { merge: true });
}

// ============================================
// Atomic Transfer (batched write)
// ============================================

export async function createTransfer(
  uid: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  note: string
): Promise<void> {
  const batch = writeBatch(db);

  // Create transfer transaction
  const txRef = doc(userCollection(uid, 'transactions'));
  batch.set(txRef, {
    amount,
    currency: 'IDR',
    type: 'transfer',
    category: 'Transfer',
    categoryIcon: '↔️',
    accountId: fromAccountId,
    accountName: '',
    toAccountId,
    toAccountName: '',
    merchant: 'Transfer',
    note,
    imageUrl: null,
    createdAtUTC: new Date().toISOString(),
    timezone: 'Asia/Jakarta',
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });

  // Deduct from source account
  const fromRef = userDoc(uid, 'accounts', fromAccountId);
  const fromDoc = await getDoc(fromRef);
  if (fromDoc.exists()) {
    batch.update(fromRef, {
      balance: (fromDoc.data().balance || 0) - amount,
      updatedAt: serverTimestamp(),
    });
  }

  // Add to destination account
  const toRef = userDoc(uid, 'accounts', toAccountId);
  const toDocSnap = await getDoc(toRef);
  if (toDocSnap.exists()) {
    batch.update(toRef, {
      balance: (toDocSnap.data().balance || 0) + amount,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  await recalculateDashboardSummary(uid);
}

// ============================================
// Internal: Update account balance on transaction
// ============================================

async function updateAccountBalance(
  uid: string,
  transaction: Omit<Transaction, 'id' | 'updatedAt'>
): Promise<void> {
  const accountRef = userDoc(uid, 'accounts', transaction.accountId);
  const accountDoc = await getDoc(accountRef);

  if (accountDoc.exists()) {
    const currentBalance = accountDoc.data().balance || 0;
    let newBalance = currentBalance;

    if (transaction.type === 'expense') {
      newBalance -= transaction.amount;
    } else if (transaction.type === 'income') {
      newBalance += transaction.amount;
    }

    await updateDoc(accountRef, {
      balance: newBalance,
      updatedAt: serverTimestamp(),
    });
  }
}

// ============================================
// Internal: Recalculate Dashboard Summary
// ============================================

export async function recalculateDashboardSummary(uid: string): Promise<void> {
  try {
    // Get user profile for budget cycle info
    const userDocRef = await getDoc(doc(db, 'users', uid));
    if (!userDocRef.exists()) return;
    const userProfile = userDocRef.data() as UserProfile;

    // Calculate cycle dates
    const now = new Date();
    const cycleStart = userProfile.budgetCycleStart || 1;
    let cycleStartDate: Date;
    let cycleEndDate: Date;

    if (now.getDate() >= cycleStart) {
      cycleStartDate = new Date(now.getFullYear(), now.getMonth(), cycleStart);
      cycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, cycleStart - 1);
    } else {
      cycleStartDate = new Date(now.getFullYear(), now.getMonth() - 1, cycleStart);
      cycleEndDate = new Date(now.getFullYear(), now.getMonth(), cycleStart - 1);
    }

    // Get transactions in current cycle
    const txQuery = query(
      userCollection(uid, 'transactions'),
      where('deletedAt', '==', null),
      where('createdAtUTC', '>=', cycleStartDate.toISOString()),
      where('createdAtUTC', '<=', now.toISOString()),
      orderBy('createdAtUTC', 'desc')
    );
    const txSnapshot = await getDocs(txQuery);
    const transactions = txSnapshot.docs.map(d => d.data() as Transaction);

    // Calculate today's spending
    const todayStr = now.toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.createdAtUTC.startsWith(todayStr));
    const todaySpent = todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate Weekly Spent (assuming week starts on Monday)
    const currentDayOfWeek = now.getDay() || 7; // 1-7 where 1 is Monday, 7 is Sunday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklyTransactions = transactions.filter(t => new Date(t.createdAtUTC) >= startOfWeek && new Date(t.createdAtUTC) <= now);
    const weeklySpent = weeklyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate monthly spending
    const monthlySpent = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyIncomeTotal = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get accounts for total balance
    const accounts = await getAccounts(uid);
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    // Get current budget
    const budget = await getCurrentBudget(uid);
    const monthlyBudget = userProfile.monthlyBudget || userProfile.monthlyIncome || budget?.totalBudget || 0;

    // Get goals
    const goals = await getGoals(uid);
    const mainGoal = goals.length > 0 ? goals[0] : null;
    const goalContributions = goals.reduce((sum, g) => sum + g.monthlyContribution, 0);

    // Get recurring expenses remaining in cycle
    const recurring = await getRecurring(uid);
    const remainingRecurring = recurring
      .filter(r => r.type === 'expense' && r.nextOccurrence <= cycleEndDate.toISOString())
      .reduce((sum, r) => sum + r.amount, 0);

    // Calculate Safe-to-Spend
    const daysRemaining = Math.max(1, Math.ceil(
      (cycleEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const totalDaysInCycle = Math.max(1, Math.ceil(
      (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const daysElapsed = Math.max(1, Math.ceil(
      (now.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Calculate daily budget limit
    // If user explicitly set dailyBudget, use that as base
    // Otherwise derive from monthly: monthlyBudget / days_in_cycle
    const baseDailyLimit = userProfile.dailyBudget || Math.round(monthlyBudget / totalDaysInCycle);
    const baseWeeklyLimit = userProfile.weeklyBudget || Math.round(monthlyBudget / 4);

    // Rolling daily budget: if user overspent previous days, today's limit shrinks
    // Total budget so far for elapsed days = baseDailyLimit * daysElapsed
    // Remaining budget for today = (baseDailyLimit * daysElapsed) - monthlySpent
    // But cap it so it's not more than baseDailyLimit (no hoarding more than 1 day)
    const cumulativeBudgetSoFar = baseDailyLimit * daysElapsed;
    const rollingDailyLimit = Math.max(0, Math.min(baseDailyLimit * 1.5, cumulativeBudgetSoFar - (monthlySpent - todaySpent)));

    let safeToSpendToday = Math.max(0, rollingDailyLimit - todaySpent);

    // Forecast
    const dailyPace = monthlySpent / daysElapsed;
    const forecastedMonthlySpend = dailyPace * totalDaysInCycle;

    // Update summary document
    await updateDashboardSummary(uid, {
      safeToSpendToday: Math.round(safeToSpendToday),
      dailySoftLimit: Math.round(rollingDailyLimit),
      weeklySoftLimit: Math.round(baseWeeklyLimit),
      weeklySpent,
      todaySpent,
      todayTransactionCount: todayTransactions.length,
      monthlySpent,
      monthlyIncome: monthlyIncomeTotal || userProfile.monthlyIncome || 0,
      monthlyBudget,
      cycleStartDate: cycleStartDate.toISOString(),
      cycleEndDate: cycleEndDate.toISOString(),
      daysRemainingInCycle: daysRemaining,
      totalBalance,
      mainGoalId: mainGoal?.id || null,
      mainGoalTitle: mainGoal?.title || null,
      mainGoalProgress: mainGoal
        ? Math.round((mainGoal.currentAmount / mainGoal.targetAmount) * 100)
        : 0,
      forecastedMonthlySpend: Math.round(forecastedMonthlySpend),
      isOnTrack: forecastedMonthlySpend <= monthlyBudget,
    });
  } catch (error) {
    console.error('Error recalculating dashboard summary:', error);
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
  timestamp: string;
}

export async function getChatHistory(uid: string): Promise<ChatMessage[]> {
  try {
    const chatRef = collection(db, 'users', uid, 'chats');
    const q = query(chatRef, orderBy('timestamp', 'asc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

export async function saveChatMessage(uid: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
  try {
    const chatRef = collection(db, 'users', uid, 'chats');
    const docRef = await addDoc(chatRef, {
      ...message,
      timestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}
