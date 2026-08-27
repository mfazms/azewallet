'use client';

import { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronRight, Wallet } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getDashboardSummary, getAccounts, getTransactions, getGoals } from '@/lib/firebase/firestore';
import { formatCurrency, formatCompactCurrency, getGreeting, formatPercentage } from '@/lib/formatting';
import ProgressRing from '@/components/ui/ProgressRing';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user, profile } = useAuthStore();
  const {
    dashboardSummary, setDashboardSummary,
    accounts, setAccounts,
    transactions, setTransactions,
    goals, setGoals,
  } = useAppStore();

  // Fetch data on mount
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [summary, accs, txs, gls] = await Promise.all([
        getDashboardSummary(user.uid),
        getAccounts(user.uid),
        getTransactions(user.uid, { limitCount: 5 }),
        getGoals(user.uid),
      ]);

      setDashboardSummary(summary);
      setAccounts(accs);
      setTransactions(txs);
      setGoals(gls);
    };

    fetchData();
  }, [user, setDashboardSummary, setAccounts, setTransactions, setGoals]);

  const summary = dashboardSummary;
  const safeToSpend = summary?.safeToSpendToday ?? 0;
  const todaySpent = summary?.todaySpent ?? 0;
  const dailyLimit = summary?.dailySoftLimit ?? 0;
  const monthlySpent = summary?.monthlySpent ?? 0;
  const monthlyBudget = summary?.monthlyBudget ?? 0;
  const todayPercentage = formatPercentage(todaySpent, dailyLimit || 1);
  const monthlyPercentage = formatPercentage(monthlySpent, monthlyBudget || 1);
  const mainGoal = goals.length > 0 ? goals[0] : null;
  const totalBalance = summary?.totalBalance ?? accounts.reduce((s, a) => s + a.balance, 0);

  const displayName = profile?.displayName || user?.displayName || 'there';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="page-container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="dashboard"
      >
        {/* Header (Greeting & Hero Number) */}
        <motion.header variants={itemVariants} className="dash-header">
          <div>
            <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>{getGreeting()}, {firstName}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span className="text-h3" style={{ color: 'var(--ink-secondary)' }}>Rp</span>
              <AnimatedNumber
                value={safeToSpend}
                className="text-hero-large"
                formatter={(v) => Math.round(v).toLocaleString('id-ID')}
              />
            </div>
          </div>
          <a href="/settings" className="dash-avatar">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="dash-avatar-img" />
            ) : (
              <span className="dash-avatar-fallback">
                {firstName.charAt(0).toUpperCase()}
              </span>
            )}
          </a>
        </motion.header>

        {/* Safe to Spend Today Card (Glass) */}
        <motion.section variants={itemVariants} className="dash-safe-card glass-surface" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="dash-safe-label" style={{ color: 'var(--ink-secondary)', marginBottom: 8, justifyContent: 'flex-start' }}>
              <span>Safe to spend today</span>
            </div>
            {summary?.isOnTrack !== undefined && (
              <div className={`dash-safe-status ${summary.isOnTrack ? 'status-good' : 'status-warn'}`} style={{ marginLeft: 0 }}>
                {summary.isOnTrack ? (
                  <>
                    <TrendingUp size={14} />
                    <span>On track</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} />
                    <span>Spending fast</span>
                  </>
                )}
              </div>
            )}
          </div>
          <ProgressRing progress={todayPercentage} size={64} strokeWidth={6}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {todayPercentage}%
            </span>
          </ProgressRing>
        </motion.section>

        {/* Monthly Budget Card (Glass) */}
        <motion.section variants={itemVariants} className="dash-monthly glass-surface" style={{ padding: 16, marginTop: 16 }}>
          <div className="dash-monthly-header">
            <span className="text-callout" style={{ color: 'var(--ink-secondary)', fontWeight: 500 }}>Monthly budget</span>
            <span className="text-caption">{monthlyPercentage}% used</span>
          </div>
          <div className="dash-monthly-amount" style={{ marginTop: 8 }}>
            <span className="text-h3 text-money">{formatCompactCurrency(monthlySpent)}</span>
            <span className="text-body-small" style={{ color: 'var(--ink-secondary)' }}>
              {' '} / {formatCompactCurrency(monthlyBudget)}
            </span>
          </div>
          <div className="dash-progress-bar" style={{ marginTop: 12 }}>
            <motion.div
              className="dash-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, monthlyPercentage)}%` }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
              style={{
                background: monthlyPercentage >= 90 ? 'var(--color-expense)'
                  : monthlyPercentage >= 75 ? 'var(--color-warning)'
                  : 'var(--color-income)',
              }}
            />
          </div>
        </motion.section>

        {/* Main Goal */}
        {mainGoal && (
          <motion.a
            variants={itemVariants}
            href="/goals"
            className="dash-goal solid-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="dash-goal-header">
              <span className="dash-goal-icon">{mainGoal.icon || '🎯'}</span>
              <div className="dash-goal-info">
                <p className="text-caption">Main Goal</p>
                <p className="text-h4">{mainGoal.title}</p>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <div className="dash-progress-bar" style={{ marginTop: '0.75rem' }}>
              <motion.div
                className="dash-progress-fill"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, formatPercentage(mainGoal.currentAmount, mainGoal.targetAmount))}%`,
                }}
                transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                style={{ background: 'var(--color-accent)' }}
              />
            </div>
            <div className="dash-goal-footer">
              <span className="text-caption">
                {formatCompactCurrency(mainGoal.currentAmount)} / {formatCompactCurrency(mainGoal.targetAmount)}
              </span>
              <span className="text-caption" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {formatPercentage(mainGoal.currentAmount, mainGoal.targetAmount)}%
              </span>
            </div>
          </motion.a>
        )}

        {/* Account Snapshot */}
        <motion.section variants={itemVariants} className="dash-accounts">
          <div className="dash-section-header">
            <p className="text-h4">Accounts</p>
            <a href="/accounts" className="dash-see-all">See all <ChevronRight size={16} /></a>
          </div>
          <div className="dash-accounts-grid">
            {accounts.length > 0 ? (
              accounts.slice(0, 4).map((acc) => (
                <div key={acc.id} className="dash-account-item solid-card">
                  <span className="dash-account-icon">{acc.icon || '🏦'}</span>
                  <p className="dash-account-name">{acc.name}</p>
                  <p className="dash-account-balance text-money">
                    {formatCompactCurrency(acc.balance)}
                  </p>
                </div>
              ))
            ) : (
              <div className="dash-empty-accounts solid-card">
                <p className="text-body-small" style={{ color: 'var(--color-text-secondary)' }}>
                  Add your first account to start tracking
                </p>
                <a href="/accounts" className="btn-ghost" style={{ marginTop: '0.5rem' }}>
                  + Add Account
                </a>
              </div>
            )}
          </div>
          {accounts.length > 0 && (
            <div className="dash-total-balance">
              <span className="text-caption">Total Balance</span>
              <span className="text-h3 text-money">{formatCurrency(totalBalance)}</span>
            </div>
          )}
        </motion.section>

        {/* Recent Activity */}
        <motion.section variants={itemVariants} className="dash-recent">
          <div className="dash-section-header">
            <p className="text-h4">Recent Activity</p>
            <a href="/activity" className="dash-see-all">See all <ChevronRight size={16} /></a>
          </div>
          {transactions.length > 0 ? (
            <div className="dash-tx-list">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="dash-tx-item">
                  <span className="dash-tx-icon">{tx.categoryIcon || '📦'}</span>
                  <div className="dash-tx-info">
                    <p className="dash-tx-merchant">{tx.merchant || tx.category}</p>
                    <p className="text-caption">{tx.accountName}</p>
                  </div>
                  <span className={`dash-tx-amount text-money ${tx.type === 'income' ? 'color-income' : 'color-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-empty solid-card">
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
              <p className="text-body-small" style={{ color: 'var(--color-text-secondary)' }}>
                Your money story starts here.
              </p>
            </div>
          )}
        </motion.section>
      </motion.div>

      
    </div>
  );
}
