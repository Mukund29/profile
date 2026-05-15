/**
 * Weekly Report screen.
 * Route: /(app)/weekly-report
 *
 * Shows discipline score, day-by-day bar chart, need/want/saving split,
 * category breakdown, and top merchants for the current ISO week (Mon–Sun).
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
import Svg, { Rect } from 'react-native-svg';

import { getMockTransactions } from '../../lib/mock-data';
import { formatAmount } from '../../lib/money';
import { Colors, Shadows } from '../../constants/colors';
import { useOnboardingStore } from '../../store/onboarding';

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BAR_MAX_HEIGHT = 80;
const BAR_WIDTH = 28;
const BAR_GAP = 10;
const CHART_WIDTH = (BAR_WIDTH + BAR_GAP) * 7 - BAR_GAP;
const CHART_HEIGHT = BAR_MAX_HEIGHT + 4;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns Monday of the ISO week containing `date` as a YYYY-MM-DD string. */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns YYYY-MM-DD for a given date. */
function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Compute discipline score clamped to [0, 100]. */
function computeScore(
  needsActual: number,
  wantsActual: number,
  savingsActual: number,
  total: number,
  needsTarget: number,
  wantsTarget: number,
  savingsTarget: number,
): number {
  if (total === 0) return 100;
  const nAct = (needsActual / total) * 100;
  const wAct = (wantsActual / total) * 100;
  const sAct = (savingsActual / total) * 100;
  const raw =
    100 -
    (Math.abs(nAct - needsTarget) * 0.5 +
      Math.abs(wAct - wantsTarget) * 0.3 +
      Math.abs(sAct - savingsTarget) * 0.2) *
      2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Return colour for discipline score. */
function scoreColor(score: number): string {
  if (score >= 70) return Colors.savingsGreen;
  if (score >= 40) return Colors.wantsAmber;
  return Colors.error;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WeeklyReportScreen() {
  const { baseCurrency, budgetNeedsPct, budgetWantsPct, budgetSavingsPct } =
    useOnboardingStore();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Compute week range
  const { monday, sunday, weekLabel, weekDays } = useMemo(() => {
    const today = new Date();
    const mon = getWeekMonday(today);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      days.push(toDateStr(d));
    }

    const label = `${mon.getDate()}–${sun.getDate()} ${sun.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
    return { monday: mon, sunday: sun, weekLabel: label, weekDays: days };
  }, []);

  // Filter and aggregate transactions for this week
  const {
    weekTxns,
    dailyTotals,
    needsTotal,
    wantsTotal,
    savingsTotal,
    grandTotal,
    categoryBreakdown,
    topMerchants,
    score,
  } = useMemo(() => {
    const all = getMockTransactions();
    const monStr = toDateStr(monday);
    const sunStr = toDateStr(sunday);

    const weekTxns = all.filter(
      (t) => t.txn_date >= monStr && t.txn_date <= sunStr,
    );

    // Daily totals (index 0=Mon … 6=Sun)
    const dailyTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    weekTxns.forEach((t) => {
      const idx = weekDays.indexOf(t.txn_date);
      if (idx !== -1) dailyTotals[idx] += t.amount;
    });

    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;
    weekTxns.forEach((t) => {
      if (t.txn_type === 'need') needsTotal += t.amount;
      else if (t.txn_type === 'want') wantsTotal += t.amount;
      else savingsTotal += t.amount;
    });
    const grandTotal = needsTotal + wantsTotal + savingsTotal;

    // Category breakdown — top 5
    const catMap: Record<string, { name: string; icon: string; total: number }> = {};
    weekTxns.forEach((t) => {
      const key = t.categories?.name ?? 'Uncategorised';
      const icon = t.categories?.icon ?? '💰';
      if (!catMap[key]) catMap[key] = { name: key, icon, total: 0 };
      catMap[key].total += t.amount;
    });
    const categoryBreakdown = Object.values(catMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Top 3 merchants by amount
    const topMerchants = [...weekTxns]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const score = computeScore(
      needsTotal,
      wantsTotal,
      savingsTotal,
      grandTotal,
      budgetNeedsPct,
      budgetWantsPct,
      budgetSavingsPct,
    );

    return {
      weekTxns,
      dailyTotals,
      needsTotal,
      wantsTotal,
      savingsTotal,
      grandTotal,
      categoryBreakdown,
      topMerchants,
      score,
    };
  }, [monday, sunday, weekDays, budgetNeedsPct, budgetWantsPct, budgetSavingsPct]);

  // Bar chart heights
  const maxDaily = Math.max(...dailyTotals, 1);
  const barHeights = dailyTotals.map((d) => Math.round((d / maxDaily) * BAR_MAX_HEIGHT));

  // Selected day spend label
  const selectedLabel =
    selectedDay !== null && weekDays[selectedDay]
      ? `${new Date(weekDays[selectedDay] + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}: ${formatAmount(dailyTotals[selectedDay] ?? 0, baseCurrency)}`
      : null;

  const needsActualPct = grandTotal > 0 ? (needsTotal / grandTotal) * 100 : 0;
  const wantsActualPct = grandTotal > 0 ? (wantsTotal / grandTotal) * 100 : 0;
  const savingsActualPct = grandTotal > 0 ? (savingsTotal / grandTotal) * 100 : 0;

  const catMax = categoryBreakdown.length > 0 ? categoryBreakdown[0].total : 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Weekly Report</Text>
          <Text style={styles.headerSub}>{weekLabel}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Discipline Score Card ─────────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.scoreRow}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor(score) }]}>
              <Text style={[styles.scoreNumber, { color: scoreColor(score) }]}>{score}</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Discipline Score</Text>
              <Text style={styles.scoreIdeal}>
                Ideal split: {budgetNeedsPct}% / {budgetWantsPct}% / {budgetSavingsPct}%
              </Text>
              <Text style={styles.scoreNote}>Needs / Wants / Savings</Text>
            </View>
          </View>
        </View>

        {/* ── Day-by-day Bar Chart ──────────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Daily Spend</Text>
          <View style={styles.chartWrapper}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              {barHeights.map((h, i) => {
                const x = i * (BAR_WIDTH + BAR_GAP);
                const y = BAR_MAX_HEIGHT - h;
                const isSelected = selectedDay === i;
                return (
                  <Rect
                    key={i}
                    x={x}
                    y={y}
                    width={BAR_WIDTH}
                    height={h === 0 ? 3 : h}
                    rx={4}
                    fill={isSelected ? Colors.primaryContainer : Colors.primary}
                    opacity={isSelected ? 1 : 0.75}
                    onPress={() => setSelectedDay(selectedDay === i ? null : i)}
                  />
                );
              })}
            </Svg>
          </View>
          {/* Day labels */}
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((label, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDay(selectedDay === i ? null : i)}
                style={styles.dayLabelBtn}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    selectedDay === i && { color: Colors.primary, fontFamily: 'Manrope_700Bold' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedLabel && (
            <Text style={styles.selectedDayText}>{selectedLabel}</Text>
          )}
        </View>

        {/* ── Need / Want / Saving Bars ─────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Budget Split</Text>
          <BudgetRow
            label="Needs"
            emoji="🏠"
            actual={needsActualPct}
            target={budgetNeedsPct}
            amount={needsTotal}
            currency={baseCurrency}
            color={Colors.needsBlue}
          />
          <BudgetRow
            label="Wants"
            emoji="🎬"
            actual={wantsActualPct}
            target={budgetWantsPct}
            amount={wantsTotal}
            currency={baseCurrency}
            color={Colors.wantsAmber}
          />
          <BudgetRow
            label="Savings"
            emoji="💰"
            actual={savingsActualPct}
            target={budgetSavingsPct}
            amount={savingsTotal}
            currency={baseCurrency}
            color={Colors.savingsGreen}
          />
        </View>

        {/* ── Category Breakdown ───────────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          {categoryBreakdown.length === 0 ? (
            <Text style={styles.emptyText}>No transactions this week</Text>
          ) : (
            categoryBreakdown.map((cat, i) => {
              const pct = catMax > 0 ? (cat.total / catMax) * 100 : 0;
              return (
                <View key={i} style={styles.catRow}>
                  <View style={styles.catLabelRow}>
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catAmount}>{formatAmount(cat.total, baseCurrency)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%` as `${number}%`, backgroundColor: Colors.primary },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Top 3 Merchants ──────────────────────────────────────────────── */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Top Merchants</Text>
          {topMerchants.length === 0 ? (
            <Text style={styles.emptyText}>No transactions this week</Text>
          ) : (
            topMerchants.map((txn, i) => (
              <View key={txn.id} style={[styles.merchantRow, i < topMerchants.length - 1 && styles.merchantBorder]}>
                <View style={styles.merchantRank}>
                  <Text style={styles.merchantRankText}>#{i + 1}</Text>
                </View>
                <Text style={styles.merchantName} numberOfLines={1}>{txn.description}</Text>
                <Text style={styles.merchantAmount}>{formatAmount(txn.amount, baseCurrency)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── BudgetRow sub-component ────────────────────────────────────────────────────
interface BudgetRowProps {
  label: string;
  emoji: string;
  actual: number;
  target: number;
  amount: number;
  currency: string;
  color: string;
}

function BudgetRow({ label, emoji, actual, target, amount, currency, color }: BudgetRowProps) {
  const isOver = actual > target;
  const fillPct = Math.min(actual, 100);
  const targetPct = Math.min(target, 100);

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetLabelRow}>
        <Text style={styles.budgetEmoji}>{emoji}</Text>
        <Text style={styles.budgetLabel}>{label}</Text>
        <Text style={[styles.budgetPct, isOver && { color: Colors.error }]}>
          {actual.toFixed(1)}%
          <Text style={styles.budgetTarget}> / {target}% target</Text>
        </Text>
        <Text style={styles.budgetAmount}>{formatAmount(amount, currency)}</Text>
      </View>
      {/* Horizontal bar with target marker */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${fillPct}%` as `${number}%`,
              backgroundColor: isOver ? Colors.error : color,
            },
          ]}
        />
        {/* Target marker */}
        <View
          style={[
            styles.targetMarker,
            { left: `${targetPct}%` as `${number}%` },
          ]}
        />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 64,
  },
  backText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.primary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
  },
  headerSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onSurface,
    marginBottom: 12,
  },
  // Score card
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  scoreNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  scoreIdeal: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  scoreNote: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Bar chart
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  dayLabelBtn: {
    width: BAR_WIDTH,
    alignItems: 'center',
  },
  dayLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  selectedDayText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  // Budget rows
  budgetRow: {
    marginBottom: 12,
  },
  budgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  budgetEmoji: {
    fontSize: 14,
  },
  budgetLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.onSurface,
    width: 56,
  },
  budgetPct: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: Colors.onSurface,
    flex: 1,
  },
  budgetTarget: {
    fontFamily: 'WorkSans_400Regular',
    color: Colors.textMuted,
  },
  budgetAmount: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: Colors.onSurface,
  },
  barTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 8,
    borderRadius: 4,
  },
  targetMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 14,
    backgroundColor: Colors.onSurface,
    borderRadius: 1,
    marginLeft: -1,
  },
  // Categories
  catRow: {
    marginBottom: 10,
  },
  catLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  catEmoji: {
    fontSize: 16,
  },
  catName: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.onSurface,
    flex: 1,
  },
  catAmount: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: Colors.onSurface,
  },
  // Merchants
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  merchantBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  merchantRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantRankText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: Colors.primary,
  },
  merchantName: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.onSurface,
    flex: 1,
  },
  merchantAmount: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: Colors.onSurface,
  },
  emptyText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  bottomSpacer: {
    height: 16,
  },
});
