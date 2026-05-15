/**
 * Phone / Email entry screen — intermediate step between welcome and OTP.
 * Auto-detects input type: '@' → email, otherwise → phone.
 * Phone mode: auto-detects country dial code from locale + syncs baseCurrency.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getLocales } from 'expo-localization';
import { sendPhoneOTP, sendEmailMagicLink } from '../../lib/auth';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';

// ── Country data ───────────────────────────────────────────────────────────────
type Country = {
  flag: string;
  code: string;
  dialCode: string;
  currency: string;
  name: string;
};

const COUNTRIES: Country[] = [
  { flag: '🇮🇳', code: 'IN', dialCode: '+91',  currency: 'INR', name: 'India' },
  { flag: '🇺🇸', code: 'US', dialCode: '+1',   currency: 'USD', name: 'United States' },
  { flag: '🇬🇧', code: 'GB', dialCode: '+44',  currency: 'GBP', name: 'United Kingdom' },
  { flag: '🇦🇺', code: 'AU', dialCode: '+61',  currency: 'AUD', name: 'Australia' },
  { flag: '🇨🇦', code: 'CA', dialCode: '+1',   currency: 'CAD', name: 'Canada' },
  { flag: '🇸🇬', code: 'SG', dialCode: '+65',  currency: 'SGD', name: 'Singapore' },
  { flag: '🇦🇪', code: 'AE', dialCode: '+971', currency: 'AED', name: 'UAE' },
  { flag: '🇩🇪', code: 'DE', dialCode: '+49',  currency: 'EUR', name: 'Germany' },
  { flag: '🇫🇷', code: 'FR', dialCode: '+33',  currency: 'EUR', name: 'France' },
  { flag: '🇯🇵', code: 'JP', dialCode: '+81',  currency: 'JPY', name: 'Japan' },
  { flag: '🇳🇿', code: 'NZ', dialCode: '+64',  currency: 'NZD', name: 'New Zealand' },
  { flag: '🇿🇦', code: 'ZA', dialCode: '+27',  currency: 'ZAR', name: 'South Africa' },
  { flag: '🇳🇬', code: 'NG', dialCode: '+234', currency: 'NGN', name: 'Nigeria' },
  { flag: '🇧🇷', code: 'BR', dialCode: '+55',  currency: 'BRL', name: 'Brazil' },
  { flag: '🇲🇽', code: 'MX', dialCode: '+52',  currency: 'MXN', name: 'Mexico' },
  { flag: '🇮🇩', code: 'ID', dialCode: '+62',  currency: 'IDR', name: 'Indonesia' },
  { flag: '🇵🇭', code: 'PH', dialCode: '+63',  currency: 'PHP', name: 'Philippines' },
  { flag: '🇰🇪', code: 'KE', dialCode: '+254', currency: 'KES', name: 'Kenya' },
];

function detectCountry(): Country {
  const regionCode = getLocales()[0]?.regionCode ?? 'IN';
  return COUNTRIES.find((c) => c.code === regionCode) ?? COUNTRIES[0];
}

// ── Animated submit button ─────────────────────────────────────────────────────
function AnimatedButton({
  onPress,
  disabled,
  loading,
  label,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  label: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
      <Animated.View style={[styles.sendButton, { transform: [{ scale }] }, disabled && styles.sendButtonDisabled]}>
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.sendButtonText}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Country picker modal ───────────────────────────────────────────────────────
function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Country;
  onSelect: (c: Country) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search)
      )
    : COUNTRIES;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <TouchableOpacity style={pickerStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>Select country</Text>
          <View style={pickerStyles.searchRow}>
            <TextInput
              style={pickerStyles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or dial code"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[pickerStyles.row, item.code === selected.code && pickerStyles.rowSelected]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={pickerStyles.flag}>{item.flag}</Text>
                <Text style={pickerStyles.countryName}>{item.name}</Text>
                <Text style={pickerStyles.dialCode}>{item.dialCode}</Text>
                {item.code === selected.code && (
                  <Text style={pickerStyles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function PhoneEmailScreen() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<Country>(detectCountry);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const { setPhoneOrEmail, setAuthMethod, setBaseCurrency } = useOnboardingStore();

  const isEmail = value.includes('@');
  const label = isEmail ? 'Email address' : 'Phone number';
  const placeholder = isEmail ? 'you@example.com' : '98765 43210';

  // Sync currency whenever country changes (phone mode only)
  useEffect(() => {
    if (!isEmail) {
      setBaseCurrency(country.currency);
    }
  }, [country.currency, isEmail]);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setBaseCurrency(c.currency);
    inputRef.current?.focus();
  };

  const validate = (): boolean => {
    if (!value.trim()) {
      setError('Please enter your phone number or email.');
      return false;
    }
    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        setError('Please enter a valid email address.');
        return false;
      }
    } else {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        setError('Please enter a valid phone number.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    const normalized = isEmail ? value.trim() : `${country.dialCode}${value.trim()}`;

    if (isEmail) {
      const { error: sendError } = await sendEmailMagicLink(normalized);
      setLoading(false);
      if (sendError) { setError(sendError); return; }
      setPhoneOrEmail(normalized);
      setAuthMethod('email');
      router.push('/(auth)/check-email' as any);
    } else {
      const { error: sendError } = await sendPhoneOTP(normalized);
      setLoading(false);
      if (sendError) { setError(sendError); return; }
      setPhoneOrEmail(normalized);
      setAuthMethod('phone');
      router.push('/(auth)/otp');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header} className="bg-surface">
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backArrow} className="text-primary">←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} className="text-primary">FinTrack</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Icon ─────────────────────────────────────────────────── */}
          <View className="items-center mb-stack-lg">
            <View style={styles.iconCircle} className="bg-secondary-container">
              <Text style={styles.iconEmoji}>📱</Text>
            </View>
          </View>

          {/* ── Copy ─────────────────────────────────────────────────── */}
          <View className="items-center mb-section-gap">
            <Text style={styles.headline} className="text-on-surface">Sign in to FinTrack</Text>
            <Text style={styles.body} className="text-on-surface-variant">
              Enter your phone number or email and we'll send a verification code.
            </Text>
          </View>

          {/* ── Input ────────────────────────────────────────────────── */}
          <View className="mb-stack-md">
            <Text style={styles.inputLabel} className="text-on-surface-variant">{label}</Text>
            <View
              style={[
                styles.inputWrapper,
                focused && styles.inputWrapperFocused,
                !!error && styles.inputWrapperError,
              ]}
            >
              {/* Country dial code badge (phone mode only) */}
              {!isEmail ? (
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={styles.dialCodeBadge}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.dialFlag}>{country.flag}</Text>
                  <Text style={styles.dialCodeText}>{country.dialCode}</Text>
                  <Text style={styles.dialChevron}>▾</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.inputPrefix} className="text-text-muted">✉</Text>
              )}

              <TextInput
                ref={inputRef}
                style={styles.input}
                value={value}
                onChangeText={(text) => {
                  setValue(text);
                  if (error) setError('');
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType={isEmail ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                maxLength={80}
              />
              {value.length > 0 && (
                <TouchableOpacity
                  onPress={() => setValue('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearIcon} className="text-text-muted">✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {!!error && (
              <Text style={styles.errorText} className="text-destructive-red">{error}</Text>
            )}
            <Text style={styles.helperText} className="text-text-muted">
              {isEmail
                ? "We'll send a magic link or code to this email."
                : `Standard message rates may apply. Currency set to ${country.currency}.`}
            </Text>
          </View>

          {/* ── Submit ───────────────────────────────────────────────── */}
          <AnimatedButton
            onPress={handleSubmit}
            disabled={!value.trim() || loading}
            loading={loading}
            label="Send code"
          />

          {/* ── Type toggle hint ──────────────────────────────────────── */}
          <View className="items-center mt-stack-lg">
            <Text style={styles.toggleHint} className="text-text-muted">
              {isEmail ? 'Prefer phone instead? Just type a number.' : 'Prefer email? Type your @ address.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Country picker ────────────────────────────────────────────── */}
      <CountryPickerModal
        visible={showPicker}
        selected={country}
        onSelect={handleCountrySelect}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

// ── Main styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  backArrow: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 36,
  },
  headline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inputLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    height: 56,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: Colors.destructiveRed,
  },
  inputPrefix: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  dialCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
    marginRight: 2,
  },
  dialFlag: {
    fontSize: 18,
  },
  dialCodeText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  dialChevron: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.onSurface,
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.destructiveRed,
    marginTop: 6,
  },
  helperText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
    marginTop: 6,
  },
  sendButton: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    color: '#ffffff',
  },
  toggleHint: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

// ── Country picker styles ──────────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: Colors.onSurface,
    textAlign: 'center',
    paddingVertical: 8,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowSelected: {
    backgroundColor: Colors.primaryFixed,
  },
  flag: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  countryName: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  dialCode: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    minWidth: 48,
    textAlign: 'right',
  },
  checkmark: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
});
