/**
 * SCR-002 — OTP Verification
 * Pixel-perfect match to Stitch Positive Finance otp_magic_link mockup.
 * Features:
 *   - 6 square OTP inputs with auto-advance and backspace handling
 *   - 30s resend countdown
 *   - Shake animation on verification failure
 *   - Trust card, background blobs, loading + error states
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { verifyPhoneOTP } from '../../lib/auth';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// ── Animated submit button ─────────────────────────────────────────────────────
function PrimaryButton({
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
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.primaryButton,
          { transform: [{ scale }] },
          disabled && styles.primaryButtonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Background blobs (opacity-5, blurred via border-radius trick) ──────────────
function BackgroundBlobs() {
  return (
    <>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
    </>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function OtpScreen() {
  const { phoneOrEmail } = useOnboardingStore();

  // OTP digit state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // UI state
  const [focused, setFocused] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resend countdown
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  // Shake animation for error
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ── Last-4 of phoneOrEmail ───────────────────────────────────────────────────
  const last4 = phoneOrEmail
    ? phoneOrEmail.slice(-4).replace(/[^0-9]/g, '') || phoneOrEmail.slice(-4)
    : '0000';

  // ── Shake trigger ────────────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── Verify OTP against Supabase ───────────────────────────────────────────────
  const handleVerify = useCallback(async (code: string) => {
    setError('');
    setLoading(true);

    const { error: verifyError } = await verifyPhoneOTP(phoneOrEmail, code);

    if (verifyError) {
      setError(verifyError);
      triggerShake();
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      setLoading(false);
      return;
    }

    // Session established — useAuth SIGNED_IN in _layout.tsx will navigate.
    // Keep loading=true so the screen stays inert until navigation fires.
  }, [phoneOrEmail, triggerShake]);

  // ── OTP input change handler ──────────────────────────────────────────────────
  const handleChange = (text: string, index: number) => {
    // Accept only single digit
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && next.every((d) => d !== '')) {
      const code = next.join('');
      // Small delay so last digit renders
      setTimeout(() => handleVerify(code), 80);
    }
  };

  // ── Backspace handler ─────────────────────────────────────────────────────────
  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index]) {
        // Clear current
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // Move to previous and clear it
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return;
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    inputRefs.current[0]?.focus();
    // TODO: call supabase.auth.signInWithOtp({ phone: phoneOrEmail })
  };

  // ── Manual verify button ──────────────────────────────────────────────────────
  const handleManualVerify = () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      triggerShake();
      return;
    }
    handleVerify(code);
  };

  const allFilled = digits.every((d) => d !== '');
  const countdownDisplay = `0:${countdown.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Background blobs */}
      <BackgroundBlobs />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Fixed header ──────────────────────────────────────────── */}
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
          {/* ── Shield icon ───────────────────────────────────────────── */}
          <View className="items-center mb-stack-lg">
            <View style={styles.shieldCircle} className="bg-secondary-container">
              <Text style={styles.shieldEmoji}>🛡️</Text>
            </View>
          </View>

          {/* ── Headline + body ───────────────────────────────────────── */}
          <View className="items-center mb-section-gap px-4">
            <Text style={styles.headline} className="text-on-surface">
              Enter Verification Code
            </Text>
            <Text style={styles.body} className="text-on-surface-variant">
              We've sent a 6-digit security code to your registered{' '}
              {phoneOrEmail?.includes('@') ? 'email' : 'mobile number'} ending in{' '}
              <Text style={styles.bodyBold} className="text-on-surface">
                {'•••• '}
                {last4}
              </Text>
              .
            </Text>
          </View>

          {/* ── OTP input grid ────────────────────────────────────────── */}
          <Animated.View
            style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => {
                  inputRefs.current[i] = ref;
                }}
                style={[
                  styles.otpCell,
                  focused === i && styles.otpCellFocused,
                  !!error && styles.otpCellError,
                  digits[i] !== '' && styles.otpCellFilled,
                ]}
                value={digits[i]}
                onChangeText={(text) => handleChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused(-1)}
                keyboardType="number-pad"
                maxLength={2} // allow 2 so we can detect replacement
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                selectTextOnFocus
                caretHidden
                placeholder="0"
                placeholderTextColor={Colors.outlineVariant}
              />
            ))}
          </Animated.View>

          {/* ── Error message ─────────────────────────────────────────── */}
          {!!error && (
            <View className="items-center mt-stack-sm">
              <Text style={styles.errorText} className="text-destructive-red">
                {error}
              </Text>
            </View>
          )}

          {/* ── Links & helpers ───────────────────────────────────────── */}
          <View className="items-center gap-stack-md mt-stack-lg mb-stack-lg">
            <TouchableOpacity onPress={() => router.replace('/(auth)/phone-email')}>
              <Text style={styles.wrongNumberLink} className="text-primary">
                Wrong number?
              </Text>
            </TouchableOpacity>

            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink} className="text-primary">
                  Resend code
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.countdownRow}>
                <Text style={styles.countdownIcon} className="text-on-surface-variant">
                  ⏱
                </Text>
                <Text style={styles.countdownText} className="text-on-surface-variant">
                  Resend in {countdownDisplay}
                </Text>
              </View>
            )}
          </View>

          {/* ── Verify button ─────────────────────────────────────────── */}
          <PrimaryButton
            onPress={handleManualVerify}
            disabled={!allFilled || loading}
            loading={loading}
            label="Verify & Continue"
          />

          {/* ── Trust card ────────────────────────────────────────────── */}
          <View style={styles.trustCard} className="bg-surface-container-low border-outline-variant/30">
            <Text style={styles.trustIcon} className="text-savings-green">
              ✓
            </Text>
            <View style={styles.trustTextBlock}>
              <Text style={styles.trustHeadline} className="text-on-surface">
                Secure Financial Access
              </Text>
              <Text style={styles.trustBody} className="text-on-surface-variant">
                FinTrack uses bank-grade multi-factor authentication to ensure your assets stay
                protected at all times.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Background blobs
  blobTop: {
    position: 'absolute',
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: Colors.primary,
    opacity: 0.05,
    top: -96,
    right: -96,
    zIndex: -1,
  },
  blobBottom: {
    position: 'absolute',
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: Colors.secondary,
    opacity: 0.05,
    bottom: -96,
    left: -96,
    zIndex: -1,
  },

  // Header
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
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

  // Scroll
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 16,
  },

  // Shield icon
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldEmoji: {
    fontSize: 36,
  },

  // Headline + body
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
  },
  bodyBold: {
    fontFamily: 'WorkSans_600SemiBold',
    color: Colors.onSurface,
  },

  // OTP grid
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 1,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    color: Colors.onSurface,
    // Square via aspectRatio — can't do this with NativeWind on TextInput
  },
  otpCellFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  otpCellError: {
    borderColor: Colors.destructiveRed,
  },
  otpCellFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },

  // Error
  errorText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.destructiveRed,
    textAlign: 'center',
  },

  // Wrong number / resend
  wrongNumberLink: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary,
  },
  resendLink: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownIcon: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  countdownText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },

  // Primary button
  primaryButton: {
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
  primaryButtonDisabled: {
    backgroundColor: Colors.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    color: '#ffffff',
  },

  // Trust card
  trustCard: {
    marginTop: 32,
    padding: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199, 196, 215, 0.3)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  trustIcon: {
    fontSize: 22,
    color: Colors.savingsGreen,
    marginTop: 1,
    fontWeight: '700',
  },
  trustTextBlock: {
    flex: 1,
  },
  trustHeadline: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
  },
  trustBody: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },
});
