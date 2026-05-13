/**
 * Phone / Email entry screen — intermediate step between welcome and OTP.
 * Auto-detects input type: '@' → email, otherwise → phone.
 */
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';

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
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.sendButton,
          { transform: [{ scale }] },
          disabled && styles.sendButtonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.sendButtonText}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function PhoneEmailScreen() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setPhoneOrEmail, setAuthMethod } = useOnboardingStore();

  const isEmail = value.includes('@');
  const inputType = isEmail ? 'email' : 'phone';
  const label = isEmail ? 'Email address' : 'Phone number';
  const placeholder = isEmail ? 'you@example.com' : '+91 98765 43210';

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
    // Simulate async send (replace with real Supabase OTP call)
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLoading(false);

    setPhoneOrEmail(value.trim());
    setAuthMethod(isEmail ? 'email' : 'phone');
    router.push('/(auth)/otp');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header} className="bg-surface">
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backArrow} className="text-primary">
              ←
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} className="text-primary">
            FinTrack
          </Text>
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
            <Text style={styles.headline} className="text-on-surface">
              Sign in to FinTrack
            </Text>
            <Text style={styles.body} className="text-on-surface-variant">
              Enter your phone number or email and we'll send a verification code.
            </Text>
          </View>

          {/* ── Input ────────────────────────────────────────────────── */}
          <View className="mb-stack-md">
            <Text style={styles.inputLabel} className="text-on-surface-variant">
              {label}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                focused && styles.inputWrapperFocused,
                !!error && styles.inputWrapperError,
              ]}
            >
              <Text style={styles.inputPrefix} className="text-text-muted">
                {isEmail ? '✉' : '📞'}
              </Text>
              <TextInput
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
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                maxLength={80}
              />
              {value.length > 0 && (
                <TouchableOpacity onPress={() => setValue('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.clearIcon} className="text-text-muted">
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {!!error && (
              <Text style={styles.errorText} className="text-destructive-red">
                {error}
              </Text>
            )}
            <Text style={styles.helperText} className="text-text-muted">
              {isEmail
                ? 'We\'ll send a magic link or code to this email.'
                : 'Standard message rates may apply.'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
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

  // Scroll
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 16,
  },

  // Icon
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

  // Copy
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

  // Input
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
  input: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.onSurface,
    padding: 0,
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

  // Submit button
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

  // Toggle hint
  toggleHint: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
