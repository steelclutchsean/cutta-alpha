'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy,
  Users,
  TrendingUp,
  Calendar,
  ChevronRight,
  Edit2,
  BarChart3,
  Shield,
  Zap,
  Clock,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUserProfile, useUserBalance, useUserOwnerships } from '@/lib/hooks';
import { EditProfileModal } from '@/components/EditProfileModal';
import { formatCurrency, formatRelativeTime } from '@cutta/shared';

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: balanceData } = useUserBalance();
  const { data: ownerships } = useUserOwnerships();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const getAvatarUrl = () => {
    if (profile?.avatarType === 'PRESET' && profile?.presetAvatarId) {
      return `/avatars/${profile.presetAvatarId}.svg`;
    }
    return profile?.avatarUrl || user?.avatarUrl;
  };

  const recentTransactions = balanceData?.transactions?.slice(0, 5) || [];
  const activePools = profile?.pools?.filter((p: any) => 
    p.status === 'LIVE' || p.status === 'IN_PROGRESS'
  ) || [];

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-transparent to-gold-500" />
        </div>

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 to-gold-500 shadow-xl ring-4 ring-white/10">
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()!}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dark-900 text-4xl font-bold">
                  {user?.displayName[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-dark-800/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {profile?.kycVerified && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-1">{profile?.displayName}</h1>
            <p className="text-dark-300 mb-3">{profile?.email}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
              {profile?.kycVerified && (
                <span className="glass-badge-success">
                  <Shield className="w-3 h-3" />
                  Verified
                </span>
              )}
              <span className="glass-badge">
                <Calendar className="w-3 h-3" />
                Member since {new Date(profile?.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/settings" className="btn-secondary">
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Link>
              <Link href="/profile/transactions" className="btn-primary">
                <BarChart3 className="w-4 h-4" />
                Transaction History
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={formatCurrency(Number(profile?.balance || 0))}
          icon={<DollarSign className="w-5 h-5" />}
          color="gold"
        />
        <StatCard
          label="Total Winnings"
          value={formatCurrency(Number(profile?.totalWinnings || 0))}
          icon={<Trophy className="w-5 h-5" />}
          color="success"
        />
        <StatCard
          label="Pools Joined"
          value={profile?.poolsJoined?.toString() || '0'}
          icon={<Users className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          label="Teams Owned"
          value={profile?.ownedTeams?.toString() || '0'}
          icon={<Shield className="w-5 h-5" />}
          color="default"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Pools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-400" />
              Active Pools
            </h2>
            <Link
              href="/pools"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {activePools.length > 0 ? (
            <div className="space-y-3">
              {activePools.slice(0, 3).map((pool: any) => (
                <Link
                  key={pool.id}
                  href={`/pools/${pool.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors"
                >
                  <div>
                    <p className="font-medium">{pool.name}</p>
                    <p className="text-sm text-dark-400">
                      {pool.status === 'LIVE' ? 'Auction Live' : 'In Progress'}
                    </p>
                  </div>
                  <span className="glass-badge-live text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-400 mb-3">No active pools</p>
              <Link href="/pools/join" className="btn-secondary text-sm">
                Join a Pool
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-400" />
              Recent Activity
            </h2>
            <Link
              href="/profile/transactions"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === 'PAYOUT' || tx.sellerId === user?.id
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <TrendingUp className={`w-4 h-4 ${
                        tx.type === 'PAYOUT' || tx.sellerId === user?.id
                          ? ''
                          : 'rotate-180'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getTransactionLabel(tx.type)}</p>
                      <p className="text-xs text-dark-400">
                        {formatRelativeTime(new Date(tx.createdAt))}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    tx.type === 'PAYOUT' || tx.sellerId === user?.id
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {tx.type === 'PAYOUT' || tx.sellerId === user?.id ? '+' : '-'}
                    {formatCurrency(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-400">No recent activity</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Owned Teams */}
      {ownerships && ownerships.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-400" />
              My Teams
            </h2>
            <Link
              href="/my-teams"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ownerships.slice(0, 6).map((ownership: any) => (
              <div
                key={ownership.id}
                className="p-3 rounded-lg bg-dark-700/50 flex items-center gap-3"
              >
                {ownership.auctionItem?.team?.logoUrl ? (
                  <img
                    src={ownership.auctionItem.team.logoUrl}
                    alt={ownership.auctionItem.team.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-dark-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {ownership.auctionItem?.team?.name || 'Unknown Team'}
                  </p>
                  <p className="text-xs text-dark-400">
                    {Number(ownership.percentage).toFixed(0)}% ownership
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          initialData={{
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            avatarType: profile.avatarType || 'CUSTOM',
            presetAvatarId: profile.presetAvatarId,
            phone: profile.phone,
          }}
        />
      )}
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
      className="glass-card"
    >
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </motion.div>
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

