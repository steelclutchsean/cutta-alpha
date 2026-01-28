'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  MessageCircle,
  Users,
  Trophy,
  Timer,
  DollarSign,
  Send,
  Video,
  Settings,
  Loader2,
  Sparkles,
  RotateCw,
  FileText,
  Radio,
  ArrowLeft,
} from 'lucide-react';
import { usePool, useAuctionState } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { useAuctionStore } from '@/lib/store';
import { formatCurrency, formatTimeRemaining } from '@cutta/shared';
import toast from 'react-hot-toast';
import { auctionApi, livekitApi } from '@/lib/api';
import WheelSpin from '@/components/WheelSpin';
import LiveStream from '@/components/LiveStream';
import TeamLogo from '@/components/TeamLogo';
import CommissionerControls from '@/components/CommissionerControls';

export default function DraftRoomPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;
  const { user, token } = useAuth();
  const { data: pool, mutate: mutatePool } = usePool(poolId);
  const auctionState = useAuctionState(poolId);
  const { socket, placeBid, sendMessage } = useSocket();
  const messages = useAuctionStore((state) => state.messages);
  const typingUsers = useAuctionStore((state) => state.typingUsers);

  const [bidAmount, setBidAmount] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);

  // Streaming state
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isEnablingStream, setIsEnablingStream] = useState(false);

  // Wheel spin state
  const [wheelSpinTeams, setWheelSpinTeams] = useState<any[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [assignedUserName, setAssignedUserName] = useState<string>('');
  const [wheelSpinState, setWheelSpinState] = useState<{ currentIndex: number; totalTeams: number; isActive: boolean } | null>(null);
  const [matchupBrief, setMatchupBrief] = useState<string | null>(null);
  const [showMatchupBrief, setShowMatchupBrief] = useState(false);
  const [wheelTeamsLoading, setWheelTeamsLoading] = useState(false);

  const isCommissioner = pool?.commissionerId === user?.id;
  const isWheelSpinMode = pool?.auctionMode === 'WHEEL_SPIN';
  const currentItem = auctionState?.currentItem;
  const minBid = currentItem
    ? (currentItem.currentBid || currentItem.startingBid) + 1
    : 1;

  // Quick bid amounts
  const quickBids = [
    minBid,
    minBid + 5,
    minBid + 10,
    minBid + 25,
  ];

  // Get LiveKit token for streaming (for both commissioner and viewers)
  useEffect(() => {
    if (pool?.streamEnabled && token) {
      livekitApi.getToken(token, poolId).then((data) => {
        setLivekitToken(data.token);
      }).catch((err) => {
        console.error('Failed to get LiveKit token:', err);
      });
    }
  }, [pool?.streamEnabled, token, poolId]);

  // Fetch wheel teams for wheel spin mode
  const fetchWheelTeams = useCallback(async () => {
    if (!token || !poolId) return;
    setWheelTeamsLoading(true);
    try {
      const data = await auctionApi.getWheelTeams(token, poolId);
      setWheelSpinTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to fetch wheel teams:', err);
    } finally {
      setWheelTeamsLoading(false);
    }
  }, [token, poolId]);

  // Load wheel teams when entering wheel spin mode draft room
  useEffect(() => {
    if (isWheelSpinMode && token && poolId) {
      fetchWheelTeams();
    }
  }, [isWheelSpinMode, token, poolId, fetchWheelTeams]);

  // Listen for wheel spin socket events
  useEffect(() => {
    if (!socket || !isWheelSpinMode) return;

    // When wheel spin starts from another client (commissioner broadcasts)
    const handleWheelSpinStart = (data: {
      teams: any[];
      targetTeamId: string;
      assignedUserId: string;
      assignedUserName: string;
      spinDuration: number;
      spinIndex: number;
      totalSpins: number;
    }) => {
      setWheelSpinTeams(data.teams || []);
      setTargetTeamId(data.targetTeamId);
      setAssignedUserName(data.assignedUserName);
      setIsSpinning(true);
      setWheelSpinState({
        currentIndex: data.spinIndex,
        totalTeams: data.totalSpins,
        isActive: true,
      });
    };

    // When wheel spin completes and bidding opens
    const handleWheelSpinComplete = () => {
      setIsSpinning(false);
    };

    // When an item is sold, refresh the wheel teams
    const handleItemSold = () => {
      // Refresh wheel teams after an item is sold
      fetchWheelTeams();
    };

    // When auction state updates (which includes after items sold)
    const handleAuctionStateUpdate = () => {
      // Only refresh wheel teams if not currently spinning
      if (!isSpinning) {
        fetchWheelTeams();
      }
    };

    socket.on('wheelSpinStart', handleWheelSpinStart);
    socket.on('wheelSpinComplete', handleWheelSpinComplete);
    socket.on('itemSold', handleItemSold);
    // Also listen for auction updates to keep teams in sync
    socket.on('auctionStateUpdate', handleAuctionStateUpdate);

    return () => {
      socket.off('wheelSpinStart', handleWheelSpinStart);
      socket.off('wheelSpinComplete', handleWheelSpinComplete);
      socket.off('itemSold', handleItemSold);
      socket.off('auctionStateUpdate', handleAuctionStateUpdate);
    };
  }, [socket, isWheelSpinMode, fetchWheelTeams, isSpinning]);

  const handleBid = useCallback((amount: number) => {
    if (!currentItem) return;
    placeBid(currentItem.id, amount);
    setBidAmount('');
    toast.success(`Bid placed: ${formatCurrency(amount)}`);
  }, [currentItem, placeBid]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendMessage(poolId, chatMessage);
    setChatMessage('');
  };

  const handleCommissionerAction = async (action: 'start' | 'pause' | 'resume' | 'next' | 'wheel-init' | 'wheel-spin' | 'wheel-complete') => {
    if (!token) return;
    try {
      switch (action) {
        case 'start':
          await auctionApi.start(token, poolId);
          toast.success('Auction started!');
          break;
        case 'pause':
          await auctionApi.pause(token, poolId);
          toast.success('Auction paused');
          break;
        case 'resume':
          await auctionApi.resume(token, poolId);
          toast.success('Auction resumed');
          break;
        case 'next':
          await auctionApi.next(token, poolId);
          break;
        case 'wheel-init':
          await auctionApi.wheelSpinInit(token, poolId);
          toast.success('Wheel spin auction initialized!');
          break;
        case 'wheel-spin':
          const spinResult = await auctionApi.wheelSpinSpin(token, poolId);
          setWheelSpinTeams(spinResult.teams || []);
          setTargetTeamId(spinResult.team?.id || null);
          setAssignedUserName(spinResult.assignedUser?.displayName || '');
          setIsSpinning(true);
          break;
        case 'wheel-complete':
          await auctionApi.wheelSpinComplete(token, poolId);
          setIsSpinning(false);
          toast.success('Bidding is now open!');
          break;
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Fetch matchup brief when current item changes
  useEffect(() => {
    if (currentItem && token) {
      auctionApi.getMatchupBrief(token, poolId).then((data) => {
        setMatchupBrief(data.matchupBrief);
      }).catch(console.error);
    }
  }, [currentItem?.id, token, poolId]);

  // Handle wheel spin completion
  const handleWheelSpinComplete = useCallback((team: any) => {
    setIsSpinning(false);
    if (isCommissioner) {
      // Small delay before completing to allow animation to finish
      setTimeout(() => {
        handleCommissionerAction('wheel-complete');
      }, 1500);
    }
  }, [isCommissioner]);

  // Live stream handlers
  const handleEnableStreaming = useCallback(async () => {
    if (!token) return;
    setIsEnablingStream(true);
    try {
      await livekitApi.enableStreaming(token, poolId);
      // Refresh pool data to get the updated streamEnabled status
      await mutatePool();
      toast.success('Streaming enabled! You can now go live.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable streaming');
    } finally {
      setIsEnablingStream(false);
    }
  }, [token, poolId, mutatePool]);

  const handleGoLive = useCallback(() => {
    setIsLive(true);
    toast.success('You are now live!');
  }, []);

  const handleStopLive = useCallback(() => {
    setIsLive(false);
    toast.success('Stream ended');
  }, []);

  if (!pool || !auctionState) {
    return (
      <div className="fixed inset-0 bg-bg-primary flex items-center justify-center">
        <div className="glass-panel text-center p-8">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-tertiary">Loading draft room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg-primary flex flex-col lg:flex-row">
      {/* Liquid Background */}
      <div className="liquid-bg" />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Bar - Glass Navbar */}
        <header className="glass-navbar flex items-center justify-between px-4 py-3 relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="glass-btn p-2 hover:bg-white/10 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-text-primary">{pool.name}</h1>
              <p className="text-sm text-text-tertiary">
                {auctionState.completedItems.length} / {(auctionState.completedItems.length + (auctionState.nextItems.length || 0) + (currentItem ? 1 : 0))} teams sold
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-badge-gold">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">{formatCurrency(auctionState.totalRaised)}</span>
            </div>
            {isCommissioner && (
              <>
                <button
                  onClick={() => router.push(`/pools/${poolId}/studio`)}
                  className="glass-btn-primary"
                  title="Open Commissioner Studio"
                >
                  <Radio className="w-4 h-4" />
                  Studio
                </button>
                <button
                  onClick={() => router.push(`/pools/${poolId}/settings`)}
                  className="glass-btn p-2"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowChat(!showChat)}
              className="lg:hidden glass-btn p-2"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Video/Stream Area */}
        <div className="relative aspect-video max-h-[40vh] flex items-center justify-center overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/50 to-transparent pointer-events-none z-10" />
          
          {pool.streamEnabled ? (
            <LiveStream
              token={livekitToken}
              isHost={isCommissioner}
              streamEnabled={pool.streamEnabled}
              onGoLive={handleGoLive}
              onStopLive={handleStopLive}
            />
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-accent-blue/5 flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-text-quaternary" />
              </div>
              <p className="text-text-tertiary mb-4">Streaming not enabled</p>
              {isCommissioner && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleEnableStreaming}
                    disabled={isEnablingStream}
                    className="glass-btn-gold"
                  >
                    {isEnablingStream ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enabling...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        Enable Streaming
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/pools/${poolId}/studio`)}
                    className="glass-btn-primary"
                  >
                    <Radio className="w-4 h-4" />
                    Open Studio
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Auction Item */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {currentItem ? (
            <div className="max-w-2xl mx-auto">
              {/* Timer - Glass Style */}
              <div className="text-center mb-6">
                <div className={`glass-panel inline-flex items-center gap-3 !p-4 !rounded-2xl ${
                  auctionState.timeRemaining <= 5
                    ? '!bg-red-500/20 !border-red-500/30 animate-pulse'
                    : ''
                }`}>
                  <Timer className={`w-6 h-6 ${auctionState.timeRemaining <= 5 ? 'text-red-400' : 'text-accent-blue'}`} />
                  <span className={`text-4xl font-mono font-bold ${auctionState.timeRemaining <= 5 ? 'text-red-400' : 'text-text-primary'}`}>
                    {formatTimeRemaining(auctionState.timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Team Card - Glass Panel */}
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel text-center mb-6 glass-border-animated"
              >
                <div className="w-24 h-24 mx-auto mb-4">
                  <TeamLogo
                    logoUrl={(currentItem.team as any).logoUrl}
                    teamName={currentItem.team.name}
                    shortName={(currentItem.team as any).shortName}
                    seed={currentItem.team.seed}
                    size="xl"
                    className="w-24 h-24"
                  />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-text-primary">{currentItem.team.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  {currentItem.team.seed && (
                    <span className="text-sm bg-accent-blue/10 px-2.5 py-1 rounded-lg text-text-secondary">
                      #{currentItem.team.seed}
                    </span>
                  )}
                  <span className="text-text-tertiary">{currentItem.team.region} {isWheelSpinMode ? 'Conference' : 'Region'}</span>
                </div>

                {currentItem.currentBid && (
                  <div className="mt-6 pt-6 border-t border-glass-border">
                    <p className="text-sm text-text-tertiary mb-1">Current Bid</p>
                    <p className="text-4xl font-bold text-accent-gold">
                      {formatCurrency(currentItem.currentBid)}
                    </p>
                    {currentItem.currentBidder && (
                      <p className="text-sm text-text-tertiary mt-2">
                        by <span className="text-text-primary">{currentItem.currentBidder.displayName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Matchup Brief Toggle */}
                {matchupBrief && (
                  <div className="mt-6 pt-6 border-t border-glass-border">
                    <button
                      onClick={() => setShowMatchupBrief(!showMatchupBrief)}
                      className="glass-btn text-sm mx-auto"
                    >
                      <FileText className="w-4 h-4" />
                      {showMatchupBrief ? 'Hide' : 'View'} Matchup Preview
                    </button>
                    <AnimatePresence>
                      {showMatchupBrief && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 text-left"
                        >
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {matchupBrief}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>

              {/* Bidding Controls - Glass Style */}
              <div className="space-y-4">
                {/* Quick Bids */}
                <div className="grid grid-cols-4 gap-2">
                  {quickBids.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleBid(amount)}
                      className="glass-btn py-3 font-bold"
                    >
                      {formatCurrency(amount, false)}
                    </button>
                  ))}
                </div>

                {/* Custom Bid */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Min ${formatCurrency(minBid, false)}`}
                      className="glass-input pl-10"
                      min={minBid}
                    />
                  </div>
                  <button
                    onClick={() => bidAmount && handleBid(Number(bidAmount))}
                    disabled={!bidAmount || Number(bidAmount) < minBid}
                    className="glass-btn-gold px-8"
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {auctionState.status === 'completed' ? (
                <div className="glass-panel max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-accent-gold/10 flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-accent-gold/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-text-primary">Auction Complete!</h2>
                  <p className="text-text-tertiary">
                    Total raised: <span className="text-accent-gold font-bold">{formatCurrency(auctionState.totalRaised)}</span>
                  </p>
                </div>
              ) : isWheelSpinMode && wheelSpinTeams.length >= 1 ? (
                // Show wheel with available teams (works even with 1 team)
                <div className="w-full max-w-lg mx-auto">
                  <WheelSpin
                    teams={wheelSpinTeams}
                    targetTeamId={targetTeamId}
                    isSpinning={isSpinning}
                    assignedUserName={assignedUserName}
                    onSpinComplete={handleWheelSpinComplete}
                  />
                  {!isSpinning && (
                    <div className="mt-6 text-center">
                      <p className="text-text-tertiary mb-2">
                        {wheelSpinTeams.length} {wheelSpinTeams.length === 1 ? 'team' : 'teams'} remaining
                      </p>
                      <div className="flex items-center justify-center gap-2 text-accent-gold">
                        <Sparkles className="w-5 h-5" />
                        <span className="text-sm font-medium">Wheel Spin Mode</span>
                      </div>
                      {isCommissioner && wheelSpinTeams.length >= 1 && (
                        <p className="mt-2 text-sm text-text-quaternary">
                          Click "Spin Wheel" below to select the next team
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : isWheelSpinMode && wheelTeamsLoading ? (
                <div className="glass-panel max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-accent-blue/5 flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-10 h-10 text-accent-blue animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-text-primary">Loading Teams</h2>
                  <p className="text-text-tertiary">Preparing wheel spin...</p>
                </div>
              ) : isWheelSpinMode && wheelSpinTeams.length === 0 ? (
                <div className="glass-panel max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-accent-gold/10 flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-accent-gold/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-text-primary">
                    {auctionState.status === 'not_started' ? 'Waiting for Wheel Spin' : 'All Teams Assigned!'}
                  </h2>
                  <p className="text-text-tertiary">
                    {auctionState.status === 'not_started' 
                      ? 'The commissioner will initialize the wheel spin to begin' 
                      : 'All teams have been auctioned off'
                    }
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-accent-gold">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-medium">Wheel Spin Mode</span>
                  </div>
                </div>
              ) : (
                <div className="glass-panel max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-accent-gold/10 flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-accent-gold/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-text-primary">
                    Waiting for auction to start
                  </h2>
                  <p className="text-text-tertiary">
                    The commissioner will begin shortly
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Commissioner Controls - Draggable on Desktop, FAB on Mobile */}
          {isCommissioner && auctionState && (
            <CommissionerControls
              status={auctionState.status}
              isWheelSpinMode={isWheelSpinMode}
              currentItem={currentItem}
              isSpinning={isSpinning}
              wheelSpinTeamsCount={wheelSpinTeams.length}
              onAction={handleCommissionerAction}
            />
          )}
        </div>
      </div>

      {/* Chat Sidebar - Glass Style */}
      <AnimatePresence>
        {showChat && (
          <motion.aside
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-80 glass-sidebar flex flex-col relative z-10"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-accent-blue" />
                <span className="font-semibold text-text-primary">Chat</span>
              </div>
              <div className="glass-badge">
                <Users className="w-3 h-3" />
                {pool.memberCount || 0}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-gold flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    {msg.user.displayName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm text-text-primary">{msg.user.displayName}</span>
                      <span className="text-xs text-text-quaternary">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-accent-blue/5 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-text-quaternary" />
                  </div>
                  <p className="text-text-quaternary text-sm">
                    No messages yet. Say hello!
                  </p>
                </div>
              )}
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-xs text-text-tertiary flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {typingUsers.map((u) => u.displayName).join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Chat Input - Glass Style */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-glass-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Send a message..."
                  className="glass-input flex-1 text-sm"
                />
                <button type="submit" className="glass-btn-primary p-2.5">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
