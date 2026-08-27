'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { createAccount, createCategory } from '@/lib/firebase/firestore';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNT_SUGGESTIONS } from '@/types';
import type { Currency, Language, AccountType } from '@/types';

const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Form data
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [language, setLanguage] = useState<Language>('en');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [paydayDate, setPaydayDate] = useState(25);
  const [mainGoalType, setMainGoalType] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [accountBalances, setAccountBalances] = useState<Record<string, string>>({});
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const incomeNum = parseFloat(monthlyIncome.replace(/[^0-9]/g, '')) || 0;

      // Update user profile
      await updateUserProfile(user.uid, {
        preferredCurrency: currency,
        preferredLanguage: language,
        monthlyIncome: incomeNum,
        paydayDate,
        budgetCycleStart: paydayDate,
        isOnboardingComplete: true,
      });

      // Create selected accounts
      for (const accName of selectedAccounts) {
        const suggestion = DEFAULT_ACCOUNT_SUGGESTIONS.find(s => s.name === accName);
        if (suggestion) {
          const balance = parseFloat((accountBalances[accName] || '0').replace(/[^0-9]/g, '')) || 0;
          await createAccount(user.uid, {
            name: suggestion.name,
            bankName: suggestion.name,
            type: suggestion.type,
            last4: '',
            color: '',
            gradient: suggestion.gradient,
            icon: suggestion.icon || '🏦',
            logoUrl: suggestion.logoUrl,
            balance,
            currency,
            isDefault: selectedAccounts.size === 1 || accName === Array.from(selectedAccounts)[0],
          });
        }
      }

      // Create default categories
      for (const cat of DEFAULT_CATEGORIES) {
        const budgetStr = categoryBudgets[cat.name] || '0';
        const budgetAmount = parseFloat(budgetStr.replace(/[^0-9]/g, '')) || 0;
        await createCategory(user.uid, {
          ...cat,
          budgetAmount,
        });
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAccount = (name: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedAccounts(next);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <div className="ob-step ob-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="ob-emoji"
            >
              ðŸ’°
            </motion.div>
            <h1 className="text-h1">Let&apos;s get your money<br />under control</h1>
            <p className="ob-desc">Set up takes less than 90 seconds. You can always change these later.</p>
          </div>
        );
      case 1: // Currency
        return (
          <div className="ob-step">
            <h2 className="text-h2">What currency?</h2>
            <p className="ob-desc">Choose your primary currency</p>
            <div className="ob-options">
              {(['IDR', 'USD', 'EUR', 'JPY', 'SGD', 'MYR'] as Currency[]).map((c) => (
                <button key={c} className={`ob-option ${currency === c ? 'ob-selected' : ''}`} onClick={() => setCurrency(c)}>
                  <span className="ob-option-icon">{c === 'IDR' ? 'ðŸ‡®ðŸ‡©' : c === 'USD' ? 'ðŸ‡ºðŸ‡¸' : c === 'EUR' ? 'ðŸ‡ªðŸ‡º' : c === 'JPY' ? 'ðŸ‡¯ðŸ‡µ' : c === 'SGD' ? 'ðŸ‡¸ðŸ‡¬' : 'ðŸ‡²ðŸ‡¾'}</span>
                  <span>{c}</span>
                  {currency === c && <Check size={18} className="ob-check" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 2: // Language
        return (
          <div className="ob-step">
            <h2 className="text-h2">Language</h2>
            <p className="ob-desc">Choose your preferred language</p>
            <div className="ob-options">
              <button className={`ob-option ${language === 'id' ? 'ob-selected' : ''}`} onClick={() => setLanguage('id')}>
                <span className="ob-option-icon">ðŸ‡®ðŸ‡©</span><span>Bahasa Indonesia</span>
                {language === 'id' && <Check size={18} className="ob-check" />}
              </button>
              <button className={`ob-option ${language === 'en' ? 'ob-selected' : ''}`} onClick={() => setLanguage('en')}>
                <span className="ob-option-icon">ðŸ‡ºðŸ‡¸</span><span>English</span>
                {language === 'en' && <Check size={18} className="ob-check" />}
              </button>
            </div>
          </div>
        );
      case 3: // Monthly Income
        return (
          <div className="ob-step">
            <h2 className="text-h2">Monthly income?</h2>
            <p className="ob-desc">How much do you earn each month? (approximate is fine)</p>
            <div className="ob-amount-input">
              <span className="ob-amount-prefix">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="8,000,000"
                value={monthlyIncome}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setMonthlyIncome(val ? parseInt(val).toLocaleString('id-ID') : '');
                }}
                className="ob-amount-field"
                autoFocus
              />
            </div>
          </div>
        );
      case 4: // Payday
        return (
          <div className="ob-step">
            <h2 className="text-h2">When do you get paid?</h2>
            <p className="ob-desc">This sets your budget cycle (e.g., 25th â†’ your cycle runs 25th to 24th)</p>
            <div className="ob-date-grid">
              {[1, 5, 10, 15, 20, 25, 28, 30].map((d) => (
                <button key={d} className={`ob-date-btn ${paydayDate === d ? 'ob-selected' : ''}`} onClick={() => setPaydayDate(d)}>
                  {d}
                  <span className="ob-date-suffix">{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 5: // Main Goal
        return (
          <div className="ob-step">
            <h2 className="text-h2">What are you working toward?</h2>
            <p className="ob-desc">Your main financial goal right now</p>
            <div className="ob-options">
              {[
                { id: 'save', icon: 'ðŸ’°', label: 'Save money' },
                { id: 'debt', icon: 'ðŸ’³', label: 'Pay off debt' },
                { id: 'purchase', icon: 'ðŸŽ¯', label: 'Save for a purchase' },
                { id: 'emergency', icon: 'ðŸ›¡ï¸', label: 'Emergency fund' },
              ].map((g) => (
                <button key={g.id} className={`ob-option ${mainGoalType === g.id ? 'ob-selected' : ''}`} onClick={() => setMainGoalType(g.id)}>
                  <span className="ob-option-icon">{g.icon}</span><span>{g.label}</span>
                  {mainGoalType === g.id && <Check size={18} className="ob-check" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 6: // Accounts
        return (
          <div className="ob-step">
            <h2 className="text-h2">Your accounts</h2>
            <p className="ob-desc">Select the accounts you use (you can add more later)</p>
            <div className="ob-account-grid">
              {DEFAULT_ACCOUNT_SUGGESTIONS.map((acc) => (
                <button
                  key={acc.name}
                  className={`ob-account-chip ${selectedAccounts.has(acc.name) ? 'ob-selected' : ''}`}
                  onClick={() => toggleAccount(acc.name)}
                >
                  <span>{acc.icon}</span>
                  <span>{acc.name}</span>
                  {selectedAccounts.has(acc.name) && <Check size={14} />}
                </button>
              ))}
            </div>
            {selectedAccounts.size > 0 && (
              <div className="ob-balance-inputs">
                <p className="text-caption" style={{ marginBottom: '0.5rem' }}>Current balances (optional)</p>
                {Array.from(selectedAccounts).map((name) => (
                  <div key={name} className="ob-balance-row">
                    <span className="ob-balance-label">{name}</span>
                    <div className="ob-balance-input">
                      <span>Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={accountBalances[name] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setAccountBalances(prev => ({ ...prev, [name]: val ? parseInt(val).toLocaleString('id-ID') : '' }));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 7: // Done
        return (
          <div className="ob-step ob-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="ob-emoji"
            >
              ðŸŽ‰
            </motion.div>
            <h1 className="text-h1">You&apos;re all set!</h1>
            <p className="ob-desc">Your financial plan is ready. Every time you open this app, you&apos;ll know if you&apos;re safe to spend.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-page">
      {/* Progress bar */}
      <div className="ob-progress">
        <div className="ob-progress-bar">
          <motion.div
            className="ob-progress-fill"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="ob-progress-text">{step + 1}/{TOTAL_STEPS}</span>
      </div>

      {/* Step content */}
      <div className="ob-content">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="ob-slide"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="ob-nav">
        {step > 0 ? (
          <button className="btn-ghost" onClick={goBack}>
            <ChevronLeft size={18} /> Back
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button className="btn-primary" onClick={goNext} style={{ width: 'auto', padding: '0.75rem 2rem' }}>
            Continue <ChevronRight size={18} />
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleFinish}
            disabled={isSubmitting}
            style={{ width: 'auto', padding: '0.75rem 2rem' }}
          >
            {isSubmitting ? 'Setting up...' : 'Let\'s go! ðŸš€'}
          </button>
        )}
      </div>

      
    </div>
  );
}
