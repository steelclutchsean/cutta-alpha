'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronRight, Users, Trophy } from 'lucide-react';
import { usePools } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';

export function LiveAuctionBanner() {
  const { data: pools } = usePools();
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Only LIVE status pools have active auctions
  const livePools = pools?.filter((p: any) => p.status === 'LIVE') || [];

  // Rotate through live pools
  useEffect(() => {
    if (livePools.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % livePools.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [livePools.length]);

  // Reset dismissed state when new auctions go live
  useEffect(() => {
    if (livePools.length > 0) {
      setDismissed(false);
    }
  }, [livePools.length]);

  if (livePools.length === 0 || dismissed) return null;

  const currentPool = livePools[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg lg:left-[calc(50%+9rem)] lg:-translate-x-1/2"
      >
        <div className="relative glass-panel !p-0 overflow-hidden border-accent-red/30 shadow-lg">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent-red/10 via-accent-blue/10 to-accent-red/10 animate-pulse" />
          
          <div className="relative p-4">
            <div className="flex items-center gap-4">
              {/* Live indicator */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-accent-red/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-accent-red" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-red rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-red rounded-full" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-accent-red uppercase tracking-wider">
                    Live Now
                  </span>
                  {livePools.length > 1 && (
                    <span className="text-xs text-text-tertiary">
                      {currentIndex + 1} of {livePools.length}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-text-primary truncate">
                  {currentPool.name}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {currentPool.memberCount || currentPool._count?.members || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {formatCurrency(Number(currentPool.totalPot || 0))}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href={`/pools/${currentPool.id}/draft`}
                    className="relative inline-flex items-center gap-1.5 py-2 px-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-[rgb(var(--accent-blue))] to-[rgb(var(--accent-blue))] text-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative">Join</span>
                    <ChevronRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </motion.div>
                <button
                  onClick={() => setDismissed(true)}
                  className="p-2 rounded-xl text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--glass-bg)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress dots for multiple live auctions */}
            {livePools.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {livePools.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentIndex
                        ? 'w-4 bg-accent-red'
                        : 'bg-text-quaternary hover:bg-text-tertiary'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
