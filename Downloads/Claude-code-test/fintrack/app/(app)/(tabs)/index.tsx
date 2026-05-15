/**
 * Dashboard — Home tab.
 * Shows spending summary, 50-30-20 budget breakdown (SVG donut ring),
 * discipline score vs targets, and recent transactions.
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
import Svg, { Circle } from 'react-native-svg';
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

// ── SVG Donut Ring ────────────────────────────────────────────────────────────
interface DonutSegment { pct: number; color: string }

interface DonutRingProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  /** Label in the centre */
  centreLabel?: string;
  centreSub?: string;
}

function DonutRing({ segments, size = 140, strokeWidth = 14, centreLabel, centreSub }: DonutRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Build dash segments (start from top = -90deg)
  let offset = 0;
  const arcs = segments.map((seg) => {
    const dashLen = (seg.pct / 100) * circumference;
    const gap = circumference - dashLen;
    const rotation = (offset / 100) * 360 - 90;
    offset += seg.pct;
    return { ...seg, dashLen, gap, rotation };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background track */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={Colors.borderLight}
          strokeWidth={strokeWidth}
        />
        {arcs.map((arc, i) =>
          arc.dashLen > 0 ? (
            <Circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dashLen} ${arc.gap}`}
              strokeLinecap="round"
              originX={cx} originY={cy}
              rotation={arc.rotation}
            />
          ) : null,
        )}
      </Svg>
      {/* Centre text */}
      {centreLabel && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.onSurface }}>
            {centreLabel}
          </Text>
          {centreSub && (
            <Text style={{ fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted }}>
              {centreSub}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Budget breakdown row ──────────────────────────────────────────────────────
interface BudgetRowProps {
  label: string;
  icon: string;
  color: string;
  actualPct: number;
  targetPct: number;
  amount: number;
  baseCurrency: string;
}

function BudgetRow({ label, icon, color, actualPct, targetPct, amount, baseCurrency }: BudgetRowProps) {
  const safe = Math.min(100, Math.max(0, actualPct));
  const overBudget = actualPct > targetPct;
  return (
    <View style={budgetRowStyles.container}>
      <View style={[budgetRowStyles.iconBadge, { backgroundColor: color + '18' }]}>
        <Text style={budgetRowStyles.icon}>{icon}</Text>
      </View>
      <View style={budgetRowStyles.meta}>
        <View style={budgetRowStyles.metaTop}>
          <Text style={budgetRowStyles.label}>{label}</Text>
          <Text style={[budgetRowStyles.pct, { color: overBudget ? '#ef4444' : color }]}>
            {safe.toFixed(0)}% <Text style={budgetRowStyles.target}>/ {targetPct}% target</Text>
          </Text>
        </View>
        <View style={budgetRowStyles.track}>
          {/* Target marker */}
          <View style={[budgetRowStyles.targetMark, { left: `${targetPct}%` as `${number}%` }]} />
          <View style={[budgetRowStyles.fill, { width: `${safe}%` as `${number}%`, backgroundColor: overBudget ? '#ef4444' : color }]} />
        </View>
        <Text style={budgetRowStyles.amount}>{formatAmount(amount, baseCurrency)}</Text>
      </View>
    </View>
  );
}

const budgetRowStyles = StyleSheet.create({
  container:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  iconBadge:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  icon:       { fontSize: 16 },
  meta:       { flex: 1, gap: 4 },
  metaTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:      { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.onSurface },
  pct:        { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  target:     { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted },
  track:      { height: 6, backgroundColor: Colors.borderLight, borderRadius: 99, overflow: 'visible', position: 'relative' },
  fill:       { height: '100%', borderRadius: 99 },
  targetMark: { position: 'absolute', top: -2, width: 2, height: 10, backgroundColor: Colors.textMuted, borderRadius: 1, zIndex: 1 },
  amount:     { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted },
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
        <Text style={txnRowStyles.iconText}>{txn.categories?.icon ?? '💰'}</Text>
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
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  iconBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText:  { fontSize: 20 },
  info:      { flex: 1, gap: 2 },
  desc:      { fontFamily: 'WorkSans_500Medium', fontSize: 14, color: Colors.onSurface },
  meta:      { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted },
  amount:    { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeTab() {
  const {
    displayName,
    baseCurrency,
    budgetNeedsPct,
    budgetWantsPct,
    budgetSavingsPct,
  } = useOnboardingStore();

  const transactions = React.useMemo<MockTransaction[]>(
    () => getMockTransactions(),
    [],
  );

  const totals = React.useMemo(() => {
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;

    for (const txn of transactions) {
      if (txn.txn_type === 'need') needsTotal += txn.amount;
      else if (txn.txn_type === 'want') wantsTotal += txn.amount;
      else if (txn.txn_type === 'saving') savingsTotal += txn.amount;
    }

    const grandTotal = needsTotal + wantsTotal + savingsTotal;
    const needsPct    = grandTotal > 0 ? (needsTotal   / grandTotal) * 100 : 0;
    const wantsPct    = grandTotal > 0 ? (wantsTotal   / grandTotal) * 100 : 0;
    const savingsPct  = grandTotal > 0 ? (savingsTotal / grandTotal) * 100 : 0;
    const spendTotal  = needsTotal + wantsTotal;
    const spendCount  = transactions.filter((t) => t.txn_type !== 'saving').length;

    return { needsTotal, wantsTotal, savingsTotal, spendTotal, grandTotal, needsPct, wantsPct, savingsPct, spendCount, totalCount: transactions.length };
  }, [transactions]);

  const recentTransactions = React.useMemo<MockTransaction[]>(() => transactions.slice(0, 5), [transactions]);
  const name = displayName.trim() || 'there';

  // Donut segments — use actual percentages (of grand total)
  const donutSegments: DonutSegment[] = [
    { pct: totals.needsPct,   color: Colors.needsBlue ?? '#6366f1' },
    { pct: totals.wantsPct,   color: Colors.wantsAmber ?? '#f59e0b' },
    { pct: totals.savingsPct, color: Colors.savingsGreen ?? '#22c55e' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {name} 👋</Text>
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
          </View>
          <Pressable
            style={styles.avatarCircle}
            onPress={() => router.push('/(app)/(tabs)/settings' as never)}
          >
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* ── Spending Card ─────────────────────────────────────────────────── */}
        <View style={[styles.spendCard, Shadows.primary]}>
          <Text style={styles.spendLabel}>This Month's Spending</Text>
          <Text style={styles.spendAmount}>{formatAmount(totals.spendTotal, baseCurrency)}</Text>
          <View style={styles.spendMeta}>
            <View style={styles.spendBadge}>
              <Text style={styles.spendBadgeText}>across {totals.spendCount} transactions</Text>
            </View>
            <View style={styles.spendBadge}>
              <Text style={styles.spendBadgeText}>{totals.totalCount} total incl. savings</Text>
            </View>
          </View>
          <View style={styles.miniBreakdown}>
            {[
              { label: 'Needs',   color: Colors.needsBlue ?? '#6366f1' },
              { label: 'Wants',   color: Colors.wantsAmber ?? '#f59e0b' },
              { label: 'Savings', color: Colors.savingsGreen ?? '#22c55e' },
            ].map((item) => (
              <View key={item.label} style={styles.miniItem}>
                <View style={[styles.miniDot, { backgroundColor: item.color }]} />
                <Text style={styles.miniLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 50-30-20 Budget Ring (US-029) ────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Budget Breakdown</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/settings' as never)}>
              <Text style={styles.cardLink}>Edit targets</Text>
            </TouchableOpacity>
          </View>

          {/* Donut + legend row */}
          <View style={styles.donutRow}>
            <DonutRing
              segments={donutSegments}
              size={130}
              strokeWidth={13}
              centreLabel={`${totals.needsPct.toFixed(0)}/${totals.wantsPct.toFixed(0)}/${totals.savingsPct.toFixed(0)}`}
              centreSub="N/W/S"
            />
            <View style={styles.donutLegend}>
              {[
                { label: 'Needs',   color: Colors.needsBlue ?? '#6366f1',   pct: totals.needsPct,   target: budgetNeedsPct },
                { label: 'Wants',   color: Colors.wantsAmber ?? '#f59e0b',  pct: totals.wantsPct,   target: budgetWantsPct },
                { label: 'Savings', color: Colors.savingsGreen ?? '#22c55e',pct: totals.savingsPct, target: budgetSavingsPct },
              ].map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={[styles.legendPct, { color: item.pct > item.target ? '#ef4444' : item.color }]}>
                    {item.pct.toFixed(0)}%
                  </Text>
                  <Text style={styles.legendTarget}>/{item.target}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Per-category bars */}
          <View style={styles.budgetBars}>
            {[
              { label: 'Needs',   icon: '🏠', color: Colors.needsBlue ?? '#6366f1',   actualPct: totals.needsPct,   targetPct: budgetNeedsPct,   amount: totals.needsTotal },
              { label: 'Wants',   icon: '🎬', color: Colors.wantsAmber ?? '#f59e0b',  actualPct: totals.wantsPct,   targetPct: budgetWantsPct,   amount: totals.wantsTotal },
              { label: 'Savings', icon: '🛡️', color: Colors.savingsGreen ?? '#22c55e',actualPct: totals.savingsPct, targetPct: budgetSavingsPct, amount: totals.savingsTotal },
            ].map((item, i, arr) => (
              <View key={item.label} style={i < arr.length - 1 ? styles.budgetBarBorder : undefined}>
                <BudgetRow {...item} baseCurrency={baseCurrency} />
              </View>
            ))}
          </View>

          <Text style={styles.guideText}>Target: {budgetNeedsPct}% Needs · {budgetWantsPct}% Wants · {budgetSavingsPct}% Savings</Text>
        </View>

        {/* ── Recent Transactions ────────────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/transactions' as never)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>No transactions yet.</Text>
              <Text style={styles.emptySubText}>Tap + to add your first one.</Text>
            </View>
          ) : (
            <View>
              {recentTransactions.map((txn, idx) => (
                <TxnRow key={txn.id} txn={txn} baseCurrency={baseCurrency} isLast={idx === recentTransactions.length - 1} />
              ))}
            </View>
          )}

          {recentTransactions.length > 0 && (
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/(app)/(tabs)/transactions' as never)} activeOpacity={0.75}>
              <Text style={styles.seeAllBtnText}>View all transactions</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fabSpacer} />
      </ScrollView>

      {/* ── FAB ───────────────────────────────────────────────────────────── */}
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 32 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  greeting:      { fontFamily: 'Manrope_700Bold', fontSize: 22, color: Colors.onSurface, lineHeight: 30 },
  dateText:      { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  avatarCircle:  { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.primary },

  // Spending card
  spendCard:      { backgroundColor: Colors.primary, borderRadius: 20, padding: 24, gap: 8 },
  spendLabel:     { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  spendAmount:    { fontFamily: 'Manrope_700Bold', fontSize: 38, color: '#ffffff', lineHeight: 46 },
  spendMeta:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  spendBadge:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  spendBadgeText: { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  miniBreakdown:  { flexDirection: 'row', gap: 16, marginTop: 4 },
  miniItem:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniDot:        { width: 8, height: 8, borderRadius: 4 },
  miniLabel:      { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Cards
  card:       { backgroundColor: Colors.surfaceContainerLowest ?? Colors.surface, borderRadius: 20, padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle:  { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.onSurface },
  cardLink:   { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, color: Colors.primary },

  // Donut
  donutRow:    { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
  donutLegend: { flex: 1, gap: 10 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.onSurface },
  legendPct:   { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  legendTarget:{ fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted },

  // Budget bars
  budgetBars:      { gap: 0 },
  budgetBarBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  guideText:       { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 12, letterSpacing: 0.2 },

  // See all
  seeAllText:    { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: Colors.primary },
  seeAllBtn:     { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primaryFixed, alignItems: 'center' },
  seeAllBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: Colors.primary },

  // Empty state
  emptyState:   { paddingVertical: 32, alignItems: 'center', gap: 8 },
  emptyIcon:    { fontSize: 36 },
  emptyText:    { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: Colors.onSurface },
  emptySubText: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // FAB
  fabSpacer: { height: 80 },
  fab:       { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  fabIcon:   { fontSize: 28, color: '#ffffff', lineHeight: 32, fontFamily: 'Manrope_700Bold' },
});
