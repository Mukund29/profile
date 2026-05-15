import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';

export default function AccountsTab() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏦</Text>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.sub}>Net worth tracking and account management — coming in Sprint 8.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emoji: { fontSize: 40 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 22, color: Colors.onSurface },
  sub: { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
