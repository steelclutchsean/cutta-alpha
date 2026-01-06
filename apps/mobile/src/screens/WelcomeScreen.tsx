import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';
import { colors } from '../lib/theme';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [user, isLoading, navigation]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingLogo}>
          <Ionicons name="trophy" size={40} color={colors.dark[900]} />
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.dark[900], colors.dark[800]]}
      style={styles.container}
    >
      {/* Background glow effects */}
      <View style={styles.glowPrimary} />
      <View style={styles.glowGold} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.primary[500], colors.gold[500]]}
            style={styles.logo}
          >
            <Ionicons name="trophy" size={48} color={colors.dark[900]} />
          </LinearGradient>
          <Text style={styles.logoText}>Cutta</Text>
        </Animated.View>

        {/* Hero Text */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.heroContainer}>
          <Text style={styles.heroTitle}>
            <Text style={styles.heroGradient}>Calcutta Auctions</Text>
            {'\n'}Reimagined
          </Text>
          <Text style={styles.heroSubtitle}>
            Live auctions, real-time bidding, instant payouts. The ultimate March
            Madness pool experience.
          </Text>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.ctaContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Auth', { screen: 'Signup' })}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowPrimary: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary[500],
    opacity: 0.1,
  },
  glowGold: {
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.gold[500],
    opacity: 0.1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
  },
  heroGradient: {
    color: colors.primary[400],
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  ctaContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.dark[700],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

