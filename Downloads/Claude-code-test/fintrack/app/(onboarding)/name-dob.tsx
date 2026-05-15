/**
 * SCR-003 — Name & Date of Birth
 * Stitch Positive Finance design system — Indigo palette
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Localization from 'expo-localization';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';
import { createUserProfile } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5; // total visible rows
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MAX_YEAR = CURRENT_YEAR - 18; // must be ≥ 18
const MIN_YEAR = 1924;

const DAYS: string[] = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS: string[] = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => String(MAX_YEAR - i),
);

// ── Drum Roll Column ────────────────────────────────────────────────────────

interface PickerColumnProps {
  data: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  flex?: number;
  borderLeft?: boolean;
  borderRight?: boolean;
}

function PickerColumn({
  data,
  selectedIndex,
  onIndexChange,
  flex = 1,
  borderLeft = false,
  borderRight = false,
}: PickerColumnProps) {
  const flatRef = useRef<FlatList<string>>(null);
  const isScrolling = useRef(false);

  // Pad with empty strings top & bottom so selected row centers
  const PAD = 2;
  const paddedData = [...Array(PAD).fill(''), ...data, ...Array(PAD).fill('')];

  useEffect(() => {
    // Scroll to initial position after mount
    const timer = setTimeout(() => {
      flatRef.current?.scrollToIndex({
        index: selectedIndex + PAD,
        animated: false,
        viewPosition: 0.5,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawIndex = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(rawIndex, data.length - 1));
      onIndexChange(clampedIndex);
      isScrolling.current = false;
    },
    [data.length, onIndexChange],
  );

  const onScrollBeginDrag = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const realIndex = index - PAD;
      const isSelected = realIndex === selectedIndex;
      const isEmpty = item === '';
      return (
        <View style={styles.pickerItem}>
          <Text
            style={[
              styles.pickerItemText,
              isSelected ? styles.pickerItemSelected : styles.pickerItemUnselected,
              isEmpty && { opacity: 0 },
            ]}
            numberOfLines={1}
          >
            {item}
          </Text>
        </View>
      );
    },
    [selectedIndex],
  );

  return (
    <View
      style={[
        styles.pickerColumnWrapper,
        { flex },
        borderLeft && styles.pickerBorderLeft,
        borderRight && styles.pickerBorderRight,
      ]}
    >
      <FlatList
        ref={flatRef}
        data={paddedData}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={onScrollBeginDrag}
        style={{ height: PICKER_HEIGHT }}
        contentContainerStyle={{ paddingVertical: 0 }}
        initialScrollIndex={selectedIndex}
        onScrollToIndexFailed={() => {
          setTimeout(() => {
            flatRef.current?.scrollToIndex({
              index: selectedIndex + PAD,
              animated: false,
              viewPosition: 0.5,
            });
          }, 100);
        }}
      />
    </View>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.toast}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function NameDobScreen() {
  const { setDisplayName, setDateOfBirth } = useOnboardingStore();

  const [firstName, setFirstName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Default DOB: 1 January 1995
  const [dayIndex, setDayIndex] = useState(0);    // Day 01
  const [monthIndex, setMonthIndex] = useState(0); // January
  const [yearIndex, setYearIndex] = useState(0);   // MAX_YEAR (current-18)

  // Detect currency from locale
  const locales = Localization.getLocales();
  const regionCode = locales[0]?.regionCode ?? 'IN';
  const currency = regionCode === 'US' ? '$ USD' : regionCode === 'GB' ? '£ GBP' : '₹ INR';

  const continueScale = useSharedValue(1);
  const continueStyle = useAnimatedStyle(() => ({ transform: [{ scale: continueScale.value }] }));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleContinue = async () => {
    if (!firstName.trim()) return;

    const day = parseInt(DAYS[dayIndex], 10);
    const month = monthIndex;
    const year = parseInt(YEARS[yearIndex], 10);

    const dob = new Date(year, month, day);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

    if (age < 18) {
      showToast('You must be 18 or older to use FinTrack');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Session expired. Please sign in again.');
      return;
    }

    setIsLoading(true);
    const baseCurrency = regionCode === 'US' ? 'USD' : regionCode === 'GB' ? 'GBP' : 'INR';
    const { error } = await createUserProfile({
      userId: user.id,
      displayName: firstName.trim(),
      dateOfBirth: dob,
      baseCurrency,
      locale: locales[0]?.languageTag ?? 'en-IN',
    });
    setIsLoading(false);

    if (error) {
      showToast(error);
      return;
    }

    setDisplayName(firstName.trim());
    setDateOfBirth(dob);
    router.push('/(onboarding)/connect-bank');
  };

  const isValid = firstName.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>FinTrack</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <View style={styles.greetingSection}>
            <Text style={styles.headline}>Hi! What should we call you?</Text>
            <Text style={styles.subtext}>
              Setting up your profile helps us personalize your financial insights.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {/* First Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FIRST NAME</Text>
              <TextInput
                style={[styles.textInput, isFocused && styles.textInputFocused]}
                placeholder="Enter your name"
                placeholderTextColor={Colors.outline}
                value={firstName}
                onChangeText={setFirstName}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="done"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* DOB Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
              <Text style={styles.dobSubLabel}>(Required — 18+ for financial services)</Text>

              <View style={styles.pickerContainer}>
                {/* Selection highlight */}
                <View style={styles.selectionIndicator} pointerEvents="none" />

                {/* Fade gradients */}
                <View style={styles.fadeTop} pointerEvents="none" />
                <View style={styles.fadeBottom} pointerEvents="none" />

                <View style={styles.pickerRow}>
                  <PickerColumn
                    data={DAYS}
                    selectedIndex={dayIndex}
                    onIndexChange={setDayIndex}
                    flex={1}
                  />
                  <PickerColumn
                    data={MONTHS}
                    selectedIndex={monthIndex}
                    onIndexChange={setMonthIndex}
                    flex={1.6}
                    borderLeft
                    borderRight
                  />
                  <PickerColumn
                    data={YEARS}
                    selectedIndex={yearIndex}
                    onIndexChange={setYearIndex}
                    flex={1.2}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Profile icon decoration */}
          <View style={styles.iconDecoration}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>👤</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Animated.View style={[{ width: '100%' }, continueStyle]}>
            <TouchableOpacity
              style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!isValid || isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? 'Saving...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.currencyNote}>
            <Text style={styles.currencyIcon}>💳</Text>
            <Text style={styles.currencyText}>Your currency is set to {currency}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backIcon: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '600',
  },
  appBarTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greetingSection: {
    marginBottom: 32,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.onSurface,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
  },
  formSection: {
    gap: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dobSubLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: -4,
    marginBottom: 4,
  },
  textInput: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  textInputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  // Picker
  pickerContainer: {
    position: 'relative',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    overflow: 'hidden',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  pickerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  pickerColumnWrapper: {
    overflow: 'hidden',
  },
  pickerBorderLeft: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.outlineVariant,
  },
  pickerBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.outlineVariant,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pickerItemText: {
    textAlign: 'center',
  },
  pickerItemSelected: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  pickerItemUnselected: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.outline,
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${Colors.primaryContainer}33`,
    backgroundColor: `${Colors.primaryFixed}0D`,
    zIndex: 10,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 5,
    // Simulated fade using a semi-transparent overlay
    backgroundColor: `${Colors.surfaceContainerLowest}CC`,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 5,
    backgroundColor: `${Colors.surfaceContainerLowest}CC`,
  },
  iconDecoration: {
    marginTop: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primaryFixedDim}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 36,
  },
  // Footer
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: Colors.surfaceContainerLowest,
    gap: 8,
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: Colors.onPrimary,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  currencyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  currencyIcon: {
    fontSize: 14,
  },
  currencyText: {
    fontSize: 12,
    color: '#703700',
    fontWeight: '400',
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    backgroundColor: Colors.onSurface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 999,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
