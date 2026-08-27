'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getGoals, createGoal } from '@/lib/firebase/firestore';
import { formatCurrency, formatCompactCurrency, formatPercentage } from '@/lib/formatting';
import BottomSheet from '@/components/ui/BottomSheet';

export default function GoalsPage() {
  const { user } = useAuthStore();
  const { goals, setGoals } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalType, setGoalType] = useState<'save' | 'debt' | 'purchase'>('save');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getGoals(user.uid).then(setGoals);
  }, [user, setGoals]);

  const handleCreate = async () => {
    if (!user || !title || !targetAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const amount = parseFloat(targetAmount.replace(/[^0-9]/g, '')) || 0;
      const months = targetDate
        ? Math.max(1, Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
        : 12;

      await createGoal(user.uid, {
        title,
        type: goalType,
        targetAmount: amount,
        currentAmount: 0,
        currency: 'IDR',
        targetDate: targetDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        monthlyContribution: Math.round(amount / months),
        linkedAccountId: null,
        icon: goalType === 'save' ? '💰' : goalType === 'debt' ? '💳' : '🎯',
        color: '#7C4DFF',
        priority: goals.length + 1,
      });

      const updated = await getGoals(user.uid);
      setGoals(updated);
      setShowForm(false);
      setTitle('');
      setTargetAmount('');
      setTargetDate('');
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="goals-page">
        <header className="goals-header">
          <h1 className="text-h1">Goals</h1>
          <button className="btn-ghost" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Add
          </button>
        </header>

        {goals.length > 0 ? (
          <div className="goals-list">
            {goals.map((goal, i) => {
              const progress = formatPercentage(goal.currentAmount, goal.targetAmount);
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="goal-card glass-surface"
                >
                  <div className="goal-header-row">
                    <span className="goal-icon">{goal.icon || '🎯'}</span>
                    <div className="goal-info">
                      <p className="text-h4">{goal.title}</p>
                      <p className="text-caption">{goal.type === 'save' ? 'Savings' : goal.type === 'debt' ? 'Debt payoff' : 'Purchase'}</p>
                    </div>
                    <span className="goal-percentage" style={{ color: 'var(--color-accent)' }}>{progress}%</span>
                  </div>

                  <div className="goal-progress-bar">
                    <motion.div
                      className="goal-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 + i * 0.1 }}
                    />
                  </div>

                  <div className="goal-footer">
                    <span className="text-caption">{formatCompactCurrency(goal.currentAmount)} / {formatCompactCurrency(goal.targetAmount)}</span>
                    <span className="text-caption">~{formatCompactCurrency(goal.monthlyContribution)}/mo</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="goals-empty solid-card">
            <Target size={40} style={{ color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }} />
            <h3 className="text-h3">Set your first goal</h3>
            <p className="text-body-small" style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Whether it&apos;s saving for a MacBook or building an emergency fund
            </p>
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: '1.25rem' }}>
              <Plus size={18} /> Create Goal
            </button>
          </div>
        )}
      </div>

      {/* New Goal Form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="New Goal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['save', 'debt', 'purchase'] as const).map((t) => (
              <button
                key={t}
                className={`act-filter-chip ${goalType === t ? 'act-filter-active' : ''}`}
                onClick={() => setGoalType(t)}
                style={{ flex: 1, textAlign: 'center', justifyContent: 'center', minHeight: 'auto', padding: '0.625rem', borderRadius: 'var(--radius-lg)', background: goalType === t ? 'var(--color-accent-bg)' : 'var(--color-input-bg)', borderWidth: '1px', borderStyle: 'solid', borderColor: goalType === t ? 'var(--color-accent)' : 'transparent', color: goalType === t ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              >
                {t === 'save' ? '💰 Save' : t === 'debt' ? '💳 Debt' : '🎯 Purchase'}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Goal title (e.g., MacBook Pro)" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rp</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Target amount"
              value={targetAmount}
              onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setTargetAmount(v ? parseInt(v).toLocaleString('id-ID') : ''); }}
              className="input-field"
              style={{ flex: 1 }}
            />
          </div>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input-field" />
          <button className="btn-primary" onClick={handleCreate} disabled={!title || !targetAmount || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </BottomSheet>

      
    </div>
  );
}
