import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
  autoFocus = false,
  testID,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const glowOpacity = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  function handleFocus() {
    setIsFocused(true);
    glowOpacity.value = withTiming(1, { duration: 200 });
  }

  function handleBlur() {
    setIsFocused(false);
    glowOpacity.value = withTiming(0, { duration: 200 });
  }

  const borderColor = error
    ? Colors.error
    : isFocused
    ? Colors.primary
    : Colors.outlineVariant;

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      {label ? (
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      ) : null}

      {/* Input container */}
      <View style={styles.inputWrapper}>
        {/* Glow ring (focus indicator) */}
        <Animated.View
          style={[
            styles.glowRing,
            { borderColor: Colors.primary },
            glowStyle,
          ]}
          pointerEvents="none"
        />

        <View
          style={[
            styles.inputContainer,
            { borderColor },
          ]}
        >
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.outlineVariant}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            autoFocus={autoFocus}
            onFocus={handleFocus}
            onBlur={handleBlur}
            testID={testID}
            accessibilityLabel={label ?? placeholder}
          />
          {secureTextEntry ? (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible((v) => !v)}
              style={styles.eyeButton}
              accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.eyeIcon}>
                {isPasswordVisible ? 'visibility_off' : 'visibility'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Error message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  label: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  inputWrapper: {
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    inset: -3,
    borderRadius: 15, // xl (12) + 3 outset
    borderWidth: 2,
    zIndex: 0,
  },
  inputContainer: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  textInput: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.onSurface,
    padding: 0, // override Android default padding
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  eyeIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 20,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.error,
    marginTop: 4,
  },
});
