/**
 * Dashboard — Home tab.
 * Shows spending summary, 50-30-20 budget breakdown, and recent transactions.
 * All amounts in smallest currency unit (paise/cents/pence).
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Shadows } from '../../../constants/colors';
import { getMockTransactions, MockTransaction } from '../../../lib/mock-data';
import { formatAmount } from '../../../lib/money';
import { useOnboardingStore } from '../../../store/onboarding';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface BudgetBarProps {
  label: string;
  icon: string;
  amount: number;
  percentage: number;
  color: string;
  baseCurrency: string;
}

function BudgetBar({ label, icon, amount, percentage, color, baseCurrency }: BudgetBarProps) {
  const safePercent = Math.min(100, Math.max(0, percentage));
  return (
    <View style={budgetBarStyles.container}>
      <View style={budgetBarStyles.labelRow}>
        <View style={[budgetBarStyles.iconBadge, { backgroundColor: color + '1A' }]}>
          <Text style={budgetBarStyles.iconText}>{icon}</Text>
        </View>
        <View style={budgetBarStyles.labelInfo}>
          <Text style={budgetBarStyles.labelText}>{label}</Text>
          <Text style={budgetBarStyles.amountText}>{formatAmount(amount, baseCurrency)}</Text>
        </View>
        <Text style={[budgetBarStyles.pctText, { color }]}>
          {safePercent.toFixed(0)}%
        </Text>
      </View>
      <View style={budgetBarStyles.track}>
        <View
          style={[
            budgetBarStyles.fill,
            { width: `${safePercent}%` as `${number}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const budgetBarStyles = StyleSheet.create({
  container: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 16 },
  labelInfo: { flex: 1 },
  labelText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  amountText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
  },
  pctText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  track: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});

// ── Transaction row ───────────────────────────────────────────────────────────

interface TxnRowProps {
  txn: MockTransaction;
  baseCurrency: string;
  isLast: boolean;
}

function TxnRow({ txn, baseCurrency, isLast }: TxnRowProps) {
  const typeColor =
    txn.txn_type === 'need'
      ? Colors.needsBlue
      : txn.txn_type === 'want'
      ? Colors.wantsAmber
      : Colors.savingsGreen;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  let dateLabel = txn.txn_date;
  if (txn.txn_date === today) dateLabel = 'Today';
  else if (txn.txn_date === yesterday) dateLabel = 'Yesterday';
  else {
    const d = new Date(txn.txn_date + 'T00:00:00');
    dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return (
    <View style={[txnRowStyles.row, !isLast && txnRowStyles.rowBorder]}>
      <View style={[txnRowStyles.iconBadge, { backgroundColor: typeColor + '18' }]}>
        <Text style={txnRowStyles.iconText}>
          {txn.categories?.icon ?? '💰'}
        </Text>
      </View>
      <View style={txnRowStyles.info}>
        <Text style={txnRowStyles.desc} numberOfLines={1}>{txn.description}</Text>
        <Text style={txnRowStyles.meta}>
          {txn.categories?.name ?? 'Uncategorised'} · {dateLabel}
        </Text>
      </View>
      <Text style={[txnRowStyles.amount, { color: txn.txn_type === 'saving' ? Colors.savingsGreen : Colors.onSurface }]}>
        {txn.txn_type === 'saving' ? '+' : '−'}{formatAmount(txn.amount, baseCurrency)}
      </Text>
    </View>
  );
}

const txnRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  desc: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  meta: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  amount: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeTab() {
  const { displayName, baseCurrency } = useOnboardingStore();

  const transactions = React.useMemo<MockTransaction[]>(
    () => getMockTransactions(),
    [],
  );

  // Computed totals
  const totals = React.useMemo(() => {
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;

    for (const txn of transactions) {
      if (txn.txn_type === 'need') needsTotal += txn.amount;
      else if (txn.txn_type === 'want') wantsTotal += txn.amount;
      else if (txn.txn_type === 'saving') savingsTotal += txn.amount;
    }

    const spendTotal = needsTotal + wantsTotal; // savings excluded from "spend"
    const grandTotal = needsTotal + wantsTotal + savingsTotal;

    const needsPct = grandTotal > 0 ? (needsTotal / grandTotal) * 100 : 0;
    const wantsPct = grandTotal > 0 ? (wantsTotal / grandTotal) * 100 : 0;
    const savingsPct = grandTotal > 0 ? (savingsTotal / grandTotal) * 100 : 0;

    const spendCount = transactions.filter((t) => t.txn_type !== 'saving').length;

    return {
      needsTotal,
      wantsTotal,
      savingsTotal,
      spendTotal,
      grandTotal,
      needsPct,
      wantsPct,
      savingsPct,
      spendCount,
      totalCount: transactions.length,
    };
  }, [transactions]);

  const recentTransactions = React.useMemo<MockTransaction[]>(
    () => transactions.slice(0, 5),
    [transactions],
  );

  const name = displayName.trim() || 'there';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {name} 👋
            </Text>
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
          </View>
          <Pressable
            style={styles.avatarCircle}
            onPress={() => router.push('/(app)/(tabs)/settings' as never)}
          >
            <Text style={styles.avatarInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* ── Spending Card ────────────────────────────────────────────────── */}
        <View style={[styles.spendCard, Shadows.primary]}>
          <Text style={styles.spendLabel}>This Month's Spending</Text>
          <Text style={styles.spendAmount}>
            {formatAmount(totals.spendTotal, baseCurrency)}
          </Text>
          <View style={styles.spendMeta}>
            <View style={styles.spendBadge}>
              <Text style={styles.spendBadgeText}>
                across {totals.spendCount} transactions
              </Text>
            </View>
            <View style={styles.spendBadge}>
              <Text style={styles.spendBadgeText}>
                {totals.totalCount} total incl. savings
              </Text>
            </View>
          </View>

          {/* Mini breakdown dots */}
          <View style={styles.miniBreakdown}>
            <View style={styles.miniItem}>
              <View style={[styles.miniDot, { backgroundColor: Colors.needsBlue }]} />
              <Text style={styles.miniLabel}>Needs</Text>
            </View>
            <View style={styles.miniItem}>
              <View style={[styles.miniDot, { backgroundColor: Colors.wantsAmber }]} />
              <Text style={styles.miniLabel}>Wants</Text>
            </View>
            <View style={styles.miniItem}>
              <View style={[styles.miniDot, { backgroundColor: Colors.savingsGreen }]} />
              <Text style={styles.miniLabel}>Savings</Text>
            </View>
          </View>
        </View>

        {/* ── 50-30-20 Budget Breakdown ─────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>50 · 30 · 20 Breakdown</Text>
            <View style={styles.cardPill}>
              <Text style={styles.cardPillText}>This month</Text>
            </View>
          </View>

          <View style={styles.budgetSection}>
            <BudgetBar
              label="Needs"
              icon="🏠"
              amount={totals.needsTotal}
              percentage={totals.needsPct}
              color={Colors.needsBlue}
              baseCurrency={baseCurrency}
            />
          </View>
          <View style={[styles.budgetSection, styles.budgetSectionBorder]}>
            <BudgetBar
              label="Wants"
              icon="🎬"
              amount={totals.wantsTotal}
              percentage={totals.wantsPct}
              color={Colors.wantsAmber}
              baseCurrency={baseCurrency}
            />
          </View>
          <View style={[styles.budgetSection, styles.budgetSectionBorder]}>
            <BudgetBar
              label="Savings"
              icon="🛡️"
              amount={totals.savingsTotal}
              percentage={totals.savingsPct}
              color={Colors.savingsGreen}
              baseCurrency={baseCurrency}
            />
          </View>

          {/* Target guideline */}
          <View style={styles.guideRow}>
            <Text style={styles.guideText}>
              Ideal: 50% Needs · 30% Wants · 20% Savings
            </Text>
          </View>
        </View>

        {/* ── Recent Transactions ───────────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/(tabs)/transactions' as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>No transactions yet.</Text>
              <Text style={styles.emptySubText}>
                Tap the + button below to add your first one.
              </Text>
            </View>
          ) : (
            <View>
              {recentTransactions.map((txn, idx) => (
                <TxnRow
                  key={txn.id}
                  txn={txn}
                  baseCurrency={baseCurrency}
                  isLast={idx === recentTransactions.length - 1}
                />
              ))}
            </View>
          )}

          {recentTransactions.length > 0 && (
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push('/(app)/(tabs)/transactions' as never)}
              activeOpacity={0.75}
            >
              <Text style={styles.seeAllBtnText}>View all transactions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom padding for FAB */}
        <View style={styles.fabSpacer} />
      </ScrollView>

      {/* ── Quick Add FAB ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, Shadows.primary]}
        onPress={() => router.push('/(app)/add-transaction' as never)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  greeting: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    lineHeight: 30,
  },
  dateText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: Colors.primary,
  },

  // Spending card
  spendCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  spendLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },
  spendAmount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 38,
    color: '#ffffff',
    lineHeight: 46,
  },
  spendMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  spendBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  spendBadgeText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  miniBreakdown: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  miniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // Generic card
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  cardPill: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardPillText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Budget bars
  budgetSection: {
    paddingVertical: 14,
  },
  budgetSectionBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  guideRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    marginTop: 2,
  },
  guideText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // See all
  seeAllText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  seeAllBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
  },
  seeAllBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },

  // Empty state
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  emptySubText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fabSpacer: { height: 80 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
    fontFamily: 'Manrope_700Bold',
  },
});
