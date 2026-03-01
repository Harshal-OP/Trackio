export const DEFAULT_CURRENCY = 'USD';
export const CURRENCY_STORAGE_KEY = 'trakio.currency';

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'AED' },
] as const;

export function normalizeCurrencyCode(value?: string | null) {
  if (!value) return DEFAULT_CURRENCY;
  const normalized = value.trim().toUpperCase();
  return normalized.length === 3 ? normalized : DEFAULT_CURRENCY;
}

export function formatCurrencyAmount(
  amount: number,
  currency?: string,
  options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>
) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  }
}

export function readCachedCurrency() {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  return normalizeCurrencyCode(window.localStorage.getItem(CURRENCY_STORAGE_KEY));
}

export function writeCachedCurrency(currency?: string | null) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, normalizeCurrencyCode(currency));
}
