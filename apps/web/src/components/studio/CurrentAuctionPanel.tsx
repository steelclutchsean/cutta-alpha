'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  Gavel,
  Timer,
  DollarSign,
  User,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatTimeRemaining } from '@cutta/shared';
import TeamLogo from '@/components/TeamLogo';

interface CurrentAuctionPanelProps {
  currentItem: {
    id: string;
    team: {
      id: string;
      name: string;
      shortName?: string;
      seed: number | null;
      region: string | null;
      logoUrl?: string | null;
    };
    currentBid: number | null;
    currentBidder: { displayName: string } | null;
    startingBid: number;
    bidCount: number;
  } | null;
  timeRemaining: number;
  isPaused: boolean;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onSellNow: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export default function CurrentAuctionPanel({
  currentItem,
  timeRemaining,
  isPaused,
  onStartTimer,
  onPauseTimer,
  onSellNow,
  onSkip,
  isLoading = false,
}: CurrentAuctionPanelProps) {
  const [isActioning, setIsActioning] = useState<string | null>(null);

  const handleAction = useCallback(async (action: string, handler: () => void) => {
    setIsActioning(action);
    try {
      await handler();
    } finally {
      setIsActioning(null);
    }
  }, []);

  if (!currentItem) {
    return (
      <div className="glass-panel h-full">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Gavel className="w-5 h-5 text-gold-400" />
          Current Auction
        </h3>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Timer className="w-8 h-8 text-dark-500" />
            </div>
            <p className="text-dark-400">No active auction</p>
            <p className="text-sm text-dark-500">Start an auction from the queue</p>
          </div>
        </div>
      </div>
    );
  }

  const currentBidAmount = currentItem.currentBid || currentItem.startingBid;
  const isTimerCritical = timeRemaining <= 5;

  return (
    <div className="glass-panel h-full">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Gavel className="w-5 h-5 text-gold-400" />
        Current Auction
      </h3>

      {/* Team Info */}
      <motion.div
        key={currentItem.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-start gap-4">
          <TeamLogo
            logoUrl={currentItem.team.logoUrl}
            teamName={currentItem.team.name}
            shortName={currentItem.team.shortName}
            seed={currentItem.team.seed}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xl font-bold text-white truncate">
              {currentItem.team.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {currentItem.team.seed && (
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-dark-300">
                  #{currentItem.team.seed}
                </span>
              )}
              <span className="text-dark-400 text-sm">
                {currentItem.team.region || 'Conference'} • {currentItem.bidCount} bids
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Timer */}
      <div className={`text-center py-4 rounded-xl mb-4 ${
        isTimerCritical 
          ? 'bg-red-500/20 border border-red-500/30' 
          : 'bg-white/5'
      }`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Timer className={`w-5 h-5 ${isTimerCritical ? 'text-red-400' : 'text-dark-400'}`} />
          <span className="text-sm text-dark-400">Time Remaining</span>
        </div>
        <span className={`text-4xl font-mono font-bold ${
          isTimerCritical ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {formatTimeRemaining(timeRemaining)}
        </span>
        {isPaused && (
          <p className="text-sm text-yellow-400 mt-1">PAUSED</p>
        )}
      </div>

      {/* Current Bid */}
      <div className="bg-white/5 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-gold-400" />
          <span className="text-sm text-dark-400">Current Bid</span>
        </div>
        <p className="text-3xl font-bold text-gold-400">
          {formatCurrency(currentBidAmount)}
        </p>
        {currentItem.currentBidder && (
          <div className="flex items-center gap-2 mt-2 text-dark-400">
            <User className="w-4 h-4" />
            <span className="text-sm">by {currentItem.currentBidder.displayName}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {isPaused ? (
          <button
            onClick={() => handleAction('start', onStartTimer)}
            disabled={isLoading || isActioning !== null}
            className="glass-btn-primary col-span-2 py-3"
          >
            {isActioning === 'start' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start Timer
          </button>
        ) : (
          <button
            onClick={() => handleAction('pause', onPauseTimer)}
            disabled={isLoading || isActioning !== null}
            className="glass-btn py-3"
          >
            {isActioning === 'pause' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
            Pause
          </button>
        )}
        
        {!isPaused && (
          <button
            onClick={() => handleAction('sell', onSellNow)}
            disabled={isLoading || isActioning !== null || !currentItem.currentBid}
            className="glass-btn-gold py-3"
          >
            {isActioning === 'sell' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Gavel className="w-4 h-4" />
            )}
            Sell Now
          </button>
        )}

        <button
          onClick={() => handleAction('skip', onSkip)}
          disabled={isLoading || isActioning !== null}
          className={`glass-btn py-3 ${isPaused ? 'col-span-1' : 'col-span-2'}`}
        >
          {isActioning === 'skip' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SkipForward className="w-4 h-4" />
          )}
          Skip / No Sale
        </button>
      </div>
    </div>
  );
}

