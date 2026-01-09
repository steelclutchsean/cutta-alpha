'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
  useTracks,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  X,
  Loader2,
  Users,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

interface StudioVideoPreviewProps {
  token: string | null;
  onViewerCountChange?: (count: number) => void;
}

export default function StudioVideoPreview({
  token,
  onViewerCountChange,
}: StudioVideoPreviewProps) {
  // If LiveKit URL is not configured, show local preview fallback
  if (!LIVEKIT_URL) {
    return <LocalCameraPreview onViewerCountChange={onViewerCountChange} />;
  }

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50 rounded-2xl">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Radio className="w-10 h-10 text-dark-500" />
          </div>
          <p className="text-dark-400">Loading stream token...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      video={true}
      audio={true}
      className="w-full h-full rounded-2xl overflow-hidden"
      onError={(error) => {
        console.error('LiveKit error:', error);
      }}
    >
      <StudioStreamContent onViewerCountChange={onViewerCountChange} />
    </LiveKitRoom>
  );
}

// Local camera preview fallback when LiveKit isn't configured
function LocalCameraPreview({
  onViewerCountChange,
}: {
  onViewerCountChange?: (count: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start camera preview
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLive(true);
      onViewerCountChange?.(0);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError(err.message || 'Failed to access camera');
    }
  }, [onViewerCountChange]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLive(false);
  }, []);

  // Toggle video track
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle audio track
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-red-400 mb-2 font-medium">Camera Error</p>
          <p className="text-dark-400 mb-4 text-sm max-w-xs">{error}</p>
          <button
            onClick={startCamera}
            className="glass-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not live yet - show start button
  if (!isLive) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center shadow-glass-glow">
            <Video className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Camera Preview</h3>
          <p className="text-dark-400 mb-2 max-w-xs mx-auto">
            Start your camera to preview your video before going live
          </p>
          <p className="text-yellow-500 text-xs mb-4">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            LiveKit not configured - using local preview
          </p>
          <button
            onClick={startCamera}
            className="glass-btn-gold px-8 py-3 text-lg"
          >
            <Video className="w-5 h-5" />
            Start Camera
          </button>
        </div>
      </div>
    );
  }

  // Live - show video preview
  return (
    <div className="relative w-full h-full bg-dark-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
      />
      
      {!isVideoEnabled && (
        <div className="w-full h-full flex items-center justify-center bg-dark-800">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-400">Camera is off</p>
          </div>
        </div>
      )}

      {/* Preview indicator */}
      <div className="absolute top-4 left-4 z-20 glass-badge bg-yellow-500/20 border-yellow-500/30">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <span className="font-bold text-yellow-400">PREVIEW</span>
      </div>

      {/* Info badge */}
      <div className="absolute top-4 right-4 z-20 glass-badge">
        <Users className="w-3 h-3" />
        <span>Local only</span>
      </div>

      {/* Stream controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 glass-panel !p-2 !rounded-full">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-all ${
            isMicEnabled
              ? 'bg-white/10 hover:bg-white/15'
              : 'bg-red-500/80 hover:bg-red-500'
          }`}
          title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-all ${
            isVideoEnabled
              ? 'bg-white/10 hover:bg-white/15'
              : 'bg-red-500/80 hover:bg-red-500'
          }`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </button>
        <div className="w-px h-6 bg-white/10" />
        <button
          onClick={stopCamera}
          className="p-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-all"
          title="Stop camera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function StudioStreamContent({
  onViewerCountChange,
}: {
  onViewerCountChange?: (count: number) => void;
}) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const room = useRoomContext();

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Find local video track
  const videoTrack = tracks.find(
    (track) =>
      track.source === Track.Source.Camera &&
      track.participant.isLocal &&
      track.publication?.track
  );

  // Update viewer count periodically
  useEffect(() => {
    if (!room || !onViewerCountChange) return;

    const updateViewerCount = () => {
      // Subtract 1 for the host
      const viewerCount = Math.max(0, room.numParticipants - 1);
      onViewerCountChange(viewerCount);
    };

    updateViewerCount();
    const interval = setInterval(updateViewerCount, 5000);

    room.on('participantConnected', updateViewerCount);
    room.on('participantDisconnected', updateViewerCount);

    return () => {
      clearInterval(interval);
      room.off('participantConnected', updateViewerCount);
      room.off('participantDisconnected', updateViewerCount);
    };
  }, [room, onViewerCountChange]);

  // Handle connection errors
  useEffect(() => {
    if (connectionState === ConnectionState.Disconnected && hasPublished) {
      setConnectionError('Lost connection to streaming server');
    }
  }, [connectionState, hasPublished]);

  // Handle going live
  const handleGoLive = useCallback(async () => {
    if (!room) return;

    try {
      setConnectionError(null);
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      setHasPublished(true);
      setIsVideoEnabled(true);
      setIsMicEnabled(true);
    } catch (error: any) {
      console.error('Failed to go live:', error);
      setConnectionError(error.message || 'Failed to start streaming');
    }
  }, [room]);

  // Reconnect handler - attempts to re-enable publishing
  const handleReconnect = useCallback(async () => {
    if (!room) return;
    try {
      setConnectionError(null);
      // If already connected, just re-enable publishing
      if (room.state === ConnectionState.Connected && hasPublished) {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
      } else {
        // If disconnected, show message - LiveKitRoom handles reconnection automatically
        setConnectionError('Connection lost. Please refresh the page if the issue persists.');
      }
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to reconnect');
    }
  }, [room, hasPublished]);

  // Toggle video
  const handleToggleVideo = useCallback(async () => {
    if (!room) return;
    const newState = !isVideoEnabled;
    await room.localParticipant.setCameraEnabled(newState);
    setIsVideoEnabled(newState);
  }, [room, isVideoEnabled]);

  // Toggle microphone
  const handleToggleMic = useCallback(async () => {
    if (!room) return;
    const newState = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsMicEnabled(newState);
  }, [room, isMicEnabled]);

  // Stop streaming
  const handleStopLive = useCallback(async () => {
    if (!room) return;
    await room.localParticipant.setCameraEnabled(false);
    await room.localParticipant.setMicrophoneEnabled(false);
    setHasPublished(false);
  }, [room]);

  // Connection states
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
          </div>
          <p className="text-dark-400">Connecting to streaming server...</p>
        </div>
      </div>
    );
  }

  if (connectionState === ConnectionState.Disconnected || connectionError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-red-400 font-medium mb-2">Connection Failed</p>
          <p className="text-dark-400 mb-4 text-sm max-w-xs">
            {connectionError || 'Unable to connect to the streaming server. Check your LiveKit configuration.'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleReconnect}
              className="glass-btn-gold"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not yet live
  if (!hasPublished) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center shadow-glass-glow">
            <Video className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Go Live</h3>
          <p className="text-dark-400 mb-6 max-w-xs mx-auto">
            Start broadcasting your camera and audio to all viewers in the draft room
          </p>
          <button
            onClick={handleGoLive}
            className="glass-btn-gold px-8 py-3 text-lg"
          >
            <Radio className="w-5 h-5" />
            Go Live
          </button>
        </div>
      </div>
    );
  }

  // Live - show video preview
  return (
    <div className="relative w-full h-full bg-dark-900">
      {videoTrack ? (
        <VideoTrack
          trackRef={videoTrack}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-dark-800">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-400">Camera is off</p>
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div className="absolute top-4 left-4 z-20 glass-badge-live">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="font-bold">LIVE</span>
      </div>

      {/* Viewer count */}
      <div className="absolute top-4 right-4 z-20 glass-badge">
        <Users className="w-3 h-3" />
        <span>{room?.numParticipants || 1} watching</span>
      </div>

      {/* Stream controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 glass-panel !p-2 !rounded-full">
        <button
          onClick={handleToggleMic}
          className={`p-3 rounded-full transition-all ${
            isMicEnabled
              ? 'bg-white/10 hover:bg-white/15'
              : 'bg-red-500/80 hover:bg-red-500'
          }`}
          title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
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
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
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
          title="End stream"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
