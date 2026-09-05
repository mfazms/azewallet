'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, ChevronDown } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { useAuthStore, useAppStore } from '@/stores';
import { createTransaction, updateTransaction, softDeleteTransaction } from '@/lib/firebase/firestore';
import { uploadReceipt } from '@/lib/firebase/storage';
import { DEFAULT_CATEGORIES } from '@/types';
import type { TransactionType, Transaction } from '@/types';

interface TransactionComposerProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export default function TransactionComposer({ isOpen, onClose, editTransaction }: TransactionComposerProps) {
  const { user } = useAuthStore();
  const { accounts, categories, showToast, addTransaction, removeTransaction } = useAppStore();
  const amountRef = useRef<HTMLInputElement>(null);

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Auto-focus amount on open and set data if editing
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => amountRef.current?.focus(), 400);
      
      if (editTransaction) {
        setType(editTransaction.type);
        setAmount(editTransaction.amount.toLocaleString('id-ID'));
        setMerchant(editTransaction.merchant || '');
        setSelectedCategory(editTransaction.category);
        setSelectedCategoryIcon(editTransaction.categoryIcon);
        setSelectedAccountId(editTransaction.accountId);
        setNote(editTransaction.note || '');
        setImagePreview(editTransaction.imageUrl || null);
      } else {
        // Set defaults for new
        if (accounts.length > 0 && !selectedAccountId) {
          const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
          setSelectedAccountId(defaultAccount.id);
        }
      }
    }
  }, [isOpen, accounts, selectedAccountId, editTransaction]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        if (!editTransaction) {
          setType('expense');
          setAmount('');
          setMerchant('');
          setSelectedCategory('');
          setSelectedCategoryIcon('');
          setNote('');
          setImageFile(null);
          setImagePreview(null);
        }
        setShowCategories(false);
      }, 300);
    }
  }, [isOpen, editTransaction]);

  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `default-${i}` }));

  // Auto-suggest category from merchant text (only if creating new)
  useEffect(() => {
    if (editTransaction || !merchant || selectedCategory) return;

    const lowerMerchant = merchant.toLowerCase();
    const foodKeywords = ['nasi', 'makan', 'coffee', 'kopi', 'warung', 'resto', 'food', 'lunch', 'dinner', 'breakfast', 'pecel', 'bakso', 'mie', 'sate', 'ayam', 'drink', 'tea', 'juice'];
    const transportKeywords = ['grab', 'gojek', 'uber', 'taxi', 'bensin', 'gas', 'parkir', 'tol', 'kereta', 'bus'];
    const shopKeywords = ['shop', 'beli', 'mall', 'tokopedia', 'shopee', 'lazada', 'amazon'];
    const billKeywords = ['listrik', 'pln', 'air', 'pdam', 'internet', 'wifi', 'telkom', 'indihome'];

    if (foodKeywords.some(k => lowerMerchant.includes(k))) {
      const cat = activeCategories.find(c => c.name === 'Food & Beverage');
      if (cat) { setSelectedCategory(cat.name); setSelectedCategoryIcon(cat.icon); }
    } else if (transportKeywords.some(k => lowerMerchant.includes(k))) {
      const cat = activeCategories.find(c => c.name === 'Transport');
      if (cat) { setSelectedCategory(cat.name); setSelectedCategoryIcon(cat.icon); }
    } else if (shopKeywords.some(k => lowerMerchant.includes(k))) {
      const cat = activeCategories.find(c => c.name === 'Shopping');
      if (cat) { setSelectedCategory(cat.name); setSelectedCategoryIcon(cat.icon); }
    } else if (billKeywords.some(k => lowerMerchant.includes(k))) {
      const cat = activeCategories.find(c => c.name === 'Bills & Utilities');
      if (cat) { setSelectedCategory(cat.name); setSelectedCategoryIcon(cat.icon); }
    }
  }, [merchant, selectedCategory, activeCategories, editTransaction]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!user || !editTransaction?.id || isSubmitting) return;
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    setIsSubmitting(true);
    try {
      await softDeleteTransaction(user.uid, editTransaction.id);
      removeTransaction(editTransaction.id);
      showToast('Transaction deleted');
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !amount || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const numAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
      if (isNaN(numAmount) || numAmount <= 0) return;

      let imageUrl: string | null = editTransaction?.imageUrl || null;

      // Upload image if present and new
      if (imageFile) {
        const tempId = Date.now().toString();
        imageUrl = await uploadReceipt(user.uid, tempId, imageFile);
      }

      const selectedAccount = accounts.find(a => a.id === selectedAccountId);
      
      const payload = {
        amount: numAmount,
        currency: 'IDR' as const,
        type,
        category: selectedCategory || 'Others',
        categoryIcon: selectedCategoryIcon || '📦',
        accountId: selectedAccountId,
        accountName: selectedAccount?.name || '',
        merchant: merchant || '',
        note,
        imageUrl,
      };

      if (editTransaction) {
        await updateTransaction(user.uid, editTransaction.id, payload);
        // Remove old and add new for local state update
        removeTransaction(editTransaction.id);
        addTransaction({
          ...editTransaction,
          ...payload,
          updatedAt: new Date().toISOString()
        });
        showToast('Transaction updated');
      } else {
        const txId = await createTransaction(user.uid, {
          ...payload,
          createdAtUTC: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
          deletedAt: null,
        });

        addTransaction({
          id: txId,
          ...payload,
          createdAtUTC: new Date().toISOString(),
          timezone: 'Asia/Jakarta',
          deletedAt: null,
          updatedAt: new Date().toISOString(),
        });

        const sign = (type === 'income' || type === 'transfer_in') ? '+' : '-';
        showToast(`${sign}Rp${numAmount.toLocaleString('id-ID')} saved`, undefined, undefined);
      }

      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showToast('Failed to save. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editTransaction ? "Edit Transaction" : "Add Transaction"}>
      <div className="tx-composer">
        {/* Type Selector */}
        <div className="tx-type-selector">
          {([
            { key: 'expense' as TransactionType, label: '⬇️ Expense' },
            { key: 'income' as TransactionType, label: '⬆️ Income' },
            { key: 'transfer_in' as TransactionType, label: '↗️ Transfer In' },
            { key: 'transfer_out' as TransactionType, label: '↘️ Transfer Out' },
          ]).map((t) => (
            <button
              key={t.key}
              className={`tx-type-btn ${type === t.key ? 'tx-type-active' : ''}`}
              onClick={() => setType(t.key)}
              data-type={t.key}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="tx-amount-section">
          <span className="tx-currency-label">Rp</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setAmount(val ? parseInt(val).toLocaleString('id-ID') : '');
            }}
            className="tx-amount-input"
            autoComplete="off"
          />
        </div>

        {/* Merchant */}
        <input
          type="text"
          placeholder="What did you spend on?"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="input-field"
          autoComplete="off"
        />

        {/* Category & Account Selection */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Category Dropdown Toggle */}
          <button
            className="input-field"
            style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => setShowCategories(!showCategories)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{selectedCategoryIcon || '📁'}</span>
              <span style={{ color: selectedCategory ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
                {selectedCategory || 'Category'}
              </span>
            </div>
            <ChevronDown size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>

          {/* Account Selection */}
          <select
            className="input-field"
            style={{ flex: 1 }}
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Categories Drawer */}
        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                padding: '0.5rem 0',
              }}>
                {activeCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSelectedCategoryIcon(cat.icon);
                      setShowCategories(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedCategory === cat.name ? 'var(--color-input-bg)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes & Receipt */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Add note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-field"
            style={{ flex: 1 }}
          />

          <label
            className="input-field"
            style={{
              width: '3.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: imagePreview ? 'var(--color-accent)' : 'var(--color-input-bg)',
              color: imagePreview ? '#FFF' : 'var(--color-text-secondary)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Receipt" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                <Camera size={18} style={{ position: 'relative', zIndex: 2 }} />
              </>
            ) : (
              <Camera size={18} />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              hidden
            />
          </label>
        </div>

        {imagePreview && (
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <img src={imagePreview} alt="Receipt Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            <button
              onClick={() => { setImagePreview(null); setImageFile(null); }}
              style={{
                position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)',
                color: '#FFF', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
          {editTransaction && (
            <button
              className="btn-secondary"
              onClick={handleDelete}
              disabled={isSubmitting}
              style={{ flex: '0 0 auto', padding: '0 1.5rem', height: '3.5rem', color: 'var(--color-expense)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              Delete
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!amount || !selectedAccountId || isSubmitting}
            style={{ flex: 1, height: '3.5rem' }}
          >
            {isSubmitting ? 'Saving...' : (editTransaction ? 'Save Changes' : 'Save Transaction')}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
