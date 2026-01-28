import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useUserBalance, usePaymentMethods } from '../../lib/hooks';
import { formatCurrency, formatRelativeTime } from '@cutta/shared';
import { colors } from '../../lib/theme';

export function WalletScreen() {
  const { user } = useAuth();
  const { data: balanceData, mutate: refreshBalance } = useUserBalance();
  const { data: paymentMethods } = usePaymentMethods();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  }, [refreshBalance]);

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
          <Pressable style={styles.balanceAction}>
            <Ionicons name="add-circle-outline" size={20} color={colors.text.primary} />
            <Text style={styles.balanceActionText}>Add Funds</Text>
          </Pressable>
          <Pressable style={styles.balanceAction}>
            <Ionicons name="arrow-down-circle-outline" size={20} color={colors.text.primary} />
            <Text style={styles.balanceActionText}>Withdraw</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Payment Methods */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <Pressable>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary[500]} />
          </Pressable>
        </View>
        {paymentMethods && paymentMethods.length > 0 ? (
          paymentMethods.map((method: any) => (
            <View key={method.id} style={styles.paymentCard}>
              <View style={styles.cardIcon}>
                <Ionicons name="card" size={24} color={colors.primary[400]} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardBrand}>
                  {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)}
                </Text>
                <Text style={styles.cardNumber}>•••• {method.last4}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardExpiry}>
                  {method.expiryMonth}/{method.expiryYear.toString().slice(-2)}
                </Text>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <Pressable style={styles.addCard}>
            <Ionicons name="add" size={24} color={colors.primary[500]} />
            <Text style={styles.addCardText}>Add a payment method</Text>
          </Pressable>
        )}
      </View>

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {balanceData?.transactions && balanceData.transactions.length > 0 ? (
          balanceData.transactions.slice(0, 10).map((tx: any) => (
            <View key={tx.id} style={styles.transaction}>
              <View style={styles.txInfo}>
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor:
                        tx.type === 'PAYOUT'
                          ? colors.success[500] + '20'
                          : colors.primary[500] + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={getTransactionIcon(tx.type) as any}
                    size={20}
                    color={tx.type === 'PAYOUT' ? colors.success[500] : colors.primary[400]}
                  />
                </View>
                <View>
                  <Text style={styles.txLabel}>{getTransactionLabel(tx.type)}</Text>
                  <Text style={styles.txDate}>{formatRelativeTime(new Date(tx.createdAt))}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  {
                    color:
                      tx.type === 'PAYOUT' || tx.type === 'DEPOSIT'
                        ? colors.success[500]
                        : colors.text.primary,
                  },
                ]}
              >
                {tx.type === 'PAYOUT' || tx.type === 'DEPOSIT' ? '+' : '-'}
                {formatCurrency(Number(tx.amount))}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getTransactionIcon(type: string): string {
  const icons: Record<string, string> = {
    AUCTION_PURCHASE: 'trophy',
    SECONDARY_PURCHASE: 'swap-horizontal',
    PAYOUT: 'cash',
    DEPOSIT: 'add-circle',
    WITHDRAWAL: 'arrow-down-circle',
  };
  return icons[type] || 'cash';
}

function getTransactionLabel(type: string): string {
  const labels: Record<string, string> = {
    AUCTION_PURCHASE: 'Auction Win',
    SECONDARY_PURCHASE: 'Market Purchase',
    PAYOUT: 'Payout',
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
  };
  return labels[type] || type;
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
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  balanceActionText: {
    fontSize: 14,
    color: colors.text.primary,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  paymentCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[500] + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cardNumber: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardExpiry: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 11,
    color: colors.primary[400],
    fontWeight: '500',
  },
  addCard: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.dark[600],
    borderStyle: 'dashed',
  },
  addCardText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  transaction: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  txInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  txDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
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


