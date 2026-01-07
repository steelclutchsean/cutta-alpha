'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  Smile,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Radio,
  Settings,
  X,
  Loader2,
  Sparkles,
  RotateCw,
  FileText,
} from 'lucide-react';
import { usePool, useAuctionState } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { useAuctionStore } from '@/lib/store';
import { formatCurrency, formatTimeRemaining } from '@cutta/shared';
import toast from 'react-hot-toast';
import { auctionApi, livekitApi } from '@/lib/api';
import WheelSpin from '@/components/WheelSpin';

export default function DraftRoomPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;
  const { user, token } = useAuth();
  const { data: pool, mutate: mutatePool } = usePool(poolId);
  const auctionState = useAuctionState(poolId);
  const { placeBid, sendMessage } = useSocket();
  const messages = useAuctionStore((state) => state.messages);
  const typingUsers = useAuctionStore((state) => state.typingUsers);

  const [bidAmount, setBidAmount] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Streaming state
  const [isLive, setIsLive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Wheel spin state
  const [wheelSpinTeams, setWheelSpinTeams] = useState<any[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [assignedUserName, setAssignedUserName] = useState<string>('');
  const [wheelSpinState, setWheelSpinState] = useState<{ currentIndex: number; totalTeams: number; isActive: boolean } | null>(null);
  const [matchupBrief, setMatchupBrief] = useState<string | null>(null);
  const [showMatchupBrief, setShowMatchupBrief] = useState(false);

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

  // Get LiveKit token for commissioner
  useEffect(() => {
    if (isCommissioner && pool?.streamEnabled && token) {
      livekitApi.getToken(token, poolId).then((data) => {
        setLivekitToken(data.token);
      }).catch(console.error);
    }
  }, [isCommissioner, pool?.streamEnabled, token, poolId]);

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

  // Go live - start camera and microphone
  const handleGoLive = async () => {
    if (!isCommissioner || !pool?.streamEnabled) return;

    setIsConnecting(true);
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true,
      });

      localStreamRef.current = stream;
      
      // Set state first - video element will be rendered, then useEffect will connect stream
      setIsLive(true);
      setIsVideoEnabled(true);
      setIsMicEnabled(true);
      toast.success('You are now live!');
    } catch (error: any) {
      console.error('Failed to go live:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Please allow camera and microphone access to go live');
      } else if (error.name === 'NotFoundError') {
        toast.error('Camera or microphone not found');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera or microphone is already in use');
      } else {
        toast.error('Failed to start streaming: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect stream to video element when both are available
  useEffect(() => {
    if (isLive && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(err => {
        console.log('Video play handled:', err);
      });
    }
  }, [isLive]);

  // Stop live streaming
  const handleStopLive = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setIsLive(false);
    toast.success('Stream ended');
  };

  // Toggle video
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle microphone
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!pool || !auctionState) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center">
        <div className="glass-panel text-center p-8">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading draft room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col lg:flex-row">
      {/* Liquid Background */}
      <div className="liquid-bg" />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Bar - Glass Navbar */}
        <header className="glass-navbar flex items-center justify-between px-4 py-3 relative z-10">
          <div>
            <h1 className="font-bold text-white">{pool.name}</h1>
            <p className="text-sm text-dark-400">
              {auctionState.completedItems.length} / {(auctionState.completedItems.length + (auctionState.nextItems.length || 0) + (currentItem ? 1 : 0))} teams sold
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-badge-gold">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">{formatCurrency(auctionState.totalRaised)}</span>
            </div>
            {isCommissioner && (
              <button
                onClick={() => router.push(`/pools/${poolId}/settings`)}
                className="glass-btn p-2"
              >
                <Settings className="w-5 h-5" />
              </button>
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
          <div className="absolute inset-0 bg-gradient-to-b from-dark-900/50 to-transparent pointer-events-none z-10" />
          
          {isLive && isCommissioner ? (
            // Commissioner's local video preview
            <div className="relative w-full h-full">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <VideoOff className="w-10 h-10 text-dark-500" />
                    </div>
                    <p className="text-dark-400">Camera off</p>
                  </div>
                </div>
              )}
              
              {/* Live indicator - Glass Badge */}
              <div className="absolute top-4 left-4 z-20 glass-badge-live">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="font-bold">LIVE</span>
              </div>

              {/* Stream Controls - Glass Style */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 glass-panel !p-2 !rounded-full">
                <button
                  onClick={handleToggleMic}
                  className={`p-3 rounded-full transition-all ${
                    isMicEnabled 
                      ? 'bg-white/10 hover:bg-white/15' 
                      : 'bg-red-500/80 hover:bg-red-500'
                  }`}
                >
                  {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleToggleVideo}
                  className={`p-3 rounded-full transition-all ${
                    isVideoEnabled 
                      ? 'bg-white/10 hover:bg-white/15' 
                      : 'bg-red-500/80 hover:bg-red-500'
                  }`}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <div className="w-px h-6 bg-white/10" />
                <button
                  onClick={handleStopLive}
                  className="p-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : pool.streamEnabled && !isCommissioner ? (
            // Viewer sees stream placeholder
            <div className="w-full h-full bg-dark-800/50 backdrop-blur-glass flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Radio className="w-10 h-10 text-dark-500" />
                </div>
                <p className="text-dark-400">
                  {isLive ? 'Stream loading...' : 'Waiting for commissioner to go live...'}
                </p>
              </div>
            </div>
          ) : isCommissioner && pool.streamEnabled ? (
            // Commissioner can go live
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center shadow-glass-glow">
                <Video className="w-12 h-12 text-primary-400" />
              </div>
              <p className="text-dark-400 mb-6">Go live to broadcast to your pool</p>
              <button
                onClick={handleGoLive}
                disabled={isConnecting}
                className="glass-btn-gold"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    Go Live
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-dark-600" />
              </div>
              <p className="text-dark-400 mb-4">No stream active</p>
              {isCommissioner && !pool.streamEnabled && (
                <button
                  onClick={() => router.push(`/pools/${poolId}/settings`)}
                  className="glass-btn text-sm"
                >
                  Enable Streaming
                </button>
              )}
            </div>
          )}

          {/* Stream controls for viewers */}
          {!isCommissioner && pool.streamEnabled && (
            <div className="absolute bottom-4 right-4 z-20">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="glass-btn p-2"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
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
                  <Timer className={`w-6 h-6 ${auctionState.timeRemaining <= 5 ? 'text-red-400' : 'text-primary-400'}`} />
                  <span className={`text-4xl font-mono font-bold ${auctionState.timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>
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
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center shadow-glass">
                  <span className="text-4xl font-bold text-white">
                    #{currentItem.team.seed}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-2 text-white">{currentItem.team.name}</h2>
                <p className="text-dark-400">{currentItem.team.region} {isWheelSpinMode ? 'Conference' : 'Region'}</p>

                {currentItem.currentBid && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-sm text-dark-400 mb-1">Current Bid</p>
                    <p className="text-4xl font-bold text-gold-400">
                      {formatCurrency(currentItem.currentBid)}
                    </p>
                    {currentItem.currentBidder && (
                      <p className="text-sm text-dark-400 mt-2">
                        by <span className="text-white">{currentItem.currentBidder.displayName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Matchup Brief Toggle */}
                {matchupBrief && (
                  <div className="mt-6 pt-6 border-t border-white/5">
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
                          <p className="text-sm text-dark-300 leading-relaxed">
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
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
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
              <div className="glass-panel max-w-md">
                <div className="w-20 h-20 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-gold-500/50" />
                </div>
                {auctionState.status === 'completed' ? (
                  <>
                    <h2 className="text-2xl font-bold mb-2 text-white">Auction Complete!</h2>
                    <p className="text-dark-400">
                      Total raised: <span className="text-gold-400 font-bold">{formatCurrency(auctionState.totalRaised)}</span>
                    </p>
                  </>
                ) : isWheelSpinMode && isSpinning ? (
                  // Show wheel spin animation
                  <div className="w-full">
                    <WheelSpin
                      teams={wheelSpinTeams}
                      targetTeamId={targetTeamId}
                      isSpinning={isSpinning}
                      assignedUserName={assignedUserName}
                      onSpinComplete={handleWheelSpinComplete}
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-2 text-white">
                      {isWheelSpinMode ? 'Waiting for wheel spin' : 'Waiting for auction to start'}
                    </h2>
                    <p className="text-dark-400">
                      {isWheelSpinMode 
                        ? 'The commissioner will spin the wheel to assign teams' 
                        : 'The commissioner will begin shortly'
                      }
                    </p>
                    {isWheelSpinMode && (
                      <div className="mt-4 flex items-center gap-2 text-gold-400">
                        <Sparkles className="w-5 h-5" />
                        <span className="text-sm font-medium">Wheel Spin Mode</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Commissioner Controls - Glass Style */}
          {isCommissioner && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 glass-panel !p-2 !rounded-2xl flex gap-2">
              {auctionState.status === 'not_started' && !isWheelSpinMode && (
                <button
                  onClick={() => handleCommissionerAction('start')}
                  className="glass-btn-gold"
                >
                  <Play className="w-4 h-4" />
                  Start Auction
                </button>
              )}
              {auctionState.status === 'not_started' && isWheelSpinMode && (
                <button
                  onClick={() => handleCommissionerAction('wheel-init')}
                  className="glass-btn-gold"
                >
                  <Sparkles className="w-4 h-4" />
                  Initialize Wheel Spin
                </button>
              )}
              {auctionState.status === 'in_progress' && isWheelSpinMode && !currentItem && !isSpinning && (
                <button
                  onClick={() => handleCommissionerAction('wheel-spin')}
                  className="glass-btn-gold"
                >
                  <RotateCw className="w-4 h-4" />
                  Spin Wheel
                </button>
              )}
              {auctionState.status === 'in_progress' && currentItem && (
                <>
                  <button
                    onClick={() => handleCommissionerAction('pause')}
                    className="glass-btn"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCommissionerAction('next')}
                    className="glass-btn-primary"
                  >
                    <SkipForward className="w-4 h-4" />
                    {isWheelSpinMode ? 'Next Spin' : 'Next Team'}
                  </button>
                </>
              )}
            </div>
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary-400" />
                <span className="font-semibold text-white">Chat</span>
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-gold-500 flex-shrink-0 flex items-center justify-center text-dark-900 text-sm font-bold">
                    {msg.user.displayName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm text-white">{msg.user.displayName}</span>
                      <span className="text-xs text-dark-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-dark-300 text-sm break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-dark-500" />
                  </div>
                  <p className="text-dark-500 text-sm">
                    No messages yet. Say hello!
                  </p>
                </div>
              )}
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-xs text-dark-400 flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {typingUsers.map((u) => u.displayName).join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Chat Input - Glass Style */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
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
