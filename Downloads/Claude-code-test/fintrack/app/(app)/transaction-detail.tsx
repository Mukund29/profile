/**
 * Transaction Detail / Edit screen.
 * Route: /(app)/transaction-detail?id=<txn-id>
 *
 * - Pre-fills all fields from the mock store (falls back gracefully to empty).
 * - Saves via updateMockTransaction (mock) or Supabase update (live).
 * - Deletes via deleteMockTransaction (mock) or Supabase delete (live).
 * - Invalidates ['transactions'] query on save / delete.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import {
  getMockTransactions,
  MOCK_CATEGORIES,
  updateMockTransaction,
  deleteMockTransaction,
  MockCategory,
} from '../../lib/mock-data';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────
type TxnType = 'need' | 'want' | 'saving';

const TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
  { value: 'need',   label: 'Need',   color: Colors.primary },
  { value: 'want',   label: 'Want',   color: '#f59e0b' },
  { value: 'saving', label: 'Saving', color: '#22c55e' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Convert paise → rupees string, e.g. 28450 → "284.50" */
function paiseToDisplay(paise: number): string {
  return (paise / 100).toFixed(2);
}
/** Convert display string → paise, e.g. "284.50" → 28450 */
function displayToPaise(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // ── Load transaction ────────────────────────────────────────────────────────
  const original = useMemo(
    () => getMockTransactions().find((t) => t.id === id) ?? null,
    [id],
  );

  // ── Local form state ────────────────────────────────────────────────────────
  const [description, setDescription] = useState(original?.description ?? '');
  const [amountDisplay, setAmountDisplay] = useState(
    original ? paiseToDisplay(original.amount) : '',
  );
  const [txnType, setTxnType] = useState<TxnType>(original?.txn_type ?? 'need');
  const [selectedCategory, setSelectedCategory] = useState<MockCategory | null>(
    original?.categories
      ? (MOCK_CATEGORIES.find((c) => c.name === original.categories?.name) ?? null)
      : null,
  );
  const [txnDate, setTxnDate] = useState(original?.txn_date ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // ── Category filtered by type ───────────────────────────────────────────────
  const filteredCategories = useMemo(
    () => MOCK_CATEGORIES.filter((c) => c.default_type === txnType),
    [txnType],
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!description.trim()) {
      Alert.alert('Validation', 'Please enter a description.');
      return;
    }
    const amount = displayToPaise(amountDisplay);
    if (amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }
    if (!txnDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Validation', 'Date must be YYYY-MM-DD format.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates = {
        description: description.trim(),
        amount,
        txn_type: txnType,
        txn_date: txnDate,
        categories: selectedCategory
          ? { name: selectedCategory.name, icon: selectedCategory.icon }
          : null,
      };

      if (user && id) {
        // Real Supabase update
        const { error } = await supabase
          .from('transactions')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (id) {
        // Mock fallback
        updateMockTransaction(id, updates);
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.back();
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'Could not save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [description, amountDisplay, txnType, txnDate, selectedCategory, id, queryClient]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user && id) {
                const { error } = await supabase
                  .from('transactions')
                  .delete()
                  .eq('id', id)
                  .eq('user_id', user.id);
                if (error) throw error;
              } else if (id) {
                deleteMockTransaction(id);
              }
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              router.back();
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', 'Could not delete transaction.');
            }
          },
        },
      ],
    );
  }, [id, queryClient]);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!original) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Transaction not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Transaction</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerDelete}>Delete</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amountDisplay}
              onChangeText={setAmountDisplay}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={txnDate}
              onChangeText={setTxnDate}
              placeholder="2026-05-15"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
          </View>

          {/* Type pills */}
          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = txnType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setTxnType(opt.value);
                      setSelectedCategory(null);
                    }}
                    style={[
                      styles.typePill,
                      active && { backgroundColor: opt.color, borderColor: opt.color },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.categoryPicker}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryPickerText}>
                {selectedCategory
                  ? `${selectedCategory.icon}  ${selectedCategory.name}`
                  : 'Select category…'}
              </Text>
              <Text style={styles.categoryPickerChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredCategories}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              const active = selectedCategory?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.categoryRow, active && styles.categoryRowActive]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                  <Text style={[styles.categoryName, active && styles.categoryNameActive]}>
                    {item.name}
                  </Text>
                  {active && <Text style={styles.categoryCheck}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },

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
  headerBack:   { fontFamily: 'WorkSans_500Medium', fontSize: 15, color: Colors.primary },
  headerTitle:  { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface },
  headerDelete: { fontFamily: 'WorkSans_500Medium', fontSize: 15, color: '#ef4444' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 48 },

  field: { gap: 6 },
  label: { fontFamily: 'WorkSans_600SemiBold', fontSize: 12, color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  typeRow:           { flexDirection: 'row', gap: 10 },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  typePillText:       { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.textMuted },
  typePillTextActive: { color: '#ffffff' },

  categoryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryPickerText:    { fontFamily: 'WorkSans_400Regular', fontSize: 15, color: Colors.onSurface },
  categoryPickerChevron: { fontFamily: 'WorkSans_400Regular', fontSize: 20, color: Colors.textMuted },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontFamily: 'WorkSans_600SemiBold', fontSize: 16, color: '#ffffff' },

  // Not-found
  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontFamily: 'WorkSans_400Regular', fontSize: 15, color: Colors.textMuted },
  backBtn:      { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  backBtnText:  { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: '#ffffff' },

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
  modalTitle:  { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface },
  modalClose:  { fontFamily: 'WorkSans_600SemiBold', fontSize: 15, color: Colors.primary },
  modalList:   { paddingVertical: 8 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  categoryRowActive: { backgroundColor: Colors.primaryFixed ?? '#e1e0ff' },
  categoryIcon:      { fontSize: 22 },
  categoryName:      { flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 15, color: Colors.onSurface },
  categoryNameActive:{ fontFamily: 'WorkSans_600SemiBold', color: Colors.primary },
  categoryCheck:     { fontSize: 16, color: Colors.primary },
});
