'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@cutta/shared';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Pools', href: '/pools', icon: Users },
  { name: 'My Teams', href: '/my-teams', icon: Shield },
  { name: 'Market', href: '/market', icon: TrendingUp },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Helper to get user avatar URL based on avatar type
function getUserAvatarUrl(user: { avatarType?: string; presetAvatarId?: string | null; avatarUrl?: string | null }): string | null {
  if (user.avatarType === 'PRESET' && user.presetAvatarId) {
    return `/avatars/${user.presetAvatarId}.svg`;
  }
  return user.avatarUrl || null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="liquid-bg" />
        <div className="glass-panel flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shadow-glass-glow">
            <Trophy className="w-6 h-6 text-dark-900" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">Loading...</span>
            <div className="flex gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
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

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Liquid Glass Background */}
      <div className="liquid-bg" />
      
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 glass-sidebar z-50 lg:hidden"
            >
              <SidebarContent onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col z-20">
        <div className="flex flex-col flex-1 glass-sidebar">
          <SidebarContent onLogout={handleLogout} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 relative">
        {/* Top bar - Glass Navbar */}
        <header className="sticky top-0 z-30 glass-navbar">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden glass-btn p-2"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Balance - Glass Badge */}
              <div className="hidden sm:flex glass-badge-gold">
                <Wallet className="w-4 h-4" />
                <span className="font-semibold">
                  {formatCurrency(Number(user.balance))}
                </span>
              </div>

              {/* Notifications */}
              <button className="relative glass-btn p-2">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-dark-900" />
              </button>

              {/* Profile */}
              <Link href="/profile" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center text-dark-900 font-bold shadow-glass-glow">
                  {getUserAvatarUrl(user) ? (
                    <img
                      src={getUserAvatarUrl(user)!}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.displayName[0].toUpperCase()
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 relative">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  onLogout,
  onClose,
}: {
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center shadow-glass-glow">
            <Trophy className="w-5 h-5 text-dark-900" />
          </div>
          <span className="text-xl font-bold text-white">Cutta</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden glass-btn p-1.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

