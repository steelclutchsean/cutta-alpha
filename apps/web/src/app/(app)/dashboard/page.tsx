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
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Radio,
} from 'lucide-react';
import { usePools, useUserBalance } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatRelativeTime } from '@cutta/shared';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: pools, isLoading: poolsLoading } = usePools();
  const { data: balanceData } = useUserBalance();

  // Only LIVE status pools have active auctions - IN_PROGRESS means tournament in progress after auction
  const activePools = pools?.filter((p: any) => p.status === 'LIVE') || [];
  const upcomingPools = pools?.filter((p: any) => p.status === 'OPEN' || p.status === 'DRAFT') || [];
  const transactions = balanceData?.transactions ?? [];

  const totalWinnings = pools?.reduce((sum: number, p: any) => sum + Number(p.myWinnings || 0), 0) || 0;
  const teamsOwned = pools?.reduce((sum: number, p: any) => sum + (p.ownerships?.length || 0), 0) || 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Welcome back, {user?.displayName?.split(' ')[0]}
          </h1>
          <p className="text-text-tertiary mt-2">
            Here&apos;s what&apos;s happening with your pools today
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/pools/join" className="glass-btn">
            <Users className="w-4 h-4" />
            Join Pool
          </Link>
          <Link href="/pools/create" className="btn-solid-gold">
            <Plus className="w-4 h-4" />
            Create Pool
          </Link>
        </div>
      </motion.div>

      {/* PROMINENT Live Auction Quick Join Hero */}
      {activePools.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-red/20 via-accent-blue/10 to-accent-gold/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          
          <div className="relative glass-panel !border-accent-red/30 !rounded-3xl">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Left side - Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-accent-red/20 flex items-center justify-center">
                      <Radio className="w-7 h-7 text-accent-red" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full animate-ping" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-accent-red uppercase tracking-wider">
                      Live Now
                    </span>
                    <h2 className="text-2xl font-bold text-text-primary">
                      {activePools.length} Active Auction{activePools.length !== 1 ? 's' : ''}
                    </h2>
                  </div>
                </div>
                <p className="text-text-tertiary">
                  Your pools are live! Jump in and start bidding on teams.
                </p>
              </div>

              {/* Right side - Quick Join Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {activePools.slice(0, 2).map((pool: any, index: number) => (
                  <Link
                    key={pool.id}
                    href={`/pools/${pool.id}/draft`}
                    className="group"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="glass-card !p-4 border-accent-red/20 hover:border-accent-red/40 transition-all min-w-[200px]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-accent-red flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                          LIVE
                        </span>
                        <Play className="w-4 h-4 text-accent-red opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-semibold text-text-primary truncate">
                        {pool.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {pool.memberCount || pool._count?.members || 0}
                        </span>
                        <span className="flex items-center gap-1 text-accent-gold">
                          <Trophy className="w-3 h-3" />
                          {formatCurrency(Number(pool.totalPot || 0))}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-glass-border">
                        <span className="text-sm font-medium text-accent-red flex items-center gap-1 group-hover:gap-2 transition-all">
                          Join Now
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                {activePools.length > 2 && (
                  <Link href="/pools?filter=live" className="glass-btn !h-auto !py-6 flex-col">
                    <span className="text-2xl font-bold text-text-primary">+{activePools.length - 2}</span>
                    <span className="text-xs text-text-tertiary">more live</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid - Premium Metal Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={formatCurrency(balanceData?.balance || 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="gold"
          trend={12.5}
          delay={0}
        />
        <StatCard
          label="Active Pools"
          value={activePools.length.toString()}
          icon={<Zap className="w-5 h-5" />}
          color="blue"
          href={activePools.length > 0 ? `/pools/${activePools[0]?.id}/draft` : undefined}
          delay={1}
        />
        <StatCard
          label="Total Winnings"
          value={formatCurrency(totalWinnings)}
          icon={<Trophy className="w-5 h-5" />}
          color="green"
          trend={totalWinnings > 0 ? 8.3 : undefined}
          delay={2}
        />
        <StatCard
          label="Teams Owned"
          value={teamsOwned.toString()}
          icon={<Users className="w-5 h-5" />}
          color="default"
          delay={3}
        />
      </motion.div>

      {/* Upcoming Pools */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-text-primary">Upcoming Auctions</h2>
          <Link
            href="/pools"
            className="text-accent-blue text-sm font-medium hover:text-accent-blue/80 flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {upcomingPools.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingPools.map((pool: any, index: number) => (
              <PoolCard key={pool.id} pool={pool} index={index} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-accent-blue/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-accent-blue" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">No upcoming auctions</h3>
            <p className="text-text-tertiary mb-6 max-w-md mx-auto">
              Create a new pool or join an existing one to get started with your next auction
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/pools/join" className="glass-btn">
                Join Pool
              </Link>
              <Link href="/pools/create" className="btn-solid-gold">
                <Plus className="w-4 h-4" />
                Create Pool
              </Link>
            </div>
          </motion.div>
        )}
      </motion.section>

      {/* Recent Activity */}
      <motion.section variants={itemVariants}>
        <h2 className="text-xl font-semibold text-text-primary mb-5">Recent Activity</h2>
        <div className="glass-panel !p-0 overflow-hidden">
          {transactions.length > 0 ? (
            <div className="divide-y divide-glass-border">
              {transactions.slice(0, 5).map((tx: any, index: number) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="px-6 py-4 flex items-center justify-between hover:bg-glass-bg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === 'PAYOUT' || tx.sellerId
                          ? 'bg-accent-green/15'
                          : 'bg-accent-red/15'
                      }`}
                    >
                      {tx.type === 'PAYOUT' || tx.sellerId ? (
                        <ArrowDownRight className="w-5 h-5 text-accent-green" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-accent-red" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{getTransactionLabel(tx.type)}</p>
                      <p className="text-sm text-text-tertiary">
                        {formatRelativeTime(new Date(tx.createdAt))}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${
                      tx.type === 'PAYOUT' || tx.sellerId
                        ? 'text-accent-green'
                        : 'text-accent-red'
                    }`}
                  >
                    {tx.type === 'PAYOUT' || tx.sellerId ? '+' : '-'}
                    {formatCurrency(Number(tx.amount))}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Sparkles className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
              <p className="text-text-tertiary">No recent activity</p>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  trend,
  href,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'gold' | 'blue' | 'green' | 'default';
  trend?: number;
  href?: string;
  delay?: number;
}) {
  const colorClasses = {
    gold: {
      bg: 'bg-accent-gold/15',
      text: 'text-accent-gold',
      glow: 'shadow-glass-gold',
    },
    blue: {
      bg: 'bg-accent-blue/15',
      text: 'text-accent-blue',
      glow: 'shadow-glass-glow',
    },
    green: {
      bg: 'bg-accent-green/15',
      text: 'text-accent-green',
      glow: '',
    },
    default: {
      bg: 'bg-accent-blue/10',
      text: 'text-accent-blue/70',
      glow: '',
    },
  };

  const colors = colorClasses[color];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: delay * 0.1,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`glass-card relative overflow-hidden group ${colors.glow} ${href ? 'cursor-pointer' : ''}`}
    >
      {/* Metal sheen effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center mb-4`}>
        <span className={colors.text}>{icon}</span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="stat-value">{value}</p>
          <p className="stat-label mt-1">{label}</p>
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-accent-green' : 'text-accent-red'} flex items-center gap-0.5`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Quick join indicator for active pools */}
      {href && color === 'blue' && parseInt(value) > 0 && (
        <div className="mt-3 pt-3 border-t border-glass-border">
          <span className="text-xs font-medium text-accent-blue flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Tap to join live
          </span>
        </div>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function PoolCard({ pool, isLive = false, index = 0 }: { pool: any; isLive?: boolean; index?: number }) {
  return (
    <Link href={`/pools/${pool.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.08,
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        whileHover={{ y: -4, scale: 1.02 }}
        className={`glass-card-hover group ${
          isLive ? 'ring-1 ring-accent-blue/30 shadow-glass-glow' : ''
        }`}
      >
        {/* Metal sheen effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary truncate">{pool.name}</h3>
              <p className="text-sm text-text-tertiary truncate mt-0.5">
                {pool.tournament?.name} {pool.tournament?.year}
              </p>
            </div>
            {isLive && (
              <span className="glass-badge-live flex-shrink-0 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {pool.memberCount || pool._count?.members || 0}
            </span>
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              {formatCurrency(Number(pool.totalPot || 0))}
            </span>
          </div>

          {!isLive && pool.auctionStartTime && (
            <div className="mt-4 pt-4 border-t border-glass-border">
              <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
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
        </div>
      </motion.div>
    </Link>
  );
}

function getTransactionLabel(type: string): string {
  const labels: Record<string, string> = {
    AUCTION_PURCHASE: 'Auction Win',
    SECONDARY_PURCHASE: 'Market Purchase',
    PAYOUT: 'Payout Received',
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
  };
  return labels[type] || type;
}
