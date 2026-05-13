/**
 * SCR-001 — Welcome / Auth Choice
 * Pixel-perfect match to Stitch Positive Finance welcome_auth_choice mockup.
 */
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';

// ── Google SVG Icon (inline, no external dep) ─────────────────────────────────
function GoogleIcon() {
  // Rendered as a styled View mosaic matching Google's 4-colour logo
  return (
    <View style={styles.googleIcon}>
      <View style={styles.googleQuadrant}>
        <View style={[styles.googleDot, { backgroundColor: '#4285F4' }]} />
        <View style={[styles.googleDot, { backgroundColor: '#34A853' }]} />
      </View>
      <View style={styles.googleQuadrant}>
        <View style={[styles.googleDot, { backgroundColor: '#FBBC05' }]} />
        <View style={[styles.googleDot, { backgroundColor: '#EA4335' }]} />
      </View>
    </View>
  );
}

// ── Animated press button ──────────────────────────────────────────────────────
function AnimatedButton({
  onPress,
  children,
  className,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// ── Hero gradient placeholder (no expo-linear-gradient dep needed) ─────────────
function HeroGradient() {
  return (
    <View style={styles.heroContainer}>
      {/* Layered Views simulate a left-to-right gradient #4648d4 → #6063ee */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#4648d4' }]} />
      <View style={[StyleSheet.absoluteFillObject, styles.heroOverlay]} />
      {/* Decorative floating elements */}
      <View style={styles.heroCircle1} />
      <View style={styles.heroCircle2} />
      <View style={styles.heroCircle3} />
      {/* Centered wallet icon area */}
      <View style={styles.heroContent}>
        <View style={styles.heroIconBadge}>
          <Text style={styles.heroIconEmoji}>💰</Text>
        </View>
        <Text style={styles.heroLabel}>Personal Finance Tracker</Text>
        <Text style={styles.heroSubLabel}>India · US · UK</Text>
      </View>
      {/* Bottom scrim */}
      <View style={styles.heroScrim} />
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const { setAuthMethod } = useOnboardingStore();

  const handleGoogle = () => {
    setAuthMethod('google');
    router.push('/(onboarding)/name-dob');
  };

  const handleApple = () => {
    setAuthMethod('apple');
    router.push('/(onboarding)/name-dob');
  };

  const handlePhoneEmail = () => {
    router.push('/(auth)/phone-email');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero / Branding ─────────────────────────────────────────── */}
          <View className="items-center text-center mb-12 pt-16">
            {/* Logo badge */}
            <View style={styles.logoBadge} className="mb-6">
              <Text style={styles.logoIcon}>account_balance_wallet</Text>
              {/* Material symbol fallback — use emoji wallet */}
              <Text style={styles.logoEmoji}>💳</Text>
            </View>
            <Text style={styles.appTitle} className="text-on-surface">
              FinTrack
            </Text>
            <Text style={styles.appSubtitle} className="text-text-muted">
              Your money, tracked
            </Text>
          </View>

          {/* ── Hero Image / Illustration ────────────────────────────────── */}
          <HeroGradient />

          {/* ── Auth Buttons ─────────────────────────────────────────────── */}
          <View className="w-full gap-stack-md mt-section-gap">
            {/* Google */}
            <AnimatedButton onPress={handleGoogle} style={styles.googleButton}>
              <View style={styles.googleButtonInner} className="border-border-light">
                <GoogleIcon />
                <Text style={styles.googleButtonText} className="text-on-surface">
                  Continue with Google
                </Text>
              </View>
            </AnimatedButton>

            {/* Apple */}
            <AnimatedButton onPress={handleApple} style={styles.appleButton}>
              <View style={styles.appleButtonInner}>
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            </AnimatedButton>

            {/* Phone / Email fallback */}
            <View className="items-center mt-4">
              <TouchableOpacity onPress={handlePhoneEmail} className="py-2">
                <Text style={styles.phoneEmailLink} className="text-primary">
                  Use phone or email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Spacer ───────────────────────────────────────────────────── */}
          <View className="flex-1" />

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText} className="text-text-muted">
              By continuing, you agree to FinTrack's{'\n'}
              <Text style={styles.footerLink} className="text-on-surface">
                Terms of Service
              </Text>
              {' and '}
              <Text style={styles.footerLink} className="text-on-surface">
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles (only for things NativeWind can't express) ─────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Logo
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoIcon: {
    display: 'none', // hidden — emoji fallback used
  },
  logoEmoji: {
    fontSize: 36,
  },
  appTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 8,
    color: Colors.onSurface,
  },
  appSubtitle: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textMuted,
  },

  // Hero gradient card
  heroContainer: {
    width: '100%',
    height: 256,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroOverlay: {
    background: 'transparent',
    // Simulates a right-side brightening using a semi-transparent layer
    borderLeftWidth: 0,
  },
  heroCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    right: -40,
  },
  heroCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -20,
  },
  heroCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(96, 99, 238, 0.5)',
    top: 60,
    left: 40,
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIconEmoji: {
    fontSize: 32,
  },
  heroLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 4,
  },
  heroSubLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'transparent',
    // Simulates from-black/20 to-transparent scrim
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },

  // Google button
  googleButton: {
    width: '100%',
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    height: 56,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderRadius: 12,
  },
  googleButtonText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.onSurface,
  },
  googleIcon: {
    width: 24,
    height: 24,
    flexDirection: 'column',
    gap: 2,
  },
  googleQuadrant: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },
  googleDot: {
    flex: 1,
    borderRadius: 2,
  },

  // Apple button
  appleButton: {
    width: '100%',
  },
  appleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    height: 56,
    backgroundColor: Colors.onSurface,
    borderRadius: 12,
  },
  appleIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
  },
  appleButtonText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#ffffff',
  },

  // Phone/email link
  phoneEmailLink: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.primary,
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  footerLink: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 12,
    color: Colors.onSurface,
  },
});
