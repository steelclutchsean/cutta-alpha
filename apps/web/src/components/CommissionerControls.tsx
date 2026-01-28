'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  Sparkles,
  RotateCw,
  GripVertical,
  X,
  Crown,
} from 'lucide-react';

interface AuctionItemWithDetails {
  id: string;
  currentBid: number | null;
  startingBid: number;
  team: {
    id: string;
    name: string;
    shortName: string;
    seed: number;
    region: string;
    logoUrl: string | null;
  };
  currentBidder: { id: string; displayName: string } | null;
  bidCount: number;
}

interface CommissionerControlsProps {
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  isWheelSpinMode: boolean;
  currentItem: AuctionItemWithDetails | null;
  isSpinning: boolean;
  wheelSpinTeamsCount: number;
  onAction: (action: 'start' | 'wheel-init' | 'wheel-spin' | 'pause' | 'next') => void;
}

const STORAGE_KEY = 'commissioner-controls-position';

export default function CommissionerControls({
  status,
  isWheelSpinMode,
  currentItem,
  isSpinning,
  wheelSpinTeamsCount,
  onAction,
}: CommissionerControlsProps) {
  // Desktop draggable state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Mobile FAB state
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize position from localStorage or default
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate position is within viewport
        const x = Math.min(Math.max(0, parsed.x), window.innerWidth - 200);
        const y = Math.min(Math.max(0, parsed.y), window.innerHeight - 80);
        setPosition({ x, y });
      } catch {
        setPosition({ x: window.innerWidth - 220, y: window.innerHeight - 100 });
      }
    } else {
      // Default to bottom-right
      setPosition({ x: window.innerWidth - 220, y: window.innerHeight - 100 });
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position && !isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (position) {
        const x = Math.min(position.x, window.innerWidth - 200);
        const y = Math.min(position.y, window.innerHeight - 80);
        if (x !== position.x || y !== position.y) {
          setPosition({ x, y });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 200));
    const y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 80));
    setPosition({ x, y });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach/detach mouse move/up listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle action and collapse mobile menu
  const handleAction = (action: 'start' | 'wheel-init' | 'wheel-spin' | 'pause' | 'next') => {
    onAction(action);
    setIsExpanded(false);
  };

  // Determine which buttons to show
  const showStartButton = status === 'not_started' && !isWheelSpinMode;
  const showWheelInitButton = status === 'not_started' && isWheelSpinMode;
  const showWheelSpinButton = isWheelSpinMode && !currentItem && !isSpinning && wheelSpinTeamsCount > 0;
  const showPauseNextButtons = status === 'in_progress' && currentItem;

  const hasControls = showStartButton || showWheelInitButton || showWheelSpinButton || showPauseNextButtons;

  if (!hasControls) return null;

  // Render action buttons
  const renderButtons = (isMobile: boolean) => {
    const btnClass = isMobile ? 'w-full justify-center' : '';
    
    return (
      <>
        {showStartButton && (
          <button
            onClick={() => handleAction('start')}
            className={`glass-btn-gold ${btnClass}`}
          >
            <Play className="w-4 h-4" />
            {!isMobile && 'Start Auction'}
          </button>
        )}
        {showWheelInitButton && (
          <button
            onClick={() => handleAction('wheel-init')}
            className={`glass-btn-gold ${btnClass}`}
          >
            <Sparkles className="w-4 h-4" />
            {!isMobile && 'Initialize Wheel'}
          </button>
        )}
        {showWheelSpinButton && (
          <button
            onClick={() => handleAction('wheel-spin')}
            className={`glass-btn-gold ${btnClass}`}
          >
            <RotateCw className="w-4 h-4" />
            {!isMobile && `Spin (${wheelSpinTeamsCount})`}
          </button>
        )}
        {showPauseNextButtons && (
          <>
            <button
              onClick={() => handleAction('pause')}
              className={`glass-btn ${btnClass}`}
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleAction('next')}
              className={`glass-btn-primary ${btnClass}`}
            >
              <SkipForward className="w-4 h-4" />
              {!isMobile && (isWheelSpinMode ? 'Next Spin' : 'Next Team')}
            </button>
          </>
        )}
      </>
    );
  };

  return (
    <>
      {/* Desktop: Draggable Panel */}
      <div
        ref={panelRef}
        className="hidden lg:flex fixed z-40"
        style={{
          left: position?.x ?? 0,
          top: position?.y ?? 0,
          cursor: isDragging ? 'grabbing' : 'auto',
        }}
      >
        <div className="glass-panel !p-0 !rounded-2xl shadow-2xl overflow-hidden">
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="w-4 h-4 text-dark-400" />
            <span className="text-xs text-dark-400 font-medium">Commissioner</span>
          </div>
          
          {/* Controls */}
          <div className="flex gap-2 p-2">
            {renderButtons(false)}
          </div>
        </div>
      </div>

      {/* Mobile: Collapsible FAB */}
      <div className="lg:hidden fixed bottom-24 right-4 z-40">
        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                onClick={() => setIsExpanded(false)}
              />
              
              {/* Expanded Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute bottom-16 right-0 glass-panel !p-2 !rounded-2xl flex flex-col gap-2 min-w-[140px]"
              >
                {showStartButton && (
                  <button
                    onClick={() => handleAction('start')}
                    className="glass-btn-gold justify-start"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                {showWheelInitButton && (
                  <button
                    onClick={() => handleAction('wheel-init')}
                    className="glass-btn-gold justify-start"
                  >
                    <Sparkles className="w-4 h-4" />
                    Initialize
                  </button>
                )}
                {showWheelSpinButton && (
                  <button
                    onClick={() => handleAction('wheel-spin')}
                    className="glass-btn-gold justify-start"
                  >
                    <RotateCw className="w-4 h-4" />
                    Spin ({wheelSpinTeamsCount})
                  </button>
                )}
                {showPauseNextButtons && (
                  <>
                    <button
                      onClick={() => handleAction('pause')}
                      className="glass-btn justify-start"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                    <button
                      onClick={() => handleAction('next')}
                      className="glass-btn-primary justify-start"
                    >
                      <SkipForward className="w-4 h-4" />
                      {isWheelSpinMode ? 'Next Spin' : 'Next Team'}
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isExpanded
              ? 'bg-dark-700 text-white'
              : 'bg-gradient-to-br from-gold-400 to-gold-600 text-dark-900'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="crown"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Crown className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
