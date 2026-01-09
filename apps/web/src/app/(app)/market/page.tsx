'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Search, Filter, DollarSign, Users, Tag, ShoppingCart, MessageSquare } from 'lucide-react';
import { useMarketListings } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';
import { marketApi } from '@/lib/api';
import TeamLogo from '@/components/TeamLogo';

type TabType = 'listings' | 'my-listings' | 'my-offers';

export default function MarketPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<TabType>('listings');
  const [search, setSearch] = useState('');
  const { data: listings, isLoading, mutate } = useMarketListings();

  const filteredListings = listings?.filter((listing: any) => {
    const teamName = listing.ownership?.auctionItem?.team?.name || '';
    return teamName.toLowerCase().includes(search.toLowerCase());
  }) || [];

  const handleBuyNow = async (listingId: string, price: number) => {
    if (!token) return;
    
    if (!confirm(`Confirm purchase for ${formatCurrency(price)}?`)) return;

    try {
      await marketApi.buyNow(token, listingId);
      toast.success('Purchase successful!');
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Secondary Market</h1>
        <p className="text-[rgb(var(--text-secondary))]">Buy and sell team ownership</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'listings', label: 'All Listings' },
          { id: 'my-listings', label: 'My Listings' },
          { id: 'my-offers', label: 'My Offers' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as TabType)}
            className={`glass-tab ${tab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-tertiary))]" />
        <input
          type="text"
          placeholder="Search by team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input pl-12"
        />
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2 mb-4" />
              <div className="h-12 bg-white/5 rounded mb-4" />
              <div className="h-10 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : filteredListings.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((listing: any, index: number) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ListingCard
                listing={listing}
                onBuyNow={() => handleBuyNow(listing.id, Number(listing.askingPrice))}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-panel text-center py-16">
          <TrendingUp className="w-12 h-12 text-[rgb(var(--text-quaternary))] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] mb-2">No listings found</h3>
          <p className="text-[rgb(var(--text-secondary))]">
            {search ? 'Try a different search term' : 'Check back later for new listings'}
          </p>
        </div>
      )}

      {/* Market Info */}
      <div className="glass-card">
        <h3 className="font-semibold text-[rgb(var(--text-primary))] mb-3">How it works</h3>
        <ul className="text-sm text-[rgb(var(--text-secondary))] space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--accent-blue))]">•</span>
            List your owned teams for sale at any price
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--accent-blue))]">•</span>
            Buyers can purchase immediately or make offers
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--accent-blue))]">•</span>
            1% platform fee on all transactions
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--accent-blue))]">•</span>
            Ownership transfers instantly upon purchase
          </li>
        </ul>
      </div>
    </div>
  );
}

function ListingCard({ listing, onBuyNow }: { listing: any; onBuyNow: () => void }) {
  const team = listing.ownership?.auctionItem?.team;
  const pool = listing.ownership?.auctionItem?.pool;
  const originalPrice = Number(listing.ownership?.purchasePrice || 0);
  const askingPrice = Number(listing.askingPrice);
  const priceChange = ((askingPrice - originalPrice) / originalPrice) * 100;

  return (
    <div className="glass-card-hover group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <TeamLogo
            logoUrl={team?.logoUrl}
            teamName={team?.name || 'Unknown'}
            shortName={team?.shortName}
            seed={team?.seed}
            size="lg"
          />
          <div>
            <h3 className="font-semibold text-[rgb(var(--text-primary))]">{team?.name || 'Unknown'}</h3>
            <p className="text-sm text-[rgb(var(--text-tertiary))]">{team?.region} Region</p>
          </div>
        </div>
        <span className="glass-badge-gold">{listing.percentageForSale}%</span>
      </div>

      {/* Pool */}
      <p className="text-sm text-[rgb(var(--text-secondary))] mb-4">
        {pool?.tournament?.name} {pool?.tournament?.year} - {pool?.name}
      </p>

      {/* Price */}
      <div className="rounded-xl p-4 mb-4 bg-[rgba(var(--accent-gold),0.08)] border border-[rgba(var(--accent-gold),0.15)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[rgb(var(--text-secondary))]">Asking Price</span>
          <span className="text-xl font-bold text-[rgb(var(--accent-gold))]">
            {formatCurrency(askingPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgb(var(--text-tertiary))]">Original</span>
          <span className="text-[rgb(var(--text-secondary))]">{formatCurrency(originalPrice)}</span>
        </div>
        {priceChange !== 0 && !isNaN(priceChange) && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-[rgb(var(--text-tertiary))]">Change</span>
            <span className={priceChange > 0 ? 'text-[rgb(var(--accent-green))]' : 'text-[rgb(var(--accent-red))]'}>
              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Seller */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[rgb(var(--accent-blue))] to-[rgb(var(--accent-gold))] flex items-center justify-center text-white text-xs font-bold">
            {listing.seller?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-[rgb(var(--text-secondary))]">{listing.seller?.displayName}</span>
        </div>
        {listing.offerCount > 0 && (
          <span className="text-xs text-[rgb(var(--text-tertiary))]">{listing.offerCount} offers</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {listing.acceptingOffers && (
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="glass-btn flex-1 group/btn overflow-hidden relative"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
            <MessageSquare className="w-4 h-4" />
            <span>Make Offer</span>
          </motion.button>
        )}
        <motion.button 
          onClick={onBuyNow} 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 relative inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-emerald-500/30 overflow-hidden group/btn"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
          <ShoppingCart className="w-4 h-4 relative" />
          <span className="relative">Buy Now</span>
        </motion.button>
      </div>
    </div>
  );
}
