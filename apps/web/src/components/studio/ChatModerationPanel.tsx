'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  VolumeX,
  Volume2,
  Trash2,
  AlertTriangle,
  Ban,
  User,
  Send,
  Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  user: {
    displayName: string;
    avatarUrl: string | null;
  };
  content: string;
  createdAt: Date | string;
  isDeleted?: boolean;
}

interface MutedUser {
  id: string;
  displayName: string;
  mutedUntil?: Date | null;
}

interface ChatModerationPanelProps {
  messages: ChatMessage[];
  mutedUsers: MutedUser[];
  onMuteUser: (userId: string, duration?: number) => Promise<void>;
  onUnmuteUser: (userId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export default function ChatModerationPanel({
  messages,
  mutedUsers,
  onMuteUser,
  onUnmuteUser,
  onDeleteMessage,
  onSendMessage,
  isLoading = false,
}: ChatModerationPanelProps) {
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showMuteDuration, setShowMuteDuration] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMuteUser = useCallback(async (userId: string, duration?: number) => {
    setActioningId(`mute-${userId}`);
    try {
      await onMuteUser(userId, duration);
      setShowMuteDuration(null);
    } finally {
      setActioningId(null);
    }
  }, [onMuteUser]);

  const handleUnmuteUser = useCallback(async (userId: string) => {
    setActioningId(`unmute-${userId}`);
    try {
      await onUnmuteUser(userId);
    } finally {
      setActioningId(null);
    }
  }, [onUnmuteUser]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setActioningId(`delete-${messageId}`);
    try {
      await onDeleteMessage(messageId);
    } finally {
      setActioningId(null);
    }
  }, [onDeleteMessage]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  }, [messageInput, onSendMessage]);

  const isUserMuted = useCallback((userId: string) => {
    return mutedUsers.some(u => u.id === userId);
  }, [mutedUsers]);

  // Filter out deleted messages for display (but keep track of them)
  const visibleMessages = messages.filter(m => !m.isDeleted);

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Chat Moderation
        </h3>
        {mutedUsers.length > 0 && (
          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
            {mutedUsers.length} muted
          </span>
        )}
      </div>

      {/* Muted Users Bar */}
      {mutedUsers.length > 0 && (
        <div className="mb-3 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-xs text-red-400 mb-2 font-medium">Muted Users:</p>
          <div className="flex flex-wrap gap-2">
            {mutedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1.5 bg-red-500/20 rounded-full px-2 py-1"
              >
                <VolumeX className="w-3 h-3 text-red-400" />
                <span className="text-xs text-white">{user.displayName}</span>
                <button
                  onClick={() => handleUnmuteUser(user.id)}
                  disabled={actioningId === `unmute-${user.id}`}
                  className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-red-400 hover:text-green-400"
                  title="Unmute user"
                >
                  {actioningId === `unmute-${user.id}` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
        {visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 text-dark-500 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleMessages.map((message) => {
              const isMuted = isUserMuted(message.userId);
              
              return (
                <motion.div
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group p-2 rounded-lg hover:bg-white/5 transition-colors ${
                    isMuted ? 'opacity-50' : ''
                  }`}
                >
                  {/* Mute Duration Selector */}
                  {showMuteDuration === message.userId ? (
                    <div className="flex flex-col gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <p className="text-xs text-red-400 font-medium">
                        Mute {message.user.displayName}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: '5 min', value: 5 },
                          { label: '15 min', value: 15 },
                          { label: '1 hour', value: 60 },
                          { label: 'Permanent', value: undefined },
                        ].map((option) => (
                          <button
                            key={option.label}
                            onClick={() => handleMuteUser(message.userId, option.value)}
                            disabled={actioningId?.startsWith('mute-')}
                            className="text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                          >
                            {option.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowMuteDuration(null)}
                          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-dark-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex-shrink-0 flex items-center justify-center text-dark-900 text-xs font-bold">
                        {message.user.displayName[0].toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white truncate">
                            {message.user.displayName}
                          </span>
                          {isMuted && (
                            <VolumeX className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-xs text-dark-500">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-dark-300 text-sm break-words">
                          {message.content}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isMuted && (
                          <button
                            onClick={() => setShowMuteDuration(message.userId)}
                            disabled={isLoading || actioningId !== null}
                            className="p-1 rounded hover:bg-red-500/20 text-dark-400 hover:text-red-400"
                            title="Mute user"
                          >
                            <VolumeX className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={isLoading || actioningId !== null}
                          className="p-1 rounded hover:bg-red-500/20 text-dark-400 hover:text-red-400"
                          title="Delete message"
                        >
                          {actioningId === `delete-${message.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Message as Commissioner */}
      <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Send announcement..."
            className="glass-input flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="glass-btn-primary p-2.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}


