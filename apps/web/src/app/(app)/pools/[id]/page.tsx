'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Play,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Crown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { usePool } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';

export default function PoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;
  const { user } = useAuth();
  const { data: pool, isLoading } = usePool(poolId);
  const [copied, setCopied] = useState(false);

  const isCommissioner = pool?.commissionerId === user?.id;
  const isLive = pool?.status === 'LIVE' || pool?.status === 'IN_PROGRESS';

  const handleCopyInvite = () => {
    if (pool?.inviteCode) {
      navigator.clipboard.writeText(pool.inviteCode);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-dark-400">Loading pool...</div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold mb-2">Pool not found</h2>
        <p className="text-dark-400 mb-6">This pool doesn't exist or you don't have access.</p>
        <Link href="/pools" className="btn-primary">
          Back to Pools
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{pool.name}</h1>
              {isLive && (
                <span className="badge-primary">
                  <span className="live-indicator">LIVE</span>
                </span>
              )}
            </div>
            <p className="text-dark-400">
              {pool.tournament?.name} {pool.tournament?.year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCommissioner && (
            <Link href={`/pools/${poolId}/settings`} className="btn-secondary">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}
          {(pool.status === 'LIVE' || pool.status === 'IN_PROGRESS') && (
            <Link href={`/pools/${poolId}/draft`} className="btn-gold">
              <Play className="w-4 h-4" />
              Join Draft
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-500/20">
              <Trophy className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Total Pot</p>
              <p className="text-xl font-bold text-gold-400">
                {formatCurrency(pool.totalPot || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Members</p>
              <p className="text-xl font-bold">
                {pool.members?.length || pool.memberCount || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-dark-600">
              <DollarSign className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Buy-in</p>
              <p className="text-xl font-bold">{formatCurrency(pool.buyIn)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-dark-600">
              <Calendar className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Status</p>
              <p className="text-xl font-bold capitalize">
                {pool.status?.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {pool.description && (
            <div className="card">
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-dark-300">{pool.description}</p>
            </div>
          )}

          {/* Payout Rules */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Payout Structure</h2>
              {isCommissioner && (
                <Link
                  href={`/pools/${poolId}/settings`}
                  className="text-sm text-primary-400 hover:underline"
                >
                  Edit
                </Link>
              )}
            </div>
            {pool.payoutRules?.length > 0 ? (
              <div className="space-y-3">
                {pool.payoutRules.map((rule: any) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      {rule.description && (
                        <p className="text-sm text-dark-400">{rule.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gold-400">
                        {formatCurrency((pool.totalPot || 0) * (Number(rule.percentage) / 100))}
                      </p>
                      <p className="text-sm text-dark-400">{Number(rule.percentage)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400">No payout rules configured yet.</p>
            )}
          </div>

          {/* Teams */}
          <div className="card">
            <h2 className="font-semibold mb-4">Teams ({pool.auctionItems?.length || 0})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {pool.auctionItems?.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg ${
                    item.team?.isEliminated
                      ? 'bg-dark-800/50 opacity-60'
                      : 'bg-dark-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-dark-400">
                      #{item.team?.seed}
                    </span>
                    <span className="font-medium truncate">{item.team?.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-dark-400">
                    <span>{item.team?.region}</span>
                    {item.winningBid && (
                      <span className="text-gold-400">{formatCurrency(item.winningBid)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invite Section */}
          {(pool.status === 'DRAFT' || pool.status === 'OPEN') && (
            <div className="card">
              <h2 className="font-semibold mb-3">Invite Members</h2>
              
              {/* Invite Link */}
              {pool.inviteLink && (
                <div className="mb-4">
                  <p className="text-xs text-dark-400 mb-1">Invite Link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-dark-700 rounded-lg px-3 py-2 text-sm truncate">
                      {pool.inviteLink}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pool.inviteLink);
                        toast.success('Link copied!');
                      }}
                      className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Invite Code */}
              <div>
                <p className="text-xs text-dark-400 mb-1">Invite Code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-dark-700 rounded-lg px-4 py-3 font-mono text-lg tracking-wider">
                    {pool.inviteCode}
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm text-dark-400 mt-2">
                Share the link or code with friends to invite them
              </p>
            </div>
          )}

          {/* Members */}
          <div className="card">
            <h2 className="font-semibold mb-4">Members</h2>
            <div className="space-y-3">
              {pool.members?.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-dark-900 text-sm font-bold">
                      {member.user?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        {member.user?.displayName}
                        {member.role === 'COMMISSIONER' && (
                          <Crown className="w-3.5 h-3.5 text-gold-400" />
                        )}
                      </p>
                      <p className="text-xs text-dark-400">
                        Spent: {formatCurrency(member.totalSpent || 0)}
                      </p>
                    </div>
                  </div>
                  {member.user?.id === user?.id && (
                    <span className="text-xs text-primary-400">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/pools/${poolId}/standings`}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <span>View Standings</span>
                <ChevronRight className="w-4 h-4 text-dark-400" />
              </Link>
              {isCommissioner && (
                <Link
                  href={`/pools/${poolId}/settings`}
                  className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
                >
                  <span>Pool Settings</span>
                  <ChevronRight className="w-4 h-4 text-dark-400" />
                </Link>
              )}
              <Link
                href="/my-teams"
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <span>My Teams</span>
                <ChevronRight className="w-4 h-4 text-dark-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

