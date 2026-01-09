'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronRight, Users, Trophy } from 'lucide-react';
import { usePools } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';

export function LiveAuctionFAB() {
  const { data: pools } = usePools();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only LIVE status pools have active auctions
  const livePools = pools?.filter((p: any) => p.status === 'LIVE') || [];

  if (livePools.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-20 right-0 w-80 glass-panel !p-0 overflow-hidden mb-2"
          >
            <div className="p-4 border-b border-glass-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                  Live Auctions
                </h3>
                <span className="text-xs text-text-tertiary">
                  {livePools.length} active
                </span>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {livePools.map((pool: any, index: number) => (
                <Link
                  key={pool.id}
                  href={`/pools/${pool.id}/draft`}
                  className="block"
                  onClick={() => setIsExpanded(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-glass-bg transition-colors border-b border-glass-border last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary truncate">
                          {pool.name}
                        </h4>
                        <p className="text-xs text-text-tertiary truncate mt-0.5">
                          {pool.tournament?.name}
                        </p>
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
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
            <div className="p-3 border-t border-glass-border bg-glass-bg">
              <Link
                href="/pools?filter=live"
                className="text-xs text-accent-blue hover:text-accent-blue/80 flex items-center justify-center gap-1"
                onClick={() => setIsExpanded(false)}
              >
                View all pools <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-red to-accent-red/80 text-white shadow-lg flex items-center justify-center group"
        style={{
          boxShadow: '0 4px 20px rgba(var(--accent-red), 0.4)',
        }}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="zap"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
            >
              <Zap className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-2xl bg-accent-red animate-ping opacity-20" />
        
        {/* Badge count */}
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-accent-red text-xs font-bold flex items-center justify-center shadow-md">
          {livePools.length}
        </span>
      </motion.button>
    </div>
  );
}

