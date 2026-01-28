'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react';
import { Track, Room, RoomEvent, ConnectionState, RoomOptions } from 'livekit-client';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  X,
  Loader2,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// Note: @livekit/components-styles is optional, component works with custom styling
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

interface LiveStreamProps {
  token: string | null;
  isHost: boolean;
  onGoLive?: () => void;
  onStopLive?: () => void;
  streamEnabled: boolean;
}

export default function LiveStream({
  token,
  isHost,
  onGoLive,
  onStopLive,
  streamEnabled,
}: LiveStreamProps) {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check for missing LiveKit URL
  if (!LIVEKIT_URL) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-red-400 font-medium mb-2">Streaming not configured</p>
          <p className="text-dark-400 text-sm">LiveKit URL is missing</p>
        </div>
      </div>
    );
  }

  if (!streamEnabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Video className="w-10 h-10 text-dark-600" />
          </div>
          <p className="text-dark-400">Streaming not enabled</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Radio className="w-10 h-10 text-dark-500" />
          </div>
          <p className="text-dark-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    setConnectionError(null);
    setRetryCount(prev => prev + 1);
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[LiveStream] Props:', { 
      hasToken: !!token, 
      isHost, 
      streamEnabled,
      livekitUrl: LIVEKIT_URL,
      retryCount
    });
  }

  // Room options optimized for Docker local development
  const roomOptions: RoomOptions = {
    // Disable adaptive stream and dynacast for simpler connections
    adaptiveStream: false,
    dynacast: false,
    // Shorter timeouts for faster feedback
    disconnectOnPageLeave: false,
    stopLocalTrackOnUnpublish: true,
  };

  return (
    <LiveKitRoom
      key={retryCount} // Force reconnect on retry
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      video={isHost}
      audio={isHost}
      options={roomOptions}
      onError={(error) => {
        console.error('LiveKit connection error:', error);
        setConnectionError(error?.message || 'Connection failed');
      }}
      onDisconnected={() => {
        console.log('[LiveStream] Disconnected');
        onStopLive?.();
      }}
      onConnected={() => {
        console.log('[LiveStream] Connected successfully');
      }}
      className="w-full h-full"
    >
      <StreamContent 
        isHost={isHost} 
        onGoLive={onGoLive} 
        onStopLive={onStopLive}
        connectionError={connectionError}
        onRetry={handleRetry}
      />
    </LiveKitRoom>
  );
}

function StreamContent({
  isHost,
  onGoLive,
  onStopLive,
  connectionError,
  onRetry,
}: {
  isHost: boolean;
  onGoLive?: () => void;
  onStopLive?: () => void;
  connectionError?: string | null;
  onRetry?: () => void;
}) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.Microphone],
    { onlySubscribed: false } // Include unsubscribed tracks so viewers can see host's track
  );
  const room = useRoomContext();

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);

  // For viewers: find the host's remote camera track
  // For hosts: find their own local camera track
  const videoTrack = tracks.find((track) => {
    if (track.source !== Track.Source.Camera) return false;
    
    // Check if track publication exists
    if (!track.publication) return false;
    
    if (isHost) {
      // Host sees their own camera (local participant)
      return track.participant?.identity === localParticipant?.identity;
    } else {
      // Viewers see remote tracks (not their own - they don't publish anyway)
      return track.participant?.identity !== localParticipant?.identity;
    }
  });

  // Auto-subscribe to remote video tracks for viewers
  useEffect(() => {
    if (isHost || !room) return;
    
    // Subscribe to all remote video tracks
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.kind === Track.Kind.Video && !pub.isSubscribed) {
          pub.setSubscribed(true);
        }
      });
    });

    // Listen for new tracks being published
    const handleTrackPublished = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.kind === Track.Kind.Video && !pub.isSubscribed) {
            pub.setSubscribed(true);
          }
        });
      });
    };

    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.ParticipantConnected, handleTrackPublished);

    return () => {
      room.off(RoomEvent.TrackPublished, handleTrackPublished);
      room.off(RoomEvent.ParticipantConnected, handleTrackPublished);
    };
  }, [room, isHost]);

  // Handle going live - publish tracks
  const handleGoLive = useCallback(async () => {
    if (!room || !isHost) return;

    try {
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      setHasPublished(true);
      setIsVideoEnabled(true);
      setIsMicEnabled(true);
      onGoLive?.();
    } catch (error) {
      console.error('Failed to go live:', error);
    }
  }, [room, isHost, onGoLive]);

  // Toggle video
  const handleToggleVideo = useCallback(async () => {
    if (!room || !isHost) return;
    const newState = !isVideoEnabled;
    await room.localParticipant.setCameraEnabled(newState);
    setIsVideoEnabled(newState);
  }, [room, isHost, isVideoEnabled]);

  // Toggle microphone
  const handleToggleMic = useCallback(async () => {
    if (!room || !isHost) return;
    const newState = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsMicEnabled(newState);
  }, [room, isHost, isMicEnabled]);

  // Stop streaming
  const handleStopLive = useCallback(async () => {
    if (!room || !isHost) return;
    await room.localParticipant.setCameraEnabled(false);
    await room.localParticipant.setMicrophoneEnabled(false);
    setHasPublished(false);
    onStopLive?.();
  }, [room, isHost, onStopLive]);

  // Connection states
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50 backdrop-blur-glass">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
          </div>
          <p className="text-dark-400">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  if (connectionState === ConnectionState.Disconnected) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-red-400 font-medium mb-2">
            {connectionError || 'Disconnected from stream'}
          </p>
          <p className="text-dark-400 text-sm mb-4">
            {connectionError 
              ? 'Check your connection and try again' 
              : 'The connection was lost'}
          </p>
          <button
            onClick={onRetry}
            className="glass-btn flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Host view - can go live
  if (isHost && !hasPublished) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center shadow-glass-glow">
            <Video className="w-12 h-12 text-primary-400" />
          </div>
          <p className="text-dark-400 mb-6">Go live to broadcast to your pool</p>
          <button
            onClick={handleGoLive}
            className="glass-btn-gold"
          >
            <Radio className="w-4 h-4" />
            Go Live
          </button>
        </div>
      </div>
    );
  }

  // Check if any remote camera track exists (for viewers to know host is live)
  const hasRemoteCameraTrack = !isHost && tracks.some(
    (track) => 
      track.source === Track.Source.Camera && 
      track.participant?.identity !== localParticipant?.identity &&
      track.publication
  );

  // Show video stream (for both host preview and viewers)
  if (videoTrack && videoTrack.publication) {
    const isSubscribing = !isHost && !videoTrack.publication.track;
    
    return (
      <div className="relative w-full h-full">
        {/* Always render VideoTrack - it handles subscription internally */}
        <VideoTrack
          trackRef={videoTrack}
          className="w-full h-full object-cover"
        />
        
        {/* Show loading overlay while subscribing to remote track */}
        {isSubscribing && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-dark-800/80 backdrop-blur-glass z-10">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
              </div>
              <p className="text-dark-400">Connecting to stream...</p>
            </div>
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-4 left-4 z-20 glass-badge-live">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="font-bold">LIVE</span>
        </div>

        {/* Participant count */}
        <div className="absolute top-4 right-4 z-20 glass-badge">
          <Users className="w-3 h-3" />
          <span>{room?.numParticipants || 1}</span>
        </div>

        {/* Host controls */}
        {isHost && hasPublished && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 glass-panel !p-2 !rounded-full">
            <button
              onClick={handleToggleMic}
              className={`p-3 rounded-full transition-all ${
                isMicEnabled
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-red-500/80 hover:bg-red-500'
              }`}
            >
              {isMicEnabled ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleToggleVideo}
              className={`p-3 rounded-full transition-all ${
                isVideoEnabled
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-red-500/80 hover:bg-red-500'
              }`}
            >
              {isVideoEnabled ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>
            <div className="w-px h-6 bg-white/10" />
            <button
              onClick={handleStopLive}
              className="p-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Viewer waiting for stream
  return (
    <div className="w-full h-full flex items-center justify-center bg-dark-800/50 backdrop-blur-glass">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Radio className="w-10 h-10 text-dark-500" />
        </div>
        <p className="text-dark-400">
          {hasRemoteCameraTrack 
            ? 'Stream found, connecting...' 
            : 'Waiting for commissioner to go live...'}
        </p>
      </div>
    </div>
  );
}

