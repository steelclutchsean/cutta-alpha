'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Users, Trophy, Calendar, Search, Filter, ChevronRight, Settings, Crown, Sparkles } from 'lucide-react';
import { usePools } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';

type FilterType = 'all' | 'commissioned' | 'live' | 'upcoming' | 'completed';

export default function PoolsPage() {
  const { data: pools, isLoading } = usePools();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filteredPools = pools?.filter((pool: any) => {
    const matchesSearch = pool.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'commissioned' && pool.myRole === 'COMMISSIONER') ||
      (filter === 'live' && (pool.status === 'LIVE' || pool.status === 'IN_PROGRESS')) ||
      (filter === 'upcoming' && (pool.status === 'OPEN' || pool.status === 'DRAFT')) ||
      (filter === 'completed' && pool.status === 'COMPLETED');
    return matchesSearch && matchesFilter;
  }) || [];

  const filterCounts = {
    all: pools?.length || 0,
    commissioned: pools?.filter((p: any) => p.myRole === 'COMMISSIONER').length || 0,
    live: pools?.filter((p: any) => p.status === 'LIVE' || p.status === 'IN_PROGRESS').length || 0,
    upcoming: pools?.filter((p: any) => p.status === 'OPEN' || p.status === 'DRAFT').length || 0,
    completed: pools?.filter((p: any) => p.status === 'COMPLETED').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My Pools</h1>
          <p className="text-dark-400">Manage your Calcutta auction pools</p>
        </div>
        <div className="flex gap-3">
          <Link href="/pools/join" className="glass-btn">
            <Users className="w-4 h-4" />
            Join Pool
          </Link>
          <Link href="/pools/create" className="glass-btn-gold">
            <Plus className="w-4 h-4" />
            Create Pool
          </Link>
        </div>
      </div>

      {/* Search and Filter - Glass Style */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search pools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(['all', 'commissioned', 'live', 'upcoming', 'completed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`glass-tab whitespace-nowrap ${filter === f ? 'active' : ''}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1.5 text-xs opacity-70">({filterCounts[f]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pool List */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card animate-pulse h-48">
              <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/5 rounded w-1/2 mb-6" />
              <div className="h-8 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : filteredPools.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPools.map((pool: any, index: number) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <PoolCard pool={pool} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-panel text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">No pools found</h3>
          <p className="text-dark-400 mb-8 max-w-sm mx-auto">
            {search
              ? 'Try a different search term'
              : filter !== 'all'
              ? `No ${filter} pools`
              : 'Create or join a pool to get started'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/pools/join" className="glass-btn">
              Join Pool
            </Link>
            <Link href="/pools/create" className="glass-btn-gold">
              <Plus className="w-4 h-4" />
              Create Pool
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PoolCard({ pool }: { pool: any }) {
  const isLive = pool.status === 'LIVE' || pool.status === 'IN_PROGRESS';
  const isUpcoming = pool.status === 'OPEN' || pool.status === 'DRAFT';
  const isCommissioner = pool.myRole === 'COMMISSIONER';

  return (
    <div className={`glass-card-hover h-full ${isLive ? '!border-primary-500/30 shadow-glass-glow' : ''}`}>
      <Link href={isLive ? `/pools/${pool.id}/draft` : `/pools/${pool.id}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              {pool.name}
              {isCommissioner && (
                <span className="glass-badge-gold !py-0.5 !px-1.5">
                  <Crown className="w-3 h-3" />
                </span>
              )}
            </h3>
            <p className="text-sm text-dark-400">
              {pool.tournament?.name} {pool.tournament?.year}
            </p>
          </div>
          {isLive && (
            <span className="glass-badge-live">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              LIVE
            </span>
          )}
          {pool.status === 'COMPLETED' && (
            <span className="glass-badge">Completed</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm mb-4">
          <span className="flex items-center gap-1.5 text-dark-300">
            <Users className="w-4 h-4 text-primary-400/70" />
            {pool.memberCount || pool._count?.members || 0}
          </span>
          <span className="flex items-center gap-1.5 text-gold-400">
            <Trophy className="w-4 h-4" />
            {formatCurrency(Number(pool.totalPot || 0))}
          </span>
        </div>

        {isUpcoming && pool.auctionStartTime && (
          <div className="glass-badge !bg-white/3 !border-white/5 text-dark-400">
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
      </Link>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <span className="text-xs text-dark-500">
          {isCommissioner ? 'Commissioner' : 'Member'}
        </span>
        <div className="flex items-center gap-2">
          {isCommissioner && (
            <Link
              href={`/pools/${pool.id}/settings`}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Settings className="w-4 h-4 text-dark-400 hover:text-white" />
            </Link>
          )}
          <Link
            href={isLive ? `/pools/${pool.id}/draft` : `/pools/${pool.id}`}
            className="text-primary-400 text-sm flex items-center gap-1 hover:text-primary-300 transition-colors"
          >
            {isLive ? 'Join Draft' : 'View'} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

