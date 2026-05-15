/**
 * Transactions tab — list of all manual + synced transactions.
 * Features:
 *  - Search bar with 300ms debounce
 *  - Filter pills: All / Need / Want / Saving
 *  - Grouped by date with pull-to-refresh
 *  - Tap row → transaction-detail screen
 *  - Long-press row → inline delete confirm
 *  - FAB + header "+ Add" button open add-transaction modal
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMockTransactions, deleteMockTransaction } from '../../../lib/mock-data';
import { formatAmount } from '../../../lib/money';
import { Colors } from '../../../constants/colors';
import { supabase } from '../../../lib/supabase';
import { useOnboardingStore } from '../../../store/onboarding';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  txn_type: 'need' | 'want' | 'saving';
  txn_date: string;
  source: string;
  categories: { name: string; icon: string } | null;
}

interface DayGroup {
  date: string;
  label: string;
  items: Transaction[];
}

type FilterType = 'all' | 'need' | 'want' | 'saving';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDate(txns: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const existing = map.get(t.txn_date) ?? [];
    map.set(t.txn_date, [...existing, t]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (b > a ? 1 : -1))
    .map(([date, items]) => ({ date, label: formatDayLabel(date), items }));
}

const TYPE_COLORS: Record<string, string> = {
  need:   Colors.primary,
  want:   '#f59e0b',
  saving: '#22c55e',
};

const TYPE_LABELS: Record<string, string> = {
  need:   'Need',
  want:   'Want',
  saving: 'Saving',
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'need',   label: 'Needs' },
  { value: 'want',   label: 'Wants' },
  { value: 'saving', label: 'Savings' },
];

// ── Data fetch ─────────────────────────────────────────────────────────────────
async function fetchTransactions(_userId: string): Promise<Transaction[]> {
  return getMockTransactions();
}

// ── Row ────────────────────────────────────────────────────────────────────────
interface TxnRowProps {
  item: Transaction;
  onPress: () => void;
  onLongPress: () => void;
}

function TxnRow({ item, onPress, onLongPress }: TxnRowProps) {
  const typeColor = TYPE_COLORS[item.txn_type] ?? Colors.primary;
  const isExpense = item.txn_type !== 'saving';

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={[styles.iconBadge, { backgroundColor: typeColor + '18' }]}>
        <Text style={styles.iconText}>{item.categories?.icon ?? '📋'}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.description}</Text>
        <View style={styles.rowSubRow}>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.categories?.name ?? 'Uncategorised'}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {TYPE_LABELS[item.txn_type] ?? item.txn_type}
            </Text>
          </View>
          {item.source !== 'manual' && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>sync</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.rowAmount, { color: isExpense ? Colors.onSurface : '#22c55e' }]}>
        {isExpense ? '−' : '+'}{formatAmount(item.amount, item.currency)}
      </Text>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function TransactionsTab() {
  const { baseCurrency } = useOnboardingStore();
  const queryClient = useQueryClient();
  const [userId, setUserId] = React.useState<string | null>(null);

  // Filter & search state
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['transactions', userId],
    queryFn: () => fetchTransactions(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  // ── Search debounce ──────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  // ── Filtered + searched transactions ────────────────────────────────────────
  const filtered = useMemo(() => {
    let txns = data ?? [];
    if (filter !== 'all') txns = txns.filter((t) => t.txn_type === filter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      txns = txns.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.categories?.name ?? '').toLowerCase().includes(q),
      );
    }
    return txns;
  }, [data, filter, debouncedSearch]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
  }, [queryClient, userId]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (txn: Transaction) => {
      Alert.alert(
        'Delete Transaction',
        `Delete "${txn.description}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { error: dbErr } = await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', txn.id)
                    .eq('user_id', user.id);
                  if (dbErr) throw dbErr;
                } else {
                  deleteMockTransaction(txn.id);
                }
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
              } catch (e) {
                console.error('Delete failed:', e);
                Alert.alert('Error', 'Could not delete transaction.');
              }
            },
          },
        ],
      );
    },
    [queryClient],
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/add-transaction' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search transactions…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setFilter(opt.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load transactions</Text>
          <Text style={styles.errorBody}>{(error as Error).message}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>{debouncedSearch ? '🔍' : '📋'}</Text>
          <Text style={styles.emptyTitle}>
            {debouncedSearch ? 'No results found' : 'No transactions yet'}
          </Text>
          <Text style={styles.emptyBody}>
            {debouncedSearch
              ? `No transactions match "${debouncedSearch}"`
              : 'Tap + Add to log your first transaction.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.date}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((txn) => (
                <TxnRow
                  key={txn.id}
                  item={txn}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/transaction-detail',
                      params: { id: txn.id },
                    } as any)
                  }
                  onLongPress={() => handleDelete(txn)}
                />
              ))}
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/add-transaction' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  addBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, color: '#ffffff' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  searchIcon:  { fontSize: 15 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText:       { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.textMuted },
  filterPillTextActive: { color: '#ffffff' },

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: Colors.onSurface },
  emptyBody:  { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  errorEmoji: { fontSize: 40 },
  errorTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: Colors.onSurface },
  errorBody:  { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: '#ffffff' },

  // List
  listContent: { paddingBottom: 100 },
  group:       { paddingTop: 16 },
  groupLabel: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText:   { fontSize: 20 },
  rowMeta:    { flex: 1, gap: 3 },
  rowTitle: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  rowSubRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 10 },
  sourceBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#e0f2fe',
  },
  sourceBadgeText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 10, color: '#0284c7' },
  rowAmount: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: '#ffffff', lineHeight: 32 },
});
