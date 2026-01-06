'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  Users,
  Trophy,
  TrendingUp,
  Calendar,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { usePools, useUserBalance } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatRelativeTime } from '@cutta/shared';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: pools, isLoading: poolsLoading } = usePools();
  const { data: balanceData } = useUserBalance();

  const activePools = pools?.filter((p: any) => p.status === 'LIVE' || p.status === 'IN_PROGRESS') || [];
  const upcomingPools = pools?.filter((p: any) => p.status === 'OPEN' || p.status === 'DRAFT') || [];
  const transactions = balanceData?.transactions ?? [];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.displayName?.split(' ')[0]}!
          </h1>
          <p className="text-dark-300 mt-1">
            Here&apos;s what&apos;s happening with your pools
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/pools/join" className="btn-secondary">
            <Users className="w-4 h-4" />
            Join Pool
          </Link>
          <Link href="/pools/create" className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Pool
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={formatCurrency(balanceData?.balance || 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="gold"
        />
        <StatCard
          label="Active Pools"
          value={activePools.length.toString()}
          icon={<Zap className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          label="Total Winnings"
          value={formatCurrency(
            pools?.reduce((sum: number, p: any) => sum + Number(p.myWinnings || 0), 0) || 0
          )}
          icon={<Trophy className="w-5 h-5" />}
          color="success"
        />
        <StatCard
          label="Teams Owned"
          value={
            pools?.reduce((sum: number, p: any) => {
              // Would need to get ownerships count
              return sum + (p.ownerships?.length || 0);
            }, 0).toString() || '0'
          }
          icon={<Users className="w-5 h-5" />}
          color="default"
        />
      </div>

      {/* Active Auctions */}
      {activePools.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="live-indicator text-red-400">Live Auctions</span>
            </h2>
            <Link href="/pools" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePools.map((pool: any) => (
              <PoolCard key={pool.id} pool={pool} isLive />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Pools */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Auctions</h2>
          <Link href="/pools" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {upcomingPools.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingPools.map((pool: any) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Calendar className="w-12 h-12 text-dark-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No upcoming auctions</h3>
            <p className="text-dark-300 mb-4">
              Create a pool or join one to get started
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/pools/join" className="btn-secondary">
                Join Pool
              </Link>
              <Link href="/pools/create" className="btn-primary">
                Create Pool
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="card">
          {transactions.length > 0 ? (
            <div className="divide-y divide-dark-600">
              {transactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getTransactionLabel(tx.type)}</p>
                    <p className="text-sm text-dark-400">
                      {formatRelativeTime(new Date(tx.createdAt))}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.type === 'PAYOUT' || tx.sellerId
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'PAYOUT' || tx.sellerId ? '+' : '-'}
                    {formatCurrency(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-400 text-center py-8">No recent activity</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'gold' | 'primary' | 'success' | 'default';
}) {
  const colorClasses = {
    gold: 'bg-gold-500/10 text-gold-400',
    primary: 'bg-primary-500/10 text-primary-400',
    success: 'bg-green-500/10 text-green-400',
    default: 'bg-dark-600 text-dark-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </motion.div>
  );
}

function PoolCard({ pool, isLive = false }: { pool: any; isLive?: boolean }) {
  return (
    <Link href={`/pools/${pool.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`card-hover ${isLive ? 'border-primary-500/50 shadow-primary-500/10' : ''}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{pool.name}</h3>
            <p className="text-sm text-dark-400">
              {pool.tournament?.name} {pool.tournament?.year}
            </p>
          </div>
          {isLive && (
            <span className="badge-primary">
              <span className="live-indicator">LIVE</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-dark-300">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {pool.memberCount || pool._count?.members || 0}
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            {formatCurrency(Number(pool.totalPot || 0))}
          </span>
        </div>

        {!isLive && pool.auctionStartTime && (
          <div className="mt-3 pt-3 border-t border-dark-600">
            <p className="text-xs text-dark-400">
              <Calendar className="w-3 h-3 inline mr-1" />
              {new Date(pool.auctionStartTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </motion.div>
    </Link>
  );
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

