'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Trophy,
  Users,
  Calendar,
  DollarSign,
  Store,
  Settings,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  GripVertical,
  Copy,
  ExternalLink,
  Sparkles,
  Share2,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTournaments } from '@/lib/hooks';
import { poolsApi } from '@/lib/api';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';

type Step = 'basics' | 'tournament' | 'settings' | 'payouts' | 'review';

type PayoutTrigger =
  | 'CHAMPIONSHIP_WIN'
  | 'FINAL_FOUR'
  | 'ELITE_EIGHT'
  | 'SWEET_SIXTEEN'
  | 'ROUND_OF_32'
  | 'ROUND_OF_64'
  | 'FIRST_FOUR'
  | 'UPSET_BONUS'
  | 'HIGHEST_SEED_WIN'
  | 'CUSTOM';

interface PayoutRule {
  name: string;
  description?: string;
  percentage: number;
  trigger: PayoutTrigger;
  triggerValue?: string;
}

const TRIGGER_OPTIONS: { value: PayoutTrigger; label: string; description: string }[] = [
  { value: 'CHAMPIONSHIP_WIN', label: 'National Champion', description: 'Team wins the championship' },
  { value: 'FINAL_FOUR', label: 'Final Four', description: 'Team reaches Final Four' },
  { value: 'ELITE_EIGHT', label: 'Elite Eight', description: 'Team reaches Elite Eight' },
  { value: 'SWEET_SIXTEEN', label: 'Sweet Sixteen', description: 'Team reaches Sweet 16' },
  { value: 'ROUND_OF_32', label: 'Round of 32', description: 'Team wins first round' },
  { value: 'ROUND_OF_64', label: 'Round of 64', description: 'First Four winner' },
  { value: 'UPSET_BONUS', label: 'Upset Bonus', description: 'Lower seed beats higher seed' },
  { value: 'HIGHEST_SEED_WIN', label: 'Highest Seed Win', description: 'Highest remaining seed' },
  { value: 'CUSTOM', label: 'Custom', description: 'Custom payout rule' },
];

const PAYOUT_TEMPLATES = [
  {
    name: 'Standard (50/25/12.5)',
    rules: [
      { name: 'Champion', percentage: 50, trigger: 'CHAMPIONSHIP_WIN' as PayoutTrigger },
      { name: 'Runner-up', percentage: 25, trigger: 'CHAMPIONSHIP_WIN' as PayoutTrigger, triggerValue: 'runner_up' },
      { name: 'Final Four (each)', percentage: 12.5, trigger: 'FINAL_FOUR' as PayoutTrigger },
    ],
  },
  {
    name: 'Deep Payouts',
    rules: [
      { name: 'Champion', percentage: 40, trigger: 'CHAMPIONSHIP_WIN' as PayoutTrigger },
      { name: 'Runner-up', percentage: 20, trigger: 'CHAMPIONSHIP_WIN' as PayoutTrigger, triggerValue: 'runner_up' },
      { name: 'Final Four (each)', percentage: 10, trigger: 'FINAL_FOUR' as PayoutTrigger },
      { name: 'Elite Eight (each)', percentage: 5, trigger: 'ELITE_EIGHT' as PayoutTrigger },
    ],
  },
  {
    name: 'Winner Takes All',
    rules: [
      { name: 'Champion', percentage: 100, trigger: 'CHAMPIONSHIP_WIN' as PayoutTrigger },
    ],
  },
];

const STEPS: { key: Step; label: string; icon: typeof Trophy }[] = [
  { key: 'basics', label: 'Pool Details', icon: Trophy },
  { key: 'tournament', label: 'Tournament', icon: Calendar },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'payouts', label: 'Payouts', icon: DollarSign },
  { key: 'review', label: 'Review', icon: Check },
];

export default function CreatePoolPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();

  const [step, setStep] = useState<Step>('basics');
  const [isLoading, setIsLoading] = useState(false);
  const [createdPool, setCreatedPool] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [buyIn, setBuyIn] = useState(100);
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null);
  const [auctionDate, setAuctionDate] = useState('');
  const [auctionTime, setAuctionTime] = useState('19:00');
  const [secondaryMarketEnabled, setSecondaryMarketEnabled] = useState(true);
  const [payoutRules, setPayoutRules] = useState<PayoutRule[]>(PAYOUT_TEMPLATES[0].rules);

  const selectedTournament = tournaments?.find((t: any) => t.id === tournamentId);
  const totalPercentage = payoutRules.reduce((sum, rule) => sum + rule.percentage, 0);
  const isPayoutValid = Math.abs(totalPercentage - 100) < 0.01;

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return name.length >= 3;
      case 'tournament':
        return !!tournamentId;
      case 'settings':
        return buyIn >= 0 && auctionDate && auctionTime;
      case 'payouts':
        return isPayoutValid && payoutRules.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].key);
    }
  };

  const goBack = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const auctionStartTime = new Date(`${auctionDate}T${auctionTime}`).toISOString();

      const pool = await poolsApi.create(token, {
        name,
        description: description || undefined,
        tournamentId,
        buyIn,
        maxParticipants: maxParticipants || undefined,
        auctionStartTime,
        secondaryMarketEnabled,
        payoutRules,
      });

      setCreatedPool(pool);
      toast.success('Pool created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create pool');
    } finally {
      setIsLoading(false);
    }
  };

  const addRule = () => {
    setPayoutRules([...payoutRules, { name: '', percentage: 0, trigger: 'CUSTOM' }]);
  };

  const updateRule = (index: number, updates: Partial<PayoutRule>) => {
    const updated = [...payoutRules];
    updated[index] = { ...updated[index], ...updates };
    setPayoutRules(updated);
  };

  const removeRule = (index: number) => {
    setPayoutRules(payoutRules.filter((_, i) => i !== index));
  };

  const copyInviteLink = () => {
    if (createdPool?.inviteLink) {
      navigator.clipboard.writeText(createdPool.inviteLink);
      toast.success('Invite link copied!');
    }
  };

  const handleShare = async () => {
    if (createdPool?.inviteLink && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${createdPool.name}`,
          text: `Join my Calcutta auction pool: ${createdPool.name}`,
          url: createdPool.inviteLink,
        });
      } catch (error) {
        copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
  };

  // Success screen with liquid glass styling
  if (createdPool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shadow-glass-glow"
          >
            <Check className="w-12 h-12 text-dark-900" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-3 gradient-text"
          >
            Pool Created!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-dark-300 text-lg"
          >
            Share the invite link with your friends to get started
          </motion.p>
        </div>

        {/* Invite Link Card - Prominent Glass Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel mb-6 glass-border-animated"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Invite Link</h2>
              <p className="text-sm text-dark-400">Share this link to invite members</p>
            </div>
          </div>

          {/* Link Display */}
          <div className="glass-card mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono text-sm text-primary-300 truncate">
                {createdPool.inviteLink}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button onClick={copyInviteLink} className="flex-1 glass-btn-primary">
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button onClick={handleShare} className="flex-1 glass-btn">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

          {/* Invite Code */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-sm text-dark-400 mb-2">Or share the invite code:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-[0.3em] text-gold-400">
                {createdPool.inviteCode}
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(createdPool.inviteCode);
                  toast.success('Code copied!');
                }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Copy className="w-4 h-4 text-dark-400" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Pool Summary */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card mb-6"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gold-400">{formatCurrency(buyIn)}</p>
              <p className="text-xs text-dark-400">Buy-in</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{selectedTournament?.teams?.length || 0}</p>
              <p className="text-xs text-dark-400">Teams</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{payoutRules.length}</p>
              <p className="text-xs text-dark-400">Payouts</p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3"
        >
          <button onClick={() => router.push('/pools')} className="flex-1 glass-btn">
            <ArrowLeft className="w-4 h-4" />
            Back to Pools
          </button>
          <button onClick={() => router.push(`/pools/${createdPool.id}`)} className="flex-1 glass-btn-gold">
            View Pool
            <ExternalLink className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl glass-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create Pool</h1>
          <p className="text-dark-400">Set up your Calcutta auction pool</p>
        </div>
      </div>

      {/* Progress Steps - Glass Style */}
      <div className="glass-card mb-8 p-2">
        <div className="flex items-center justify-between overflow-x-auto">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isPast = index < stepIndex;

            return (
              <button
                key={s.key}
                onClick={() => index <= stepIndex && setStep(s.key)}
                disabled={index > stepIndex}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : isPast
                    ? 'text-primary-400 cursor-pointer hover:bg-white/5'
                    : 'text-dark-500 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-primary-500 text-dark-900 shadow-glass-glow'
                    : isPast
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-white/5 text-dark-400'
                }`}>
                  {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="hidden sm:inline font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="glass-panel"
        >
          {/* Step 1: Basics */}
          {step === 'basics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Pool Details</h2>
                <p className="text-dark-400">Give your pool a name and description</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-dark-200">Pool Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., March Madness 2025"
                  className="glass-input"
                  maxLength={100}
                />
                <p className="text-xs text-dark-500 mt-2">{name.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-dark-200">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell participants what this pool is about..."
                  rows={3}
                  className="glass-input resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-dark-500 mt-2">{description.length}/500 characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Tournament */}
          {step === 'tournament' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Select Tournament</h2>
                <p className="text-dark-400">Choose the tournament for your pool</p>
              </div>

              {tournamentsLoading ? (
                <div className="grid gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 glass-card animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  {tournaments?.map((tournament: any) => (
                    <button
                      key={tournament.id}
                      onClick={() => setTournamentId(tournament.id)}
                      className={`p-4 rounded-xl transition-all text-left ${
                        tournamentId === tournament.id
                          ? 'bg-primary-500/15 border border-primary-500/40 shadow-glass-glow'
                          : 'glass-card-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{tournament.name} {tournament.year}</h3>
                          <p className="text-sm text-dark-400">
                            {tournament.sport?.replace('_', ' ')} • {tournament.teams?.length || 0} teams
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          tournamentId === tournament.id
                            ? 'bg-primary-500 shadow-glass-glow'
                            : 'bg-white/5 border border-white/10'
                        }`}>
                          {tournamentId === tournament.id && (
                            <Check className="w-4 h-4 text-dark-900" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Pool Settings</h2>
                <p className="text-dark-400">Configure buy-in and auction timing</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-dark-200">Buy-in Amount *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="number"
                      value={buyIn}
                      onChange={(e) => setBuyIn(Number(e.target.value))}
                      min={0}
                      className="glass-input pl-10"
                    />
                  </div>
                  <p className="text-xs text-dark-500 mt-2">Entry fee for participants</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-dark-200">Max Participants</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="number"
                      value={maxParticipants || ''}
                      onChange={(e) => setMaxParticipants(e.target.value ? Number(e.target.value) : null)}
                      placeholder="Unlimited"
                      min={2}
                      max={1000}
                      className="glass-input pl-10"
                    />
                  </div>
                  <p className="text-xs text-dark-500 mt-2">Leave blank for no limit</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-dark-200">Auction Date *</label>
                  <input
                    type="date"
                    value={auctionDate}
                    onChange={(e) => setAuctionDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-dark-200">Auction Time *</label>
                  <input
                    type="time"
                    value={auctionTime}
                    onChange={(e) => setAuctionTime(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="glass-divider" />

              <div className="glass-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Secondary Market</h3>
                      <p className="text-sm text-dark-400">Allow trading team ownership after the auction</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSecondaryMarketEnabled(!secondaryMarketEnabled)}
                    className={`glass-toggle ${secondaryMarketEnabled ? 'active' : ''}`}
                  >
                    <div className="glass-toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payouts */}
          {step === 'payouts' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">Payout Structure</h2>
                  <p className="text-dark-400">Define how winnings are distributed</p>
                </div>
                <div className={`glass-badge ${
                  isPayoutValid ? 'glass-badge-success' : ''
                } ${!isPayoutValid ? 'bg-red-500/20 border-red-500/30 text-red-400' : ''}`}>
                  <div className="flex items-center gap-2">
                    {isPayoutValid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="font-mono font-bold">{totalPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Templates */}
              <div className="glass-card">
                <p className="text-sm text-dark-400 mb-3">Quick Templates:</p>
                <div className="flex flex-wrap gap-2">
                  {PAYOUT_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => setPayoutRules(template.rules)}
                      className="glass-btn text-sm"
                    >
                      <Sparkles className="w-3 h-3 text-gold-400" />
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {payoutRules.map((rule, index) => (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="glass-card"
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-2 text-dark-500 cursor-grab hover:text-dark-300 transition-colors">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-dark-400 mb-1 block">Name</label>
                            <input
                              type="text"
                              value={rule.name}
                              onChange={(e) => updateRule(index, { name: e.target.value })}
                              placeholder="e.g., Champion"
                              className="glass-input w-full text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-dark-400 mb-1 block">Trigger</label>
                            <select
                              value={rule.trigger}
                              onChange={(e) => {
                                const trigger = e.target.value as PayoutTrigger;
                                const option = TRIGGER_OPTIONS.find(o => o.value === trigger);
                                updateRule(index, { 
                                  trigger,
                                  name: rule.name || option?.label || '',
                                });
                              }}
                              className="glass-select w-full text-sm"
                            >
                              {TRIGGER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-dark-400 mb-1 block">Percentage</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={rule.percentage}
                                onChange={(e) => updateRule(index, { percentage: Number(e.target.value) })}
                                min={0}
                                max={100}
                                step={0.5}
                                className="glass-input w-full pr-8 text-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">%</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeRule(index)}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={addRule}
                className="w-full py-4 border border-dashed border-white/10 rounded-xl text-dark-400 hover:border-primary-500/50 hover:text-primary-400 hover:bg-primary-500/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Payout Rule
              </button>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Review & Create</h2>
                <p className="text-dark-400">Confirm your pool settings before creating</p>
              </div>

              <div className="grid gap-4">
                {/* Basic Info */}
                <div className="glass-card">
                  <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-4">Pool Details</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-dark-500 mb-1">Name</p>
                      <p className="font-semibold text-white">{name}</p>
                    </div>
                    {description && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-dark-500 mb-1">Description</p>
                        <p className="text-sm text-dark-300">{description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tournament */}
                <div className="glass-card">
                  <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-4">Tournament</h3>
                  <p className="font-semibold text-white">{selectedTournament?.name} {selectedTournament?.year}</p>
                  <p className="text-sm text-dark-400">{selectedTournament?.teams?.length || 0} teams</p>
                </div>

                {/* Settings */}
                <div className="glass-card">
                  <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-4">Settings</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-dark-500 mb-1">Buy-in</p>
                      <p className="font-bold text-2xl text-gold-400">{formatCurrency(buyIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500 mb-1">Max Participants</p>
                      <p className="font-semibold text-white">{maxParticipants || 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500 mb-1">Auction Date/Time</p>
                      <p className="font-semibold text-white">
                        {new Date(`${auctionDate}T${auctionTime}`).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500 mb-1">Secondary Market</p>
                      <span className={`glass-badge ${secondaryMarketEnabled ? 'glass-badge-success' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                        {secondaryMarketEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payouts */}
                <div className="glass-card">
                  <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-4">Payout Structure</h3>
                  <div className="space-y-3">
                    {payoutRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-white">{rule.name}</span>
                        <span className="font-mono font-bold text-gold-400">{rule.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={goBack}
          disabled={stepIndex === 0}
          className="glass-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step === 'review' ? (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="glass-btn-gold"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Create Pool
              </>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="glass-btn-primary"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

