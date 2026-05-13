import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Shadows } from '../../constants/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  icon?: string; // Material Symbol name (rendered as text — wire up with your icon font)
  fullWidth?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }

  const isDisabled = disabled || loading;

  // ── Container styles ─────────────────────────────────────────────────────
  const baseContainer = {
    height: 56,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    paddingHorizontal: 24,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? ('stretch' as const) : ('auto' as const),
  };

  const variantContainer = {
    primary: {
      backgroundColor: Colors.primary,
      ...Shadows.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: Colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    destructive: {
      backgroundColor: 'transparent',
    },
  }[variant];

  // ── Label styles ─────────────────────────────────────────────────────────
  const variantText = {
    primary: {
      color: Colors.onPrimary,
      fontFamily: 'WorkSans_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
    },
    secondary: {
      color: Colors.primary,
      fontFamily: 'WorkSans_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
    },
    ghost: {
      color: Colors.primary,
      fontFamily: 'WorkSans_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
    },
    destructive: {
      color: Colors.destructiveRed,
      fontFamily: 'WorkSans_600SemiBold',
      fontSize: 16,
      lineHeight: 24,
    },
  }[variant];

  const activityIndicatorColor =
    variant === 'primary' ? Colors.onPrimary : Colors.primary;

  return (
    <AnimatedTouchable
      style={[baseContainer, variantContainer, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={activityIndicatorColor} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? (
            <Text
              style={{
                fontFamily: 'MaterialSymbolsOutlined',
                fontSize: 20,
                color: variantText.color,
              }}
            >
              {icon}
            </Text>
          ) : null}
          <Text style={variantText}>{label}</Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}
