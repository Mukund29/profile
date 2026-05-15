import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toSmallestUnit } from '../../lib/money';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';
import { MOCK_CATEGORIES, addMockTransaction } from '../../lib/mock-data';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  icon: string;
  colour_hex: string;
  default_type: 'need' | 'want' | 'saving';
}

type TxnType = 'need' | 'want' | 'saving';

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(iso: string): string {
  const today = todayISO();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shiftDate(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function makeDedupHash(): string {
  return 'm_' + Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

const TYPE_META: Record<TxnType, { label: string; color: string }> = {
  need:   { label: 'Need',  color: Colors.primary },
  want:   { label: 'Want',  color: '#f59e0b' },
  saving: { label: 'Save',  color: '#22c55e' },
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AddTransactionScreen() {
  const { baseCurrency } = useOnboardingStore();
  const queryClient = useQueryClient();

  const [userId, setUserId] = React.useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  // Form state
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [txnType, setTxnType] = useState<TxnType>('need');
  const [txnDate, setTxnDate] = useState(todayISO());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Category picker state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories — fall back to mock data if Supabase not yet configured
  useEffect(() => {
    setCatsLoading(true);
    if (!userId) {
      // No auth yet — use mock categories so UI is fully usable in dev
      setCategories(MOCK_CATEGORIES as Category[]);
      setCatsLoading(false);
      return;
    }
    supabase
      .from('categories')
      .select('id, name, icon, colour_hex, default_type')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq('is_archived', false)
      .order('name')
      .then(({ data, error: fetchErr }) => {
        if (!fetchErr && data && data.length > 0) {
          setCategories(data as Category[]);
        } else {
          // DB not seeded yet — fall back to mock
          setCategories(MOCK_CATEGORIES as Category[]);
        }
        setCatsLoading(false);
      });
  }, [userId]);

  // Reset category when type changes if it doesn't match
  useEffect(() => {
    if (selectedCategory && selectedCategory.default_type !== txnType) {
      setSelectedCategory(null);
    }
  }, [txnType]);

  const filteredCategories = categories.filter((c) => c.default_type === txnType);

  const handleSave = useCallback(async () => {
    setError(null);

    const parsedAmount = parseFloat(amountText.replace(/,/g, ''));
    if (!amountText || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setSaving(true);
    const smallestUnit = toSmallestUnit(parsedAmount, baseCurrency);

    if (!userId) {
      // Dev mode — save to in-memory mock store
      addMockTransaction({
        description:  description.trim(),
        amount:       smallestUnit,
        currency:     baseCurrency,
        txn_type:     txnType,
        txn_date:     txnDate,
        source:       'manual',
        categories:   selectedCategory
          ? { name: selectedCategory.name, icon: selectedCategory.icon }
          : null,
      });
      setSaving(false);
      queryClient.invalidateQueries({ queryKey: ['transactions', null] });
      router.back();
      return;
    }

    const { error: insertError } = await supabase.from('transactions').insert({
      user_id:           userId,
      txn_date:          txnDate,
      description:       description.trim(),
      category_id:       selectedCategory?.id ?? null,
      txn_type:          txnType,
      amount:            smallestUnit,
      currency:          baseCurrency,
      amount_base:       smallestUnit,
      fx_rate_at_insert: 1,
      payment_mode:      'other',
      source:            'manual',
      dedup_hash:        makeDedupHash(),
      notes:             notes.trim() || null,
      is_confirmed:      true,
    });

    setSaving(false);

    if (insertError) {
      // If Supabase not configured yet, fall back to mock
      addMockTransaction({
        description:  description.trim(),
        amount:       smallestUnit,
        currency:     baseCurrency,
        txn_type:     txnType,
        txn_date:     txnDate,
        source:       'manual',
        categories:   selectedCategory
          ? { name: selectedCategory.name, icon: selectedCategory.icon }
          : null,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    router.back();
  }, [userId, amountText, description, notes, txnType, txnDate, selectedCategory, baseCurrency, queryClient]);

  const typeColor = TYPE_META[txnType].color;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Transaction</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {saving
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={[styles.saveText, { color: typeColor }]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount */}
          <View style={[styles.amountCard, { borderColor: typeColor }]}>
            <Text style={styles.currencySymbol}>{baseCurrency}</Text>
            <TextInput
              style={styles.amountInput}
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              returnKeyType="done"
              selectTextOnFocus
            />
          </View>

          {/* Type selector */}
          <View style={styles.typeRow}>
            {(Object.keys(TYPE_META) as TxnType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  txnType === t && { backgroundColor: TYPE_META[t].color, borderColor: TYPE_META[t].color },
                ]}
                onPress={() => setTxnType(t)}
                activeOpacity={0.75}
              >
                <Text style={[styles.typeBtnText, txnType === t && styles.typeBtnTextActive]}>
                  {TYPE_META[t].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Groceries at DMart"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              maxLength={120}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowCatPicker(true)}
              activeOpacity={0.7}
            >
              {selectedCategory ? (
                <Text style={styles.pickerValue}>
                  {selectedCategory.icon}  {selectedCategory.name}
                </Text>
              ) : (
                <Text style={styles.pickerPlaceholder}>Select category (optional)</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateArrow}
                onPress={() => setTxnDate((d) => shiftDate(d, -1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.dateArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.dateLabel}>{formatDateDisplay(txnDate)}</Text>
              <TouchableOpacity
                style={styles.dateArrow}
                onPress={() => setTxnDate((d) => {
                  const next = shiftDate(d, 1);
                  return next <= todayISO() ? next : d;
                })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.dateArrowText, txnDate >= todayISO() && styles.dateArrowDisabled]}>
                  ›
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any extra details…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker modal */}
      <Modal
        visible={showCatPicker}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCatPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Category</Text>
            <TouchableOpacity onPress={() => setShowCatPicker(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Clear selection */}
          <TouchableOpacity
            style={styles.catRow}
            onPress={() => { setSelectedCategory(null); setShowCatPicker(false); }}
          >
            <Text style={styles.catIcon}>✕</Text>
            <Text style={[styles.catName, { color: Colors.textMuted }]}>No category</Text>
          </TouchableOpacity>

          {catsLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
          ) : filteredCategories.length === 0 ? (
            <View style={styles.catEmpty}>
              <Text style={styles.catEmptyText}>No categories for this type yet.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={(c) => c.id}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.catRow,
                    selectedCategory?.id === item.id && styles.catRowSelected,
                  ]}
                  onPress={() => { setSelectedCategory(item); setShowCatPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catIcon}>{item.icon}</Text>
                  <Text style={styles.catName}>{item.name}</Text>
                  {selectedCategory?.id === item.id && (
                    <Text style={[styles.catCheck, { color: typeColor }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
  },
  cancelText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 16,
    color: Colors.textMuted,
  },
  saveText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
  },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 48 },

  // Amount
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  currencySymbol: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    color: Colors.textMuted,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 36,
    color: Colors.onSurface,
    padding: 0,
  },

  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  typeBtnText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.textMuted,
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },

  // Fields
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  optional: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
  },
  notesInput: {
    height: 88,
    paddingTop: 12,
  },

  // Category picker row
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerValue: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
  },
  pickerPlaceholder: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textMuted,
    lineHeight: 22,
  },

  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 16,
  },
  dateArrow: {
    width: 36,
    alignItems: 'center',
  },
  dateArrowText: {
    fontSize: 24,
    color: Colors.onSurface,
    lineHeight: 26,
  },
  dateArrowDisabled: { color: Colors.borderLight },
  dateLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'WorkSans_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
  },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.destructiveRed,
    textAlign: 'center',
  },

  // Category modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
  },
  modalDone: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    gap: 14,
  },
  catRowSelected: { backgroundColor: Colors.primaryFixed },
  catIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  catName: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
  },
  catCheck: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
  },
  catEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  catEmptyText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderLight, marginLeft: 20 },
});
