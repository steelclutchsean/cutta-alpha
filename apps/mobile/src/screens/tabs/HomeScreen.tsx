import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import { usePools, useUserBalance } from '../../lib/hooks';
import { formatCurrency } from '@cutta/shared';
import { colors } from '../../lib/theme';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { data: pools, mutate: refreshPools } = usePools();
  const { data: balanceData, mutate: refreshBalance } = useUserBalance();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshPools(), refreshBalance()]);
    setRefreshing(false);
  }, [refreshPools, refreshBalance]);

  const activePools = pools?.filter((p: any) => p.status === 'LIVE' || p.status === 'IN_PROGRESS') || [];
  const upcomingPools = pools?.filter((p: any) => p.status === 'OPEN' || p.status === 'DRAFT') || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary[500]}
        />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.displayName?.split(' ')[0]}</Text>
        </View>
        <Pressable
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
          <View style={styles.notificationBadge} />
        </Pressable>
      </View>

      {/* Balance Card */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(balanceData?.balance || Number(user?.balance) || 0)}
        </Text>
        <View style={styles.balanceActions}>
          <Pressable style={styles.balanceAction} onPress={() => navigation.navigate('Main', { screen: 'Wallet' })}>
            <Ionicons name="add-circle-outline" size={20} color={colors.text.primary} />
            <Text style={styles.balanceActionText}>Add Funds</Text>
          </Pressable>
          <Pressable style={styles.balanceAction} onPress={() => navigation.navigate('Main', { screen: 'Wallet' })}>
            <Ionicons name="arrow-down-circle-outline" size={20} color={colors.text.primary} />
            <Text style={styles.balanceActionText}>Withdraw</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickAction}
          onPress={() => navigation.navigate('PoolCreate')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary[500] + '20' }]}>
            <Ionicons name="add" size={24} color={colors.primary[500]} />
          </View>
          <Text style={styles.quickActionText}>Create Pool</Text>
        </Pressable>
        <Pressable
          style={styles.quickAction}
          onPress={() => navigation.navigate('PoolJoin')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.gold[500] + '20' }]}>
            <Ionicons name="enter-outline" size={24} color={colors.gold[500]} />
          </View>
          <Text style={styles.quickActionText}>Join Pool</Text>
        </Pressable>
        <Pressable
          style={styles.quickAction}
          onPress={() => navigation.navigate('Main', { screen: 'Market' })}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#00ff77' + '20' }]}>
            <Ionicons name="trending-up" size={24} color="#00ff77" />
          </View>
          <Text style={styles.quickActionText}>Market</Text>
        </Pressable>
      </View>

      {/* Live Pools */}
      {activePools.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Auctions</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Main', { screen: 'Pools' })}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {activePools.map((pool: any) => (
            <Pressable
              key={pool.id}
              style={[styles.poolCard, styles.poolCardLive]}
              onPress={() => navigation.navigate('Draft', { id: pool.id })}
            >
              <View style={styles.poolInfo}>
                <Text style={styles.poolName}>{pool.name}</Text>
                <Text style={styles.poolMeta}>
                  {pool.tournament?.name} • {pool.memberCount} members
                </Text>
              </View>
              <View style={styles.poolStats}>
                <Text style={styles.poolPot}>{formatCurrency(Number(pool.totalPot))}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.dark[400]} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Upcoming Pools */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Auctions</Text>
          <Pressable onPress={() => navigation.navigate('Main', { screen: 'Pools' })}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        </View>
        {upcomingPools.length > 0 ? (
          upcomingPools.map((pool: any) => (
            <Pressable
              key={pool.id}
              style={styles.poolCard}
              onPress={() => navigation.navigate('Pool', { id: pool.id })}
            >
              <View style={styles.poolInfo}>
                <Text style={styles.poolName}>{pool.name}</Text>
                <Text style={styles.poolMeta}>
                  {new Date(pool.auctionStartTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.poolStats}>
                <Text style={styles.poolMembers}>{pool.memberCount} joined</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.dark[400]} />
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.dark[600]} />
            <Text style={styles.emptyTitle}>No upcoming auctions</Text>
            <Text style={styles.emptyText}>Create or join a pool to get started</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 16,
  },
  balanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  balanceActionText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary[400],
    fontWeight: '500',
  },
  poolCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poolCardLive: {
    borderWidth: 1,
    borderColor: colors.primary[500] + '40',
  },
  poolInfo: {
    flex: 1,
  },
  poolName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  poolMeta: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  poolStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poolPot: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gold[400],
  },
  poolMembers: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyState: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

