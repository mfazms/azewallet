'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, Wallet, Pencil } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getAccounts, createAccount, updateAccount } from '@/lib/firebase/firestore';
import { formatCurrency } from '@/lib/formatting';
import BottomSheet from '@/components/ui/BottomSheet';
import { DEFAULT_ACCOUNT_SUGGESTIONS } from '@/types';
import type { AccountType, Account } from '@/types';

export default function AccountsPage() {
  const { user } = useAuthStore();
  const { accounts, setAccounts } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Form State
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accBalance, setAccBalance] = useState('');
  const [accLast4, setAccLast4] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accHolderName, setAccHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAccounts(user.uid).then(setAccounts);
  }, [user, setAccounts]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const groupedSuggestions = useMemo(() => {
    return DEFAULT_ACCOUNT_SUGGESTIONS.reduce((acc, curr) => {
      if (!acc[curr.group]) acc[curr.group] = [];
      acc[curr.group].push(curr);
      return acc;
    }, {} as Record<string, typeof DEFAULT_ACCOUNT_SUGGESTIONS>);
  }, []);

  const openFormForCreate = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccBalance('');
    setAccLast4('');
    setAccNumber('');
    setAccHolderName('');
    setShowForm(true);
  };

  const openFormForEdit = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccLast4(acc.last4 || '');
    setAccNumber(acc.accountNumber || '');
    setAccHolderName(acc.accountName || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !accName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const balance = parseFloat(accBalance.replace(/[^0-9]/g, '')) || 0;
      const suggestion = DEFAULT_ACCOUNT_SUGGESTIONS.find(s => s.name === accName);
      
      const payload = {
        name: accName,
        bankName: accName,
        type: accType,
        last4: accLast4,
        accountNumber: accNumber,
        accountName: accHolderName,
        balance,
        currency: 'IDR' as const,
      };

      if (editingAccount) {
        await updateAccount(user.uid, editingAccount.id, payload);
      } else {
        await createAccount(user.uid, {
          ...payload,
          color: '',
          gradient: suggestion?.gradient || 'linear-gradient(135deg, #546E7A, #90A4AE)',
          icon: suggestion?.icon || (accType === 'bank' ? '🏦' : accType === 'ewallet' ? '💳' : accType === 'cash' ? '💵' : '🏦'),
          logoUrl: suggestion?.logoUrl,
          isDefault: accounts.length === 0,
        });
      }

      const updated = await getAccounts(user.uid);
      setAccounts(updated);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="accounts-page">
        <header className="acc-header">
          <h1 className="text-h1">Accounts</h1>
          <button className="btn-ghost" onClick={openFormForCreate}>
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
              style={{ background: acc.gradient, cursor: 'pointer', position: 'relative' }}
              onClick={() => openFormForEdit(acc)}
            >
              <div className="acc-card-header">
                <p className="acc-card-balance">{formatCurrency(acc.balance)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="acc-card-name">{acc.name}</span>
                  {acc.logoUrl && (
                    <div style={{ width: '24px', height: '24px', background: '#fff', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={acc.logoUrl} alt={acc.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
                    </div>
                  )}
                </div>
              </div>
              <span className="acc-card-type">
                {acc.type === 'bank' ? 'Bank' : acc.type === 'ewallet' ? 'E-Wallet' : acc.type === 'credit_card' ? 'Credit Card' : acc.type === 'cash' ? 'Cash' : acc.type}
              </span>
              {(acc.accountNumber || acc.last4) && (
                <p className="acc-card-last4">{acc.accountNumber ? acc.accountNumber : `•••• ${acc.last4}`}</p>
              )}
              {acc.accountName && <p className="acc-card-type" style={{ marginTop: 2, opacity: 0.8 }}>{acc.accountName}</p>}
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
            <button className="btn-primary" onClick={openFormForCreate} style={{ marginTop: '1.25rem' }}>
              <Plus size={18} /> Add Account
            </button>
          </div>
        )}
      </div>

      {/* Account Form Modal */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title={editingAccount ? "Edit Account" : "Add Account"}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingBottom: '2rem' }}>
          
          {/* Grouped Suggestions (Only show when creating new) */}
          {!editingAccount && Object.entries(groupedSuggestions).map(([groupName, suggestions]) => (
            <div key={groupName} style={{ marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>{groupName}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {suggestions.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => { setAccName(s.name); setAccType(s.type); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-full)',
                      background: accName === s.name ? 'var(--color-income-bg)' : 'var(--color-input-bg)',
                      border: accName === s.name ? '1px solid var(--color-income)' : '1px solid transparent',
                      color: accName === s.name ? 'var(--color-income)' : 'var(--color-text)',
                      fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                    ) : (
                      <span>{s.icon}</span>
                    )}
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="text-caption">Institution Name</label>
            <input type="text" placeholder="e.g. BCA, GoPay" value={accName} onChange={(e) => setAccName(e.target.value)} className="input-field" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="text-caption">Account Type</label>
            <select value={accType} onChange={(e) => setAccType(e.target.value as AccountType)} className="input-field">
              <option value="bank">🏦 Bank Account</option>
              <option value="ewallet">💳 E-Wallet</option>
              <option value="emoney">💳 E-Money</option>
              <option value="cash">💵 Cash</option>
              <option value="credit_card">💳 Credit Card</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="text-caption">Account Holder Name (Optional)</label>
            <input type="text" placeholder="John Doe" value={accHolderName} onChange={(e) => setAccHolderName(e.target.value)} className="input-field" />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="text-caption">Account Number (Optional)</label>
              <input type="text" placeholder="Full account number" value={accNumber} onChange={(e) => setAccNumber(e.target.value.replace(/\D/g, ''))} className="input-field" inputMode="numeric" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="text-caption">Last 4 Digits</label>
              <input type="text" placeholder="e.g. 1234" value={accLast4} onChange={(e) => setAccLast4(e.target.value.slice(0, 4))} className="input-field" maxLength={4} inputMode="numeric" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="text-caption">Current Balance</label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={accBalance}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setAccBalance(v ? parseInt(v).toLocaleString('id-ID') : ''); }}
                className="input-field"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={!accName || isSubmitting} style={{ marginTop: '1rem' }}>
            {isSubmitting ? 'Saving...' : (editingAccount ? 'Save Changes' : 'Add Account')}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
