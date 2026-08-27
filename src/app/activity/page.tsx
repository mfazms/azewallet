'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getTransactions } from '@/lib/firebase/firestore';
import { formatCurrency, formatRelativeDate, formatTime } from '@/lib/formatting';
import TransactionComposer from '@/features/transactions/TransactionComposer';
import type { Transaction } from '@/types';

export default function ActivityPage() {
  const { user } = useAuthStore();
  const { transactions, setTransactions } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const txs = await getTransactions(user.uid, {
        limitCount: 50,
        typeFilter: filterType || undefined,
      });
      setTransactions(txs);
    };
    fetch();
  }, [user, filterType, setTransactions]);

  const filtered = transactions.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.merchant.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.note || '').toLowerCase().includes(q) ||
      tx.accountName.toLowerCase().includes(q)
    );
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, tx) => {
    const date = formatRelativeDate(tx.createdAtUTC);
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});

  const getAmountColor = (type: string) => {
    if (type === 'income' || type === 'transfer_in') return 'color-income';
    if (type === 'transfer' || type === 'transfer_out') return 'color-transfer';
    return 'color-expense';
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'income' || type === 'transfer_in') return '+';
    if (type === 'transfer' || type === 'transfer_out') return '-';
    return '-';
  };

  return (
    <div className="page-container">
      <div className="activity-page">
        <header className="act-header">
          <h1 className="text-h1">Activity</h1>
        </header>

        {/* Filters */}
        <div className="act-filters">
          {[
            { value: '', label: 'All' },
            { value: 'expense', label: '⬇️ Expense' },
            { value: 'income', label: '⬆️ Income' },
            { value: 'transfer_in', label: '↗️ Transfer In' },
            { value: 'transfer_out', label: '↘️ Transfer Out' },
          ].map((t) => (
            <button
              key={t.value}
              className={`act-filter-chip ${filterType === t.value ? 'act-filter-active' : ''}`}
              onClick={() => setFilterType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="act-search">
          <Search size={18} className="act-search-icon" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {/* Transaction List */}
        <div className="act-list">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date} className="act-group">
              <p className="act-date-label">{date}</p>
              {txs.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="act-tx-item"
                  onClick={() => setEditingTx(tx)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="act-tx-icon">{tx.categoryIcon || '📦'}</span>
                  <div className="act-tx-info">
                    <p className="act-tx-merchant">{tx.merchant || tx.category}</p>
                    <p className="text-caption">{tx.accountName} • {formatTime(tx.createdAtUTC)}</p>
                  </div>
                  <span className={`act-tx-amount text-money ${getAmountColor(tx.type)}`}>
                    {getAmountPrefix(tx.type)}{formatCurrency(tx.amount)}
                  </span>
                </motion.div>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="act-empty">
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</p>
              <p className="text-body-small" style={{ color: 'var(--color-text-secondary)' }}>
                {search ? 'No transactions found' : 'No transactions yet'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {editingTx && (
        <TransactionComposer
          isOpen={true}
          onClose={() => setEditingTx(null)}
          editTransaction={editingTx}
        />
      )}
    </div>
  );
}
