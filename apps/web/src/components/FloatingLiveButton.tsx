'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Radio, X, Users, Trophy, ChevronRight, Zap } from 'lucide-react';
import { formatCurrency } from '@cutta/shared';

interface FloatingLiveButtonProps {
  pools: any[];
}

export function FloatingLiveButton({ pools }: FloatingLiveButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pools.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-20 right-0 w-80 glass-panel !p-0 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-accent-red/10 border-b border-glass-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red" />
                </span>
                <span className="text-sm font-semibold text-accent-red">
                  {pools.length} Live Auction{pools.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg hover:bg-glass-bg transition-colors"
              >
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>

            {/* Pool List */}
            <div className="max-h-80 overflow-y-auto">
              {pools.map((pool, index) => (
                <Link
                  key={pool.id}
                  href={`/pools/${pool.id}`}
                  onClick={() => setIsExpanded(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-4 py-3 hover:bg-glass-bg transition-colors border-b border-glass-border last:border-b-0 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-text-primary truncate">
                        {pool.name}
                      </h4>
                      <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-accent-blue group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-text-tertiary mb-2 truncate">
                      {pool.tournament?.name} {pool.tournament?.year}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {pool.memberCount || pool._count?.members || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {formatCurrency(Number(pool.totalPot || 0))}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 bg-glass-bg border-t border-glass-border">
              <Link
                href="/pools?filter=live"
                onClick={() => setIsExpanded(false)}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-accent-blue/10 text-accent-blue text-sm font-medium hover:bg-accent-blue/20 transition-colors"
              >
                <Zap className="w-4 h-4" />
                View All Live Auctions
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-red to-accent-gold flex items-center justify-center shadow-lg"
        style={{
          boxShadow: '0 4px 20px rgba(255, 59, 48, 0.4)',
        }}
      >
        {/* Ping animation */}
        <span className="absolute inset-0 rounded-2xl animate-ping bg-accent-red/30" style={{ animationDuration: '2s' }} />
        
        {/* Icon */}
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="radio"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Radio className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-accent-red text-xs font-bold flex items-center justify-center shadow-md">
          {pools.length}
        </span>
      </motion.button>
    </div>
  );
}

