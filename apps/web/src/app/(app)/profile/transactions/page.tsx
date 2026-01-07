'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Trophy,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTransactionAnalytics, useTransactions } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';

type FilterType = 'ALL' | 'AUCTION_PURCHASE' | 'SECONDARY_PURCHASE' | 'PAYOUT' | 'DEPOSIT' | 'WITHDRAWAL';
type DateRange = '7d' | '30d' | '90d' | 'all';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [showFilters, setShowFilters] = useState(false);

  const { data: analytics, isLoading: analyticsLoading } = useTransactionAnalytics();
  
  const dateParams = useMemo(() => {
    if (dateRange === 'all') return {};
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { startDate: startDate.toISOString() };
  }, [dateRange]);

  const { data: transactionsData, isLoading: txLoading } = useTransactions({
    type: filterType === 'ALL' ? undefined : filterType,
    ...dateParams,
    limit: 100,
  });

  const transactions = transactionsData?.transactions || [];

  const handleExportCSV = () => {
    if (!transactions.length) return;

    const headers = ['Date', 'Type', 'Amount', 'Status', 'Team', 'Pool'];
    const rows = transactions.map((tx: any) => [
      new Date(tx.createdAt).toLocaleDateString(),
      tx.type,
      tx.amount,
      tx.status,
      tx.listing?.ownership?.auctionItem?.team?.name || '',
      tx.listing?.ownership?.auctionItem?.pool?.name || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="glass-btn p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Transaction History</h1>
            <p className="text-dark-300">Track your buys, sells, and winnings</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Spent"
          value={formatCurrency(analytics?.summary?.totalSpent || 0)}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="red"
          loading={analyticsLoading}
        />
        <SummaryCard
          label="Total Earned"
          value={formatCurrency(analytics?.summary?.totalEarned || 0)}
          icon={<ArrowDownLeft className="w-5 h-5" />}
          color="green"
          loading={analyticsLoading}
        />
        <SummaryCard
          label="Winnings"
          value={formatCurrency(analytics?.summary?.totalWinnings || 0)}
          icon={<Trophy className="w-5 h-5" />}
          color="gold"
          loading={analyticsLoading}
        />
        <SummaryCard
          label="Net P&L"
          value={formatCurrency(analytics?.summary?.netPnL || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color={(analytics?.summary?.netPnL || 0) >= 0 ? 'green' : 'red'}
          loading={analyticsLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
        >
          <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
          {analyticsLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analytics?.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
            <TrendChart data={analytics.monthlyTrends} />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-dark-400">
              No data available
            </div>
          )}
        </motion.div>

        {/* Breakdown by Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
        >
          <h3 className="text-lg font-semibold mb-4">Transaction Breakdown</h3>
          {analyticsLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analytics?.byType && analytics.byType.length > 0 ? (
            <BreakdownChart data={analytics.byType} />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-dark-400">
              No data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Pool Performance */}
      {analytics?.byPool && analytics.byPool.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
        >
          <h3 className="text-lg font-semibold mb-4">Performance by Pool</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Pool</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Spent</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Earned</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Winnings</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Net</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byPool.map((pool: any) => {
                  const net = pool.earned + pool.winnings - pool.spent;
                  return (
                    <tr key={pool.poolId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 font-medium">{pool.poolName}</td>
                      <td className="py-3 px-4 text-right text-red-400">
                        -{formatCurrency(pool.spent)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-400">
                        +{formatCurrency(pool.earned)}
                      </td>
                      <td className="py-3 px-4 text-right text-gold-400">
                        +{formatCurrency(pool.winnings)}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        net >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {net >= 0 ? '+' : ''}{formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel"
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">All Transactions</h3>
            <p className="text-sm text-dark-400">
              {transactionsData?.pagination?.total || 0} transactions found
            </p>
          </div>
          
          <div className="flex gap-3">
            {/* Date Range */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="glass-select text-sm pr-8"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="glass-select text-sm pr-8"
              >
                <option value="ALL">All Types</option>
                <option value="AUCTION_PURCHASE">Auction Wins</option>
                <option value="SECONDARY_PURCHASE">Market Purchases</option>
                <option value="PAYOUT">Payouts</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAWAL">Withdrawals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {txLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Details</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => {
                  const isSeller = tx.sellerId === user?.id;
                  const isCredit = tx.type === 'PAYOUT' || tx.type === 'DEPOSIT' || isSeller;
                  
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-sm">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <span className="block text-xs text-dark-400">
                          {new Date(tx.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`glass-badge text-xs ${getTypeBadgeClass(tx.type)}`}>
                          {getTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {tx.listing?.ownership?.auctionItem?.team ? (
                          <div>
                            <p className="font-medium">
                              {tx.listing.ownership.auctionItem.team.name}
                            </p>
                            <p className="text-xs text-dark-400">
                              {tx.listing.ownership.auctionItem.pool?.name}
                            </p>
                          </div>
                        ) : (
                          <span className="text-dark-400">-</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        isCredit ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          tx.status === 'COMPLETED' ? 'text-green-400' : 
                          tx.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {tx.status === 'COMPLETED' && <RefreshCw className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-dark-500 mx-auto mb-3" />
            <p className="text-dark-400 mb-1">No transactions found</p>
            <p className="text-sm text-dark-500">
              Try adjusting your filters or date range
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'red' | 'green' | 'gold';
  loading: boolean;
}) {
  const colorClasses = {
    red: 'bg-red-500/10 text-red-400',
    green: 'bg-green-500/10 text-green-400',
    gold: 'bg-gold-500/10 text-gold-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
    >
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-dark-600 rounded animate-pulse" />
      ) : (
        <p className="stat-value">{value}</p>
      )}
      <p className="stat-label">{label}</p>
    </motion.div>
  );
}

function TrendChart({ data }: { data: Array<{ month: string; spent: number; earned: number; winnings: number }> }) {
  const maxValue = Math.max(
    ...data.flatMap(d => [d.spent, d.earned, d.winnings])
  );
  
  const height = 160;
  const width = 100;
  const padding = 20;

  return (
    <div className="h-[200px]">
      <div className="flex items-end justify-between h-full gap-2">
        {data.slice(-6).map((item, idx) => {
          const spentHeight = maxValue > 0 ? (item.spent / maxValue) * height : 0;
          const earnedHeight = maxValue > 0 ? (item.earned / maxValue) * height : 0;
          const winningsHeight = maxValue > 0 ? (item.winnings / maxValue) * height : 0;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="flex items-end gap-1 h-[160px]">
                <div
                  className="w-2 bg-red-500/60 rounded-t"
                  style={{ height: `${spentHeight}px` }}
                  title={`Spent: ${formatCurrency(item.spent)}`}
                />
                <div
                  className="w-2 bg-green-500/60 rounded-t"
                  style={{ height: `${earnedHeight}px` }}
                  title={`Earned: ${formatCurrency(item.earned)}`}
                />
                <div
                  className="w-2 bg-gold-500/60 rounded-t"
                  style={{ height: `${winningsHeight}px` }}
                  title={`Winnings: ${formatCurrency(item.winnings)}`}
                />
              </div>
              <span className="text-xs text-dark-400 mt-2">
                {item.month.split('-')[1]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/60" /> Spent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500/60" /> Earned
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gold-500/60" /> Winnings
        </span>
      </div>
    </div>
  );
}

function BreakdownChart({ data }: { data: Array<{ type: string; count: number; total: number }> }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  
  const colors: Record<string, string> = {
    AUCTION_PURCHASE: '#ef4444',
    SECONDARY_PURCHASE: '#f97316',
    PAYOUT: '#22c55e',
    DEPOSIT: '#3b82f6',
    WITHDRAWAL: '#a855f7',
  };

  let currentAngle = 0;

  return (
    <div className="flex items-center gap-6">
      {/* Donut Chart */}
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.map((item, idx) => {
            const percentage = total > 0 ? (item.total / total) * 100 : 0;
            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const rotation = currentAngle;
            currentAngle += percentage;
            
            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={colors[item.type] || '#64748b'}
                strokeWidth="15"
                strokeDasharray={strokeDasharray}
                strokeDashoffset="0"
                style={{
                  transformOrigin: '50% 50%',
                  transform: `rotate(${rotation * 3.6}deg)`,
                }}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-bold">{data.reduce((sum, d) => sum + d.count, 0)}</p>
            <p className="text-xs text-dark-400">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {data.map((item) => (
          <div key={item.type} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded"
                style={{ background: colors[item.type] || '#64748b' }}
              />
              <span className="text-dark-300">{getTypeLabel(item.type)}</span>
            </div>
            <div className="text-right">
              <span className="font-medium">{formatCurrency(item.total)}</span>
              <span className="text-dark-400 ml-2">({item.count})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    AUCTION_PURCHASE: 'Auction Wins',
    SECONDARY_PURCHASE: 'Market Buys',
    PAYOUT: 'Payouts',
    DEPOSIT: 'Deposits',
    WITHDRAWAL: 'Withdrawals',
  };
  return labels[type] || type;
}

function getTypeBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    AUCTION_PURCHASE: 'bg-red-500/20 text-red-400 border-red-500/30',
    SECONDARY_PURCHASE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    PAYOUT: 'bg-green-500/20 text-green-400 border-green-500/30',
    DEPOSIT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    WITHDRAWAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return classes[type] || '';
}

