/**
 * Toast — imperative API for one-off notifications.
 *
 * Usage:
 *   // 1. Mount <ToastHost /> once near the root of your app (inside SafeAreaProvider).
 *   // 2. Call showToast() from anywhere.
 *
 *   import { showToast, ToastHost } from '@/components/ui/Toast';
 *   showToast('Saved!', 'success');
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

// ── Singleton event emitter ───────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastPayload {
  message: string;
  type: ToastType;
  id: number;
}

type Listener = (payload: ToastPayload) => void;

let _listener: Listener | null = null;
let _id = 0;

export function showToast(message: string, type: ToastType = 'info'): void {
  _listener?.({ message, type, id: ++_id });
}

// ── ToastHost (mount once near root) ─────────────────────────────────────

interface ToastState {
  message: string;
  type: ToastType;
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register this host as the singleton listener
  useEffect(() => {
    _listener = (payload) => {
      // Clear any pending dismiss
      if (dismissRef.current) clearTimeout(dismissRef.current);

      setToast({ message: payload.message, type: payload.type });

      // Animate in
      translateY.value = -80;
      opacity.value = 0;
      translateY.value = withTiming(0, { duration: 280 });
      opacity.value = withTiming(1, { duration: 200 });

      // Auto-dismiss after 3 s
      dismissRef.current = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 250 });
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(setToast)(null);
        });
      }, 3000);
    };

    return () => {
      _listener = null;
      if (dismissRef.current) clearTimeout(dismissRef.current);
    };
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const bg =
    toast.type === 'success'
      ? Colors.savingsGreen
      : toast.type === 'error'
      ? Colors.errorContainer
      : Colors.surfaceContainerHigh;

  const textColor =
    toast.type === 'success'
      ? '#002114' // dark green on savings-green
      : toast.type === 'error'
      ? '#93000a' // on-error-container
      : Colors.onSurface;

  const icon =
    toast.type === 'success'
      ? 'check_circle'
      : toast.type === 'error'
      ? 'error'
      : 'info';

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, backgroundColor: bg },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>
      <Text style={[styles.message, { color: textColor }]}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 20,
  },
  message: {
    flex: 1,
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
