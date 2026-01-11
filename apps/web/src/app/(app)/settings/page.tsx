'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Lock,
  LogOut,
  ChevronRight,
  Edit2,
  Mail,
  Trash2,
  Plus,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUserProfile, usePaymentMethods } from '@/lib/hooks';
import { EditProfileModal } from '@/components/EditProfileModal';
import { formatCurrency } from '@cutta/shared';
import { useUser } from '@clerk/nextjs';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { user: clerkUser } = useUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: paymentMethods, isLoading: pmLoading } = usePaymentMethods();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const getAvatarUrl = () => {
    if (profile?.avatarType === 'PRESET' && profile?.presetAvatarId) {
      return `/avatars/${profile.presetAvatarId}.svg`;
    }
    return profile?.avatarUrl || user?.avatarUrl;
  };

  // Check if 2FA is enabled via Clerk
  const twoFactorEnabled = clerkUser?.twoFactorEnabled ?? false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-dark-300 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 to-gold-500 shadow-lg">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()!}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dark-900 text-2xl font-bold">
                    {user?.displayName[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              {profile?.kycVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.displayName || user?.displayName}</h2>
              <p className="text-dark-300">{profile?.email || user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {profile?.kycVerified ? (
                  <span className="glass-badge-success text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="glass-badge text-xs text-yellow-400">
                    <AlertCircle className="w-3 h-3" />
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowEditProfile(true)}
            className="btn-secondary"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <p className="text-sm text-dark-400">Balance</p>
            <p className="text-lg font-semibold text-gold-400">
              {formatCurrency(Number(profile?.balance || 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-dark-400">Pools Joined</p>
            <p className="text-lg font-semibold">{profile?.poolsJoined || 0}</p>
          </div>
          <div>
            <p className="text-sm text-dark-400">Teams Owned</p>
            <p className="text-lg font-semibold">{profile?.ownedTeams || 0}</p>
          </div>
          <div>
            <p className="text-sm text-dark-400">Total Winnings</p>
            <p className="text-lg font-semibold text-green-400">
              {formatCurrency(Number(profile?.totalWinnings || 0))}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-400" />
          Contact Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                <Mail className="w-5 h-5 text-dark-300" />
              </div>
              <div>
                <p className="text-sm text-dark-400">Email</p>
                <p className="font-medium">{profile?.email || user?.email}</p>
              </div>
            </div>
            <Link
              href={clerkUser ? '/user' : '#'}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Manage via Clerk
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-400" />
            Payment Methods
          </h3>
          <button className="btn-secondary text-sm">
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>

        {pmLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((pm: any) => (
              <div
                key={pm.id}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded bg-gradient-to-br from-dark-500 to-dark-600 flex items-center justify-center text-xs font-bold uppercase">
                    {pm.brand}
                  </div>
                  <div>
                    <p className="font-medium">•••• {pm.last4}</p>
                    <p className="text-xs text-dark-400">
                      Expires {pm.expiryMonth}/{pm.expiryYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pm.isDefault && (
                    <span className="glass-badge-primary text-xs">Default</span>
                  )}
                  <button className="glass-btn p-2 text-dark-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-dark-500 mx-auto mb-3" />
            <p className="text-dark-300 mb-3">No payment methods added</p>
            <button className="btn-secondary">
              <Plus className="w-4 h-4" />
              Add Payment Method
            </button>
          </div>
        )}
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-400" />
          Notifications
        </h3>

        <div className="space-y-4">
          <NotificationToggle
            label="Auction Alerts"
            description="Get notified when auctions start or you're outbid"
            defaultEnabled={true}
          />
          <NotificationToggle
            label="Pool Updates"
            description="Updates about pools you've joined"
            defaultEnabled={true}
          />
          <NotificationToggle
            label="Payout Notifications"
            description="Get notified when you receive winnings"
            defaultEnabled={true}
          />
          <NotificationToggle
            label="Marketing Emails"
            description="News, tips, and promotional content"
            defaultEnabled={false}
          />
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-400" />
          Security
        </h3>

        <div className="space-y-3">
          {/* Two-Factor Authentication */}
          <Link
            href={clerkUser ? '/user/security' : '#'}
            className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                twoFactorEnabled ? 'bg-green-500/20' : 'bg-dark-600'
              }`}>
                {twoFactorEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                ) : (
                  <Smartphone className="w-5 h-5 text-dark-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Two-Factor Authentication</p>
                  {twoFactorEnabled ? (
                    <span className="glass-badge-success text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Enabled
                    </span>
                  ) : (
                    <span className="glass-badge text-xs text-yellow-400">
                      <ShieldAlert className="w-3 h-3" />
                      Not enabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-400">
                  {twoFactorEnabled 
                    ? 'Your account is protected with 2FA' 
                    : 'Add extra security with authenticator app or SMS'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </Link>

          {/* Password Management */}
          <Link
            href={clerkUser ? '/user/security' : '#'}
            className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                <Lock className="w-5 h-5 text-dark-400" />
              </div>
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-dark-400">Change your password</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </Link>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel border-red-500/20"
      >
        <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>

        <div className="space-y-3">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full p-3 rounded-lg bg-dark-700/50 hover:bg-red-500/10 text-dark-300 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          initialData={{
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            avatarType: profile.avatarType || 'CUSTOM',
            presetAvatarId: profile.presetAvatarId,
          }}
        />
      )}
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultEnabled,
}: {
  label: string;
  description: string;
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-dark-400">{description}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`glass-toggle ${enabled ? 'active' : ''}`}
      >
        <div className="glass-toggle-thumb" />
      </button>
    </div>
  );
}

