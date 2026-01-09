'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Home,
  Users,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Shield,
  User,
  ChevronRight,
  Zap,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { usePools } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LiveAuctionBanner } from '@/components/LiveAuctionBanner';
import { LiveAuctionFAB } from '@/components/LiveAuctionFAB';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Pools', href: '/pools', icon: Users },
  { name: 'My Teams', href: '/my-teams', icon: Shield },
  { name: 'Market', href: '/market', icon: TrendingUp },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function getUserAvatarUrl(user: { avatarType?: string; presetAvatarId?: string | null; avatarUrl?: string | null }): string | null {
  if (user.avatarType === 'PRESET' && user.presetAvatarId) {
    return `/avatars/${user.presetAvatarId}.svg`;
  }
  return user.avatarUrl || null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { data: pools } = usePools();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Only LIVE status pools have active auctions - IN_PROGRESS means tournament in progress after auction
  const livePools = pools?.filter((p: any) => p.status === 'LIVE') || [];

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="liquid-bg" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel flex items-center gap-4 relative z-10"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center shadow-glass-glow">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-xl font-semibold text-text-primary">Loading...</span>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent-blue"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Check if we're already in a draft/auction room or studio
  const isInAuctionRoom = pathname.includes('/draft');
  const isInStudio = pathname.includes('/studio');
  
  // Hide sidebar completely for studio
  if (isInStudio) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Liquid Glass Background */}
      <div className="liquid-bg" />
      
      {/* Live Auction Banner - only show if not in auction room */}
      {!isInAuctionRoom && <LiveAuctionBanner />}
      
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 w-80 glass-sidebar z-50 lg:hidden"
            >
              <SidebarContent
                pathname={pathname}
                user={user}
                livePools={livePools}
                onLogout={handleLogout}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col z-20">
        <div className="flex flex-col flex-1 glass-sidebar">
          <SidebarContent
            pathname={pathname}
            user={user}
            livePools={livePools}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 relative min-h-screen">
        {/* Top bar - Glass Navbar */}
        <header className="sticky top-0 z-30 glass-navbar">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden glass-btn !p-2.5 !rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Live Auction Quick Join - Navbar */}
            {livePools.length > 0 && !isInAuctionRoom && (
              <Link
                href={`/pools/${livePools[0].id}/draft`}
                className="hidden md:flex items-center gap-2 glass-btn !py-2 !px-3 !rounded-xl border-accent-red/30 hover:border-accent-red/50 group"
              >
                <span className="relative">
                  <Radio className="w-4 h-4 text-accent-red" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-red rounded-full animate-ping" />
                </span>
                <span className="text-sm font-medium text-accent-red">
                  {livePools.length} Live
                </span>
                <ChevronRight className="w-4 h-4 text-accent-red opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </Link>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Balance - Glass Badge */}
              <Link
                href="/wallet"
                className="hidden sm:flex glass-badge-gold gap-2 hover:scale-105 transition-transform"
              >
                <Wallet className="w-4 h-4" />
                <span className="font-semibold tabular-nums">
                  {formatCurrency(Number(user.balance))}
                </span>
              </Link>

              {/* Notifications */}
              <button className="relative glass-btn !p-2.5 !rounded-xl">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full ring-2 ring-bg-primary" />
              </button>

              {/* Profile */}
              <Link href="/profile" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center text-white font-bold shadow-glass transition-transform group-hover:scale-105">
                  {getUserAvatarUrl(user) ? (
                    <img
                      src={getUserAvatarUrl(user)!}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">{user.displayName[0].toUpperCase()}</span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Floating Action Button for Live Auctions - only show if not in auction room */}
      {!isInAuctionRoom && <LiveAuctionFAB />}
    </div>
  );
}

function SidebarContent({
  pathname,
  user,
  livePools,
  onLogout,
  onClose,
}: {
  pathname: string;
  user: any;
  livePools: any[];
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-glass-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center shadow-glass-glow"
          >
            <Trophy className="w-6 h-6 text-white" />
          </motion.div>
          <span className="text-xl font-bold text-text-primary">Cutta</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden glass-btn !p-2 !rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live Auctions Quick Join Section */}
      {livePools.length > 0 && (
        <div className="px-4 pt-4">
          <div className="glass-card !p-0 overflow-hidden border-accent-red/20">
            <div className="px-4 py-3 bg-accent-red/10 border-b border-accent-red/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative">
                    <Zap className="w-4 h-4 text-accent-red" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent-red rounded-full animate-ping" />
                  </span>
                  <span className="text-sm font-semibold text-accent-red">
                    Live Now
                  </span>
                </div>
                <span className="text-xs text-text-tertiary">
                  {livePools.length} auction{livePools.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="divide-y divide-glass-border">
              {livePools.slice(0, 3).map((pool: any) => (
                <Link
                  key={pool.id}
                  href={`/pools/${pool.id}/draft`}
                  onClick={onClose}
                  className="block px-4 py-3 hover:bg-glass-bg transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-blue transition-colors">
                        {pool.name}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {pool.memberCount || pool._count?.members || 0} members • {formatCurrency(Number(pool.totalPot || 0))}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-quaternary group-hover:text-accent-blue transition-colors flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
            {livePools.length > 3 && (
              <Link
                href="/pools?filter=live"
                onClick={onClose}
                className="block px-4 py-2 text-center text-xs text-accent-blue hover:bg-glass-bg transition-colors border-t border-glass-border"
              >
                View all {livePools.length} live auctions
              </Link>
            )}
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="px-4 py-4">
        <div className="glass-card !p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center text-white font-bold">
            {getUserAvatarUrl(user) ? (
              <img
                src={getUserAvatarUrl(user)!}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm">{user.displayName[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                  isActive
                    ? 'text-accent-blue bg-accent-blue/10'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-glass-bg'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-6 rounded-r-full bg-accent-blue"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span className="flex-1">{item.name}</span>
                {item.name === 'My Pools' && livePools.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-accent-red text-white text-xs font-bold flex items-center justify-center">
                    {livePools.length}
                  </span>
                )}
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-accent-blue opacity-60" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Mobile Balance */}
      <div className="px-4 py-3 lg:hidden">
        <Link href="/wallet" onClick={onClose} className="glass-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-gold/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-accent-gold" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-text-tertiary">Balance</p>
            <p className="text-lg font-bold text-accent-gold tabular-nums">
              {formatCurrency(Number(user.balance))}
            </p>
          </div>
        </Link>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-glass-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}
