'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Shield,
  User,
  ChevronRight,
  Zap,
  Radio,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { usePools, useUserBalance } from '@/lib/hooks';
import { formatCurrency } from '@cutta/shared';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LiveAuctionFAB } from '@/components/LiveAuctionFAB';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Pools', href: '/pools', icon: Users },
  { name: 'My Teams', href: '/my-teams', icon: Shield },
  { name: 'Market', href: '/market', icon: TrendingUp },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function getUserAvatarUrl(user: { avatarType?: string; presetAvatarId?: string | null; avatarUrl?: string | null }): string | null {
  if (user.avatarType === 'PRESET' && user.presetAvatarId) {
    return `/avatars/${user.presetAvatarId}.svg`;
  }
  return user.avatarUrl || null;
}

// Hook to persist sidebar collapsed state
function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);
  
  const setCollapsed = useCallback((value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem('sidebar-collapsed', String(value));
  }, []);
  
  return [isCollapsed, setCollapsed] as const;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { data: pools } = usePools();
  const { data: balanceData } = useUserBalance();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();

  // Only LIVE status pools have active auctions - IN_PROGRESS means tournament in progress after auction
  const livePools = pools?.filter((p: any) => p.status === 'LIVE') || [];
  
  // Use real-time balance from hook, fall back to user balance
  const currentBalance = balanceData?.balance ?? user?.balance ?? 0;

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
  
  // Hide sidebar completely for studio and draft room (both are full-screen experiences)
  if (isInStudio || isInAuctionRoom) {
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
                balance={currentBalance}
                isCollapsed={false}
                onToggleCollapse={() => {}}
                onLogout={handleLogout}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.div 
        className="hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col z-20"
        initial={false}
        animate={{ width: isCollapsed ? 88 : 288 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col flex-1 glass-sidebar relative">
          <SidebarContent
            pathname={pathname}
            user={user}
            livePools={livePools}
            balance={currentBalance}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            onLogout={handleLogout}
          />
          
          {/* Edge Toggle Button - Always visible on sidebar edge */}
          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-12 rounded-r-lg border border-l-0 flex items-center justify-center transition-all z-30 group"
            style={{
              background: 'var(--glass-bg-solid)',
              borderColor: 'var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.95 }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-primary" />
            </motion.div>
          </motion.button>
        </div>
      </motion.div>

      {/* Main content */}
      <div 
        className={`relative min-h-screen transition-all duration-300 ease-out ${
          isCollapsed ? 'lg:pl-[88px]' : 'lg:pl-72'
        }`}
      >
        {/* Mobile header - only shows hamburger menu on mobile */}
        <header className="sticky top-0 z-30 glass-navbar lg:hidden">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="glass-btn !p-2.5 !rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-text-primary">Cutta</span>
            </Link>
            <div className="w-10" /> {/* Spacer for centering */}
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
  balance,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  onClose,
}: {
  pathname: string;
  user: any;
  livePools: any[];
  balance: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center justify-between h-16 border-b border-glass-border ${isCollapsed ? 'px-3' : 'px-6'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center shadow-glass-glow flex-shrink-0"
          >
            <Trophy className="w-6 h-6 text-white" />
          </motion.div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xl font-bold text-text-primary overflow-hidden whitespace-nowrap"
              >
                Cutta
              </motion.span>
            )}
          </AnimatePresence>
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

      {/* Wallet Balance - Always Prominent */}
      <div className={`${isCollapsed ? 'px-2' : 'px-4'} pt-4`}>
        <Link 
          href="/wallet" 
          onClick={onClose}
          className={`group block ${isCollapsed ? '' : ''}`}
        >
          <motion.div 
            className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
              isCollapsed 
                ? 'p-2' 
                : 'p-4'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 191, 0, 0.15) 0%, rgba(255, 179, 0, 0.08) 100%)',
              border: '1px solid rgba(255, 191, 0, 0.25)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            
            {isCollapsed ? (
              // Collapsed: Icon with balance below
              <div className="flex flex-col items-center gap-1.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-accent-gold/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-accent-gold" />
                </div>
                <span className="text-xs font-bold text-accent-gold tabular-nums whitespace-nowrap">
                  {formatCurrency(Number(balance)).replace('$', '')}
                </span>
              </div>
            ) : (
              // Expanded: Full display
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-accent-gold/20 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6 text-accent-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">
                    Wallet Balance
                  </p>
                  <p className="text-2xl font-bold text-accent-gold tabular-nums">
                    {formatCurrency(Number(balance))}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-accent-gold/50 group-hover:text-accent-gold group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            )}
          </motion.div>
        </Link>
      </div>

      {/* Live Auctions Quick Join Section */}
      {livePools.length > 0 && (
        <div className={`${isCollapsed ? 'px-2' : 'px-4'} pt-3`}>
          {isCollapsed ? (
            // Collapsed: Just icon with badge
            <Link
              href={`/pools/${livePools[0].id}/draft`}
              onClick={onClose}
              className="group flex flex-col items-center gap-1"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-12 h-12 rounded-xl bg-accent-red/15 border border-accent-red/25 flex items-center justify-center"
              >
                <Radio className="w-5 h-5 text-accent-red" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-red text-white text-xs font-bold flex items-center justify-center">
                  {livePools.length}
                </span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-accent-red rounded-full animate-ping" />
              </motion.div>
              <span className="text-[10px] font-semibold text-accent-red uppercase">Live</span>
            </Link>
          ) : (
            // Expanded: Full panel
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
          )}
        </div>
      )}

      {/* User Info */}
      <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-4`}>
        {isCollapsed ? (
          <Link href="/profile" onClick={onClose} className="group flex justify-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center text-white font-bold"
            >
              {getUserAvatarUrl(user) ? (
                <img
                  src={getUserAvatarUrl(user)!}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm">{user.displayName[0].toUpperCase()}</span>
              )}
            </motion.div>
          </Link>
        ) : (
          <div className="glass-card !p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-accent-blue to-accent-gold flex items-center justify-center text-white font-bold flex-shrink-0">
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
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-2 space-y-1 overflow-y-auto`}>
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
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} rounded-2xl font-medium transition-all duration-300 group ${
                  isActive
                    ? 'text-accent-blue bg-accent-blue/10'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-glass-bg'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-6 rounded-r-full bg-accent-blue"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                  {item.name === 'My Pools' && livePools.length > 0 && isCollapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center">
                      {livePools.length}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <>
                      <motion.span 
                        className="flex-1"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                      >
                        {item.name}
                      </motion.span>
                      {item.name === 'My Pools' && livePools.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-accent-red text-white text-xs font-bold flex items-center justify-center">
                          {livePools.length}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-accent-blue opacity-60" />
                      )}
                    </>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={`${isCollapsed ? 'px-2' : 'px-3'} pb-2 space-y-1`}>
        {/* Theme Toggle */}
        <div className={`flex ${isCollapsed ? 'justify-center' : 'px-4'} py-2`}>
          <ThemeToggle />
        </div>
        
        {/* Toggle Collapse Button (Desktop only) */}
        {!onClose && (
          <button
            onClick={onToggleCollapse}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full px-4 py-3 rounded-2xl text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-300`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5" />
                <span className="font-medium">Collapse</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Logout */}
      <div className={`${isCollapsed ? 'p-2' : 'p-3'} border-t border-glass-border`}>
        <button
          onClick={onLogout}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full px-4 py-3 rounded-2xl text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 transition-all duration-300`}
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-5 h-5" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                className="font-medium"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
