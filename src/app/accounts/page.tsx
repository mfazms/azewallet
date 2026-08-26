'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, Wallet } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getAccounts, createAccount } from '@/lib/firebase/firestore';
import { formatCurrency, formatCompactCurrency } from '@/lib/formatting';
import BottomSheet from '@/components/ui/BottomSheet';
import { DEFAULT_ACCOUNT_SUGGESTIONS } from '@/types';
import type { AccountType } from '@/types';

export default function AccountsPage() {
  const { user } = useAuthStore();
  const { accounts, setAccounts } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accBalance, setAccBalance] = useState('');
  const [accLast4, setAccLast4] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAccounts(user.uid).then(setAccounts);
  }, [user, setAccounts]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleCreate = async () => {
    if (!user || !accName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const balance = parseFloat(accBalance.replace(/[^0-9]/g, '')) || 0;
      const suggestion = DEFAULT_ACCOUNT_SUGGESTIONS.find(s => s.name === accName);
      await createAccount(user.uid, {
        name: accName,
        bankName: accName,
        type: accType,
        last4: accLast4,
        color: '',
        gradient: suggestion?.gradient || 'linear-gradient(135deg, #546E7A, #90A4AE)',
        icon: suggestion?.icon || (accType === 'bank' ? '🏦' : accType === 'ewallet' ? '💳' : accType === 'cash' ? '💵' : '🏦'),
        balance,
        currency: 'IDR',
        isDefault: accounts.length === 0,
      });
      const updated = await getAccounts(user.uid);
      setAccounts(updated);
      setShowForm(false);
      setAccName('');
      setAccBalance('');
      setAccLast4('');
    } catch (err) {
      console.error('Error creating account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="accounts-page">
        <header className="acc-header">
          <h1 className="text-h1">Accounts</h1>
          <button className="btn-ghost" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Add
          </button>
        </header>

        {/* Total Balance */}
        <div className="acc-total glass-card">
          <Wallet size={20} style={{ color: 'var(--color-text-secondary)' }} />
          <div>
            <p className="text-caption">Total Balance</p>
            <p className="text-hero-large text-money" style={{ marginTop: '0.25rem' }}>{formatCurrency(totalBalance)}</p>
          </div>
        </div>

        {/* Account Cards */}
        <div className="acc-list">
          {accounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="acc-card"
              style={{ background: acc.gradient }}
            >
              <div className="acc-card-header">
                <span className="acc-card-name">{acc.name}</span>
                <span className="acc-card-type">
                  {acc.type === 'bank' ? 'Bank' : acc.type === 'ewallet' ? 'E-Wallet' : acc.type === 'credit_card' ? 'Credit Card' : acc.type === 'cash' ? 'Cash' : acc.type}
                </span>
              </div>
              {acc.last4 && <p className="acc-card-last4">•••• {acc.last4}</p>}
              <p className="acc-card-balance text-money">{formatCurrency(acc.balance)}</p>
            </motion.div>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="acc-empty solid-card">
            <CreditCard size={40} style={{ color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }} />
            <h3 className="text-h3">Add your first account</h3>
            <p className="text-body-small" style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Bank accounts, e-wallets, cash — track them all
            </p>
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: '1.25rem' }}>
              <Plus size={18} /> Add Account
            </button>
          </div>
        )}
      </div>

      {/* New Account Form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Add Account">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Quick suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {DEFAULT_ACCOUNT_SUGGESTIONS.map((s) => (
              <button
                key={s.name}
                onClick={() => { setAccName(s.name); setAccType(s.type); }}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-full)',
                  background: accName === s.name ? 'var(--color-income-bg)' : 'var(--color-input-bg)',
                  border: accName === s.name ? '1px solid var(--color-income)' : '1px solid transparent',
                  color: accName === s.name ? 'var(--color-income)' : 'var(--color-text-secondary)',
                  fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', minHeight: 'auto',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>

          <input type="text" placeholder="Account name" value={accName} onChange={(e) => setAccName(e.target.value)} className="input-field" />

          <select
            value={accType}
            onChange={(e) => setAccType(e.target.value as AccountType)}
            className="input-field"
          >
            <option value="bank">🏦 Bank Account</option>
            <option value="ewallet">💳 E-Wallet</option>
            <option value="cash">💵 Cash</option>
            <option value="credit_card">💳 Credit Card</option>
            <option value="investment">📈 Investment</option>
            <option value="other">📦 Other</option>
          </select>

          <input type="text" placeholder="Last 4 digits (optional)" value={accLast4} onChange={(e) => setAccLast4(e.target.value.slice(0, 4))} className="input-field" maxLength={4} inputMode="numeric" />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rp</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Current balance"
              value={accBalance}
              onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setAccBalance(v ? parseInt(v).toLocaleString('id-ID') : ''); }}
              className="input-field"
              style={{ flex: 1 }}
            />
          </div>

          <button className="btn-primary" onClick={handleCreate} disabled={!accName || isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Account'}
          </button>
        </div>
      </BottomSheet>

      
    </div>
  );
}
