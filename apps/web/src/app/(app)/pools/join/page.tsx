'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Trophy,
  Calendar,
  DollarSign,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { poolsApi } from '@/lib/api';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';

export default function JoinPoolPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const codeFromUrl = searchParams.get('code');

  const [inviteCode, setInviteCode] = useState(codeFromUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedPoolId, setJoinedPoolId] = useState<string | null>(null);

  // Auto-format invite code (uppercase, no spaces)
  const handleCodeChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    setInviteCode(formatted);
  };

  const handleJoin = async () => {
    if (!token || !inviteCode.trim()) return;

    setIsJoining(true);
    try {
      const result = await poolsApi.join(token, inviteCode.trim());
      toast.success('Successfully joined the pool!');
      setJoinedPoolId(result.poolId);
    } catch (error: any) {
      if (error.code === 'ALREADY_MEMBER') {
        toast.error('You\'re already a member of this pool');
      } else if (error.code === 'INVALID_INVITE') {
        toast.error('Invalid invite code');
      } else if (error.code === 'POOL_FULL') {
        toast.error('This pool is full');
      } else if (error.code === 'POOL_CLOSED') {
        toast.error('This pool is no longer accepting members');
      } else {
        toast.error(error.message || 'Failed to join pool');
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Success screen
  if (joinedPoolId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center"
        >
          <Check className="w-10 h-10 text-dark-900" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold mb-2"
        >
          You're In!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-dark-400 mb-8"
        >
          You've successfully joined the pool
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-3"
        >
          <button onClick={() => router.push('/pools')} className="btn-secondary">
            Back to Pools
          </button>
          <button onClick={() => router.push(`/pools/${joinedPoolId}`)} className="btn-gold">
            View Pool
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Join Pool</h1>
          <p className="text-dark-400">Enter your invite code to join</p>
        </div>
      </div>

      {/* Join Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter code (e.g., ABC12345)"
              className="input text-center text-2xl font-mono tracking-widest"
              maxLength={12}
              autoFocus
            />
            <p className="text-xs text-dark-400 mt-2 text-center">
              Get this code from the pool commissioner
            </p>
          </div>

          <button
            onClick={handleJoin}
            disabled={isJoining || inviteCode.length < 6}
            className="w-full btn-gold py-3"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Join Pool
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Info */}
      <div className="mt-8 space-y-4 text-center">
        <p className="text-sm text-dark-400">
          Don't have an invite code?{' '}
          <button
            onClick={() => router.push('/pools/discover')}
            className="text-primary-400 hover:underline"
          >
            Discover public pools
          </button>
        </p>
        <p className="text-sm text-dark-400">
          Or{' '}
          <button
            onClick={() => router.push('/pools/create')}
            className="text-primary-400 hover:underline"
          >
            create your own pool
          </button>
        </p>
      </div>
    </div>
  );
}

