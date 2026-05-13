import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

interface TrustCardProps {
  icon: string; // Material Symbol name
  iconColor?: string;
  title: string;
  body: string;
}

export function TrustCard({
  icon,
  iconColor = Colors.savingsGreen,
  title,
  body,
}: TrustCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`, // 30% opacity = 0x4D
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurface,
  },
  body: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
});
