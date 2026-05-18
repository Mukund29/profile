/**
 * S14 Story 21-4 — Credit Card Detail + Reward Points/Cashback Tracker.
 *
 * Route: /(app)/credit-card-detail?id={uuid}
 *
 * Sections:
 *  1. Card summary (masked last4, limit, billing cycle day, payment due day)
 *  2. Current Month Rewards — Premium-gated
 *     - Fetches all transactions this month for this card
 *     - For cashback: amount × default_rate (from reward_config.default)
 *     - Shows "₹12.50 cashback this month" / "250 points this month"
 *  3. Monthly History bar chart (last 6 months, custom View-based bars) — Premium-gated
 *  4. Recent Transactions (last 10 tagged to this card)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Shadows } from '../../constants/colors';
import { supabase, getCurrentUserId } from '../../lib/supabase';
import { formatAmount, fromSmallestUnit } from '../../lib/money';
import { useOnboardingStore } from '../../store/onboarding';
import { useEntitlement } from '../../hooks/useEntitlement';
import { estimateReward } from '../../lib/roiSuggestions';

// ── Types ─────────────────────────────────────────────────────────────────────

type NetworkType = 'visa' | 'mastercard' | 'amex' | 'rupay' | 'diners' | 'other';
type RewardType  = 'cashback' | 'points' | 'miles' | 'none';

interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  network: NetworkType;
  last4: string | null;
  credit_limit: number | null;
  billing_cycle_day: number;
  payment_due_day: number;
  reward_type: RewardType;
  reward_config: Record<string, number>;
  created_at: string;
}

interface Transaction {
  id: string;
  description: string;
  txn_date: string;
  amount: number;
  txn_type: string;
  currency: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CategoryRewardRow {
  categoryId: string | null;
  name: string;
  icon: string | null;
  rewardValue: number;
}

interface MonthlyReward {
  /** ISO month key: "2026-05" */
  monthKey: string;
  /** Short label for the bar: "May" */
  label: string;
  /** Computed reward value (smallest unit for cashback, raw for points) */
  rewardValue: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NETWORK_ICON: Record<NetworkType, string> = {
  visa:       '💳',
  mastercard: '🟠',
  amex:       '🟦',
  rupay:      '🇮🇳',
  diners:     '⬛',
  other:      '💳',
};

const NETWORK_LABEL: Record<NetworkType, string> = {
  visa:       'Visa',
  mastercard: 'Mastercard',
  amex:       'Amex',
  rupay:      'RuPay',
  diners:     'Diners',
  other:      'Other',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function maskLast4(last4: string | null): string {
  if (!last4) return '●●●● ●●●● ●●●● ────';
  return `●●●● ●●●● ●●●● ${last4}`;
}

/** Returns the ISO month key (YYYY-MM) for the month that is `offsetMonths` back from today. */
function monthKeyOffset(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offsetMonths);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Short label e.g. "May" or "Dec" from "2026-05" */
function monthLabel(key: string): string {
  const month = parseInt(key.split('-')[1], 10);
  return MONTH_NAMES[month - 1] ?? key;
}

/**
 * Compute the reward value for a single transaction amount (in smallest unit).
 * defaultRate is a decimal fraction (0.015 for 1.5%).
 * For cashback/miles: returns value in smallest unit.
 * For points: returns raw points as a float (treat as integer).
 */
function computeReward(
  amountSmallest: number,
  rewardType: RewardType,
  defaultRate: number,
  baseCurrency: string,
): number {
  if (rewardType === 'none' || defaultRate <= 0) return 0;
  const amountDecimal = fromSmallestUnit(amountSmallest, baseCurrency);
  if (rewardType === 'cashback' || rewardType === 'miles') {
    // Return in smallest unit
    return Math.round(amountSmallest * defaultRate);
  }
  // Points: typically per ₹100 or $1 — apply rate on full decimal amount
  return Math.floor(amountDecimal * defaultRate * 100) / 100;
}

function formatRewardDisplay(
  rewardValue: number,
  rewardType: RewardType,
  baseCurrency: string,
): string {
  if (rewardType === 'cashback') {
    return `${formatAmount(rewardValue, baseCurrency)} cashback this month`;
  }
  if (rewardType === 'miles') {
    return `${formatAmount(rewardValue, baseCurrency)} miles this month`;
  }
  if (rewardType === 'points') {
    return `${Math.round(rewardValue).toLocaleString()} points this month`;
  }
  return '—';
}

function formatRewardBarLabel(
  rewardValue: number,
  rewardType: RewardType,
  baseCurrency: string,
): string {
  if (rewardType === 'points') return Math.round(rewardValue).toString();
  if (rewardValue === 0) return '0';
  return formatAmount(rewardValue, baseCurrency);
}

// ── Premium Gate Overlay ──────────────────────────────────────────────────────

function PremiumGate() {
  return (
    <View style={gateStyles.container}>
      <View style={gateStyles.blurCard}>
        <Text style={gateStyles.lockIcon}>🔒</Text>
        <Text style={gateStyles.title}>Premium Feature</Text>
        <Text style={gateStyles.subtitle}>
          Upgrade to see your reward earnings and monthly history.
        </Text>
        <TouchableOpacity
          style={gateStyles.upgradeBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/paywall' as any)}
        >
          <Text style={gateStyles.upgradeBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  blurCard: {
    alignItems: 'center',
    gap: 8,
    padding: 28,
  },
  lockIcon:    { fontSize: 32 },
  title:       { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.onSurface },
  subtitle:    { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
  upgradeBtn:  { marginTop: 8, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11 },
  upgradeBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: '#ffffff' },
});

// ── Bar Chart ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  months: MonthlyReward[];
  rewardType: RewardType;
  baseCurrency: string;
}

function BarChart({ months, rewardType, baseCurrency }: BarChartProps) {
  const maxValue = Math.max(...months.map((m) => m.rewardValue), 1);

  return (
    <View style={chartStyles.container}>
      {months.map((m) => {
        const pct = m.rewardValue / maxValue;
        const barHeight = Math.max(Math.round(pct * 100), 4); // min 4px for empty months
        const isCurrentMonth = m.monthKey === monthKeyOffset(0);

        return (
          <View key={m.monthKey} style={chartStyles.barWrap}>
            {/* Value label above bar */}
            {m.rewardValue > 0 && (
              <Text style={chartStyles.barValue} numberOfLines={1}>
                {formatRewardBarLabel(m.rewardValue, rewardType, baseCurrency)}
              </Text>
            )}
            {/* Bar */}
            <View style={chartStyles.barTrack}>
              <View
                style={[
                  chartStyles.bar,
                  { height: barHeight },
                  isCurrentMonth && chartStyles.barActive,
                ]}
              />
            </View>
            {/* Month label */}
            <Text style={[chartStyles.monthLabel, isCurrentMonth && chartStyles.monthLabelActive]}>
              {m.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  barValue: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 8,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  barTrack: {
    width: '70%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primaryFixed,
  },
  barActive: {
    backgroundColor: Colors.primary,
  },
  monthLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
  },
  monthLabelActive: {
    fontFamily: 'WorkSans_600SemiBold',
    color: Colors.primary,
  },
});

// ── Transaction Row ───────────────────────────────────────────────────────────

function TxnRow({ txn, baseCurrency }: { txn: Transaction; baseCurrency: string }) {
  const date = new Date(txn.txn_date + 'T00:00:00');
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const typeColors: Record<string, string> = {
    need:   Colors.needsBlue,
    want:   Colors.wantsAmber,
    saving: Colors.savingsGreen,
  };
  const typeColor = typeColors[txn.txn_type] ?? Colors.textMuted;

  return (
    <View style={txnStyles.row}>
      <View style={txnStyles.info}>
        <Text style={txnStyles.desc} numberOfLines={1}>{txn.description}</Text>
        <Text style={txnStyles.date}>{dateStr}</Text>
      </View>
      <View style={txnStyles.right}>
        <Text style={[txnStyles.amount, { color: typeColor }]}>
          {formatAmount(txn.amount, txn.currency || baseCurrency)}
        </Text>
        <Text style={txnStyles.type}>{txn.txn_type}</Text>
      </View>
    </View>
  );
}

const txnStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  info:   { flex: 1, gap: 2 },
  desc:   { fontFamily: 'WorkSans_500Medium', fontSize: 14, color: Colors.onSurface },
  date:   { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted },
  right:  { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  type:   { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: Colors.textMuted, textTransform: 'capitalize' },
});

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={secStyles.label}>{title}</Text>;
}

const secStyles = StyleSheet.create({
  label: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreditCardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { baseCurrency } = useOnboardingStore();
  const { isPremium, loading: entitlementLoading } = useEntitlement();

  const [userId,          setUserId]          = useState<string | null>(null);
  const [card,            setCard]            = useState<CreditCard | null>(null);
  const [recentTxns,      setRecentTxns]      = useState<Transaction[]>([]);
  const [monthlyData,     setMonthlyData]     = useState<MonthlyReward[]>([]);
  const [currentMonthReward, setCurrentMonthReward] = useState(0);
  const [categoryRewards, setCategoryRewards] = useState<CategoryRewardRow[]>([]);
  const [categoryMap,     setCategoryMap]     = useState<Map<string, { name: string; icon: string | null }>>(new Map());
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);

  useEffect(() => { getCurrentUserId().then(setUserId); }, []);

  const fetchAll = useCallback(async (uid: string, cardId: string) => {
    // 1. Fetch card metadata
    const { data: cardData, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', uid)
      .maybeSingle();

    if (cardError || !cardData) return;
    const fetchedCard = cardData as CreditCard;
    setCard(fetchedCard);

    // 2. Fetch categories to build a lookup map
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name, icon')
      .or(`user_id.is.null,user_id.eq.${uid}`)
      .eq('is_archived', false);
    const newCategoryMap = new Map<string, { name: string; icon: string | null }>();
    for (const cat of (catData ?? []) as Category[]) {
      newCategoryMap.set(cat.id, { name: cat.name, icon: cat.icon });
    }
    setCategoryMap(newCategoryMap);

    // 3. Fetch last 10 transactions for this card
    const { data: txnData } = await supabase
      .from('transactions')
      .select('id, description, txn_date, amount, txn_type, currency, category_id')
      .eq('user_id', uid)
      .eq('credit_card_id', cardId)
      .order('txn_date', { ascending: false })
      .limit(10);
    setRecentTxns((txnData ?? []) as Transaction[]);

    // 4. Fetch 6 months of transactions for reward chart
    const defaultRate = (fetchedCard.reward_config['default'] as number | undefined) ?? 0;
    const rewardType  = fetchedCard.reward_type;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const fromDate = sixMonthsAgo.toISOString().split('T')[0];

    const { data: allTxns } = await supabase
      .from('transactions')
      .select('txn_date, amount, currency, category_id')
      .eq('user_id', uid)
      .eq('credit_card_id', cardId)
      .gte('txn_date', fromDate)
      .order('txn_date', { ascending: true });

    // Group by month
    const rewardByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      rewardByMonth[monthKeyOffset(i)] = 0;
    }

    // Compute category rewards for current month
    const catRewardMap: Record<string, number> = {};
    const currentKey = monthKeyOffset(0);

    const cardForEstimate = {
      id: fetchedCard.id,
      name: fetchedCard.name,
      network: fetchedCard.network,
      last4: fetchedCard.last4,
      reward_type: fetchedCard.reward_type,
      reward_config: fetchedCard.reward_config,
    };

    for (const txn of (allTxns ?? [])) {
      const key = (txn.txn_date as string).slice(0, 7); // "YYYY-MM"
      const categoryId = (txn.category_id as string | null) ?? null;
      if (key in rewardByMonth) {
        const reward = computeReward(txn.amount as number, rewardType, defaultRate, baseCurrency);
        rewardByMonth[key] += reward;
      }
      // Per-category breakdown — current month only
      if (key === currentKey && rewardType !== 'none') {
        const catReward = estimateReward(txn.amount as number, cardForEstimate, categoryId);
        const mapKey = categoryId ?? '__uncategorized__';
        catRewardMap[mapKey] = (catRewardMap[mapKey] ?? 0) + catReward;
      }
    }

    setCurrentMonthReward(rewardByMonth[currentKey] ?? 0);

    // Build sorted category reward rows (reward > 0 only)
    const catRows: CategoryRewardRow[] = Object.entries(catRewardMap)
      .filter(([, val]) => val > 0)
      .map(([catKey, val]) => {
        if (catKey === '__uncategorized__') {
          return { categoryId: null, name: 'Uncategorized', icon: null, rewardValue: val };
        }
        const catInfo = newCategoryMap.get(catKey);
        return {
          categoryId: catKey,
          name: catInfo?.name ?? 'Unknown',
          icon: catInfo?.icon ?? null,
          rewardValue: val,
        };
      })
      .sort((a, b) => b.rewardValue - a.rewardValue);
    setCategoryRewards(catRows);

    const chartData: MonthlyReward[] = Object.entries(rewardByMonth).map(([key, val]) => ({
      monthKey: key,
      label: monthLabel(key),
      rewardValue: val,
    }));
    setMonthlyData(chartData);
  }, [baseCurrency]);

  useEffect(() => {
    if (!userId || !id) return;
    setLoading(true);
    fetchAll(userId, id).finally(() => setLoading(false));
  }, [userId, id, fetchAll]);

  const onRefresh = useCallback(async () => {
    if (!userId || !id) return;
    setRefreshing(true);
    await fetchAll(userId, id);
    setRefreshing(false);
  }, [userId, id, fetchAll]);

  if (loading || entitlementLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Card Detail</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Card not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const networkIcon  = NETWORK_ICON[card.network] ?? '💳';
  const networkLabel = NETWORK_LABEL[card.network] ?? card.network;
  const defaultRate  = (card.reward_config['default'] as number | undefined) ?? 0;
  const rewardRatePct = (defaultRate * 100).toFixed(2).replace(/\.?0+$/, '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {networkIcon}  {card.name}
        </Text>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => Alert.alert('Coming Soon', 'Edit card — coming in a future update.')}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ── Card Hero ───────────────────────────────────────────────────── */}
        <View style={[styles.cardHero, Shadows.primary]}>
          <View style={styles.cardHeroTop}>
            <Text style={styles.cardHeroIcon}>{networkIcon}</Text>
            <View>
              <Text style={styles.cardHeroNetwork}>{networkLabel}</Text>
              {card.reward_type !== 'none' && defaultRate > 0 && (
                <Text style={styles.cardHeroRate}>{rewardRatePct}% {card.reward_type}</Text>
              )}
            </View>
          </View>
          <Text style={styles.cardHeroMasked}>{maskLast4(card.last4)}</Text>
          <Text style={styles.cardHeroName}>{card.name}</Text>
        </View>

        {/* ── Summary Details ─────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Credit Limit</Text>
            <Text style={styles.summaryValue}>
              {card.credit_limit != null
                ? formatAmount(card.credit_limit, baseCurrency)
                : '—'
              }
            </Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Billing Cycle Day</Text>
            <Text style={styles.summaryValue}>{card.billing_cycle_day}</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Due Day</Text>
            <Text style={styles.summaryValue}>{card.payment_due_day}</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Network</Text>
            <Text style={styles.summaryValue}>{networkLabel}</Text>
          </View>
        </View>

        {/* ── Current Month Rewards (Premium-gated) ───────────────────────── */}
        <SectionHeader title="Current Month Rewards" />
        {!isPremium ? (
          <PremiumGate />
        ) : card.reward_type === 'none' ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>This card has no reward programme configured.</Text>
          </View>
        ) : (
          <View style={[styles.rewardCard, Shadows.card]}>
            <View style={styles.rewardIconWrap}>
              <Text style={styles.rewardIcon}>
                {card.reward_type === 'cashback' ? '💰' : card.reward_type === 'miles' ? '✈️' : '⭐'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardAmount}>
                {formatRewardDisplay(currentMonthReward, card.reward_type, baseCurrency)}
              </Text>
              {defaultRate > 0 && (
                <Text style={styles.rewardRate}>
                  {rewardRatePct}% {card.reward_type} on all tagged transactions
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Monthly History bar chart (Premium-gated) ───────────────────── */}
        <SectionHeader title="Reward History (6 months)" />
        {!isPremium ? (
          <PremiumGate />
        ) : card.reward_type === 'none' ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Rewards history unavailable — no reward type set.</Text>
          </View>
        ) : (
          <View style={[styles.chartCard, Shadows.card]}>
            <BarChart
              months={monthlyData}
              rewardType={card.reward_type}
              baseCurrency={baseCurrency}
            />
            <Text style={styles.chartFootnote}>
              Bars represent rewards earned on transactions tagged to this card.
            </Text>
          </View>
        )}

        {/* ── Rewards by Category (Premium-gated) ────────────────────────── */}
        <SectionHeader title="Rewards by Category" />
        {!isPremium ? (
          <PremiumGate />
        ) : card.reward_type === 'none' ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>No reward programme configured for this card.</Text>
          </View>
        ) : categoryRewards.length === 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>No reward transactions recorded this month.</Text>
          </View>
        ) : (
          <View style={styles.catRewardCard}>
            {categoryRewards.map((row, idx) => (
              <View key={row.categoryId ?? '__uncategorized__'}>
                <View style={styles.catRewardRow}>
                  <Text style={styles.catRewardIcon}>{row.icon ?? '🏷️'}</Text>
                  <Text style={styles.catRewardName} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.catRewardValue}>
                    {card.reward_type === 'points'
                      ? `${Math.round(row.rewardValue).toLocaleString()} pts`
                      : formatAmount(row.rewardValue, baseCurrency)}
                  </Text>
                </View>
                {idx < categoryRewards.length - 1 && <View style={styles.catRewardSep} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Recent Transactions ─────────────────────────────────────────── */}
        <SectionHeader title="Recent Transactions" />
        <View style={styles.txnCard}>
          {recentTxns.length === 0 ? (
            <View style={styles.txnEmpty}>
              <Text style={styles.txnEmptyText}>
                No transactions tagged to this card yet.{'\n'}
                Tag a transaction by selecting this card when adding an expense.
              </Text>
            </View>
          ) : (
            recentTxns.map((txn) => (
              <TxnRow key={txn.id} txn={txn} baseCurrency={baseCurrency} />
            ))
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  backText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 16,
    color: Colors.primary,
    width: 60,
  },
  editText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 16,
    color: Colors.primary,
    textAlign: 'right',
    width: 60,
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.textMuted },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },

  // Card hero
  cardHero: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    marginBottom: 4,
  },
  cardHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeroIcon:    { fontSize: 28 },
  cardHeroNetwork: { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  cardHeroRate:    { fontFamily: 'WorkSans_400Regular',  fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  cardHeroMasked:  {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 3,
  },
  cardHeroName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summarySep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  summaryLabel: { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.textMuted },
  summaryValue: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: Colors.onSurface },

  // Reward card
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    gap: 14,
  },
  rewardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIcon:   { fontSize: 24 },
  rewardAmount: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.onSurface, letterSpacing: -0.3 },
  rewardRate:   { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Chart card
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    gap: 8,
  },
  chartFootnote: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Info card (no reward type)
  infoCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Category reward card
  catRewardCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  catRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  catRewardIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  catRewardName: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  catRewardValue: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  catRewardSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },

  // Transaction card
  txnCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  txnEmpty: { paddingVertical: 24, alignItems: 'center' },
  txnEmptyText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
