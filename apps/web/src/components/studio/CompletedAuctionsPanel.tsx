'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  RotateCcw,
  Check,
  X,
  DollarSign,
  User,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@cutta/shared';
import TeamLogo from '@/components/TeamLogo';

interface CompletedItem {
  id: string;
  team: {
    id: string;
    name: string;
    shortName?: string;
    seed: number | null;
    region: string | null;
    logoUrl?: string | null;
  };
  winningBid: number | null;
  winner: { id: string; displayName: string } | null;
  status: 'sold' | 'unsold';
  auctionedAt: string | null;
}

interface CompletedAuctionsPanelProps {
  items: CompletedItem[];
  onRevert: (itemId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CompletedAuctionsPanel({
  items,
  onRevert,
  isLoading = false,
}: CompletedAuctionsPanelProps) {
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);

  const handleRevertClick = useCallback((itemId: string) => {
    setConfirmRevertId(itemId);
  }, []);

  const handleConfirmRevert = useCallback(async (itemId: string) => {
    setRevertingId(itemId);
    try {
      await onRevert(itemId);
      setConfirmRevertId(null);
    } catch (error) {
      console.error('Failed to revert auction:', error);
    } finally {
      setRevertingId(null);
    }
  }, [onRevert]);

  const handleCancelRevert = useCallback(() => {
    setConfirmRevertId(null);
  }, []);

  const soldItems = items.filter(item => item.status === 'sold');
  const unsoldItems = items.filter(item => item.status === 'unsold');

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-green-400" />
          Completed Auctions
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400">{soldItems.length} sold</span>
          <span className="text-dark-500">•</span>
          <span className="text-dark-400">{unsoldItems.length} unsold</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <History className="w-8 h-8 text-dark-500" />
            </div>
            <p className="text-dark-400">No completed auctions</p>
            <p className="text-sm text-dark-500">Sold teams will appear here</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 rounded-xl transition-colors ${
                  item.status === 'sold'
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                {/* Revert Confirmation */}
                {confirmRevertId === item.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2 text-yellow-400">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Revert this auction?</p>
                        <p className="text-sm text-dark-400">
                          {item.status === 'sold' 
                            ? `This will refund ${item.winner?.displayName || 'the winner'} and return ${item.team.name} to the queue.`
                            : `This will return ${item.team.name} to the auction queue.`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmRevert(item.id)}
                        disabled={revertingId === item.id}
                        className="flex-1 glass-btn-primary py-2 text-sm"
                      >
                        {revertingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Confirm Revert
                      </button>
                      <button
                        onClick={handleCancelRevert}
                        disabled={revertingId === item.id}
                        className="flex-1 glass-btn py-2 text-sm"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Team Logo */}
                    <TeamLogo
                      logoUrl={item.team.logoUrl}
                      teamName={item.team.name}
                      shortName={item.team.shortName}
                      seed={item.team.seed}
                      size="md"
                    />

                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {item.team.name}
                        </span>
                        {item.team.seed && (
                          <span className="text-xs text-dark-400 bg-white/10 px-1.5 py-0.5 rounded">
                            #{item.team.seed}
                          </span>
                        )}
                      </div>
                      {item.status === 'sold' && item.winner ? (
                        <div className="flex items-center gap-2 text-sm text-dark-400">
                          <span className="text-green-400 font-medium">
                            {formatCurrency(item.winningBid || 0)}
                          </span>
                          <span>•</span>
                          <User className="w-3 h-3" />
                          <span className="truncate">{item.winner.displayName}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-dark-500">No bids</p>
                      )}
                    </div>

                    {/* Revert Button */}
                    <button
                      onClick={() => handleRevertClick(item.id)}
                      disabled={isLoading || revertingId !== null}
                      className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-yellow-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Revert auction"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

