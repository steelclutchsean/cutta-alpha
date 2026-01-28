'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Play,
  SkipForward,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Loader2,
} from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';

interface QueueItem {
  id: string;
  teamId: string;
  order: number;
  team: {
    id: string;
    name: string;
    shortName?: string;
    seed: number | null;
    region: string | null;
    logoUrl?: string | null;
  };
}

interface AuctionQueueManagerProps {
  items: QueueItem[];
  onReorder: (items: QueueItem[]) => void;
  onStartAuction: (itemId: string) => void;
  onMoveUp: (itemId: string) => void;
  onMoveDown: (itemId: string) => void;
  isLoading?: boolean;
  currentItemId?: string | null;
}

export default function AuctionQueueManager({
  items,
  onReorder,
  onStartAuction,
  onMoveUp,
  onMoveDown,
  isLoading = false,
  currentItemId,
}: AuctionQueueManagerProps) {
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleAction = useCallback(async (id: string, action: () => void) => {
    setActioningId(id);
    try {
      await action();
    } finally {
      setActioningId(null);
    }
  }, []);

  const handleReorder = useCallback((newItems: QueueItem[]) => {
    // Update order property based on new position
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    onReorder(updatedItems);
  }, [onReorder]);

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-primary-400" />
          Auction Queue
        </h3>
        <span className="text-sm text-dark-400">
          {items.length} teams
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
              <ListOrdered className="w-8 h-8 text-primary-400/50" />
            </div>
            <p className="text-text-secondary">No teams in queue</p>
            <p className="text-sm text-text-tertiary">All teams have been auctioned</p>
          </div>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="flex-1 overflow-y-auto space-y-2 pr-2"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <Reorder.Item
                key={item.id}
                value={item}
                className="relative"
                whileDrag={{ scale: 1.02, zIndex: 50 }}
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group ${
                    item.id === currentItemId ? 'ring-2 ring-gold-500/50 bg-gold-500/10' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing text-primary-400/40 hover:text-primary-400">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Order Number */}
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>

                  {/* Team Logo */}
                  <TeamLogo
                    logoUrl={item.team.logoUrl}
                    teamName={item.team.name}
                    shortName={item.team.shortName}
                    seed={item.team.seed}
                    size="sm"
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
                    <p className="text-xs text-text-tertiary truncate">
                      {item.team.region || 'Conference'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onMoveUp(item.id)}
                      disabled={index === 0 || isLoading}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onMoveDown(item.id)}
                      disabled={index === items.length - 1 || isLoading}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction(item.id, () => onStartAuction(item.id))}
                      disabled={isLoading || actioningId !== null || !!currentItemId}
                      className="p-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Start auction"
                    >
                      {actioningId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  );
}

