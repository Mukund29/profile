/**
 * Transactions tab — list of all manual + synced transactions.
 * Grouped by date, pull-to-refresh, empty state, FAB opens add-transaction modal.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMockTransactions } from '../../../lib/mock-data';
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
  need: Colors.primary,
  want: '#f59e0b',
  saving: '#22c55e',
};

const TYPE_LABELS: Record<string, string> = {
  need: 'Need',
  want: 'Want',
  saving: 'Saving',
};

// ── Fetch (mock → real Supabase once DB is live) ──────────────────────────────
async function fetchTransactions(_userId: string): Promise<Transaction[]> {
  return getMockTransactions();
}

// ── Row ────────────────────────────────────────────────────────────────────────
function TxnRow({ item }: { item: Transaction }) {
  const typeColor = TYPE_COLORS[item.txn_type] ?? Colors.primary;
  const isExpense = item.txn_type !== 'saving';

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7}>
      <View style={[styles.iconBadge, { backgroundColor: typeColor + '18' }]}>
        <Text style={styles.iconText}>{item.categories?.icon ?? '📋'}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.rowSub}>
          {item.categories?.name ?? 'Uncategorised'} · {TYPE_LABELS[item.txn_type] ?? item.txn_type}
        </Text>
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

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['transactions', userId],
    queryFn: () => fetchTransactions(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
  }, [queryClient, userId]);

  const groups = React.useMemo(() => groupByDate(data ?? []), [data]);

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
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyBody}>Tap + Add to log your first transaction.</Text>
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
                <TxnRow key={txn.id} item={txn} />
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
  addBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: Colors.onSurface },
  emptyBody: { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  errorEmoji: { fontSize: 40 },
  errorTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: Colors.onSurface },
  errorBody: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: '#ffffff' },
  listContent: { paddingBottom: 100 },
  group: { paddingTop: 16 },
  groupLabel: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
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
  iconText: { fontSize: 20 },
  rowMeta: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  rowSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  rowAmount: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
  },
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
