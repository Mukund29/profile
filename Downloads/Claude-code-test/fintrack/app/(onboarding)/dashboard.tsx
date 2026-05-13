/**
 * SCR-005 — Dashboard First Landing
 * Forest Green design system — bg-[#f8f9ff], primary: #004c22
 * Bento grid: Net Worth + Budget Ring + Smart Nudges + Hero Banner
 * Confetti on first landing, Bottom nav, FAB
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useOnboardingStore } from '../../store/onboarding';

// ── Colors — Forest Green palette ──────────────────────────────────────────
const G = {
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff',
  surfaceContainerHigh: '#dee9fc',
  primary: '#004c22',
  primaryContainer: '#166534',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#93e0a2',
  primaryFixed: '#a6f4b5',
  primaryFixedDim: '#8bd79b',
  secondary: '#536439',
  secondaryContainer: '#d3e7b1',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#57683d',
  tertiary: '#394426',
  tertiaryContainer: '#505c3b',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#c5d4ab',
  onSurface: '#121c2a',
  onSurfaceVariant: '#404940',
  outline: '#707a6f',
  outlineVariant: '#bfc9bd',
  onBackground: '#121c2a',
  surfaceVariant: '#d9e3f6',
};

const { width: SCREEN_W } = Dimensions.get('window');

// ── Confetti particle ───────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#004c22', '#a6f4b5', '#166534', '#d3e7b1', '#F59E0B', '#F472B6', '#6366F1'];

interface ConfettiPieceProps {
  x: number;
  delay: number;
  color: string;
}

function ConfettiPiece({ x, delay, color }: ConfettiPieceProps) {
  const translateY = useRef(new RNAnimated.Value(-20)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const rotate = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const anim = RNAnimated.sequence([
      RNAnimated.delay(delay),
      RNAnimated.parallel([
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        RNAnimated.timing(translateY, {
          toValue: 700,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(translateX, {
          toValue: (Math.random() - 0.5) * 80,
          duration: 2000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(rotate, {
          toValue: Math.random() * 4 - 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        RNAnimated.sequence([
          RNAnimated.delay(1600),
          RNAnimated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    anim.start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [-2, 2], outputRange: ['-720deg', '720deg'] });

  return (
    <RNAnimated.View
      style={{
        position: 'absolute',
        top: 0,
        left: x,
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
      }}
    />
  );
}

function Confetti({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_W,
    delay: Math.random() * 800,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} x={p.x} delay={p.delay} color={p.color} />
      ))}
    </View>
  );
}

// ── SVG Budget Ring ────────────────────────────────────────────────────────

function BudgetRing({ pct = 0 }: { pct?: number }) {
  const SIZE = 128;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="transparent"
        stroke={G.surfaceContainerHigh}
        strokeWidth={STROKE}
      />
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="transparent"
        stroke={G.primary}
        strokeWidth={STROKE}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        opacity={pct > 0 ? 1 : 0.2}
      />
    </Svg>
  );
}

// ── Smart Nudge card ───────────────────────────────────────────────────────

interface NudgeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

function NudgeCard({ icon, title, subtitle, iconBg, iconColor, onPress }: NudgeCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.96, {}, () => { scale.value = withSpring(1); });
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.nudgeCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.nudgeIconWrapper, { backgroundColor: iconBg }]}>
          <Text style={[styles.nudgeIcon, { color: iconColor }]}>{icon}</Text>
        </View>
        <View style={styles.nudgeTextBlock}>
          <Text style={styles.nudgeTitle}>{title}</Text>
          <Text style={styles.nudgeSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.nudgeChevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────

type NavTab = 'home' | 'tracker' | 'reports' | 'goals' | 'settings';

interface NavItemProps {
  icon: string;
  label: string;
  tab: NavTab;
  active: boolean;
  onPress: () => void;
}

function NavItem({ icon, label, tab, active, onPress }: NavItemProps) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.navIcon, active && styles.navIconActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Toast helper ──────────────────────────────────────────────────────────

function showToastMsg(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
  // iOS: handled via state toast below
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { displayName, bankConnected, bankName, isFirstLanding, markFirstLandingSeen } =
    useOnboardingStore();

  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [iosToast, setIosToast] = useState('');
  const [iosToastVisible, setIosToastVisible] = useState(false);

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const name = displayName || 'there';

  useEffect(() => {
    if (isFirstLanding) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        markFirstLandingSeen();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const showComingSoon = () => {
    const msg = 'Coming in Sprint 2!';
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      setIosToast(msg);
      setIosToastVisible(true);
      setTimeout(() => setIosToastVisible(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Confetti layer */}
      <Confetti visible={showConfetti} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.appTitle}>FinTrack</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.welcomeSection}>
          <Text style={styles.welcomeGreeting}>
            {greeting}, {name} 👋
          </Text>
          <Text style={styles.welcomeSub}>Welcome to your new financial journey.</Text>
        </Animated.View>

        {/* Bento grid row 1: Net Worth (7/12) + Budget Ring (5/12) */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.bentoRow}>
          {/* Net Worth card */}
          <View style={[styles.bentoCard, styles.netWorthCard]}>
            <Text style={styles.netWorthLabel}>CURRENT NET WORTH</Text>
            <View style={styles.netWorthAmountRow}>
              <Text style={styles.netWorthAmount}>
                {bankConnected ? '₹ 24,800' : '₹ —'}
              </Text>
              {bankConnected && (
                <View style={styles.netWorthBadge}>
                  <Text style={styles.netWorthBadgeText}>+2.4%</Text>
                </View>
              )}
            </View>
            <View style={styles.netWorthFooter}>
              <View style={styles.bankIconsRow}>
                <View style={[styles.bankIconBubble, { backgroundColor: G.primaryContainer }]}>
                  <Text style={styles.bankIconText}>🏦</Text>
                </View>
                {bankConnected && (
                  <View style={[styles.bankIconBubble, styles.bankIconBubbleOffset, { backgroundColor: G.secondaryContainer }]}>
                    <Text style={styles.bankIconText}>💳</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={showComingSoon}>
                <Text style={styles.viewAnalytics}>View Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Ring card */}
          <View style={[styles.bentoCard, styles.budgetRingCard]}>
            <View style={styles.budgetRingWrapper}>
              <BudgetRing pct={0} />
              <View style={styles.budgetRingCenter}>
                <Text style={styles.budgetRingPct}>0%</Text>
              </View>
            </View>
            <Text style={styles.budgetRingLabel}>Monthly Budget</Text>
            <Text style={styles.budgetRingSub}>No transactions{'\n'}tracked yet</Text>
          </View>
        </Animated.View>

        {/* Smart nudges */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.nudgesSection}>
          <Text style={styles.nudgesSectionTitle}>NEXT STEPS</Text>
          <View style={styles.nudgesGrid}>
            <NudgeCard
              icon="💰"
              title="Set income"
              subtitle="Tell us how much you earn monthly"
              iconBg={G.primaryContainer}
              iconColor={G.onPrimaryContainer}
              onPress={showComingSoon}
            />
            <NudgeCard
              icon="🛒"
              title="Add first spend"
              subtitle="Track your very first expense today"
              iconBg={G.tertiaryContainer}
              iconColor={G.onTertiaryContainer}
              onPress={showComingSoon}
            />
          </View>
        </Animated.View>

        {/* Hero banner */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.heroBanner}>
          {/* Green gradient overlay */}
          <View style={styles.heroBannerGradient} />
          <View style={styles.heroBannerContent}>
            <Text style={styles.heroBannerTitle}>Secure your future</Text>
            <Text style={styles.heroBannerSub}>
              Every small step today leads to big wealth tomorrow.
            </Text>
          </View>
        </Animated.View>

        {/* Bottom padding for nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fab, fabStyle]}>
        <TouchableOpacity
          onPress={() => {
            fabScale.value = withSpring(0.9, {}, () => { fabScale.value = withSpring(1); });
            showComingSoon();
          }}
          style={styles.fabInner}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>＋</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <NavItem icon="🏠" label="Home" tab="home" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <NavItem icon="📋" label="Tracker" tab="tracker" active={activeTab === 'tracker'} onPress={() => setActiveTab('tracker')} />
        <NavItem icon="📊" label="Reports" tab="reports" active={activeTab === 'reports'} onPress={() => setActiveTab('reports')} />
        <NavItem icon="🎯" label="Goals" tab="goals" active={activeTab === 'goals'} onPress={() => setActiveTab('goals')} />
        <NavItem icon="⚙️" label="Settings" tab="settings" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>

      {/* iOS Toast */}
      {iosToastVisible && (
        <Animated.View entering={FadeInUp.duration(200)} style={styles.iosToast}>
          <Text style={styles.iosToastText}>{iosToast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: G.background,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: G.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: G.outlineVariant,
    shadowColor: G.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: G.primary,
    fontWeight: '600',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: G.primary,
    letterSpacing: -0.5,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  // Welcome
  welcomeSection: {
    gap: 4,
  },
  welcomeGreeting: {
    fontSize: 24,
    fontWeight: '600',
    color: G.onSurface,
    lineHeight: 32,
  },
  welcomeSub: {
    fontSize: 16,
    fontWeight: '400',
    color: G.onSurfaceVariant,
    lineHeight: 24,
  },
  // Bento
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    backgroundColor: G.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: G.outlineVariant,
    borderRadius: 12,
    padding: 16,
    shadowColor: G.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  netWorthCard: {
    flex: 7,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  budgetRingCard: {
    flex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  netWorthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: G.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  netWorthAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  netWorthAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: G.primary,
    letterSpacing: -1,
  },
  netWorthBadge: {
    backgroundColor: G.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  netWorthBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: G.primary,
  },
  netWorthFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: G.outlineVariant,
    paddingTop: 12,
    marginTop: 12,
  },
  bankIconsRow: {
    flexDirection: 'row',
  },
  bankIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: G.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankIconBubbleOffset: {
    marginLeft: -8,
  },
  bankIconText: {
    fontSize: 14,
  },
  viewAnalytics: {
    fontSize: 13,
    fontWeight: '500',
    color: G.primary,
  },
  // Budget Ring
  budgetRingWrapper: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetRingPct: {
    fontSize: 22,
    fontWeight: '600',
    color: G.outline,
  },
  budgetRingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: G.onSurface,
    textAlign: 'center',
  },
  budgetRingSub: {
    fontSize: 11,
    color: G.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Nudges
  nudgesSection: {
    gap: 12,
  },
  nudgesSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: G.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  nudgesGrid: {
    gap: 10,
  },
  nudgeCard: {
    backgroundColor: G.surfaceContainerLow,
    borderWidth: 1,
    borderColor: G.outlineVariant,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nudgeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeIcon: {
    fontSize: 22,
  },
  nudgeTextBlock: {
    flex: 1,
  },
  nudgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: G.onSurface,
  },
  nudgeSubtitle: {
    fontSize: 12,
    color: G.onSurfaceVariant,
    marginTop: 1,
  },
  nudgeChevron: {
    fontSize: 22,
    color: G.onSurfaceVariant,
  },
  // Hero banner
  heroBanner: {
    height: 144,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: G.outlineVariant,
    overflow: 'hidden',
    backgroundColor: G.surfaceContainer,
    justifyContent: 'flex-end',
  },
  heroBannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: G.primary,
    opacity: 0.85,
  },
  heroBannerContent: {
    padding: 20,
    maxWidth: '70%',
  },
  heroBannerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: G.onPrimary,
    marginBottom: 4,
  },
  heroBannerSub: {
    fontSize: 12,
    color: `${G.onPrimary}CC`,
    lineHeight: 18,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    zIndex: 50,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: G.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: G.primaryContainer,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: G.onPrimary,
    fontWeight: '300',
    marginTop: Platform.OS === 'android' ? -2 : 0,
  },
  // Bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 8,
    backgroundColor: G.surfaceContainer,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: G.primaryContainer,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 40,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    borderRadius: 999,
  },
  navItemActive: {
    backgroundColor: G.primaryContainer,
    paddingHorizontal: 12,
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: `${G.onSurfaceVariant}B3`,
    fontWeight: '400',
  },
  navLabelActive: {
    color: G.onPrimaryContainer,
    fontWeight: '600',
  },
  // iOS Toast
  iosToast: {
    position: 'absolute',
    bottom: 110,
    left: 24,
    right: 24,
    backgroundColor: G.onSurface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 999,
  },
  iosToastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
