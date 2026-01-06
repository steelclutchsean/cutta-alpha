'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Search, Filter, DollarSign, Users, Tag } from 'lucide-react';
import { useMarketListings } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@cutta/shared';
import toast from 'react-hot-toast';
import { marketApi } from '@/lib/api';

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
        <h1 className="text-2xl font-bold">Secondary Market</h1>
        <p className="text-dark-300">Buy and sell team ownership</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-4">
        {[
          { id: 'listings', label: 'All Listings' },
          { id: 'my-listings', label: 'My Listings' },
          { id: 'my-offers', label: 'My Offers' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as TabType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-500 text-white'
                : 'text-dark-300 hover:text-white hover:bg-dark-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          placeholder="Search by team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-dark-600 rounded w-3/4 mb-2" />
              <div className="h-3 bg-dark-600 rounded w-1/2 mb-4" />
              <div className="h-12 bg-dark-600 rounded mb-4" />
              <div className="h-10 bg-dark-600 rounded" />
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
        <div className="card text-center py-16">
          <TrendingUp className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No listings found</h3>
          <p className="text-dark-300">
            {search ? 'Try a different search term' : 'Check back later for new listings'}
          </p>
        </div>
      )}

      {/* Market Info */}
      <div className="card bg-dark-700/50">
        <h3 className="font-medium mb-2">How it works</h3>
        <ul className="text-sm text-dark-300 space-y-2">
          <li>• List your owned teams for sale at any price</li>
          <li>• Buyers can purchase immediately or make offers</li>
          <li>• 1% platform fee on all transactions</li>
          <li>• Ownership transfers instantly upon purchase</li>
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
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-gold-500/20 flex items-center justify-center">
            <span className="font-bold text-primary-400">#{team?.seed || '?'}</span>
          </div>
          <div>
            <h3 className="font-semibold">{team?.name || 'Unknown'}</h3>
            <p className="text-sm text-dark-400">{team?.region} Region</p>
          </div>
        </div>
        <span className="badge-gold">{listing.percentageForSale}%</span>
      </div>

      {/* Pool */}
      <p className="text-sm text-dark-400 mb-4">{pool?.name}</p>

      {/* Price */}
      <div className="bg-dark-800 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-dark-400">Asking Price</span>
          <span className="text-xl font-bold text-gold-400">
            {formatCurrency(askingPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-500">Original</span>
          <span className="text-dark-400">{formatCurrency(originalPrice)}</span>
        </div>
        {priceChange !== 0 && !isNaN(priceChange) && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-dark-500">Change</span>
            <span className={priceChange > 0 ? 'text-green-400' : 'text-red-400'}>
              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Seller */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-dark-900 text-xs font-bold">
            {listing.seller?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-dark-400">{listing.seller?.displayName}</span>
        </div>
        {listing.offerCount > 0 && (
          <span className="text-xs text-dark-400">{listing.offerCount} offers</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {listing.acceptingOffers && (
          <button className="btn-secondary flex-1">Make Offer</button>
        )}
        <button onClick={onBuyNow} className="btn-gold flex-1">
          Buy Now
        </button>
      </div>
    </div>
  );
}

