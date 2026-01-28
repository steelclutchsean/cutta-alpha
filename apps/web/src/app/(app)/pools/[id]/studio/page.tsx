'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Settings,
  Users,
  Radio,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { usePool, useAuctionState } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { useAuctionStore } from '@/lib/store';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';
import { auctionApi, livekitApi, poolsApi } from '@/lib/api';

import StudioVideoPreview from '@/components/studio/StudioVideoPreview';
import AuctionQueueManager from '@/components/studio/AuctionQueueManager';
import CurrentAuctionPanel from '@/components/studio/CurrentAuctionPanel';
import CompletedAuctionsPanel from '@/components/studio/CompletedAuctionsPanel';
import ChatModerationPanel from '@/components/studio/ChatModerationPanel';

export default function CommissionerStudioPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;
  const { user, token } = useAuth();
  const { data: pool, mutate: mutatePool } = usePool(poolId);
  const auctionState = useAuctionState(poolId);
  const { socket, sendMessage } = useSocket();
  const messages = useAuctionStore((state) => state.messages);

  // State
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [mutedUsers, setMutedUsers] = useState<any[]>([]);

  const isCommissioner = pool?.commissionerId === user?.id;

  // Redirect if not commissioner
  useEffect(() => {
    if (pool && user && !isCommissioner) {
      toast.error('Only the commissioner can access the studio');
      router.push(`/pools/${poolId}/draft`);
    }
  }, [pool, user, isCommissioner, poolId, router]);

  // Get LiveKit token
  useEffect(() => {
    if (!pool?.streamEnabled || !token) return;
    
    livekitApi.getToken(token, poolId).then((data) => {
      setLivekitToken(data.token);
    }).catch((err) => {
      console.error('Failed to get LiveKit token:', err);
    });
  }, [pool?.streamEnabled, token, poolId]);

  // Enable streaming if not already enabled
  const handleEnableStreaming = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      await livekitApi.enableStreaming(token, poolId);
      await mutatePool();
      toast.success('Streaming enabled!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable streaming');
    } finally {
      setIsLoading(false);
    }
  }, [token, poolId, mutatePool]);

  // Update items from auction state
  useEffect(() => {
    if (!auctionState) return;
    
    setPendingItems(auctionState.nextItems || []);
    setCompletedItems(auctionState.completedItems || []);
  }, [auctionState]);

  // Fetch muted users
  useEffect(() => {
    if (!token || !poolId) return;
    
    // Fetch muted users from API
    auctionApi.getMutedUsers?.(token, poolId)
      .then(setMutedUsers)
      .catch(() => setMutedUsers([]));
  }, [token, poolId]);

  // Auction control handlers
  const handleStartTimer = useCallback(async () => {
    if (!token) return;
    try {
      await auctionApi.resume(token, poolId);
      setIsPaused(false);
      toast.success('Timer started');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handlePauseTimer = useCallback(async () => {
    if (!token) return;
    try {
      await auctionApi.pause(token, poolId);
      setIsPaused(true);
      toast.success('Timer paused');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleSellNow = useCallback(async () => {
    if (!token) return;
    try {
      await auctionApi.sellNow(token, poolId);
      toast.success('Team sold!');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleSkip = useCallback(async () => {
    if (!token) return;
    try {
      await auctionApi.next(token, poolId);
      toast.success('Skipped to next team');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleStartAuction = useCallback(async (itemId: string) => {
    if (!token) return;
    try {
      await auctionApi.startItem(token, poolId, itemId);
      toast.success('Auction started!');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleReorderQueue = useCallback(async (items: any[]) => {
    if (!token) return;
    try {
      const itemOrder = items.map((item, index) => ({
        itemId: item.id,
        order: index + 1,
      }));
      await auctionApi.reorderQueue(token, poolId, itemOrder);
      setPendingItems(items);
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleMoveUp = useCallback(async (itemId: string) => {
    const index = pendingItems.findIndex(i => i.id === itemId);
    if (index <= 0) return;
    
    const newItems = [...pendingItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    await handleReorderQueue(newItems);
  }, [pendingItems, handleReorderQueue]);

  const handleMoveDown = useCallback(async (itemId: string) => {
    const index = pendingItems.findIndex(i => i.id === itemId);
    if (index < 0 || index >= pendingItems.length - 1) return;
    
    const newItems = [...pendingItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    await handleReorderQueue(newItems);
  }, [pendingItems, handleReorderQueue]);

  const handleRevertAuction = useCallback(async (itemId: string) => {
    if (!token) return;
    try {
      await auctionApi.revertAuction(token, poolId, itemId);
      toast.success('Auction reverted');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  // Chat moderation handlers
  const handleMuteUser = useCallback(async (userId: string, duration?: number) => {
    if (!token) return;
    try {
      await auctionApi.muteUser(token, poolId, userId, duration);
      // Refresh muted users
      const users = await auctionApi.getMutedUsers?.(token, poolId) || [];
      setMutedUsers(users);
      toast.success('User muted');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleUnmuteUser = useCallback(async (userId: string) => {
    if (!token) return;
    try {
      await auctionApi.unmuteUser(token, poolId, userId);
      setMutedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User unmuted');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!token) return;
    try {
      await auctionApi.deleteMessage(token, poolId, messageId);
      toast.success('Message deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId]);

  const handleSendMessage = useCallback((content: string) => {
    sendMessage(poolId, content);
  }, [poolId, sendMessage]);

  const handleEndAuction = useCallback(async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to end the entire auction? This cannot be undone.')) return;
    
    try {
      await auctionApi.endAuction(token, poolId);
      toast.success('Auction ended');
      router.push(`/pools/${poolId}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [token, poolId, router]);

  // Loading state
  if (!pool || !auctionState) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center">
        <div className="glass-panel text-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-400" />
          <p className="text-dark-400">Loading studio...</p>
        </div>
      </div>
    );
  }

  // Not commissioner check
  if (!isCommissioner) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center">
        <div className="glass-panel text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-dark-400 mb-4">Only the commissioner can access the studio.</p>
          <button
            onClick={() => router.push(`/pools/${poolId}/draft`)}
            className="glass-btn"
          >
            Go to Draft Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col">
      {/* Liquid Background */}
      <div className="liquid-bg" />

      {/* Header */}
      <header className="glass-navbar flex items-center justify-between px-6 py-3 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/pools/${poolId}/draft`)}
            className="glass-btn p-2"
            title="Back to draft room"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-400 animate-pulse" />
              Commissioner Studio
            </h1>
            <p className="text-sm text-dark-400">{pool.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Viewer Count */}
          <div className="glass-badge">
            <Users className="w-4 h-4" />
            <span>{viewerCount} viewers</span>
          </div>

          {/* Total Raised */}
          <div className="glass-badge-gold">
            <span className="font-bold">{formatCurrency(auctionState.totalRaised)}</span>
          </div>

          {/* End Auction Button */}
          <button
            onClick={handleEndAuction}
            className="glass-btn text-red-400 hover:bg-red-500/20"
          >
            <XCircle className="w-4 h-4" />
            End Auction
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push(`/pools/${poolId}/settings`)}
            className="glass-btn p-2"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden relative">
        <div className="h-full grid grid-cols-12 gap-6">
          {/* Left Column - Video & Current Auction */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            {/* Video Preview */}
            <div className="aspect-video rounded-2xl overflow-hidden bg-dark-800 shadow-glass-lg">
              {!pool.streamEnabled ? (
                <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center shadow-glass-glow">
                      <Radio className="w-12 h-12 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Enable Streaming</h3>
                    <p className="text-dark-400 mb-6 max-w-xs mx-auto">
                      Enable streaming to broadcast your camera and audio to viewers in the draft room
                    </p>
                    <button
                      onClick={handleEnableStreaming}
                      disabled={isLoading}
                      className="glass-btn-gold px-8 py-3 text-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enabling...
                        </>
                      ) : (
                        <>
                          <Radio className="w-5 h-5" />
                          Enable Streaming
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <StudioVideoPreview
                  token={livekitToken}
                  onViewerCountChange={setViewerCount}
                />
              )}
            </div>

            {/* Current Auction */}
            <div className="flex-1 min-h-0">
              <CurrentAuctionPanel
                currentItem={auctionState.currentItem}
                timeRemaining={auctionState.timeRemaining}
                isPaused={isPaused}
                onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer}
                onSellNow={handleSellNow}
                onSkip={handleSkip}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Right Column - Queue, Completed, Chat */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-8 grid lg:grid-cols-2 xl:grid-cols-3 gap-6 h-full">
            {/* Auction Queue */}
            <div className="min-h-0 overflow-hidden xl:col-span-1">
              <AuctionQueueManager
                items={pendingItems}
                onReorder={handleReorderQueue}
                onStartAuction={handleStartAuction}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isLoading={isLoading}
                currentItemId={auctionState.currentItem?.id}
              />
            </div>

            {/* Completed Auctions */}
            <div className="min-h-0 overflow-hidden xl:col-span-1">
              <CompletedAuctionsPanel
                items={completedItems.map(item => ({
                  ...item,
                  winner: item.currentBidder || null,
                  winningBid: item.currentBid || item.winningBid,
                }))}
                onRevert={handleRevertAuction}
                isLoading={isLoading}
              />
            </div>

            {/* Chat Moderation */}
            <div className="min-h-0 overflow-hidden lg:col-span-2 xl:col-span-1">
              <ChatModerationPanel
                messages={messages}
                mutedUsers={mutedUsers}
                onMuteUser={handleMuteUser}
                onUnmuteUser={handleUnmuteUser}
                onDeleteMessage={handleDeleteMessage}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

