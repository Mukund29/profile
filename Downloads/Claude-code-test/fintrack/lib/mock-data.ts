/**
 * Mock data for UI demo / development testing.
 * Replace with real Supabase calls once DB is configured (see SUPABASE_SETUP.md).
 *
 * All amounts are in INR paise (smallest unit): ₹1 = 100 paise.
 */

export interface MockCategory {
  id: string;
  name: string;
  icon: string;
  colour_hex: string;
  default_type: 'need' | 'want' | 'saving';
}

export interface MockTransaction {
  id: string;
  description: string;
  amount: number;       // paise
  currency: string;
  txn_type: 'need' | 'want' | 'saving';
  txn_date: string;     // YYYY-MM-DD
  source: string;
  categories: { name: string; icon: string } | null;
}

// ── Categories ─────────────────────────────────────────────────────────────────
export const MOCK_CATEGORIES: MockCategory[] = [
  // Needs
  { id: 'cat-01', name: 'Groceries',       icon: '🛒', colour_hex: '#6366f1', default_type: 'need' },
  { id: 'cat-02', name: 'Rent',            icon: '🏠', colour_hex: '#6366f1', default_type: 'need' },
  { id: 'cat-03', name: 'Transport',       icon: '🚌', colour_hex: '#6366f1', default_type: 'need' },
  { id: 'cat-04', name: 'Health',          icon: '💊', colour_hex: '#6366f1', default_type: 'need' },
  { id: 'cat-05', name: 'Utilities',       icon: '⚡', colour_hex: '#6366f1', default_type: 'need' },
  { id: 'cat-06', name: 'Eating Out',      icon: '🍽️', colour_hex: '#6366f1', default_type: 'need' },
  // Wants
  { id: 'cat-07', name: 'Entertainment',   icon: '🎬', colour_hex: '#f59e0b', default_type: 'want' },
  { id: 'cat-08', name: 'Shopping',        icon: '🛍️', colour_hex: '#f59e0b', default_type: 'want' },
  { id: 'cat-09', name: 'Travel',          icon: '✈️', colour_hex: '#f59e0b', default_type: 'want' },
  { id: 'cat-10', name: 'Subscriptions',   icon: '📱', colour_hex: '#f59e0b', default_type: 'want' },
  // Savings
  { id: 'cat-11', name: 'Emergency Fund',  icon: '🛡️', colour_hex: '#22c55e', default_type: 'saving' },
  { id: 'cat-12', name: 'Investments',     icon: '📈', colour_hex: '#22c55e', default_type: 'saving' },
  { id: 'cat-13', name: 'Fixed Deposit',   icon: '🏦', colour_hex: '#22c55e', default_type: 'saving' },
];

// ── Transactions (in-memory store, mutable for add) ────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const _seed: MockTransaction[] = [
  {
    id: 'txn-01', description: 'Big Basket order',
    amount: 284500, currency: 'INR', txn_type: 'need', txn_date: daysAgo(0),
    source: 'manual', categories: { name: 'Groceries', icon: '🛒' },
  },
  {
    id: 'txn-02', description: 'Ola cab to office',
    amount: 18700, currency: 'INR', txn_type: 'need', txn_date: daysAgo(0),
    source: 'manual', categories: { name: 'Transport', icon: '🚌' },
  },
  {
    id: 'txn-03', description: 'Netflix subscription',
    amount: 64900, currency: 'INR', txn_type: 'want', txn_date: daysAgo(1),
    source: 'manual', categories: { name: 'Subscriptions', icon: '📱' },
  },
  {
    id: 'txn-04', description: 'Apollo Pharmacy',
    amount: 52000, currency: 'INR', txn_type: 'need', txn_date: daysAgo(1),
    source: 'manual', categories: { name: 'Health', icon: '💊' },
  },
  {
    id: 'txn-05', description: 'SIP — Mirae Asset ELSS',
    amount: 500000, currency: 'INR', txn_type: 'saving', txn_date: daysAgo(2),
    source: 'manual', categories: { name: 'Investments', icon: '📈' },
  },
  {
    id: 'txn-06', description: 'Zomato — Burger King',
    amount: 37800, currency: 'INR', txn_type: 'need', txn_date: daysAgo(2),
    source: 'manual', categories: { name: 'Eating Out', icon: '🍽️' },
  },
  {
    id: 'txn-07', description: 'BookMyShow — Kalki 2898 AD',
    amount: 89800, currency: 'INR', txn_type: 'want', txn_date: daysAgo(3),
    source: 'manual', categories: { name: 'Entertainment', icon: '🎬' },
  },
  {
    id: 'txn-08', description: 'DMart groceries',
    amount: 156300, currency: 'INR', txn_type: 'need', txn_date: daysAgo(4),
    source: 'manual', categories: { name: 'Groceries', icon: '🛒' },
  },
  {
    id: 'txn-09', description: 'Amazon — AirPods case',
    amount: 199900, currency: 'INR', txn_type: 'want', txn_date: daysAgo(5),
    source: 'manual', categories: { name: 'Shopping', icon: '🛍️' },
  },
  {
    id: 'txn-10', description: 'BSES electricity bill',
    amount: 138000, currency: 'INR', txn_type: 'need', txn_date: daysAgo(6),
    source: 'manual', categories: { name: 'Utilities', icon: '⚡' },
  },
  {
    id: 'txn-11', description: 'Emergency fund top-up',
    amount: 1000000, currency: 'INR', txn_type: 'saving', txn_date: daysAgo(7),
    source: 'manual', categories: { name: 'Emergency Fund', icon: '🛡️' },
  },
  {
    id: 'txn-12', description: 'Indigo — Goa trip',
    amount: 487500, currency: 'INR', txn_type: 'want', txn_date: daysAgo(8),
    source: 'manual', categories: { name: 'Travel', icon: '✈️' },
  },
  {
    id: 'txn-13', description: 'Society maintenance',
    amount: 250000, currency: 'INR', txn_type: 'need', txn_date: daysAgo(10),
    source: 'manual', categories: { name: 'Utilities', icon: '⚡' },
  },
  {
    id: 'txn-14', description: 'Nykaa — skincare',
    amount: 112000, currency: 'INR', txn_type: 'want', txn_date: daysAgo(12),
    source: 'manual', categories: { name: 'Shopping', icon: '🛍️' },
  },
  {
    id: 'txn-15', description: 'SBI Fixed Deposit',
    amount: 5000000, currency: 'INR', txn_type: 'saving', txn_date: daysAgo(14),
    source: 'manual', categories: { name: 'Fixed Deposit', icon: '🏦' },
  },
];

// Mutable store — add-transaction appends here at runtime.
let _transactions: MockTransaction[] = [..._seed];

export function getMockTransactions(): MockTransaction[] {
  return [..._transactions].sort((a, b) => (b.txn_date > a.txn_date ? 1 : -1));
}

export function addMockTransaction(txn: Omit<MockTransaction, 'id'>): MockTransaction {
  const newTxn: MockTransaction = {
    ...txn,
    id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  _transactions = [newTxn, ..._transactions];
  return newTxn;
}

export function updateMockTransaction(
  id: string,
  updates: Partial<Omit<MockTransaction, 'id'>>,
): MockTransaction | null {
  let found: MockTransaction | null = null;
  _transactions = _transactions.map((t) => {
    if (t.id !== id) return t;
    found = { ...t, ...updates };
    return found;
  });
  return found;
}

export function deleteMockTransaction(id: string): void {
  _transactions = _transactions.filter((t) => t.id !== id);
}
