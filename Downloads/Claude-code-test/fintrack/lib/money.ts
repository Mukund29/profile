/**
 * Currency utilities built on dinero.js v2.
 * All monetary values in this app are stored as bigint (smallest unit: paise/cents/pence).
 * NEVER pass raw floats to Supabase — always convert through these helpers.
 */
import {
  dinero, add, subtract, toSnapshot,
  INR, USD, GBP, AUD, CAD, SGD, AED, EUR, JPY, NZD,
  ZAR, NGN, BRL, MXN, IDR, PHP, KES,
} from 'dinero.js';

// Currency registry — maps ISO 4217 code → dinero.js currency object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CURRENCY_MAP: Record<string, any> = {
  INR, USD, GBP, AUD, CAD, SGD, AED, EUR, JPY, NZD,
  ZAR, NGN, BRL, MXN, IDR, PHP, KES,
};

// Currency symbol map
const SYMBOL_MAP: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', AUD: 'A$', CAD: 'C$',
  SGD: 'S$', AED: 'د.إ', EUR: '€', JPY: '¥', NZD: 'NZ$',
  ZAR: 'R', NGN: '₦', BRL: 'R$', MXN: 'MX$', IDR: 'Rp',
  PHP: '₱', KES: 'KSh',
};

function getCurrency(code: string): typeof INR {
  const c = CURRENCY_MAP[code.toUpperCase()];
  if (!c) throw new Error(`[money] Unknown currency code: ${code}`);
  return c;
}

/**
 * Convert a human-readable decimal amount to smallest unit (integer).
 * e.g. 123.45 INR → 12345 (paise)
 *      10.00 USD → 1000 (cents)
 *      10.00 JPY → 10  (JPY has 0 exponent — no subunit)
 */
export function toSmallestUnit(decimal: number, currencyCode: string): number {
  const currency = getCurrency(currencyCode);
  const factor = Math.pow(10, currency.exponent);
  return Math.round(decimal * factor);
}

/**
 * Convert smallest unit to human-readable decimal.
 * e.g. 12345 INR → 123.45
 */
export function fromSmallestUnit(amount: number, currencyCode: string): number {
  const currency = getCurrency(currencyCode);
  const factor = Math.pow(10, currency.exponent);
  return amount / factor;
}

/**
 * Format an amount (in smallest unit) to a display string.
 * e.g. 12345 INR → "₹123.45"
 *      1000 USD → "$10.00"
 */
export function formatAmount(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const symbol = SYMBOL_MAP[currencyCode.toUpperCase()] ?? currencyCode;
  const decimal = fromSmallestUnit(amount, currencyCode);
  const formatted = decimal.toLocaleString('en-IN', {
    minimumFractionDigits: currency.exponent,
    maximumFractionDigits: currency.exponent,
  });
  return `${symbol}${formatted}`;
}

/**
 * Format with sign: positive amounts get "+", negative get "−".
 * e.g. income 5000 INR → "+₹50.00"
 */
export function formatWithSign(amount: number, currencyCode: string): string {
  const str = formatAmount(Math.abs(amount), currencyCode);
  return amount >= 0 ? `+${str}` : `−${str}`;
}

/**
 * Add two amounts in smallest unit. Currencies must match.
 */
export function addAmounts(a: number, b: number, currencyCode: string): number {
  const currency = getCurrency(currencyCode);
  const da = dinero({ amount: a, currency });
  const db = dinero({ amount: b, currency });
  return toSnapshot(add(da, db)).amount;
}

/**
 * Subtract b from a in smallest unit. Currencies must match.
 */
export function subtractAmounts(a: number, b: number, currencyCode: string): number {
  const currency = getCurrency(currencyCode);
  const da = dinero({ amount: a, currency });
  const db = dinero({ amount: b, currency });
  return toSnapshot(subtract(da, db)).amount;
}

export { SYMBOL_MAP, CURRENCY_MAP };
