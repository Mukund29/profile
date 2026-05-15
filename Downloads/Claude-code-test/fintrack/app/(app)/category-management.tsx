/**
 * Category Management Screen
 * Route: /(app)/category-management
 *
 * Lists the 13 system categories (read-only) and lets users add / delete
 * custom categories in local state.
 * Custom categories will be persisted to Supabase in production.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { MOCK_CATEGORIES } from '../../lib/mock-data';
import { Colors } from '../../constants/colors';

// ── Types ──────────────────────────────────────────────────────────────────────
type CategoryType = 'need' | 'want' | 'saving';

interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  type: CategoryType;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TYPE_OPTIONS: { value: CategoryType; label: string; color: string }[] = [
  { value: 'need',    label: 'Need',    color: Colors.needsBlue },
  { value: 'want',    label: 'Want',    color: Colors.wantsAmber },
  { value: 'saving',  label: 'Saving',  color: Colors.savingsGreen },
];

const QUICK_EMOJIS = ['🛒','🍕','🚗','💊','🏋️','🎮','🎵','🛍️','🎓','💈','🐾','🌿'];

function typeColor(type: CategoryType): string {
  if (type === 'need')    return Colors.needsBlue;
  if (type === 'want')    return Colors.wantsAmber;
  return Colors.savingsGreen;
}

function typeLabel(type: CategoryType): string {
  if (type === 'need')    return 'Need';
  if (type === 'want')    return 'Want';
  return 'Saving';
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CategoryManagementScreen() {
  // Custom categories (local state; Supabase-backed in production)
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  // Inline form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CategoryType>('need');
  const [formEmoji, setFormEmoji] = useState('🛒');
  const [nameError, setNameError] = useState('');

  function handleAdd() {
    const trimmed = formName.trim();
    if (!trimmed) {
      setNameError('Please enter a category name.');
      return;
    }
    if (trimmed.length > 30) {
      setNameError('Name must be 30 characters or fewer.');
      return;
    }
    const duplicate =
      MOCK_CATEGORIES.some((c) => c.name.toLowerCase() === trimmed.toLowerCase()) ||
      customCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setNameError('A category with this name already exists.');
      return;
    }

    const newCat: CustomCategory = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      icon: formEmoji,
      type: formType,
    };
    setCustomCategories((prev) => [...prev, newCat]);

    // Reset form
    setFormName('');
    setFormType('need');
    setFormEmoji('🛒');
    setNameError('');
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function cancelForm() {
    setFormName('');
    setFormType('need');
    setFormEmoji('🛒');
    setNameError('');
    setShowForm(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
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
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── System Categories ─────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>System Categories</Text>
          <View style={styles.categoryList}>
            {MOCK_CATEGORIES.map((cat, index) => (
              <View
                key={cat.id}
                style={[
                  styles.categoryRow,
                  index === MOCK_CATEGORIES.length - 1 && styles.categoryRowLast,
                ]}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: typeColor(cat.default_type) + '22' },
                  ]}
                >
                  <Text
                    style={[styles.typeBadgeText, { color: typeColor(cat.default_type) }]}
                  >
                    {typeLabel(cat.default_type)}
                  </Text>
                </View>
                <Text style={styles.systemLabel}>(system)</Text>
              </View>
            ))}
          </View>

          {/* ── Custom Categories ─────────────────────────────────────────── */}
          <View style={styles.customHeader}>
            <Text style={styles.sectionHeader}>Custom Categories</Text>
            {!showForm && (
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                style={styles.addButton}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>+ Add Category</Text>
              </TouchableOpacity>
            )}
          </View>

          {customCategories.length > 0 && (
            <View style={styles.categoryList}>
              {customCategories.map((cat, index) => (
                <View
                  key={cat.id}
                  style={[
                    styles.categoryRow,
                    index === customCategories.length - 1 && !showForm && styles.categoryRowLast,
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: typeColor(cat.type) + '22' },
                    ]}
                  >
                    <Text
                      style={[styles.typeBadgeText, { color: typeColor(cat.type) }]}
                    >
                      {typeLabel(cat.type)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(cat.id)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {customCategories.length === 0 && !showForm && (
            <View style={styles.emptyCustom}>
              <Text style={styles.emptyText}>
                No custom categories yet. Tap "Add Category" to create one.
              </Text>
            </View>
          )}

          {/* ── Inline Add Form ───────────────────────────────────────────── */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Category</Text>

              {/* Name input */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={[styles.textInput, nameError ? styles.textInputError : null]}
                  value={formName}
                  onChangeText={(v) => {
                    setFormName(v);
                    if (nameError) setNameError('');
                  }}
                  placeholder="e.g. Pet Food"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={30}
                  returnKeyType="done"
                />
                {nameError !== '' && (
                  <Text style={styles.errorText}>{nameError}</Text>
                )}
              </View>

              {/* Type selector */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map((opt) => {
                    const active = formType === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setFormType(opt.value)}
                        style={[
                          styles.typePill,
                          active && { backgroundColor: opt.color, borderColor: opt.color },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.typePillText, active && styles.typePillTextActive]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Emoji picker */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Icon</Text>
                <View style={styles.emojiGrid}>
                  {QUICK_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setFormEmoji(emoji)}
                      style={[
                        styles.emojiTile,
                        formEmoji === emoji && styles.emojiTileSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiChar}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Form actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  onPress={cancelForm}
                  style={styles.cancelBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={styles.submitBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerBack:    { fontFamily: 'WorkSans_500Medium', fontSize: 15, color: Colors.primary },
  headerTitle:   { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface },
  headerSpacer:  { width: 48 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  sectionHeader: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },

  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  categoryList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  categoryRowLast: { borderBottomWidth: 0 },
  categoryIcon:    { fontSize: 20, width: 28, textAlign: 'center' },
  categoryName: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 11,
  },
  systemLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  deleteButton: { padding: 4 },
  deleteIcon:   { fontSize: 16 },

  emptyCustom: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: Colors.onPrimary,
  },

  // ── Form ────────────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    gap: 16,
  },
  formTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  formField: { gap: 6 },
  formLabel: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
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
  textInputError: { borderColor: Colors.error },
  errorText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: Colors.error,
  },

  typeRow:           { flexDirection: 'row', gap: 8 },
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

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  emojiTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  emojiChar: { fontSize: 22 },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  cancelBtnText: { fontFamily: 'WorkSans_500Medium', fontSize: 14, color: Colors.textMuted },
  submitBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: '#ffffff' },
});
