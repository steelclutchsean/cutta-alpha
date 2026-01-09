'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Users, Trophy, Calendar, Search, Filter, ChevronRight, Settings, Crown, Sparkles, Globe, Zap, Radio, Play } from 'lucide-react';
import { usePools } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';

type FilterType = 'all' | 'commissioned' | 'live' | 'upcoming' | 'completed';

export default function PoolsPage() {
  const { data: pools, isLoading } = usePools();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  // Only LIVE status pools have active auctions
  const livePools = pools?.filter((p: any) => p.status === 'LIVE') || [];

  const filteredPools = pools?.filter((pool: any) => {
    const matchesSearch = pool.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'commissioned' && pool.myRole === 'COMMISSIONER') ||
      (filter === 'live' && pool.status === 'LIVE') ||
      (filter === 'upcoming' && (pool.status === 'OPEN' || pool.status === 'DRAFT')) ||
      (filter === 'completed' && (pool.status === 'COMPLETED' || pool.status === 'IN_PROGRESS'));
    return matchesSearch && matchesFilter;
  }) || [];

  const filterCounts = {
    all: pools?.length || 0,
    commissioned: pools?.filter((p: any) => p.myRole === 'COMMISSIONER').length || 0,
    live: livePools.length,
    upcoming: pools?.filter((p: any) => p.status === 'OPEN' || p.status === 'DRAFT').length || 0,
    completed: pools?.filter((p: any) => p.status === 'COMPLETED' || p.status === 'IN_PROGRESS').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Live Auctions Quick Join Banner */}
      {livePools.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel !p-0 overflow-hidden border-accent-red/30"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent-red/5 via-accent-blue/5 to-accent-red/5" />
          
          <div className="relative p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-accent-red/15 flex items-center justify-center">
                    <Radio className="w-7 h-7 text-accent-red" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full animate-ping opacity-75" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    Live Auctions
                    <span className="px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red text-xs font-semibold">
                      {livePools.length} Active
                    </span>
                  </h2>
                  <p className="text-sm text-text-tertiary mt-0.5">
                    Jump into an ongoing auction and start bidding
                  </p>
                </div>
              </div>
              
              {/* Quick join buttons */}
              <div className="flex flex-wrap gap-2">
                {livePools.slice(0, 2).map((pool: any) => (
                  <Link
                    key={pool.id}
                    href={`/pools/${pool.id}/draft`}
                    className="glass-btn !py-2.5 !px-4 border-accent-red/20 hover:border-accent-red/40 group"
                  >
                    <Play className="w-4 h-4 text-accent-red" />
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {pool.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-accent-red transition-colors" />
                  </Link>
                ))}
                {livePools.length > 2 && (
                  <button
                    onClick={() => setFilter('live')}
                    className="glass-btn !py-2.5 !px-4"
                  >
                    <span className="text-sm">+{livePools.length - 2} more</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">My Pools</h1>
          <p className="text-text-tertiary mt-1">Manage your Calcutta auction pools</p>
        </div>
        <div className="flex gap-3">
          <Link href="/pools/discover" className="glass-btn">
            <Globe className="w-4 h-4" />
            Discover
          </Link>
          <Link href="/pools/join" className="glass-btn">
            <Users className="w-4 h-4" />
            Join
          </Link>
          <Link href="/pools/create" className="btn-solid-gold">
            <Plus className="w-4 h-4" />
            Create
          </Link>
        </div>
      </div>

      {/* Search and Filter - Glass Style */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
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
                className={`glass-tab whitespace-nowrap flex items-center gap-1.5 ${filter === f ? 'active' : ''}`}
              >
                {f === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="text-xs opacity-70">({filterCounts[f]})</span>
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
              <div className="h-4 bg-text-quaternary/20 rounded w-3/4 mb-3" />
              <div className="h-3 bg-text-quaternary/20 rounded w-1/2 mb-6" />
              <div className="h-8 bg-text-quaternary/20 rounded" />
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
          <div className="w-16 h-16 rounded-2xl bg-text-quaternary/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-text-quaternary" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-text-primary">No pools found</h3>
          <p className="text-text-tertiary mb-8 max-w-sm mx-auto">
            {search
              ? 'Try a different search term'
              : filter !== 'all'
              ? `No ${filter} pools`
              : 'Create or join a pool to get started'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/pools/discover" className="glass-btn-primary">
              <Globe className="w-4 h-4" />
              Discover Pools
            </Link>
            <Link href="/pools/join" className="glass-btn">
              Have Invite Code
            </Link>
            <Link href="/pools/create" className="btn-solid-gold">
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
  const isLive = pool.status === 'LIVE';
  const isUpcoming = pool.status === 'OPEN' || pool.status === 'DRAFT';
  const isCommissioner = pool.myRole === 'COMMISSIONER';

  return (
    <div className={`glass-card-hover h-full relative overflow-hidden ${isLive ? 'border-accent-red/30 shadow-[0_0_30px_rgba(var(--accent-red),0.15)]' : ''}`}>
      {/* Live auction glow effect */}
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-red/5 to-transparent pointer-events-none" />
      )}
      
      <Link href={isLive ? `/pools/${pool.id}/draft` : `/pools/${pool.id}`} className="relative block">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              {pool.name}
              {isCommissioner && (
                <span className="glass-badge-gold !py-0.5 !px-1.5">
                  <Crown className="w-3 h-3" />
                </span>
              )}
            </h3>
            <p className="text-sm text-text-tertiary">
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
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <Users className="w-4 h-4 text-accent-blue/70" />
            {pool.memberCount || pool._count?.members || 0}
          </span>
          <span className="flex items-center gap-1.5 text-accent-gold">
            <Trophy className="w-4 h-4" />
            {formatCurrency(Number(pool.totalPot || 0))}
          </span>
        </div>

        {isUpcoming && pool.auctionStartTime && (
          <div className="glass-badge !bg-glass-bg !border-glass-border text-text-tertiary">
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

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-glass-border">
        <span className="text-xs text-text-quaternary">
          {isCommissioner ? 'Commissioner' : 'Member'}
        </span>
        <div className="flex items-center gap-2">
          {isCommissioner && (
            <Link
              href={`/pools/${pool.id}/settings`}
              className="p-1.5 rounded-lg hover:bg-glass-bg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Settings className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
            </Link>
          )}
          <Link
            href={isLive ? `/pools/${pool.id}/draft` : `/pools/${pool.id}`}
            className={`text-sm font-medium flex items-center gap-1 transition-colors ${
              isLive 
                ? 'text-accent-red hover:text-accent-red/80' 
                : 'text-accent-blue hover:text-accent-blue/80'
            }`}
          >
            {isLive ? (
              <>
                <Zap className="w-4 h-4" />
                Join Now
              </>
            ) : (
              <>
                View
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
