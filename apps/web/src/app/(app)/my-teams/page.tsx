'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  DollarSign,
  Tag,
  Percent,
  AlertCircle,
  Check,
  X,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';
import { usersApi, marketApi } from '@/lib/api';
import TeamLogo from '@/components/TeamLogo';

interface Ownership {
  id: string;
  userId: string;
  auctionItemId: string;
  percentage: number;
  purchasePrice: number;
  source: string;
  acquiredAt: string;
  availablePercentage: number;
  listedPercentage: number;
  auctionItem: {
    id: string;
    team: {
      id: string;
      name: string;
      shortName: string;
      seed: number;
      region: string;
      isEliminated: boolean;
    };
    pool: {
      id: string;
      name: string;
      status: string;
    };
  };
  listings: {
    id: string;
    percentageForSale: number;
    askingPrice: number;
    status: string;
  }[];
}

interface ListingFormData {
  ownershipId: string;
  percentageForSale: number;
  askingPrice: number;
  acceptingOffers: boolean;
}

export default function MyTeamsPage() {
  const { token } = useAuth();
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOwnership, setSelectedOwnership] = useState<Ownership | null>(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingForm, setListingForm] = useState<ListingFormData>({
    ownershipId: '',
    percentageForSale: 100,
    askingPrice: 0,
    acceptingOffers: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      loadOwnerships();
    }
  }, [token]);

  const loadOwnerships = async () => {
    if (!token) return;
    try {
      const data = await usersApi.getOwnerships(token);
      setOwnerships(data);
      // Auto-expand all pools
      const poolIds = new Set(data.map((o: Ownership) => o.auctionItem.pool.id));
      setExpandedPools(poolIds);
    } catch (error: any) {
      toast.error('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenListingModal = (ownership: Ownership) => {
    if (ownership.auctionItem.team.isEliminated) {
      toast.error('Cannot list eliminated teams');
      return;
    }
    if (ownership.availablePercentage <= 0) {
      toast.error('No available ownership to list');
      return;
    }
    setSelectedOwnership(ownership);
    setListingForm({
      ownershipId: ownership.id,
      percentageForSale: Math.min(ownership.availablePercentage, 100),
      askingPrice: Math.round(Number(ownership.purchasePrice) * (ownership.availablePercentage / 100) * 1.2),
      acceptingOffers: true,
    });
    setShowListingModal(true);
  };

  const handleCreateListing = async () => {
    if (!token || !selectedOwnership) return;

    if (listingForm.percentageForSale <= 0 || listingForm.percentageForSale > selectedOwnership.availablePercentage) {
      toast.error(`You can only list up to ${selectedOwnership.availablePercentage}%`);
      return;
    }

    if (listingForm.askingPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      await marketApi.createListing(token, listingForm);
      toast.success('Team listed on market!');
      setShowListingModal(false);
      loadOwnerships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!token) return;
    try {
      await marketApi.cancelListing(token, listingId);
      toast.success('Listing cancelled');
      loadOwnerships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel listing');
    }
  };

  const togglePool = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  // Group ownerships by pool
  const ownershipsByPool = ownerships.reduce((acc, ownership) => {
    const poolId = ownership.auctionItem.pool.id;
    if (!acc[poolId]) {
      acc[poolId] = {
        pool: ownership.auctionItem.pool,
        ownerships: [],
      };
    }
    acc[poolId].ownerships.push(ownership);
    return acc;
  }, {} as Record<string, { pool: Ownership['auctionItem']['pool']; ownerships: Ownership[] }>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-dark-400">Loading your teams...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Teams</h1>
        <p className="text-dark-400">
          Manage your team ownership and list shares on the secondary market
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-dark-400">Total Teams</p>
          <p className="text-2xl font-bold">{ownerships.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Active Teams</p>
          <p className="text-2xl font-bold text-green-400">
            {ownerships.filter(o => !o.auctionItem.team.isEliminated).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Total Invested</p>
          <p className="text-2xl font-bold text-gold-400">
            {formatCurrency(ownerships.reduce((sum, o) => sum + Number(o.purchasePrice), 0))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Active Listings</p>
          <p className="text-2xl font-bold text-primary-400">
            {ownerships.reduce((sum, o) => sum + o.listings.length, 0)}
          </p>
        </div>
      </div>

      {/* Teams by Pool */}
      {Object.keys(ownershipsByPool).length === 0 ? (
        <div className="card text-center py-12">
          <Trophy className="w-16 h-16 text-gold-400/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Teams Yet</h2>
          <p className="text-text-secondary">
            Join a pool and win some auctions to start building your portfolio!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(ownershipsByPool).map(({ pool, ownerships: poolOwnerships }) => (
            <div key={pool.id} className="card">
              {/* Pool Header */}
              <button
                onClick={() => togglePool(pool.id)}
                className="w-full flex items-center justify-between p-4 -m-4 hover:bg-dark-700/30 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-gold-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-bold">{pool.name}</h2>
                    <p className="text-sm text-dark-400">
                      {poolOwnerships.length} team{poolOwnerships.length !== 1 ? 's' : ''} • 
                      {poolOwnerships.filter(o => !o.auctionItem.team.isEliminated).length} active
                    </p>
                  </div>
                </div>
                {expandedPools.has(pool.id) ? (
                  <ChevronUp className="w-5 h-5 text-primary-400/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary-400/60" />
                )}
              </button>

              {/* Pool Teams */}
              <AnimatePresence>
                {expandedPools.has(pool.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-dark-700 grid gap-4">
                      {poolOwnerships
                        .sort((a, b) => {
                          // Active teams first, then by seed
                          if (a.auctionItem.team.isEliminated !== b.auctionItem.team.isEliminated) {
                            return a.auctionItem.team.isEliminated ? 1 : -1;
                          }
                          return a.auctionItem.team.seed - b.auctionItem.team.seed;
                        })
                        .map((ownership) => (
                          <div
                            key={ownership.id}
                            className={`p-4 rounded-xl border ${
                              ownership.auctionItem.team.isEliminated
                                ? 'bg-dark-800/30 border-dark-700 opacity-60'
                                : 'bg-dark-700/30 border-dark-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Team Logo */}
                                <TeamLogo
                                  logoUrl={(ownership.auctionItem.team as any).logoUrl}
                                  teamName={ownership.auctionItem.team.name}
                                  shortName={ownership.auctionItem.team.shortName}
                                  seed={ownership.auctionItem.team.seed}
                                  size="lg"
                                />

                                {/* Team Info */}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold">{ownership.auctionItem.team.name}</h3>
                                    <span className="text-xs text-dark-400 bg-dark-600 px-1.5 py-0.5 rounded">
                                      #{ownership.auctionItem.team.seed}
                                    </span>
                                    {ownership.auctionItem.team.isEliminated && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                                        Eliminated
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-dark-400">
                                    {ownership.auctionItem.team.region} Region
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                {/* Ownership Details */}
                                <div className="text-right">
                                  <p className="text-sm text-dark-400">Ownership</p>
                                  <p className="font-bold">{Number(ownership.percentage)}%</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-dark-400">Paid</p>
                                  <p className="font-bold text-gold-400">
                                    {formatCurrency(ownership.purchasePrice)}
                                  </p>
                                </div>

                                {/* Listing Status / Action */}
                                {ownership.listings.length > 0 ? (
                                  <div className="text-right">
                                    <p className="text-sm text-dark-400">Listed</p>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-primary-400">
                                        {ownership.listedPercentage}%
                                      </span>
                                      <button
                                        onClick={() => handleCancelListing(ownership.listings[0].id)}
                                        className="p-1 text-dark-400 hover:text-red-400 transition-colors"
                                        title="Cancel listing"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleOpenListingModal(ownership)}
                                    disabled={ownership.auctionItem.team.isEliminated || ownership.availablePercentage <= 0}
                                    className="btn-primary py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Tag className="w-4 h-4" />
                                    List
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Active Listings */}
                            {ownership.listings.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-dark-600">
                                <p className="text-sm text-dark-400 mb-2">Active Listings</p>
                                <div className="space-y-2">
                                  {ownership.listings.map((listing) => (
                                    <div
                                      key={listing.id}
                                      className="flex items-center justify-between bg-dark-800/50 rounded-lg p-3"
                                    >
                                      <div className="flex items-center gap-4">
                                        <Percent className="w-4 h-4 text-dark-400" />
                                        <span>{Number(listing.percentageForSale)}% for sale</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="font-bold text-gold-400">
                                          {formatCurrency(listing.askingPrice)}
                                        </span>
                                        <button
                                          onClick={() => handleCancelListing(listing.id)}
                                          className="text-dark-400 hover:text-red-400 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Listing Modal */}
      <AnimatePresence>
        {showListingModal && selectedOwnership && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowListingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-dark-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-6">List Team for Sale</h2>

              {/* Team Preview */}
              <div className="bg-dark-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gold-500/20 to-primary-500/20 flex items-center justify-center text-xl font-bold">
                    #{selectedOwnership.auctionItem.team.seed}
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedOwnership.auctionItem.team.name}</h3>
                    <p className="text-sm text-dark-400">
                      {selectedOwnership.auctionItem.team.region} Region • 
                      You own {Number(selectedOwnership.percentage)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Percentage */}
                <div>
                  <label className="text-sm text-dark-400 mb-2 block">
                    Percentage to Sell
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={listingForm.percentageForSale}
                      onChange={(e) => setListingForm({
                        ...listingForm,
                        percentageForSale: Number(e.target.value),
                      })}
                      min={1}
                      max={selectedOwnership.availablePercentage}
                      className="input w-full pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400">%</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-dark-400">
                      Available: {selectedOwnership.availablePercentage}%
                    </p>
                    <div className="flex gap-2">
                      {[25, 50, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setListingForm({
                            ...listingForm,
                            percentageForSale: Math.min(pct, selectedOwnership.availablePercentage),
                          })}
                          className="px-2 py-1 text-xs bg-dark-700 rounded hover:bg-dark-600 transition-colors"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm text-text-tertiary mb-2 block">
                    Asking Price
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400/60" />
                    <input
                      type="number"
                      value={listingForm.askingPrice}
                      onChange={(e) => setListingForm({
                        ...listingForm,
                        askingPrice: Number(e.target.value),
                      })}
                      min={1}
                      step={1}
                      className="input w-full pl-10"
                    />
                  </div>
                  <p className="text-xs text-dark-400 mt-2">
                    Original price: {formatCurrency(Number(selectedOwnership.purchasePrice) * (listingForm.percentageForSale / 100))} for {listingForm.percentageForSale}%
                  </p>
                </div>

                {/* Accept Offers */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Accept Offers</p>
                    <p className="text-sm text-dark-400">Allow buyers to make offers below asking price</p>
                  </div>
                  <button
                    onClick={() => setListingForm({
                      ...listingForm,
                      acceptingOffers: !listingForm.acceptingOffers,
                    })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      listingForm.acceptingOffers ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      listingForm.acceptingOffers ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Platform Fee Notice */}
                <div className="bg-dark-700/30 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-dark-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-dark-400">
                    <p>A 1% platform fee will be deducted from the sale.</p>
                    <p className="text-dark-300 mt-1">
                      You'll receive: {formatCurrency(listingForm.askingPrice * 0.99)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowListingModal(false)}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateListing}
                  className="btn-gold flex-1"
                  disabled={isSubmitting || listingForm.percentageForSale <= 0 || listingForm.askingPrice <= 0}
                >
                  {isSubmitting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <Tag className="w-4 h-4" />
                      List for Sale
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

