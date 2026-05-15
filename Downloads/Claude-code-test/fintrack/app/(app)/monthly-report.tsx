/**
 * Monthly Report Screen
 * Route: /(app)/monthly-report
 *
 * Shows discipline score, calendar heatmap, budget vs actual table,
 * and category breakdown for the current calendar month.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { getMockTransactions } from '../../lib/mock-data';
import { formatAmount } from '../../lib/money';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function scoreColor(score: number): string {
  if (score >= 70) return Colors.savingsGreen;
  if (score >= 40) return Colors.wantsAmber;
  return Colors.error;
}

function heatColor(ratio: number): string {
  // ratio: 0 = no spend, 1 = max spend day
  if (ratio === 0) return Colors.borderLight;
  if (ratio < 0.25) return '#bbf7d0';   // light green
  if (ratio < 0.6)  return Colors.wantsAmber;
  return Colors.primary;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MonthlyReportScreen() {
  const { budgetNeedsPct, budgetWantsPct, budgetSavingsPct, baseCurrency } =
    useOnboardingStore();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const currency = baseCurrency || 'INR';

  // ── Filter transactions to current month ────────────────────────────────────
  const allTxns = useMemo(() => getMockTransactions(), []);

  const monthTxns = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return allTxns.filter((t) => t.txn_date.startsWith(prefix));
  }, [allTxns, year, month]);

  // ── Totals by type ──────────────────────────────────────────────────────────
  const { totalSpend, needsTotal, wantsTotal, savingsTotal } = useMemo(() => {
    let needs = 0, wants = 0, savings = 0;
    for (const t of monthTxns) {
      if (t.txn_type === 'need')    needs    += t.amount;
      else if (t.txn_type === 'want')   wants    += t.amount;
      else if (t.txn_type === 'saving') savings  += t.amount;
    }
    return { totalSpend: needs + wants + savings, needsTotal: needs, wantsTotal: wants, savingsTotal: savings };
  }, [monthTxns]);

  // ── Discipline score ────────────────────────────────────────────────────────
  const disciplineScore = useMemo(() => {
    if (totalSpend === 0) return 0;
    const needsPct   = (needsTotal   / totalSpend) * 100;
    const wantsPct   = (wantsTotal   / totalSpend) * 100;
    const savingsPct = (savingsTotal / totalSpend) * 100;
    const raw =
      100 -
      (Math.abs(needsPct - budgetNeedsPct)     * 0.5 +
       Math.abs(wantsPct - budgetWantsPct)     * 0.3 +
       Math.abs(savingsPct - budgetSavingsPct) * 0.2) *
        2;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [totalSpend, needsTotal, wantsTotal, savingsTotal, budgetNeedsPct, budgetWantsPct, budgetSavingsPct]);

  // ── Calendar heatmap data ───────────────────────────────────────────────────
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayTotals = useMemo(() => {
    const map: Record<number, number> = {};
    for (const t of monthTxns) {
      const day = parseInt(t.txn_date.split('-')[2], 10);
      map[day] = (map[day] ?? 0) + t.amount;
    }
    return map;
  }, [monthTxns]);

  const maxDayTotal = useMemo(
    () => Math.max(1, ...Object.values(dayTotals)),
    [dayTotals],
  );

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // ── Category breakdown ──────────────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { icon: string; amount: number }> = {};
    for (const t of monthTxns) {
      if (!t.categories) continue;
      const key = t.categories.name;
      if (!map[key]) map[key] = { icon: t.categories.icon, amount: 0 };
      map[key].amount += t.amount;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, icon: v.icon, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [monthTxns]);

  const maxCatAmount = useMemo(
    () => Math.max(1, ...categoryBreakdown.map((c) => c.amount)),
    [categoryBreakdown],
  );

  // ── Budget vs Actual ────────────────────────────────────────────────────────
  const budgetRows = useMemo(() => {
    const safe = totalSpend || 1;
    return [
      {
        label: 'Needs',
        target: budgetNeedsPct,
        actual: Math.round((needsTotal / safe) * 100),
        amount: needsTotal,
        color: Colors.needsBlue,
      },
      {
        label: 'Wants',
        target: budgetWantsPct,
        actual: Math.round((wantsTotal / safe) * 100),
        amount: wantsTotal,
        color: Colors.wantsAmber,
      },
      {
        label: 'Savings',
        target: budgetSavingsPct,
        actual: Math.round((savingsTotal / safe) * 100),
        amount: savingsTotal,
        color: Colors.savingsGreen,
      },
    ];
  }, [totalSpend, needsTotal, wantsTotal, savingsTotal, budgetNeedsPct, budgetWantsPct, budgetSavingsPct]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const scoreCol = scoreColor(disciplineScore);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Monthly Report</Text>
          <Text style={styles.headerSub}>{monthLabel}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Discipline Score ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Discipline Score</Text>
          <View style={styles.scoreRow}>
            <View style={[styles.scoreCircle, { borderColor: scoreCol }]}>
              <Text style={[styles.scoreNumber, { color: scoreCol }]}>
                {disciplineScore}
              </Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
            <View style={styles.scoreLegend}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: Colors.savingsGreen }]} />
                <Text style={styles.legendText}>Great (≥ 70)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: Colors.wantsAmber }]} />
                <Text style={styles.legendText}>Fair (40–69)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.legendText}>{'Poor (< 40)'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Calendar Heatmap ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Spend Calendar</Text>
          <View style={styles.heatmapGrid}>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const total = dayTotals[day] ?? 0;
              const ratio = total / maxDayTotal;
              const bg = heatColor(ratio);
              const isSelected = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(isSelected ? null : day)}
                  style={[
                    styles.dayTile,
                    { backgroundColor: bg },
                    isSelected && styles.dayTileSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNum, total > 0 && styles.dayNumActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedDay !== null && (
            <View style={styles.dayDetail}>
              <Text style={styles.dayDetailText}>
                {MONTH_NAMES[month]} {selectedDay}:{' '}
                {dayTotals[selectedDay]
                  ? formatAmount(dayTotals[selectedDay], currency)
                  : 'No spend'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Budget vs Actual ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Budget vs Actual</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellWide, styles.tableHeadText]}>Category</Text>
            <Text style={[styles.tableCell, styles.tableHeadText]}>Target</Text>
            <Text style={[styles.tableCell, styles.tableHeadText]}>Actual</Text>
            <Text style={[styles.tableCell, styles.tableCellWide, styles.tableHeadText]}>Amount</Text>
            <Text style={[styles.tableCell, styles.tableHeadText]}> </Text>
          </View>
          {budgetRows.map((row) => {
            const ok = row.actual <= row.target + 5;
            return (
              <View key={row.label} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.tableCellWide, styles.rowLabelCell]}>
                  <View style={[styles.typeDot, { backgroundColor: row.color }]} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </View>
                <Text style={styles.tableCell}>{row.target}%</Text>
                <Text style={[styles.tableCell, { color: ok ? Colors.savingsGreen : Colors.error }]}>
                  {row.actual}%
                </Text>
                <Text style={[styles.tableCell, styles.tableCellWide, styles.amountText]}>
                  {formatAmount(row.amount, currency)}
                </Text>
                <Text style={styles.tableCell}>{ok ? '✓' : '⚠️'}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Category Breakdown ───────────────────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            {categoryBreakdown.map((cat) => {
              const barWidth = `${Math.round((cat.amount / maxCatAmount) * 100)}%` as `${number}%`;
              return (
                <View key={cat.name} style={styles.catRow}>
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <View style={styles.catInfo}>
                    <View style={styles.catLabelRow}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catAmount}>{formatAmount(cat.amount, currency)}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: barWidth }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {monthTxns.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions this month yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const TILE_SIZE = 38;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerBack:    { fontFamily: 'WorkSans_500Medium', fontSize: 15, color: Colors.primary },
  headerCenter:  { alignItems: 'center' },
  headerTitle:   { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface },
  headerSub:     { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  headerSpacer:  { width: 48 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 48 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onSurface,
    marginBottom: 2,
  },

  // Score circle
  scoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 24 },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontFamily: 'Manrope_700Bold', fontSize: 28 },
  scoreOutOf:  { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: -2 },
  scoreLegend: { gap: 8 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },

  // Heatmap
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTileSelected: { borderWidth: 2, borderColor: Colors.primary },
  dayNum:          { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted },
  dayNumActive:    { color: Colors.onSurface, fontFamily: 'WorkSans_600SemiBold' },
  dayDetail: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayDetailText: { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.onSurface },

  // Budget table
  tableHeader:   { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tableRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  tableCell:     { flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.onSurface, textAlign: 'center' },
  tableCellWide: { flex: 1.8, textAlign: 'left' },
  tableHeadText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  rowLabelCell:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot:       { width: 8, height: 8, borderRadius: 4 },
  rowLabel:      { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.onSurface },
  amountText:    { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, color: Colors.onSurface },

  // Category bars
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji:    { fontSize: 22, width: 32, textAlign: 'center' },
  catInfo:     { flex: 1, gap: 4 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName:     { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.onSurface },
  catAmount:   { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, color: Colors.onSurface },
  barTrack:    { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText:  { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.textMuted },
});
