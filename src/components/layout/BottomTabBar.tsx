'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Activity, Wallet, Target, CreditCard, Plus } from 'lucide-react';
import { useAppStore } from '@/stores';

const tabs = [
  { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'activity', label: 'Activity', icon: Activity, path: '/activity' },
  { id: 'fab', label: '', icon: Plus, path: '' }, // FAB placeholder
  { id: 'goals', label: 'Goals', icon: Target, path: '/goals' },
  { id: 'accounts', label: 'Accounts', icon: CreditCard, path: '/accounts' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const setTransactionSheetOpen = useAppStore((s) => s.setTransactionSheetOpen);

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="tab-bar glass-heavy" role="tablist">
      {tabs.filter(t => t.id !== 'fab').map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.path);

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            className={`tab-item ${active ? 'tab-active' : ''}`}
            onClick={() => router.push(tab.path)}
          >
            <div className="tab-icon-wrapper">
              <Icon
                size={24}
                strokeWidth={active ? 2.2 : 1.8}
              />
            </div>
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}

      {/* FAB Button - Rendered independently as it's absolute positioned */}
      <button
        className="fab-button"
        onClick={() => setTransactionSheetOpen(true)}
        aria-label="Add transaction"
      >
        <div className="fab-inner">
          <Plus size={28} strokeWidth={2.5} />
        </div>
      </button>

      
    </nav>
  );
}
