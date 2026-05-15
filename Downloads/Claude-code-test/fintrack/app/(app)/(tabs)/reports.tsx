/**
 * Reports Tab — navigation hub for Weekly and Monthly reports.
 * Shows summary cards with key metrics; tapping opens the full report screen.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Shadows } from '../../../constants/colors';
import { getMockTransactions } from '../../../lib/mock-data';
import { formatAmount } from '../../../lib/money';
import { useOnboardingStore } from '../../../store/onboarding';

// ── Discipline score formula (CLAUDE.md) ──────────────────────────────────────
function calcDisciplineScore(
  needsPct: number,
  wantsPct: number,
  savingsPct: number,
  targetNeeds: number,
  targetWants: number,
  targetSavings: number,
): number {
  const raw =
    100 -
    (Math.abs(needsPct - targetNeeds) * 0.5 +
      Math.abs(wantsPct - targetWants) * 0.3 +
      Math.abs(savingsPct - targetSavings) * 0.2) *
      2;
  return Math.max(0, Math.min(100, raw));
}

function scoreColor(score: number): string {
  if (score >= 70) return Colors.savingsGreen ?? '#22c55e';
  if (score >= 40) return Colors.wantsAmber ?? '#f59e0b';
  return '#ef4444';
}

// ── Current week bounds (Mon–Sun) ─────────────────────────────────────────────
function currentWeekBounds(): { start: string; end: string; label: string } {
  const today = new Date();
  const day = today.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const lbl = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return { start: fmt(mon), end: fmt(sun), label: `${lbl(mon)} – ${lbl(sun)}` };
}

// ── Summary card ──────────────────────────────────────────────────────────────
interface SummaryCardProps {
  title: string;
  period: string;
  score: number;
  totalSpend: number;
  baseCurrency: string;
  onPress: () => void;
  emoji: string;
}

function SummaryCard({
  title,
  period,
  score,
  totalSpend,
  baseCurrency,
  onPress,
  emoji,
}: SummaryCardProps) {
  const sColor = scoreColor(score);
  return (
    <TouchableOpacity style={[styles.card, Shadows.card]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardPeriod}>{period}</Text>
        </View>
        <View style={[styles.scoreCircle, { borderColor: sColor }]}>
          <Text style={[styles.scoreNumber, { color: sColor }]}>{Math.round(score)}</Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.spendLabel}>Total spend</Text>
          <Text style={styles.spendAmount}>{formatAmount(totalSpend, baseCurrency)}</Text>
        </View>
        <View style={[styles.viewBtn, { backgroundColor: Colors.primary + '12' }]}>
          <Text style={[styles.viewBtnText, { color: Colors.primary }]}>View report →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Quick stat pill ───────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: color + '15' }]}>
      <Text style={[pillStyles.value, { color }]}>{value}</Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill:  { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  value: { fontFamily: 'Manrope_700Bold', fontSize: 16 },
  label: { fontFamily: 'WorkSans_400Regular', fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ReportsTab() {
  const { baseCurrency, budgetNeedsPct, budgetWantsPct, budgetSavingsPct } =
    useOnboardingStore();
  const transactions = useMemo(() => getMockTransactions(), []);
  const week = useMemo(() => currentWeekBounds(), []);

  const weekTotals = useMemo(() => {
    const txns = transactions.filter(
      (t) => t.txn_date >= week.start && t.txn_date <= week.end,
    );
    let needs = 0, wants = 0, savings = 0;
    for (const t of txns) {
      if (t.txn_type === 'need') needs += t.amount;
      else if (t.txn_type === 'want') wants += t.amount;
      else savings += t.amount;
    }
    const grand = needs + wants + savings;
    return {
      spend: needs + wants,
      needsPct:   grand > 0 ? (needs   / grand) * 100 : 0,
      wantsPct:   grand > 0 ? (wants   / grand) * 100 : 0,
      savingsPct: grand > 0 ? (savings / grand) * 100 : 0,
    };
  }, [transactions, week]);

  const weekScore = useMemo(
    () => calcDisciplineScore(weekTotals.needsPct, weekTotals.wantsPct, weekTotals.savingsPct, budgetNeedsPct, budgetWantsPct, budgetSavingsPct),
    [weekTotals, budgetNeedsPct, budgetWantsPct, budgetSavingsPct],
  );

  const monthStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);
  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    [],
  );

  const monthTotals = useMemo(() => {
    const txns = transactions.filter((t) => t.txn_date >= monthStart);
    let needs = 0, wants = 0, savings = 0;
    for (const t of txns) {
      if (t.txn_type === 'need') needs += t.amount;
      else if (t.txn_type === 'want') wants += t.amount;
      else savings += t.amount;
    }
    const grand = needs + wants + savings;
    return {
      savings,
      spend: needs + wants,
      txnCount: txns.length,
      needsPct:   grand > 0 ? (needs   / grand) * 100 : 0,
      wantsPct:   grand > 0 ? (wants   / grand) * 100 : 0,
      savingsPct: grand > 0 ? (savings / grand) * 100 : 0,
    };
  }, [transactions, monthStart]);

  const monthScore = useMemo(
    () => calcDisciplineScore(monthTotals.needsPct, monthTotals.wantsPct, monthTotals.savingsPct, budgetNeedsPct, budgetWantsPct, budgetSavingsPct),
    [monthTotals, budgetNeedsPct, budgetWantsPct, budgetSavingsPct],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick stats */}
        <View style={styles.pillRow}>
          <StatPill label="Transactions" value={String(monthTotals.txnCount)} color={Colors.primary} />
          <StatPill label="Month spend" value={formatAmount(monthTotals.spend, baseCurrency)} color={Colors.wantsAmber ?? '#f59e0b'} />
          <StatPill label="Savings" value={formatAmount(monthTotals.savings, baseCurrency)} color={Colors.savingsGreen ?? '#22c55e'} />
        </View>

        <SummaryCard
          title="Weekly Report"
          period={week.label}
          score={weekScore}
          totalSpend={weekTotals.spend}
          baseCurrency={baseCurrency}
          emoji="📅"
          onPress={() => router.push('/(app)/weekly-report' as any)}
        />

        <SummaryCard
          title="Monthly Report"
          period={monthLabel}
          score={monthScore}
          totalSpend={monthTotals.spend}
          baseCurrency={baseCurrency}
          emoji="📆"
          onPress={() => router.push('/(app)/monthly-report' as any)}
        />

        {/* Annual placeholder */}
        <View style={[styles.card, styles.cardDisabled]}>
          <Text style={styles.cardEmoji}>📊</Text>
          <Text style={styles.cardTitle}>Annual Report</Text>
          <Text style={styles.cardPeriod}>Coming in Sprint 8 · Year-over-year insights</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle:  { fontFamily: 'Manrope_700Bold', fontSize: 22, color: Colors.onSurface, letterSpacing: -0.3 },
  scrollContent:{ padding: 20, gap: 16 },
  pillRow:      { flexDirection: 'row', gap: 8 },

  card:         { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: Colors.borderLight },
  cardDisabled: { opacity: 0.5 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardEmoji:    { fontSize: 28, marginBottom: 4 },
  cardTitle:    { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface },
  cardPeriod:   { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  scoreCircle:  { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreNumber:  { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 26 },
  scoreLabel:   { fontFamily: 'WorkSans_400Regular', fontSize: 10, color: Colors.textMuted },

  cardBottom:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  spendLabel:   { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted },
  spendAmount:  { fontFamily: 'Manrope_700Bold', fontSize: 20, color: Colors.onSurface },
  viewBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  viewBtnText:  { fontFamily: 'WorkSans_600SemiBold', fontSize: 13 },
});
