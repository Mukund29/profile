import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';

export default function PaywallScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const offerings = await Purchases.getOfferings();
      const annual = offerings.current?.availablePackages.find(
        (p) => p.identifier === '$rc_annual'
      );
      if (!annual) {
        setError('No offering available. Please try again.');
        setLoading(false);
        return;
      }
      await Purchases.purchasePackage(annual);
      router.replace('/(app)/(tabs)/' as any);
    } catch (err: any) {
      if (!err.userCancelled) {
        setError(err.message ?? 'Purchase failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Start your free trial</Text>
        <Text style={styles.subtitle}>
          14 days free, then $2.99/month billed annually.{'\n'}Cancel any time.
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleStartTrial}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Start 14-day free trial</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#004c22',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#404940',
    textAlign: 'center',
    lineHeight: 24,
  },
  error: {
    marginTop: 8,
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    padding: 24,
    gap: 8,
  },
  button: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#004c22',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#004c22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: '#707a6f',
    fontSize: 14,
  },
});
