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
import { Track, Room, RoomEvent, ConnectionState } from 'livekit-client';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  X,
  Loader2,
  Users,
} from 'lucide-react';

// Note: @livekit/components-styles is optional, component works with custom styling
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

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

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      video={isHost}
      audio={isHost}
      onConnected={() => setIsConnected(true)}
      onDisconnected={() => {
        setIsConnected(false);
        onStopLive?.();
      }}
      className="w-full h-full"
    >
      <StreamContent isHost={isHost} onGoLive={onGoLive} onStopLive={onStopLive} />
    </LiveKitRoom>
  );
}

function StreamContent({
  isHost,
  onGoLive,
  onStopLive,
}: {
  isHost: boolean;
  onGoLive?: () => void;
  onStopLive?: () => void;
}) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const room = useRoomContext();

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);

  // Find the main video track (host's camera)
  const videoTrack = tracks.find(
    (track) =>
      track.source === Track.Source.Camera &&
      track.publication?.track
  );

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
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-10 h-10 text-dark-500" />
          </div>
          <p className="text-dark-400 mb-4">Disconnected from stream</p>
          {isHost && (
            <button
              onClick={handleGoLive}
              className="glass-btn-gold"
            >
              <Radio className="w-4 h-4" />
              Reconnect & Go Live
            </button>
          )}
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

  // Show video stream (for both host preview and viewers)
  if (videoTrack) {
    return (
      <div className="relative w-full h-full">
        <VideoTrack
          trackRef={videoTrack}
          className="w-full h-full object-cover"
        />

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
          Waiting for commissioner to go live...
        </p>
      </div>
    </div>
  );
}

