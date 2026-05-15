/**
 * Accounts Tab — US-039 Accounts overview + US-026 Balance cache UI.
 *
 * Shows:
 *  - Net Worth card (sum of all mock accounts in base currency)
 *  - Per-account cards: name, type, balance, "Updated X ago" badge, status
 *  - "Connect account" CTA (stub for bank SDK integration)
 *
 * Data: mock bank accounts until real Plaid/TrueLayer/Setu connections exist.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../../constants/colors';
import { formatAmount } from '../../../lib/money';
import { useOnboardingStore } from '../../../store/onboarding';

// ── Mock account data ─────────────────────────────────────────────────────────
type AccountStatus = 'active' | 'expired' | 'error' | 'disconnected';
type AccountType   = 'savings' | 'current' | 'credit' | 'cash';

interface MockAccount {
  id: string;
  bankName: string;
  accountType: AccountType;
  accountLast4: string;
  /** Balance in smallest unit (paise/cents/pence) */
  balance: number;
  currency: string;
  status: AccountStatus;
  /** ISO string of last refresh */
  balanceCachedAt: string;
  emoji: string;
  provider: 'manual' | 'plaid' | 'truelayer' | 'setu';
}

// Simulate "Updated X ago" — set cachedAt to some minutes/hours ago
function minsAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 'acc-01',
    bankName: 'HDFC Bank',
    accountType: 'savings',
    accountLast4: '4821',
    balance: 18_43_200,       // ₹18,432.00
    currency: 'INR',
    status: 'active',
    balanceCachedAt: minsAgo(47),
    emoji: '🏦',
    provider: 'setu',
  },
  {
    id: 'acc-02',
    bankName: 'ICICI Bank',
    accountType: 'current',
    accountLast4: '9034',
    balance: 5_20_000,        // ₹5,200.00
    currency: 'INR',
    status: 'active',
    balanceCachedAt: minsAgo(3),
    emoji: '🏛️',
    provider: 'setu',
  },
  {
    id: 'acc-03',
    bankName: 'Cash',
    accountType: 'cash',
    accountLast4: '',
    balance: 4_500_00,        // ₹4,500.00
    currency: 'INR',
    status: 'active',
    balanceCachedAt: minsAgo(120),
    emoji: '💵',
    provider: 'manual',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; bg: string }> = {
  active:       { label: 'Active',        color: '#16a34a', bg: '#dcfce7' },
  expired:      { label: 'Reconnect',     color: '#d97706', bg: '#fef3c7' },
  error:        { label: 'Error',         color: '#dc2626', bg: '#fee2e2' },
  disconnected: { label: 'Disconnected',  color: '#6b7280', bg: '#f3f4f6' },
};

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings: 'Savings',
  current: 'Current',
  credit:  'Credit Card',
  cash:    'Cash',
};

// ── Account Card ──────────────────────────────────────────────────────────────
function AccountCard({ account, baseCurrency }: { account: MockAccount; baseCurrency: string }) {
  const status = STATUS_CONFIG[account.status];
  const ago    = timeAgo(account.balanceCachedAt);
  const needsReconnect = account.status === 'expired' || account.status === 'error';

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.top}>
        {/* Bank icon + name */}
        <View style={cardStyles.bankInfo}>
          <View style={cardStyles.emoji}>
            <Text style={cardStyles.emojiText}>{account.emoji}</Text>
          </View>
          <View>
            <Text style={cardStyles.bankName}>{account.bankName}</Text>
            <Text style={cardStyles.accountType}>
              {ACCOUNT_TYPE_LABELS[account.accountType]}
              {account.accountLast4 ? ` ···${account.accountLast4}` : ''}
            </Text>
          </View>
        </View>
        {/* Status badge */}
        <View style={[cardStyles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[cardStyles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Balance */}
      <Text style={cardStyles.balance}>
        {formatAmount(account.balance, account.currency)}
      </Text>

      {/* Cache info */}
      <View style={cardStyles.footer}>
        <Text style={cardStyles.updatedAt}>Updated {ago}</Text>
        {needsReconnect && (
          <TouchableOpacity style={cardStyles.reconnectBtn}>
            <Text style={cardStyles.reconnectText}>Reconnect →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container:    { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.borderLight },
  top:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bankInfo:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji:        { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  emojiText:    { fontSize: 20 },
  bankName:     { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: Colors.onSurface },
  accountType:  { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText:   { fontFamily: 'WorkSans_600SemiBold', fontSize: 11 },
  balance:      { fontFamily: 'Manrope_700Bold', fontSize: 24, color: Colors.onSurface, letterSpacing: -0.5 },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updatedAt:    { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted },
  reconnectBtn: {},
  reconnectText:{ fontFamily: 'WorkSans_600SemiBold', fontSize: 12, color: Colors.primary },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AccountsTab() {
  const { baseCurrency } = useOnboardingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Net worth = sum of all active account balances
  const netWorth = accounts
    .filter((a) => a.status !== 'disconnected')
    .reduce((sum, a) => sum + a.balance, 0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate cache refresh (1.5s) — real impl would call Supabase edge fn
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((a) => ({ ...a, balanceCachedAt: new Date().toISOString() })),
      );
      setLastRefreshed(new Date());
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accounts</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ── Net Worth Card ────────────────────────────────────────────────── */}
        <View style={[styles.netWorthCard, Shadows.primary]}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthAmount}>{formatAmount(netWorth, baseCurrency)}</Text>
          <Text style={styles.netWorthSub}>
            {accounts.filter((a) => a.status === 'active').length} active account
            {accounts.filter((a) => a.status === 'active').length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.refreshRow}>
            <Text style={styles.refreshLabel}>
              Last refreshed: {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.refreshBtn}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Accounts List ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Your Accounts</Text>
        {accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} baseCurrency={baseCurrency} />
        ))}

        {/* ── Connect CTA ───────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.connectCard} activeOpacity={0.8}>
          <Text style={styles.connectIcon}>➕</Text>
          <View style={styles.connectText}>
            <Text style={styles.connectTitle}>Connect a bank account</Text>
            <Text style={styles.connectSub}>Auto-sync transactions · India, US & UK supported</Text>
          </View>
          <Text style={styles.connectChevron}>›</Text>
        </TouchableOpacity>

        {/* ── Loans placeholder ─────────────────────────────────────────────── */}
        <View style={styles.loansCard}>
          <Text style={styles.loansTitle}>Loans & Liabilities</Text>
          <Text style={styles.loansSub}>Coming in v2 — credit cards, home loans, EMI tracking.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 22, color: Colors.onSurface, letterSpacing: -0.3 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 12 },

  // Net worth
  netWorthCard:   { backgroundColor: Colors.primary, borderRadius: 20, padding: 24, gap: 6 },
  netWorthLabel:  { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  netWorthAmount: { fontFamily: 'Manrope_700Bold', fontSize: 36, color: '#ffffff', lineHeight: 44 },
  netWorthSub:    { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  refreshRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  refreshLabel:   { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  refreshBtn:     { fontFamily: 'WorkSans_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  // Section label
  sectionLabel: { fontFamily: 'WorkSans_600SemiBold', fontSize: 11, color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 },

  // Connect CTA
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  connectIcon:    { fontSize: 22 },
  connectText:    { flex: 1, gap: 2 },
  connectTitle:   { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: Colors.primary },
  connectSub:     { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted },
  connectChevron: { fontFamily: 'WorkSans_400Regular', fontSize: 20, color: Colors.primary },

  // Loans
  loansCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    opacity: 0.6,
  },
  loansTitle: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: Colors.onSurface },
  loansSub:   { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted },
});
