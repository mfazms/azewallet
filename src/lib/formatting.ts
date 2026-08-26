import type { Currency } from '@/types';

// ============================================
// Currency Formatting
// ============================================

const currencyConfig: Record<Currency, { locale: string; symbol: string; decimals: number }> = {
  IDR: { locale: 'id-ID', symbol: 'Rp', decimals: 0 },
  USD: { locale: 'en-US', symbol: '$', decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 2 },
  JPY: { locale: 'ja-JP', symbol: '¥', decimals: 0 },
  SGD: { locale: 'en-SG', symbol: 'S$', decimals: 2 },
  MYR: { locale: 'ms-MY', symbol: 'RM', decimals: 2 },
};

export function formatCurrency(amount: number, currency: Currency = 'IDR'): string {
  const config = currencyConfig[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency: Currency = 'IDR'): string {
  const config = currencyConfig[currency];

  if (currency === 'IDR') {
    if (amount >= 1_000_000_000) return `${config.symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `${config.symbol}${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${config.symbol}${(amount / 1_000).toFixed(0)}K`;
    return `${config.symbol}${amount}`;
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// ============================================
// Date Formatting
// ============================================

export function formatDate(dateString: string, locale: string = 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(dateString);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDayMonth(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

// ============================================
// Percentage
// ============================================

export function formatPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}
