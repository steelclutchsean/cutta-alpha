import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config/index.js';

const livekitHost = config.livekit.url?.replace('wss://', 'https://') || '';

export const roomService = new RoomServiceClient(
  livekitHost,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

/**
 * Generate a token for a user to join a LiveKit room
 */
export async function generateLiveKitToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  isHost: boolean = false
): Promise<string> {
  const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: '6h', // 6 hour expiry
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isHost, // Only hosts can publish video/audio
    canSubscribe: true,
    canPublishData: true, // Everyone can send data messages
  });

  return token.toJwt();
}

/**
 * Create a LiveKit room for a pool's draft
 */
export async function createDraftRoom(poolId: string): Promise<string> {
  const roomName = `draft-${poolId}`;

  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 60 * 6, // 6 hours
      maxParticipants: 500,
    });
  } catch (error) {
    // Room might already exist, which is fine
    console.log('Room creation:', error);
  }

  return roomName;
}

/**
 * Delete a draft room
 */
export async function deleteDraftRoom(roomName: string): Promise<void> {
  try {
    await roomService.deleteRoom(roomName);
  } catch (error) {
    console.error('Error deleting room:', error);
  }
}

/**
 * Get room participants
 */
export async function getRoomParticipants(roomName: string) {
  try {
    return await roomService.listParticipants(roomName);
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
}

/**
 * Mute a participant
 */
export async function muteParticipant(
  roomName: string,
  participantIdentity: string,
  muted: boolean
): Promise<void> {
  try {
    await roomService.mutePublishedTrack(roomName, participantIdentity, 'audio', muted);
  } catch (error) {
    console.error('Error muting participant:', error);
  }
}

/**
 * Remove a participant from room
 */
export async function removeParticipant(
  roomName: string,
  participantIdentity: string
): Promise<void> {
  try {
    await roomService.removeParticipant(roomName, participantIdentity);
  } catch (error) {
    console.error('Error removing participant:', error);
  }
}

