import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { usePools } from '../../lib/hooks';
import { formatCurrency } from '@cutta/shared';
import { colors } from '../../lib/theme';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function PoolsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: pools, isLoading, mutate } = usePools();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  }, [mutate]);

  const activePools = pools?.filter((p: any) => p.status === 'LIVE' || p.status === 'IN_PROGRESS') || [];
  const upcomingPools = pools?.filter((p: any) => p.status === 'OPEN' || p.status === 'DRAFT') || [];
  const completedPools = pools?.filter((p: any) => p.status === 'COMPLETED') || [];

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate('PoolJoin')}
        >
          <Ionicons name="enter-outline" size={20} color={colors.primary[500]} />
          <Text style={styles.actionButtonText}>Join Pool</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => navigation.navigate('PoolCreate')}
        >
          <Ionicons name="add" size={20} color={colors.text.primary} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>Create Pool</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Live Pools */}
        {activePools.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.sectionTitle}>Live</Text>
              </View>
            </View>
            {activePools.map((pool: any) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                onPress={() => navigation.navigate('Draft', { id: pool.id })}
                isLive
              />
            ))}
          </View>
        )}

        {/* Upcoming Pools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcomingPools.length > 0 ? (
            upcomingPools.map((pool: any) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                onPress={() => navigation.navigate('Pool', { id: pool.id })}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming pools</Text>
            </View>
          )}
        </View>

        {/* Completed Pools */}
        {completedPools.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedPools.map((pool: any) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                onPress={() => navigation.navigate('Pool', { id: pool.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PoolCard({
  pool,
  onPress,
  isLive = false,
}: {
  pool: any;
  onPress: () => void;
  isLive?: boolean;
}) {
  return (
    <Pressable
      style={[styles.poolCard, isLive && styles.poolCardLive]}
      onPress={onPress}
    >
      <View style={styles.poolInfo}>
        <Text style={styles.poolName}>{pool.name}</Text>
        <Text style={styles.poolMeta}>
          {pool.tournament?.name} • {pool.memberCount} members
        </Text>
        {!isLive && pool.auctionStartTime && (
          <Text style={styles.poolDate}>
            {new Date(pool.auctionStartTime).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
      <View style={styles.poolRight}>
        <Text style={styles.poolPot}>{formatCurrency(Number(pool.totalPot) || 0)}</Text>
        <View style={styles.poolRole}>
          <Text style={styles.poolRoleText}>
            {pool.myRole === 'COMMISSIONER' ? 'Commissioner' : 'Member'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[700],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[600],
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  actionButtonTextPrimary: {
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
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
  poolCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginBottom: 4,
  },
  poolDate: {
    fontSize: 12,
    color: colors.dark[400],
  },
  poolRight: {
    alignItems: 'flex-end',
  },
  poolPot: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gold[400],
    marginBottom: 8,
  },
  poolRole: {
    backgroundColor: colors.dark[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  poolRoleText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});


