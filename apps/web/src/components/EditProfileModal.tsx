'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Phone, Save, Loader2 } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { mutate } from 'swr';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    displayName: string;
    avatarUrl: string | null;
    avatarType: 'CUSTOM' | 'PRESET' | 'CLERK';
    presetAvatarId: string | null;
    phone: string | null;
  };
}

export function EditProfileModal({
  isOpen,
  onClose,
  initialData,
}: EditProfileModalProps) {
  const { token, updateUser } = useAuth();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: initialData.displayName,
    avatarUrl: initialData.avatarUrl,
    avatarType: initialData.avatarType,
    presetAvatarId: initialData.presetAvatarId,
    phone: initialData.phone || '',
  });

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        displayName: initialData.displayName,
        avatarUrl: initialData.avatarUrl,
        avatarType: initialData.avatarType,
        presetAvatarId: initialData.presetAvatarId,
        phone: initialData.phone || '',
      });
      setError(null);
    }
  }, [isOpen, initialData]);

  const getAvatarDisplay = () => {
    if (formData.avatarType === 'PRESET' && formData.presetAvatarId) {
      return `/avatars/${formData.presetAvatarId}.svg`;
    }
    return formData.avatarUrl;
  };

  const handleAvatarSelect = (selection: {
    avatarUrl: string | null;
    avatarType: 'CUSTOM' | 'PRESET' | 'CLERK';
    presetAvatarId: string | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      ...selection,
    }));
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Clean phone number for API
      const cleanPhone = formData.phone.replace(/\D/g, '');
      
      const updateData: any = {
        displayName: formData.displayName,
        avatarType: formData.avatarType,
        phone: cleanPhone || null,
      };

      if (formData.avatarType === 'PRESET') {
        updateData.presetAvatarId = formData.presetAvatarId;
        updateData.avatarUrl = null;
      } else if (formData.avatarType === 'CUSTOM') {
        updateData.avatarUrl = formData.avatarUrl;
        updateData.presetAvatarId = null;
      }

      const updatedUser = await usersApi.updateProfile(token, updateData);
      
      // Update local auth context
      updateUser(updatedUser);
      
      // Revalidate SWR cache
      mutate(['profile', token]);
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel w-full max-w-md relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Edit Profile</h2>
            <button onClick={onClose} className="glass-btn p-2">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 to-gold-500">
                  {getAvatarDisplay() ? (
                    <img
                      src={getAvatarDisplay()!}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-900 text-3xl font-bold">
                      {formData.displayName[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="mt-2 text-sm text-primary-400 hover:text-primary-300"
              >
                Change avatar
              </button>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  required
                  minLength={2}
                  maxLength={50}
                  className="glass-input pl-10"
                  placeholder="Your display name"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">
                Phone Number
                <span className="text-dark-400 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="glass-input pl-10"
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
              </div>
              <p className="text-xs text-dark-400">
                Used for important account notifications
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.displayName.trim()}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Avatar Picker Modal */}
        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4"
              onClick={() => setShowAvatarPicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <AvatarPicker
                  currentAvatarUrl={formData.avatarUrl}
                  currentAvatarType={formData.avatarType}
                  currentPresetAvatarId={formData.presetAvatarId}
                  onSelect={handleAvatarSelect}
                  onClose={() => setShowAvatarPicker(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

