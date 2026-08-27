'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, PiggyBank } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getGoals, createGoal, updateGoal } from '@/lib/firebase/firestore';
import { formatCurrency, formatCompactCurrency, formatPercentage } from '@/lib/formatting';
import BottomSheet from '@/components/ui/BottomSheet';
import type { Goal } from '@/types';

export default function GoalsPage() {
  const { user } = useAuthStore();
  const { goals, setGoals } = useAppStore();
  
  // Forms states
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addingFundsGoal, setAddingFundsGoal] = useState<Goal | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');

  // Goal Form Fields
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalType, setGoalType] = useState<'save' | 'debt' | 'purchase'>('save');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getGoals(user.uid).then(setGoals);
  }, [user, setGoals]);

  const openCreateForm = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setTargetDate('');
    setGoalType('save');
    setShowForm(true);
  };

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setTargetDate(goal.targetDate.split('T')[0]);
    setGoalType(goal.type);
    setShowForm(true);
  };

  const openAddFunds = (goal: Goal) => {
    setAddingFundsGoal(goal);
    setAddFundsAmount('');
    setShowAddFunds(true);
  };

  const handleSaveGoal = async () => {
    if (!user || !title || !targetAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const amount = parseFloat(targetAmount.replace(/[^0-9]/g, '')) || 0;
      const tDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const months = Math.max(1, Math.ceil((tDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));

      const payload = {
        title,
        type: goalType,
        targetAmount: amount,
        targetDate: tDate.toISOString(),
        monthlyContribution: Math.round(amount / months),
        icon: goalType === 'save' ? '💰' : goalType === 'debt' ? '💳' : '🎯',
      };

      if (editingGoal) {
        await updateGoal(user.uid, editingGoal.id, payload);
      } else {
        await createGoal(user.uid, {
          ...payload,
          currentAmount: 0,
          currency: 'IDR',
          linkedAccountId: null,
          color: '#7C4DFF',
          priority: goals.length + 1,
        });
      }

      const updated = await getGoals(user.uid);
      setGoals(updated);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFundsSubmit = async () => {
    if (!user || !addingFundsGoal || !addFundsAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const amountToAdd = parseFloat(addFundsAmount.replace(/[^0-9]/g, '')) || 0;
      const newAmount = addingFundsGoal.currentAmount + amountToAdd;

      await updateGoal(user.uid, addingFundsGoal.id, {
        currentAmount: Math.min(newAmount, addingFundsGoal.targetAmount) // Don't exceed target
      });

      const updated = await getGoals(user.uid);
      setGoals(updated);
      setShowAddFunds(false);
    } catch (error) {
      console.error('Error adding funds:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="goals-page">
        <header className="goals-header">
          <h1 className="text-h1">Goals</h1>
          <button className="btn-ghost" onClick={openCreateForm}>
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
                  style={{ position: 'relative' }}
                >
                  <div className="goal-header-row" onClick={() => openEditForm(goal)} style={{ cursor: 'pointer' }}>
                    <span className="goal-icon">{goal.icon || '🎯'}</span>
                    <div className="goal-info">
                      <p className="text-h4">{goal.title}</p>
                      <p className="text-caption">{goal.type === 'save' ? 'Savings' : goal.type === 'debt' ? 'Debt payoff' : 'Purchase'}</p>
                    </div>
                    <span className="goal-percentage" style={{ color: 'var(--color-accent)' }}>{progress}%</span>
                  </div>

                  <div className="goal-progress-bar" onClick={() => openEditForm(goal)} style={{ cursor: 'pointer' }}>
                    <motion.div
                      className="goal-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 + i * 0.1 }}
                    />
                  </div>

                  <div className="goal-footer" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span className="text-caption" style={{ display: 'block' }}>{formatCompactCurrency(goal.currentAmount)} / {formatCompactCurrency(goal.targetAmount)}</span>
                      <span className="text-caption" style={{ opacity: 0.7 }}>~{formatCompactCurrency(goal.monthlyContribution)}/mo</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openAddFunds(goal); }}
                      style={{ 
                        background: 'var(--color-accent-bg)', color: 'var(--color-accent)',
                        border: '1px solid var(--color-accent)', padding: '4px 12px',
                        borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> Add Funds
                    </button>
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
              Whether it's saving for a MacBook or building an emergency fund
            </p>
            <button className="btn-primary" onClick={openCreateForm} style={{ marginTop: '1.25rem' }}>
              <Plus size={18} /> Create Goal
            </button>
          </div>
        )}
      </div>

      {/* Goal Form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title={editingGoal ? "Edit Goal" : "New Goal"}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['save', 'debt', 'purchase'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setGoalType(t)}
                style={{ 
                  flex: 1, padding: '0.625rem', borderRadius: 'var(--radius-lg)', 
                  background: goalType === t ? 'var(--color-accent-bg)' : 'var(--color-input-bg)', 
                  border: goalType === t ? '1px solid var(--color-accent)' : '1px solid transparent', 
                  color: goalType === t ? 'var(--color-accent)' : 'var(--color-text-secondary)', 
                  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer'
                }}
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
          <button className="btn-primary" onClick={handleSaveGoal} disabled={!title || !targetAmount || isSubmitting}>
            {isSubmitting ? 'Saving...' : (editingGoal ? 'Save Changes' : 'Create Goal')}
          </button>
        </div>
      </BottomSheet>

      {/* Add Funds Form */}
      <BottomSheet isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} title="Add Funds">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <p className="text-body-small" style={{ color: 'var(--color-text-secondary)' }}>Adding funds to</p>
            <p className="text-h3">{addingFundsGoal?.title}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rp</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={addFundsAmount}
              onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setAddFundsAmount(v ? parseInt(v).toLocaleString('id-ID') : ''); }}
              className="input-field"
              style={{ flex: 1, fontSize: '1.5rem', height: 'auto', padding: '12px' }}
              autoFocus
            />
          </div>
          <button className="btn-primary" onClick={handleAddFundsSubmit} disabled={!addFundsAmount || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Funds'}
          </button>
        </div>
      </BottomSheet>

    </div>
  );
}
