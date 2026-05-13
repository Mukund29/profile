import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

interface TopBarProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  rightLabel?: string; // e.g. "Step 2 of 3"
}

export function TopBar({
  showBack = false,
  onBack,
  title = 'FinTrack',
  rightLabel,
}: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        {/* Left: back button or spacer */}
        <View style={styles.side}>
          {showBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backIcon}>arrow_back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>

        {/* Centre: title */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Right: step label or spacer */}
        <View style={[styles.side, styles.sideRight]}>
          {rightLabel ? (
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    // Shadow (Android)
    elevation: 2,
    zIndex: 50,
  },
  inner: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: {
    width: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 24,
    color: Colors.primary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.primary,
  },
  rightLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },
});
