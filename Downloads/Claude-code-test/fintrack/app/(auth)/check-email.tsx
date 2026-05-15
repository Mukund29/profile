/**
 * SCR-002b — Check Your Email
 * Shown after sendEmailMagicLink() succeeds. User must tap the link in their inbox.
 * When the magic link is tapped, the app opens via fintrack://auth/callback?code=...
 * and _layout.tsx exchanges the PKCE code for a session.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../store/onboarding';
import { sendEmailMagicLink } from '../../lib/auth';
import { Colors } from '../../constants/colors';

export default function CheckEmailScreen() {
  const { phoneOrEmail } = useOnboardingStore();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const scale = useRef(new Animated.Value(1)).current;

  const email = phoneOrEmail ?? '';

  const handleResend = async () => {
    if (resending || !email) return;
    setResending(true);
    setError('');
    const { error: sendError } = await sendEmailMagicLink(email);
    setResending(false);
    if (sendError) {
      setError(sendError);
    } else {
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    }
  };

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FinTrack</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>✉️</Text>
        </View>

        {/* Copy */}
        <Text style={styles.headline}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent a sign-in link to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>
        <Text style={styles.hint}>
          Tap the link in the email to sign in. Check your spam folder if you don't see it.
        </Text>

        {/* Error */}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Resent confirmation */}
        {resent && <Text style={styles.resentText}>✓ Email resent successfully</Text>}

        {/* Resend button */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleResend}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={resending}
          style={styles.resendWrapper}
        >
          <Animated.View style={[styles.resendButton, { transform: [{ scale }] }, resending && styles.resendButtonDisabled]}>
            {resending ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.resendText}>Resend email</Text>
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Use phone instead */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/phone-email')} style={styles.switchLink}>
          <Text style={styles.switchLinkText}>Use phone number instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconEmoji: {
    fontSize: 40,
  },
  headline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    lineHeight: 34,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 12,
  },
  email: {
    fontFamily: 'WorkSans_600SemiBold',
    color: Colors.onSurface,
  },
  hint: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  errorText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: Colors.destructiveRed,
    textAlign: 'center',
    marginBottom: 12,
  },
  resentText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: Colors.savingsGreen,
    textAlign: 'center',
    marginBottom: 12,
  },
  resendWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  resendButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
  },
  switchLink: {
    paddingVertical: 12,
  },
  switchLinkText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
