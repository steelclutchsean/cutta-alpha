import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useMarketListings } from '../../lib/hooks';
import { formatCurrency } from '@cutta/shared';
import { colors } from '../../lib/theme';

export function MarketScreen() {
  const { data: listings, isLoading, mutate } = useMarketListings();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  }, [mutate]);

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filters}>
        <Pressable style={[styles.filterTab, styles.filterTabActive]}>
          <Text style={[styles.filterTabText, styles.filterTabTextActive]}>All Listings</Text>
        </Pressable>
        <Pressable style={styles.filterTab}>
          <Text style={styles.filterTabText}>My Listings</Text>
        </Pressable>
        <Pressable style={styles.filterTab}>
          <Text style={styles.filterTabText}>My Offers</Text>
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
        {listings && listings.length > 0 ? (
          listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={48} color={colors.dark[600]} />
            <Text style={styles.emptyTitle}>No listings available</Text>
            <Text style={styles.emptyText}>
              Check back later or list your own teams
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ListingCard({ listing }: { listing: any }) {
  const team = listing.ownership?.auctionItem?.team;
  const pool = listing.ownership?.auctionItem?.pool;

  return (
    <Pressable style={styles.listingCard}>
      <View style={styles.listingHeader}>
        <View style={styles.teamInfo}>
          <View style={styles.seedBadge}>
            <Text style={styles.seedText}>#{team?.seed || '?'}</Text>
          </View>
          <View>
            <Text style={styles.teamName}>{team?.name || 'Unknown Team'}</Text>
            <Text style={styles.poolName}>{pool?.name || 'Unknown Pool'}</Text>
          </View>
        </View>
        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{listing.percentageForSale}%</Text>
        </View>
      </View>

      <View style={styles.listingBody}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Asking Price</Text>
          <Text style={styles.priceValue}>{formatCurrency(Number(listing.askingPrice))}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Original Price</Text>
          <Text style={styles.originalPrice}>
            {formatCurrency(Number(listing.ownership?.purchasePrice || 0))}
          </Text>
        </View>
      </View>

      <View style={styles.listingFooter}>
        <View style={styles.sellerInfo}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerInitial}>
              {listing.seller?.displayName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.sellerName}>{listing.seller?.displayName}</Text>
        </View>
        <View style={styles.actions}>
          {listing.acceptingOffers && (
            <Pressable style={styles.offerButton}>
              <Text style={styles.offerButtonText}>Make Offer</Text>
            </Pressable>
          )}
          <Pressable style={styles.buyButton}>
            <Text style={styles.buyButtonText}>Buy Now</Text>
          </Pressable>
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
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[700],
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dark[700],
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterTabTextActive: {
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  listingCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seedBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[400],
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  poolName: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  percentBadge: {
    backgroundColor: colors.gold[500] + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold[400],
  },
  listingBody: {
    backgroundColor: colors.dark[800],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gold[400],
  },
  originalPrice: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.dark[900],
  },
  sellerName: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  offerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dark[600],
  },
  offerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  buyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary[500],
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
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
    textAlign: 'center',
  },
});

