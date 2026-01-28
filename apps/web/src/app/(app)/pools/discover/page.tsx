'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Trophy,
  Calendar,
  DollarSign,
  Sparkles,
  Search,
  Filter,
  ChevronRight,
  Check,
  Loader2,
  Globe,
  Zap,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { useDiscoverPools } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { poolsApi } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@cutta/shared';
import toast from 'react-hot-toast';

type SportFilter = 'all' | 'NFL' | 'NCAA_BASKETBALL' | 'GOLF' | 'OTHER';

export default function DiscoverPoolsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: pools, isLoading, mutate } = useDiscoverPools();
  
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);

  const filteredPools = pools?.filter((pool: any) => {
    const matchesSearch = pool.name.toLowerCase().includes(search.toLowerCase()) ||
      pool.tournament?.name.toLowerCase().includes(search.toLowerCase());
    const matchesSport = sportFilter === 'all' || pool.tournament?.sport === sportFilter;
    return matchesSearch && matchesSport;
  }) || [];

  // Group pools by entry type
  const freePools = filteredPools.filter((p: any) => Number(p.buyIn) === 0);
  const paidPools = filteredPools.filter((p: any) => Number(p.buyIn) > 0);

  const handleJoinPool = async (pool: any) => {
    if (!token) {
      router.push('/login');
      return;
    }

    setJoiningPoolId(pool.id);
    try {
      const result = await poolsApi.join(token, pool.inviteCode);
      toast.success(`Successfully joined ${pool.name}!`);
      mutate(); // Refresh the list
      router.push(`/pools/${result.poolId}`);
    } catch (error: any) {
      if (error.code === 'ALREADY_MEMBER') {
        toast.error("You're already a member of this pool");
        router.push(`/pools/${pool.id}`);
      } else if (error.code === 'POOL_FULL') {
        toast.error('This pool is now full');
        mutate(); // Refresh the list
      } else if (error.code === 'POOL_CLOSED') {
        toast.error('This pool is no longer accepting members');
        mutate();
      } else {
        toast.error(error.message || 'Failed to join pool');
      }
    } finally {
      setJoiningPoolId(null);
    }
  };

  const sportFilterOptions: { value: SportFilter; label: string }[] = [
    { value: 'all', label: 'All Sports' },
    { value: 'NFL', label: 'NFL' },
    { value: 'NCAA_BASKETBALL', label: 'March Madness' },
    { value: 'GOLF', label: 'Golf' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header */}
      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="gradient-text">Discover Pools</span>
              <Globe className="w-7 h-7 text-[rgb(var(--accent-blue))]" />
            </h1>
            <p className="text-[rgb(var(--text-secondary))] mt-1">
              Find and join public Calcutta pools
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-tertiary))]" />
            <input
              type="text"
              placeholder="Search pools by name or tournament..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-12"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {sportFilterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSportFilter(option.value)}
                className={`glass-tab whitespace-nowrap ${sportFilter === option.value ? 'active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="h-5 bg-white/5 rounded w-3/4 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/2 mb-6" />
              <div className="flex gap-4 mb-4">
                <div className="h-4 bg-white/5 rounded w-16" />
                <div className="h-4 bg-white/5 rounded w-16" />
              </div>
              <div className="h-10 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPools.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel text-center py-16"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[rgba(var(--accent-blue),0.2)] to-[rgba(var(--accent-gold),0.2)] flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-[rgb(var(--accent-gold))]" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Public Pools Available</h3>
          <p className="text-[rgb(var(--text-secondary))] mb-8 max-w-md mx-auto">
            {search || sportFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Check back soon or create your own pool and make it public!'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/pools/join" className="glass-btn">
              Have Invite Code
            </Link>
            <Link href="/pools/create" className="glass-btn-gold">
              <Sparkles className="w-4 h-4" />
              Create Pool
            </Link>
          </div>
        </motion.div>
      )}

      {/* Free Pools Section */}
      {!isLoading && freePools.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-green),0.15)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[rgb(var(--accent-green))]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Free to Join</h2>
              <p className="text-sm text-[rgb(var(--text-tertiary))]">No entry fee required</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {freePools.map((pool: any, index: number) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PoolCard
                  pool={pool}
                  onJoin={() => handleJoinPool(pool)}
                  isJoining={joiningPoolId === pool.id}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Paid Pools Section */}
      {!isLoading && paidPools.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-gold),0.15)] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[rgb(var(--accent-gold))]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Entry Fee Pools</h2>
              <p className="text-sm text-[rgb(var(--text-tertiary))]">Compete for real prizes</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidPools.map((pool: any, index: number) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PoolCard
                  pool={pool}
                  onJoin={() => handleJoinPool(pool)}
                  isJoining={joiningPoolId === pool.id}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Info Banner */}
      {!isLoading && filteredPools.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card border-[rgba(var(--accent-blue),0.2)] bg-[rgba(var(--accent-blue),0.05)]"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-blue),0.15)] flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-[rgb(var(--accent-blue))]" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Quick Join</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Click "Join Pool" to instantly join any available pool. For pools with entry fees, 
                the fee will be deducted from your balance or charged during the auction.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PoolCard({
  pool,
  onJoin,
  isJoining,
}: {
  pool: any;
  onJoin: () => void;
  isJoining: boolean;
}) {
  const isLive = pool.status === 'LIVE';
  const buyIn = Number(pool.buyIn);
  const isFree = buyIn === 0;
  const spotsRemaining = pool.spotsRemaining;
  const isAlmostFull = spotsRemaining !== null && spotsRemaining <= 3;

  return (
    <div className={`glass-card-hover h-full flex flex-col ${isLive ? 'border-[rgba(var(--accent-blue),0.3)]' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[rgb(var(--text-primary))] truncate">{pool.name}</h3>
          <p className="text-sm text-[rgb(var(--text-tertiary))] truncate">
            {pool.tournament?.name} {pool.tournament?.year}
          </p>
        </div>
        {isLive ? (
          <span className="glass-badge-live flex-shrink-0 ml-2">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            LIVE
          </span>
        ) : isFree ? (
          <span className="glass-badge-success flex-shrink-0 ml-2">FREE</span>
        ) : null}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
        <span className="flex items-center gap-1.5 text-[rgb(var(--text-secondary))]">
          <Users className="w-4 h-4 text-[rgb(var(--accent-blue))]" />
          {pool.memberCount}
          {pool.maxParticipants && `/${pool.maxParticipants}`}
        </span>
        {!isFree && (
          <span className="flex items-center gap-1.5 text-[rgb(var(--accent-gold))]">
            <DollarSign className="w-4 h-4" />
            {formatCurrency(buyIn)} entry
          </span>
        )}
        {Number(pool.totalPot) > 0 && (
          <span className="flex items-center gap-1.5 text-[rgb(var(--accent-gold))]">
            <Trophy className="w-4 h-4" />
            {formatCurrency(Number(pool.totalPot))}
          </span>
        )}
      </div>

      {/* Commissioner */}
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-3.5 h-3.5 text-[rgb(var(--text-quaternary))]" />
        <span className="text-xs text-[rgb(var(--text-tertiary))]">
          by {pool.commissioner?.displayName || 'Unknown'}
        </span>
      </div>

      {/* Spots Badge */}
      {spotsRemaining !== null && (
        <div className={`text-xs mb-4 ${isAlmostFull ? 'text-[rgb(var(--accent-red))]' : 'text-[rgb(var(--text-tertiary))]'}`}>
          {isAlmostFull ? (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Only {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left!
            </span>
          ) : (
            <span>{spotsRemaining} spots available</span>
          )}
        </div>
      )}

      {/* Auction Time */}
      {pool.auctionStartTime && !isLive && (
        <div className="glass-badge !bg-white/3 !border-white/5 text-[rgb(var(--text-tertiary))] mb-4 w-fit">
          <Calendar className="w-3 h-3" />
          {new Date(pool.auctionStartTime).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Join Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onJoin();
        }}
        disabled={isJoining}
        className={`w-full mt-4 ${isFree ? 'glass-btn-primary' : 'glass-btn-gold'} py-2.5`}
      >
        {isJoining ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            {isFree ? 'Join Free' : `Join · ${formatCurrency(buyIn)}`}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}


