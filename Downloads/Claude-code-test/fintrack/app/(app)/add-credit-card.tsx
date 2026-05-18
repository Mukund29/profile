/**
 * S14 Story 21-1 — Add Credit Card form.
 *
 * Fields:
 *  - Card Name (required)
 *  - Network (segmented: Visa / Mastercard / Amex / RuPay / Diners / Other)
 *  - Last 4 digits (optional, numeric, max 4)
 *  - Credit Limit (optional, numeric)
 *  - Billing cycle day (1–28, default 1)
 *  - Payment due day (1–28, default 21)
 *  - Reward type (segmented: Cashback / Points / Miles / None)
 *  - Default reward rate % (optional, e.g. 1.5 for 1.5%)
 *  - Category reward rates (optional, per-category overrides)
 *
 * On save: inserts into credit_cards, stores reward_config = {"default": rateAsDecimal, [catId]: rateAsDecimal}.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase, getCurrentUserId } from '../../lib/supabase';
import { toSmallestUnit, SYMBOL_MAP } from '../../lib/money';
import { useOnboardingStore } from '../../store/onboarding';

// ── Types ─────────────────────────────────────────────────────────────────────

type NetworkType = 'visa' | 'mastercard' | 'amex' | 'rupay' | 'diners' | 'other';
type RewardType  = 'cashback' | 'points' | 'miles' | 'none';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  default_type: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NETWORKS: { key: NetworkType; label: string; icon: string }[] = [
  { key: 'visa',       label: 'Visa',       icon: '💳' },
  { key: 'mastercard', label: 'Mastercard',  icon: '🟠' },
  { key: 'amex',       label: 'Amex',        icon: '🟦' },
  { key: 'rupay',      label: 'RuPay',       icon: '🇮🇳' },
  { key: 'diners',     label: 'Diners',      icon: '⬛' },
  { key: 'other',      label: 'Other',       icon: '💳' },
];

const REWARD_TYPES: { key: RewardType; label: string }[] = [
  { key: 'cashback', label: 'Cashback' },
  { key: 'points',   label: 'Points'   },
  { key: 'miles',    label: 'Miles'    },
  { key: 'none',     label: 'None'     },
];

// ── Segmented control ─────────────────────────────────────────────────────────

interface SegmentedControlProps<T extends string> {
  options: { key: T; label: string; icon?: string }[];
  selected: T;
  onSelect: (key: T) => void;
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: SegmentedControlProps<T>) {
  return (
    <View style={segStyles.wrapper}>
      {options.map((opt) => {
        const active = opt.key === selected;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[segStyles.btn, active && segStyles.btnActive]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.75}
          >
            {opt.icon && <Text style={segStyles.icon}>{opt.icon}</Text>}
            <Text style={[segStyles.label, active && segStyles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  btnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  icon:  { fontSize: 14 },
  label: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  labelActive: { color: Colors.primary },
});

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>
        {label}
        {optional && <Text style={fieldStyles.opt}> (optional)</Text>}
      </Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap:  { gap: 8 },
  label: { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.textMuted, letterSpacing: 0.3 },
  opt:   { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: Colors.textMuted },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AddCreditCardScreen() {
  const { baseCurrency } = useOnboardingStore();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

  // Categories for per-category rates
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [categoryRates, setCategoryRates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('categories')
      .select('id, name, icon, default_type')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq('is_archived', false)
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
  }, [userId]);

  // Form state
  const [cardName,       setCardName]       = useState('');
  const [network,        setNetwork]        = useState<NetworkType>('visa');
  const [last4,          setLast4]          = useState('');
  const [limitText,      setLimitText]      = useState('');
  const [billingDay,     setBillingDay]     = useState('1');
  const [dueDay,         setDueDay]         = useState('21');
  const [rewardType,     setRewardType]     = useState<RewardType>('cashback');
  const [rewardRateText, setRewardRateText] = useState('');

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const currencySymbol = SYMBOL_MAP[baseCurrency] ?? baseCurrency;

  const validateAndSave = useCallback(async () => {
    setError(null);

    const trimmedName = cardName.trim();
    if (!trimmedName) {
      setError('Card name is required.');
      return;
    }

    if (last4 && !/^\d{4}$/.test(last4)) {
      setError('Last 4 digits must be exactly 4 numeric characters.');
      return;
    }

    const billingDayNum = parseInt(billingDay, 10);
    if (!billingDay || isNaN(billingDayNum) || billingDayNum < 1 || billingDayNum > 28) {
      setError('Billing cycle day must be between 1 and 28.');
      return;
    }

    const dueDayNum = parseInt(dueDay, 10);
    if (!dueDay || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 28) {
      setError('Payment due day must be between 1 and 28.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'Not signed in. Please restart the app.');
      return;
    }

    // Parse optional fields
    const limitDecimal   = limitText.trim() ? parseFloat(limitText.replace(/,/g, '')) : null;
    const limitSmallest  = limitDecimal != null && !isNaN(limitDecimal)
      ? toSmallestUnit(limitDecimal, baseCurrency)
      : null;

    const rateDecimal    = rewardRateText.trim() ? parseFloat(rewardRateText) : null;
    // reward_config: {"default": 0.015, [catId]: 0.05} — empty object if no rates
    const rewardConfig: Record<string, number> = {};
    if (rateDecimal != null && !isNaN(rateDecimal) && rateDecimal > 0) {
      rewardConfig['default'] = rateDecimal / 100;
    }
    for (const [catId, rateStr] of Object.entries(categoryRates)) {
      const v = parseFloat(rateStr);
      if (!isNaN(v) && v > 0) rewardConfig[catId] = v / 100;
    }

    setSaving(true);
    const { error: dbError } = await supabase.from('credit_cards').insert({
      user_id:           userId,
      name:              trimmedName,
      network,
      last4:             last4 || null,
      credit_limit:      limitSmallest,
      billing_cycle_day: billingDayNum,
      payment_due_day:   dueDayNum,
      reward_type:       rewardType,
      reward_config:     rewardConfig,
    });
    setSaving(false);

    if (dbError) {
      Alert.alert('Error', dbError.message || 'Could not save card. Please try again.');
      return;
    }

    Alert.alert('Card added', `"${trimmedName}" has been added successfully.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [
    userId,
    cardName,
    network,
    last4,
    limitText,
    billingDay,
    dueDay,
    rewardType,
    rewardRateText,
    categoryRates,
    baseCurrency,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Credit Card</Text>
          <TouchableOpacity
            onPress={validateAndSave}
            disabled={saving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {saving
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Name */}
          <Field label="Card Name">
            <TextInput
              style={styles.textInput}
              value={cardName}
              onChangeText={setCardName}
              placeholder='e.g. HDFC Regalia'
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              maxLength={80}
              autoFocus
            />
          </Field>

          {/* Network */}
          <Field label="Network">
            <SegmentedControl
              options={NETWORKS}
              selected={network}
              onSelect={setNetwork}
            />
          </Field>

          {/* Last 4 digits */}
          <Field label="Last 4 digits" optional>
            <TextInput
              style={styles.textInput}
              value={last4}
              onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
              placeholder='1234'
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
            />
          </Field>

          {/* Credit Limit */}
          <Field label={`Credit Limit (${currencySymbol})`} optional>
            <TextInput
              style={styles.textInput}
              value={limitText}
              onChangeText={setLimitText}
              placeholder='e.g. 100000'
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </Field>

          {/* Billing cycle day + Payment due day side-by-side */}
          <View style={styles.twoCol}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Billing Cycle Day</Text>
              <TextInput
                style={styles.textInput}
                value={billingDay}
                onChangeText={(t) => setBillingDay(t.replace(/\D/g, ''))}
                placeholder='1'
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />
              <Text style={styles.fieldHint}>1 – 28</Text>
            </View>

            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Payment Due Day</Text>
              <TextInput
                style={styles.textInput}
                value={dueDay}
                onChangeText={(t) => setDueDay(t.replace(/\D/g, ''))}
                placeholder='21'
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />
              <Text style={styles.fieldHint}>1 – 28</Text>
            </View>
          </View>

          {/* Reward type */}
          <Field label="Reward Type">
            <SegmentedControl
              options={REWARD_TYPES}
              selected={rewardType}
              onSelect={setRewardType}
            />
          </Field>

          {/* Reward rate — only shown when reward type is not "none" */}
          {rewardType !== 'none' && (
            <Field label="Default reward rate %" optional>
              <View style={styles.rateRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={rewardRateText}
                  onChangeText={setRewardRateText}
                  placeholder='e.g. 1.5'
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <View style={styles.rateSuffix}>
                  <Text style={styles.rateSuffixText}>
                    {rewardType === 'cashback' ? '% cashback' : rewardType === 'miles' ? '% miles' : 'pts per ₹100'}
                  </Text>
                </View>
              </View>
              <Text style={styles.fieldHint}>
                e.g. 1.5 means 1.5% reward on all transactions
              </Text>
            </Field>
          )}

          {/* Category Reward Rates — only shown when reward type is not "none" */}
          {rewardType !== 'none' && categories.length > 0 && (
            <View style={styles.catRatesSection}>
              <Text style={styles.catRatesTitle}>Category Reward Rates (optional)</Text>
              <Text style={styles.catRatesSubtitle}>
                Override the default rate for specific categories. Leave blank to use the default.
              </Text>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.catRateRow}>
                  <Text style={styles.catRateIcon}>{cat.icon ?? '🏷️'}</Text>
                  <Text style={styles.catRateName} numberOfLines={1}>{cat.name}</Text>
                  <TextInput
                    style={styles.catRateInput}
                    value={categoryRates[cat.id] ?? ''}
                    onChangeText={(t) =>
                      setCategoryRates((prev) => ({ ...prev, [cat.id]: t }))
                    }
                    placeholder='e.g. 5'
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                  <Text style={styles.catRatePct}>%</Text>
                </View>
              ))}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
    color: Colors.primary,
  },

  scrollContent: { padding: 20, gap: 20, paddingBottom: 48 },

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

  twoCol: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1, gap: 6 },
  fieldLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  fieldHint: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    paddingHorizontal: 2,
  },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateSuffix: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  rateSuffixText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },

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

  // Category reward rates section
  catRatesSection: {
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
  },
  catRatesTitle: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  catRatesSubtitle: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  catRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catRateIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  catRateName: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.onSurface,
  },
  catRateInput: {
    width: 70,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.onSurface,
    textAlign: 'right',
  },
  catRatePct: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    width: 14,
  },
});
