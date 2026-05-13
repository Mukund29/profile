/**
 * SCR-004 — Connect Bank / Finances
 * Stitch Positive Finance design system — Indigo palette
 * Region-aware: Setu AA (India) | Plaid (US) | TrueLayer (UK)
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Localization from 'expo-localization';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useOnboardingStore } from '../../store/onboarding';
import { Colors } from '../../constants/colors';

// ── Region-aware provider config ────────────────────────────────────────────

interface ProviderConfig {
  name: string;
  fullName: string;
  description: string;
  benefits: string[];
  regulatoryBadge: string;
  successBankName: string;
  successLast4: string;
}

function getProviderConfig(regionCode: string): ProviderConfig {
  switch (regionCode) {
    case 'US':
      return {
        name: 'Plaid',
        fullName: 'Plaid',
        description:
          'FDIC-regulated. FinTrack never stores your credentials. We use Plaid to securely connect your accounts with your explicit consent.',
        benefits: ['Auto-sync transactions daily', '256-bit AES encryption', 'Read-only access'],
        regulatoryBadge: 'FDIC Regulated · End-to-end Encryption · No PII Shared',
        successBankName: 'Chase Bank',
        successLast4: '4291',
      };
    case 'GB':
      return {
        name: 'TrueLayer',
        fullName: 'TrueLayer Open Banking',
        description:
          'FCA-regulated. FinTrack never stores your credentials. We use TrueLayer to access your accounts securely under Open Banking.',
        benefits: ['Auto-sync transactions daily', '256-bit AES encryption', 'Open Banking compliant'],
        regulatoryBadge: 'FCA Regulated · End-to-end Encryption · No PII Shared',
        successBankName: 'Barclays',
        successLast4: '7734',
      };
    default: // IN and all others
      return {
        name: 'Setu',
        fullName: 'Setu Account Aggregator',
        description:
          'Regulated by RBI. FinTrack never stores your credentials. We use Setu to fetch data securely from your banks with your explicit consent.',
        benefits: ['Auto-sync transactions daily', '256-bit AES encryption', 'RBI-licensed AA framework'],
        regulatoryBadge: 'RBI Regulated · End-to-end Encryption · No PII Shared',
        successBankName: 'HDFC Bank',
        successLast4: '8829',
      };
  }
}

// ── Checkmark row ────────────────────────────────────────────────────────────

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkMark}>✓</Text>
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

// ── Success card ─────────────────────────────────────────────────────────────

function SuccessCard({ bankName, last4 }: { bankName: string; last4: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.successCard}>
      <View style={styles.successCardInner}>
        <View style={styles.successBankLogo}>
          <Text style={styles.successBankInitial}>
            {bankName.charAt(0)}
          </Text>
        </View>
        <View style={styles.successBankInfo}>
          <Text style={styles.successConnectedLabel}>Connected ✓</Text>
          <Text style={styles.successBankName}>{bankName} •••• {last4}</Text>
        </View>
      </View>
      <View style={styles.successOverlayIcon}>
        <Text style={styles.successOverlayText}>✅</Text>
      </View>
    </Animated.View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ConnectBankScreen() {
  const { setBankConnected } = useOnboardingStore();

  const locales = Localization.getLocales();
  const regionCode = locales[0]?.regionCode ?? 'IN';
  const provider = getProviderConfig(regionCode);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Auto-navigate after connected
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        router.replace('/(onboarding)/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const handleConnect = () => {
    if (isConnecting || isConnected) return;
    buttonScale.value = withSpring(0.96, {}, () => {
      buttonScale.value = withSpring(1);
    });
    setIsConnecting(true);

    setTimeout(() => {
      setIsConnecting(false);
      setBankConnected(true, provider.successBankName);
      setIsConnected(true);
    }, 1500);
  };

  const handleSkip = () => {
    router.replace('/(onboarding)/dashboard');
  };

  // Trust badge items
  const trustBadges = [
    { icon: '🛡️', label: provider.regulatoryBadge.split(' · ')[0] },
    { icon: '🔒', label: 'End-to-end Encryption' },
    { icon: '🚫', label: 'No PII Shared' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Background gradient decorations */}
      <View style={styles.bgGradientTopRight} pointerEvents="none" />
      <View style={styles.bgGradientBottomLeft} pointerEvents="none" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>FinTrack</Text>
        </View>
        <Text style={styles.stepLabel}>Step 2 of 3</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.displayHeadline}>Connect your finances</Text>
          <Text style={styles.subtext}>
            Auto-track every transaction with bank-grade security for a complete financial overview.
          </Text>
        </View>

        {/* Provider card */}
        <View style={styles.providerCard}>
          {/* Card header row */}
          <View style={styles.providerCardHeader}>
            <View style={styles.providerIconContainer}>
              <Text style={styles.providerIcon}>🏦</Text>
            </View>
            <View style={styles.securePill}>
              <Text style={styles.securePillVerified}>✓</Text>
              <Text style={styles.securePillText}>Secure Link</Text>
            </View>
          </View>

          {/* Provider details */}
          <View>
            <Text style={styles.providerName}>{provider.fullName}</Text>
            <Text style={styles.providerDescription}>{provider.description}</Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            {provider.benefits.map((benefit) => (
              <BenefitRow key={benefit} text={benefit} />
            ))}
          </View>

          {/* Connect button */}
          <Animated.View style={[{ width: '100%' }, buttonStyle]}>
            <TouchableOpacity
              style={[styles.connectButton, isConnected && styles.connectButtonSuccess]}
              onPress={handleConnect}
              activeOpacity={0.85}
              disabled={isConnecting || isConnected}
            >
              {isConnecting ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : isConnected ? (
                <Text style={styles.connectButtonText}>Connected ✓</Text>
              ) : (
                <Text style={styles.connectButtonText}>Connect Bank</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Success state */}
        {isConnected && (
          <SuccessCard
            bankName={provider.successBankName}
            last4={provider.successLast4}
          />
        )}

        {/* Skip */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        {/* Trust badges */}
        <View style={styles.trustBadges}>
          {trustBadges.map((badge, i) => (
            <React.Fragment key={badge.label}>
              <View style={styles.trustBadgeItem}>
                <Text style={styles.trustBadgeIcon}>{badge.icon}</Text>
                <Text style={styles.trustBadgeLabel}>{badge.label}</Text>
              </View>
              {i < trustBadges.length - 1 && <View style={styles.trustDot} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  bgGradientTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '33%',
    height: '33%',
    backgroundColor: `${Colors.primary}0D`, // /5
    zIndex: 0,
  },
  bgGradientBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: '50%',
    backgroundColor: `${Colors.secondaryContainer}1A`, // /10
    zIndex: 0,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '600',
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  stepLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '400',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  displayHeadline: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.onSurface,
    lineHeight: 40,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
    textAlign: 'center',
  },
  // Provider card
  providerCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`, // /30
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  providerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerIcon: {
    fontSize: 28,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 999,
  },
  securePillVerified: {
    fontSize: 12,
    color: Colors.onSecondaryContainer,
    fontWeight: '600',
  },
  securePillText: {
    fontSize: 12,
    color: Colors.onSecondaryContainer,
    fontWeight: '400',
  },
  providerName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.onSurface,
    lineHeight: 28,
  },
  providerDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: 4,
  },
  benefitsSection: {
    gap: 10,
    paddingTop: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${Colors.savingsGreen}26`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkMark: {
    fontSize: 11,
    color: Colors.savingsGreen,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '400',
    flex: 1,
  },
  connectButton: {
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
  connectButtonSuccess: {
    backgroundColor: Colors.savingsGreen,
    shadowColor: Colors.savingsGreen,
  },
  connectButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  // Success card
  successCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}33`,
    padding: 16,
    overflow: 'hidden',
  },
  successCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successBankLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBankInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  successBankInfo: {
    flex: 1,
  },
  successConnectedLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  successBankName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  successOverlayIcon: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    opacity: 0.15,
  },
  successOverlayText: {
    fontSize: 64,
  },
  // Skip
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '400',
    textDecorationLine: 'underline',
    textDecorationColor: Colors.outlineVariant,
  },
  // Trust badges
  trustBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    opacity: 0.6,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeIcon: {
    fontSize: 12,
  },
  trustBadgeLabel: {
    fontSize: 12,
    color: Colors.onSurface,
    fontWeight: '400',
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
  },
});
