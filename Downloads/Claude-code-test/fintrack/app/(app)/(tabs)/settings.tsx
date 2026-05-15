/**
 * Settings Tab — US-028 Income & Budget Configuration.
 *
 * Sections:
 *  - Finance: monthly income input + Needs/Wants/Savings sliders (sum to 100%)
 *  - Profile: display name, base currency
 *  - Account: sign out
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Colors } from '../../../constants/colors';
import { useOnboardingStore } from '../../../store/onboarding';
import { signOut } from '../../../lib/auth';
import { fromSmallestUnit, toSmallestUnit } from '../../../lib/money';

// ── Currency symbol helper ────────────────────────────────────────────────────
function currencySymbol(code: string): string {
  const map: Record<string, string> = { INR: '₹', USD: '$', GBP: '£' };
  return map[code] ?? code;
}

// ── Slider row ────────────────────────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, color, value, onChange }: SliderRowProps) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.header}>
        <View style={[sliderStyles.dot, { backgroundColor: color }]} />
        <Text style={sliderStyles.label}>{label}</Text>
        <Text style={[sliderStyles.value, { color }]}>{Math.round(value)}%</Text>
      </View>
      <Slider
        style={sliderStyles.slider}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={color}
        maximumTrackTintColor={Colors.borderLight}
        thumbTintColor={color}
      />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { gap: 4 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  label:     { flex: 1, fontFamily: 'WorkSans_500Medium', fontSize: 14, color: Colors.onSurface },
  value:     { fontFamily: 'Manrope_700Bold', fontSize: 15, minWidth: 38, textAlign: 'right' },
  slider:    { height: 36, marginHorizontal: -4 },
});

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrapper}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: { gap: 8 },
  title:   { fontFamily: 'WorkSans_600SemiBold', fontSize: 11, color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 4 },
  card:    { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
});

// ── Row ────────────────────────────────────────────────────────────────────────
function SettingRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.border]}>
      <Text style={rowStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  label:  { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.onSurface, flex: 1 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SettingsTab() {
  const {
    displayName,
    baseCurrency,
    monthlyIncome,
    budgetNeedsPct,
    budgetWantsPct,
    budgetSavingsPct,
    setMonthlyIncome,
    setBudgetTargets,
    setDisplayName,
  } = useOnboardingStore();

  // Income in display units (₹/$/£, not paise/cents/pence)
  const [incomeDisplay, setIncomeDisplay] = useState(
    monthlyIncome > 0 ? fromSmallestUnit(monthlyIncome, baseCurrency).toFixed(0) : '',
  );

  // Budget sliders — local state so they update live
  const [needsPct, setNeedsPct] = useState(budgetNeedsPct);
  const [wantsPct, setWantsPct] = useState(budgetWantsPct);
  const [savingsPct, setSavingsPct] = useState(budgetSavingsPct);

  const total = Math.round(needsPct) + Math.round(wantsPct) + Math.round(savingsPct);
  const totalOk = total === 100;

  // When needs slider changes, auto-adjust savings to keep total = 100
  const handleNeedsChange = useCallback((v: number) => {
    const n = Math.round(v);
    setNeedsPct(n);
    const remaining = 100 - n - Math.round(wantsPct);
    setSavingsPct(Math.max(0, Math.min(100, remaining)));
  }, [wantsPct]);

  const handleWantsChange = useCallback((v: number) => {
    const w = Math.round(v);
    setWantsPct(w);
    const remaining = 100 - Math.round(needsPct) - w;
    setSavingsPct(Math.max(0, Math.min(100, remaining)));
  }, [needsPct]);

  const handleSavingsChange = useCallback((v: number) => {
    const s = Math.round(v);
    setSavingsPct(s);
    const remaining = 100 - Math.round(needsPct) - s;
    setWantsPct(Math.max(0, Math.min(100, remaining)));
  }, [needsPct]);

  const handleSave = useCallback(() => {
    // Save income
    const income = parseFloat(incomeDisplay.replace(/[^0-9.]/g, ''));
    if (incomeDisplay && !isNaN(income) && income > 0) {
      setMonthlyIncome(toSmallestUnit(income, baseCurrency));
    } else if (!incomeDisplay) {
      setMonthlyIncome(0);
    }

    if (!totalOk) {
      Alert.alert('Budget Error', `Your budget percentages add up to ${total}%. They must total exactly 100%.`);
      return;
    }

    setBudgetTargets(Math.round(needsPct), Math.round(wantsPct), Math.round(savingsPct));
    Alert.alert('Saved', 'Your finance settings have been updated.');
  }, [incomeDisplay, needsPct, wantsPct, savingsPct, totalOk, total, baseCurrency, setMonthlyIncome, setBudgetTargets]);

  const sym = currencySymbol(baseCurrency);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Finance ───────────────────────────────────────────────────────── */}
        <Section title="Finance">
          <SettingRow label={`Monthly Income (${sym})`}>
            <TextInput
              style={styles.incomeInput}
              value={incomeDisplay}
              onChangeText={setIncomeDisplay}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
            />
          </SettingRow>

          {/* Budget sliders */}
          <View style={styles.slidersContainer}>
            <Text style={styles.slidersTitle}>Monthly Budget Targets</Text>
            <SliderRow
              label="Needs"
              color={Colors.needsBlue ?? '#6366f1'}
              value={needsPct}
              onChange={handleNeedsChange}
            />
            <SliderRow
              label="Wants"
              color={Colors.wantsAmber ?? '#f59e0b'}
              value={wantsPct}
              onChange={handleWantsChange}
            />
            <SliderRow
              label="Savings"
              color={Colors.savingsGreen ?? '#22c55e'}
              value={savingsPct}
              onChange={handleSavingsChange}
            />
            {/* Total indicator */}
            <View style={[styles.totalRow, !totalOk && styles.totalRowError]}>
              <Text style={[styles.totalText, !totalOk && styles.totalTextError]}>
                Total: {total}%{totalOk ? ' ✓' : ` — must be 100%`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setNeedsPct(50);
                  setWantsPct(30);
                  setSavingsPct(20);
                }}
              >
                <Text style={styles.resetText}>Reset 50/30/20</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save Finance Settings</Text>
          </TouchableOpacity>
        </Section>

        {/* ── Profile ───────────────────────────────────────────────────────── */}
        <Section title="Profile">
          <SettingRow label="Display Name">
            <TextInput
              style={styles.inlineInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
            />
          </SettingRow>
          <SettingRow label="Base Currency" last>
            <Text style={styles.valueText}>{baseCurrency}</Text>
          </SettingRow>
        </Section>

        {/* ── Account ───────────────────────────────────────────────────────── */}
        <Section title="Account">
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={signOut}
            activeOpacity={0.75}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 22, color: Colors.onSurface, letterSpacing: -0.3 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 24 },

  incomeInput: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: Colors.onSurface,
    textAlign: 'right',
    minWidth: 100,
  },
  inlineInput: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    textAlign: 'right',
    flex: 1,
  },
  valueText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },

  slidersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  slidersTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingTop: 14,
    paddingBottom: 6,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  totalRowError: {},
  totalText:      { fontFamily: 'WorkSans_500Medium', fontSize: 13, color: Colors.textMuted },
  totalTextError: { color: '#ef4444' },
  resetText:      { fontFamily: 'WorkSans_600SemiBold', fontSize: 12, color: Colors.primary },

  saveBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 15, color: '#ffffff' },

  signOutRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: '#dc2626' },
});
