'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Trophy,
  DollarSign,
  AlertCircle,
  Check,
  GripVertical,
  Copy,
  Share2,
  Store,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  Users,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { usePool } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';
import { poolsApi, livekitApi } from '@/lib/api';

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
  id?: string;
  name: string;
  description?: string;
  percentage: number;
  trigger: PayoutTrigger;
  triggerValue?: string;
  order: number;
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

type SettingsTab = 'general' | 'payouts' | 'streaming';

export default function PoolSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;
  const { user, getValidToken } = useAuth();
  const { data: pool, mutate } = usePool(poolId);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [payoutRules, setPayoutRules] = useState<PayoutRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Pool settings state
  const [secondaryMarketEnabled, setSecondaryMarketEnabled] = useState(true);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [isTogglingStream, setIsTogglingStream] = useState(false);

  useEffect(() => {
    if (pool?.payoutRules) {
      setPayoutRules(pool.payoutRules.map((rule: any, index: number) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        percentage: Number(rule.percentage),
        trigger: rule.trigger,
        triggerValue: rule.triggerValue,
        order: rule.order || index + 1,
      })));
    }
    if (pool) {
      setSecondaryMarketEnabled(pool.secondaryMarketEnabled ?? true);
      setStreamEnabled(pool.streamEnabled ?? false);
    }
  }, [pool]);

  const isCommissioner = pool?.commissionerId === user?.id;
  const totalPercentage = payoutRules.reduce((sum, rule) => sum + rule.percentage, 0);
  const isPayoutValid = Math.abs(totalPercentage - 100) < 0.01;

  const addRule = () => {
    const newRule: PayoutRule = {
      name: '',
      percentage: 0,
      trigger: 'CUSTOM',
      order: payoutRules.length + 1,
    };
    setPayoutRules([...payoutRules, newRule]);
    setHasChanges(true);
  };

  const updateRule = (index: number, updates: Partial<PayoutRule>) => {
    const updated = [...payoutRules];
    updated[index] = { ...updated[index], ...updates };
    setPayoutRules(updated);
    setHasChanges(true);
  };

  const removeRule = (index: number) => {
    setPayoutRules(payoutRules.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSavePayouts = async () => {
    if (!isPayoutValid) return;

    setIsLoading(true);
    try {
      const token = await getValidToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      const rulesData = payoutRules.map((rule) => ({
        name: rule.name,
        description: rule.description,
        percentage: rule.percentage,
        trigger: rule.trigger,
        triggerValue: rule.triggerValue,
      }));
      await poolsApi.updatePayoutRules(token, poolId, rulesData);
      toast.success('Payout rules saved!');
      setHasChanges(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setIsLoading(true);
    try {
      const token = await getValidToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      await poolsApi.update(token, poolId, {
        secondaryMarketEnabled,
      });
      toast.success('Settings saved!');
      setHasChanges(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStream = async () => {
    setIsTogglingStream(true);
    try {
      const token = await getValidToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      if (streamEnabled) {
        await livekitApi.disableStreaming(token, poolId);
        setStreamEnabled(false);
        toast.success('Streaming disabled');
      } else {
        await livekitApi.enableStreaming(token, poolId);
        setStreamEnabled(true);
        toast.success('Streaming enabled! You can now go live in the draft room.');
      }
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle streaming');
    } finally {
      setIsTogglingStream(false);
    }
  };

  const handleCopyInvite = (type: 'code' | 'link') => {
    const textToCopy = type === 'code' ? pool?.inviteCode : pool?.inviteLink;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(type === 'code' ? 'Invite code copied!' : 'Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (pool?.inviteLink && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${pool.name}`,
          text: `Join my Calcutta auction pool: ${pool.name}`,
          url: pool.inviteLink,
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopyInvite('link');
      }
    } else {
      handleCopyInvite('link');
    }
  };

  if (!pool) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading pool settings...</p>
        </div>
      </div>
    );
  }

  if (!isCommissioner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="glass-panel">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-dark-400 mb-6">Only the commissioner can edit pool settings.</p>
          <button onClick={() => router.back()} className="glass-btn">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl glass-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Pool Settings</h1>
            <p className="text-dark-400">{pool.name}</p>
          </div>
        </div>
      </div>

      {/* Pool Overview */}
      <div className="glass-panel mb-8">
        <h2 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-4">Pool Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-dark-500 mb-1">Total Pot</p>
            <p className="text-2xl font-bold text-gold-400">
              {formatCurrency(pool.totalPot || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Buy-in</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(pool.buyIn)}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Members</p>
            <p className="text-2xl font-bold text-white">{pool.memberCount || pool.members?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Status</p>
            <span className="glass-badge-primary capitalize">{pool.status?.toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Tabs - Glass Style */}
      <div className="glass-card p-2 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'general' as SettingsTab, label: 'General', icon: Users },
            { key: 'payouts' as SettingsTab, label: 'Payouts', icon: DollarSign },
            { key: 'streaming' as SettingsTab, label: 'Streaming', icon: Video },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`glass-tab ${activeTab === tab.key ? 'active' : ''} flex items-center gap-2 whitespace-nowrap`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* General Tab */}
        {activeTab === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Invite Section - Prominent Glass Panel */}
            <div className="glass-panel glass-border-animated">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Invite Members</h2>
                  <p className="text-sm text-dark-400">Share the invite link or code</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Invite Link */}
                <div>
                  <label className="text-xs text-dark-400 mb-2 block uppercase tracking-wider">Invite Link</label>
                  <div className="glass-card">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 font-mono text-sm text-primary-300 truncate">
                        {pool.inviteLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/pools/join?code=${pool.inviteCode}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCopyInvite('link')}
                      className="flex-1 glass-btn-primary"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 glass-btn"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>

                <div className="glass-divider" />

                {/* Invite Code */}
                <div>
                  <label className="text-xs text-dark-400 mb-2 block uppercase tracking-wider">Invite Code</label>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-bold tracking-[0.3em] text-gold-400">
                      {pool.inviteCode}
                    </span>
                    <button
                      onClick={() => handleCopyInvite('code')}
                      className="glass-btn"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Market */}
            <div className="glass-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Secondary Market</h3>
                    <p className="text-sm text-dark-400">Allow trading team ownership after the auction</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSecondaryMarketEnabled(!secondaryMarketEnabled);
                    setHasChanges(true);
                  }}
                  className={`glass-toggle ${secondaryMarketEnabled ? 'active' : ''}`}
                >
                  <div className="glass-toggle-thumb" />
                </button>
              </div>
              
              {hasChanges && activeTab === 'general' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-white/5"
                >
                  <button
                    onClick={handleSaveGeneral}
                    disabled={isLoading}
                    className="glass-btn-gold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <motion.div
            key="payouts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="glass-panel">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Payout Structure</h2>
                  <p className="text-sm text-dark-400">
                    Customize how the pool pot is distributed
                  </p>
                </div>
                <div className={`glass-badge ${
                  isPayoutValid ? 'glass-badge-success' : 'bg-red-500/20 border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {isPayoutValid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="font-mono font-bold">{totalPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="glass-card mb-6">
                <p className="text-sm text-dark-400 mb-3">Quick Templates:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setPayoutRules([
                        { name: 'Champion', percentage: 50, trigger: 'CHAMPIONSHIP_WIN', order: 1 },
                        { name: 'Runner-up', percentage: 25, trigger: 'CHAMPIONSHIP_WIN', triggerValue: 'runner_up', order: 2 },
                        { name: 'Final Four (each)', percentage: 12.5, trigger: 'FINAL_FOUR', order: 3 },
                      ]);
                      setHasChanges(true);
                    }}
                    className="glass-btn text-sm"
                  >
                    <Sparkles className="w-3 h-3 text-gold-400" />
                    Standard (50/25/12.5)
                  </button>
                  <button
                    onClick={() => {
                      setPayoutRules([
                        { name: 'Champion', percentage: 40, trigger: 'CHAMPIONSHIP_WIN', order: 1 },
                        { name: 'Runner-up', percentage: 20, trigger: 'CHAMPIONSHIP_WIN', triggerValue: 'runner_up', order: 2 },
                        { name: 'Final Four (each)', percentage: 10, trigger: 'FINAL_FOUR', order: 3 },
                        { name: 'Elite Eight (each)', percentage: 5, trigger: 'ELITE_EIGHT', order: 4 },
                      ]);
                      setHasChanges(true);
                    }}
                    className="glass-btn text-sm"
                  >
                    <Sparkles className="w-3 h-3 text-gold-400" />
                    Deep Payouts
                  </button>
                  <button
                    onClick={() => {
                      setPayoutRules([
                        { name: 'Champion', percentage: 100, trigger: 'CHAMPIONSHIP_WIN', order: 1 },
                      ]);
                      setHasChanges(true);
                    }}
                    className="glass-btn text-sm"
                  >
                    <Sparkles className="w-3 h-3 text-gold-400" />
                    Winner Takes All
                  </button>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-3 mb-6">
                <AnimatePresence mode="popLayout">
                  {payoutRules.map((rule, index) => (
                    <motion.div
                      key={rule.id || index}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="glass-card"
                    >
                      <div className="flex items-start gap-4">
                        <div className="pt-2 text-dark-500 cursor-grab hover:text-dark-300 transition-colors">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-dark-500">Payout</p>
                            <p className="font-mono font-bold text-gold-400">
                              {formatCurrency((pool.totalPot || 0) * (rule.percentage / 100))}
                            </p>
                          </div>
                          <button
                            onClick={() => removeRule(index)}
                            className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {rule.trigger === 'CUSTOM' && (
                        <div className="mt-4 ml-9">
                          <label className="text-xs text-dark-400 mb-1 block">Description (optional)</label>
                          <input
                            type="text"
                            value={rule.description || ''}
                            onChange={(e) => updateRule(index, { description: e.target.value })}
                            placeholder="Describe when this payout is triggered"
                            className="glass-input w-full text-sm"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {payoutRules.length === 0 && (
                  <div className="text-center py-12 text-dark-400">
                    <div className="w-16 h-16 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-gold-500/50" />
                    </div>
                    <p className="font-medium">No payout rules configured</p>
                    <p className="text-sm text-dark-500">Add rules to define how the pot is distributed</p>
                  </div>
                )}
              </div>

              <button
                onClick={addRule}
                className="w-full py-4 border border-dashed border-white/10 rounded-xl text-dark-400 hover:border-primary-500/50 hover:text-primary-400 hover:bg-primary-500/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Payout Rule
              </button>

              {hasChanges && activeTab === 'payouts' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between"
                >
                  <span className="text-sm text-gold-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                    Unsaved changes
                  </span>
                  <button
                    onClick={handleSavePayouts}
                    disabled={!isPayoutValid || isLoading}
                    className="glass-btn-gold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Streaming Tab */}
        {activeTab === 'streaming' && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="glass-panel">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${streamEnabled ? 'bg-red-500/20' : 'bg-white/5'}`}>
                  <Radio className={`w-6 h-6 ${streamEnabled ? 'text-red-400' : 'text-dark-400'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Live Streaming</h2>
                  <p className="text-sm text-dark-400">Go live with camera & microphone during the draft</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Stream Toggle */}
                <div className="glass-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">Enable Streaming</h3>
                      <p className="text-sm text-dark-400">
                        {streamEnabled 
                          ? 'Streaming is enabled. Go to the draft room to start broadcasting.'
                          : 'Enable streaming to broadcast live during the draft.'
                        }
                      </p>
                    </div>
                    <button
                      onClick={handleToggleStream}
                      disabled={isTogglingStream}
                      className={`glass-toggle ${streamEnabled ? 'active !bg-red-500/40 !border-red-500/50' : ''}`}
                    >
                      {isTogglingStream ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        </div>
                      ) : (
                        <div className={`glass-toggle-thumb ${streamEnabled ? '!bg-red-400' : ''}`} />
                      )}
                    </button>
                  </div>
                </div>

                {streamEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    {/* Stream Info */}
                    <div className="glass-card">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                        <Video className="w-4 h-4 text-primary-400" />
                        How to Go Live
                      </h3>
                      <ol className="space-y-3">
                        {[
                          'Go to the draft room when ready',
                          'Click the "Go Live" button to start your camera & microphone',
                          'Pool members will see your stream in the draft room',
                          'You can mute/unmute or toggle video anytime',
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-dark-300">
                            <span className="w-6 h-6 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xs flex-shrink-0">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Quick Access to Draft */}
                    <button
                      onClick={() => router.push(`/pools/${poolId}/draft`)}
                      className="w-full glass-btn-gold"
                    >
                      <Video className="w-4 h-4" />
                      Go to Draft Room
                    </button>
                  </motion.div>
                )}

                {!streamEnabled && (
                  <div className="glass-card text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <VideoOff className="w-8 h-8 text-dark-500" />
                    </div>
                    <p className="text-dark-400">
                      Enable streaming to broadcast live during your pool's draft auction
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
