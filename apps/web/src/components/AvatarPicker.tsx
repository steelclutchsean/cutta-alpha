'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, X, ImageIcon, Sparkles } from 'lucide-react';
import { usePresetAvatars } from '@/lib/hooks';

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  currentAvatarType: 'CUSTOM' | 'PRESET' | 'CLERK';
  currentPresetAvatarId: string | null;
  onSelect: (selection: {
    avatarUrl: string | null;
    avatarType: 'CUSTOM' | 'PRESET' | 'CLERK';
    presetAvatarId: string | null;
  }) => void;
  onClose: () => void;
}

type Category = 'all' | 'sports' | 'abstract' | 'animals' | 'characters';

export function AvatarPicker({
  currentAvatarUrl,
  currentAvatarType,
  currentPresetAvatarId,
  onSelect,
  onClose,
}: AvatarPickerProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    currentAvatarType === 'PRESET' ? currentPresetAvatarId : null
  );
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    currentAvatarType === 'CUSTOM' ? currentAvatarUrl : null
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: presetAvatars, isLoading } = usePresetAvatars();

  const categories: { id: Category; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'sports', label: 'Sports' },
    { id: 'abstract', label: 'Abstract' },
    { id: 'animals', label: 'Animals' },
    { id: 'characters', label: 'Characters' },
  ];

  const filteredAvatars = presetAvatars?.filter(
    (avatar) => selectedCategory === 'all' || avatar.category === selectedCategory
  );

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setSelectedPresetId(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    setUploadedImage(null);
  };

  const handleConfirm = () => {
    if (selectedPresetId) {
      const preset = presetAvatars?.find((p) => p.id === selectedPresetId);
      onSelect({
        avatarUrl: preset?.url || null,
        avatarType: 'PRESET',
        presetAvatarId: selectedPresetId,
      });
    } else if (uploadedImage) {
      onSelect({
        avatarUrl: uploadedImage,
        avatarType: 'CUSTOM',
        presetAvatarId: null,
      });
    }
    onClose();
  };

  const getCurrentSelection = () => {
    if (selectedPresetId) {
      return presetAvatars?.find((p) => p.id === selectedPresetId)?.url;
    }
    return uploadedImage;
  };

  return (
    <div className="glass-panel p-0 overflow-hidden max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold">Choose Avatar</h3>
        <button onClick={onClose} className="glass-btn p-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'presets'
              ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-500/10'
              : 'text-dark-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Preset Avatars
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-500/10'
              : 'text-dark-300 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Upload Custom
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'presets' ? (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'glass-btn-primary'
                        : 'glass-btn'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Avatar Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {filteredAvatars?.map((avatar) => (
                    <motion.button
                      key={avatar.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePresetSelect(avatar.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedPresetId === avatar.id
                          ? 'border-primary-500 ring-2 ring-primary-500/30'
                          : 'border-transparent hover:border-white/20'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedPresetId === avatar.id && (
                        <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-primary-400" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-dark-500 hover:border-dark-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                
                {uploadedImage ? (
                  <div className="space-y-4">
                    <div className="w-32 h-32 mx-auto rounded-xl overflow-hidden border-2 border-primary-500">
                      <img
                        src={uploadedImage}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-dark-300">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto rounded-xl bg-dark-600 flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 text-dark-400" />
                    </div>
                    <p className="text-white font-medium mb-1">
                      Drop your image here
                    </p>
                    <p className="text-sm text-dark-400">
                      or click to browse (max 5MB)
                    </p>
                  </>
                )}
              </div>

              <p className="text-xs text-dark-400 text-center">
                Supported formats: JPG, PNG, GIF, WebP
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview & Actions */}
      <div className="p-4 border-t border-white/10 bg-dark-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-dark-400">Preview:</span>
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-dark-600">
              {getCurrentSelection() ? (
                <img
                  src={getCurrentSelection()!}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dark-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPresetId && !uploadedImage}
              className="btn-primary"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

