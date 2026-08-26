'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, ChevronDown } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { useAuthStore, useAppStore } from '@/stores';
import { createTransaction } from '@/lib/firebase/firestore';
import { uploadReceipt } from '@/lib/firebase/storage';
import { DEFAULT_CATEGORIES } from '@/types';
import type { TransactionType } from '@/types';

interface TransactionComposerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionComposer({ isOpen, onClose }: TransactionComposerProps) {
  const { user } = useAuthStore();
  const { accounts, categories, showToast, addTransaction } = useAppStore();
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

  // Auto-focus amount on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => amountRef.current?.focus(), 400);
      // Set defaults
      if (accounts.length > 0 && !selectedAccountId) {
        const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [isOpen, accounts, selectedAccountId]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setType('expense');
        setAmount('');
        setMerchant('');
        setSelectedCategory('');
        setSelectedCategoryIcon('');
        setNote('');
        setImageFile(null);
        setImagePreview(null);
        setShowCategories(false);
      }, 300);
    }
  }, [isOpen]);

  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `default-${i}` }));

  // Auto-suggest category from merchant text
  useEffect(() => {
    if (!merchant || selectedCategory) return;

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
  }, [merchant, selectedCategory, activeCategories]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !amount || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const numAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
      if (isNaN(numAmount) || numAmount <= 0) return;

      let imageUrl: string | null = null;

      // Upload image if present
      if (imageFile) {
        const tempId = Date.now().toString();
        imageUrl = await uploadReceipt(user.uid, tempId, imageFile);
      }

      const selectedAccount = accounts.find(a => a.id === selectedAccountId);

      const txId = await createTransaction(user.uid, {
        amount: numAmount,
        currency: 'IDR',
        type,
        category: selectedCategory || 'Others',
        categoryIcon: selectedCategoryIcon || '📦',
        accountId: selectedAccountId,
        accountName: selectedAccount?.name || '',
        merchant: merchant || '',
        note,
        imageUrl,
        createdAtUTC: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        deletedAt: null,
      });

      // Add to local state immediately for instant UI update
      addTransaction({
        id: txId,
        amount: numAmount,
        currency: 'IDR',
        type,
        category: selectedCategory || 'Others',
        categoryIcon: selectedCategoryIcon || '📦',
        accountId: selectedAccountId,
        accountName: selectedAccount?.name || '',
        merchant: merchant || '',
        note,
        imageUrl,
        createdAtUTC: new Date().toISOString(),
        timezone: 'Asia/Jakarta',
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const sign = (type === 'income' || type === 'transfer_in') ? '+' : '-';
      showToast(
        `${sign}Rp${numAmount.toLocaleString('id-ID')} saved`,
        undefined,
        undefined
      );

      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
      showToast('Failed to save. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <div className="tx-composer">
        {/* Type Selector */}
        <div className="tx-type-selector">
          {([
            { key: 'expense' as TransactionType, label: '💸 Expense' },
            { key: 'income' as TransactionType, label: '💰 Income' },
            { key: 'transfer_in' as TransactionType, label: '📥 Transfer In' },
            { key: 'transfer_out' as TransactionType, label: '📤 Transfer Out' },
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

        {/* Category Selector */}
        <button
          className="tx-selector-btn"
          onClick={() => setShowCategories(!showCategories)}
        >
          <span>
            {selectedCategoryIcon || '📂'} {selectedCategory || 'Choose category'}
          </span>
          <ChevronDown size={18} />
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="tx-category-grid-wrapper"
            >
              <div className="tx-category-grid">
                {activeCategories.map((cat) => (
                  <button
                    key={cat.id || cat.name}
                    className={`tx-category-chip ${selectedCategory === cat.name ? 'tx-category-active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSelectedCategoryIcon(cat.icon);
                      setShowCategories(false);
                    }}
                  >
                    <span className="tx-category-icon">{cat.icon}</span>
                    <span className="tx-category-name">{cat.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="tx-account-row">
            {accounts.slice(0, 4).map((acc) => (
              <button
                key={acc.id}
                className={`tx-account-chip ${selectedAccountId === acc.id ? 'tx-account-active' : ''}`}
                onClick={() => setSelectedAccountId(acc.id)}
              >
                {acc.name}
              </button>
            ))}
          </div>
        )}

        {/* Optional: Note */}
        <input
          type="text"
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input-field"
          autoComplete="off"
        />

        {/* Photo */}
        <div className="tx-photo-section">
          {imagePreview ? (
            <div className="tx-photo-preview">
              <img src={imagePreview} alt="Receipt" />
              <button className="tx-photo-remove" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="tx-photo-btn">
              <Camera size={18} />
              <span>Add receipt</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                hidden
              />
            </label>
          )}
        </div>

        {/* Save Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!amount || isSubmitting}
          style={{ marginTop: '0.5rem' }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </motion.button>
      </div>

      
    </BottomSheet>
  );
}
