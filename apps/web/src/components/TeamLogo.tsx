'use client';

import { useState } from 'react';
import Image from 'next/image';

interface TeamLogoProps {
  logoUrl?: string | null;
  teamName: string;
  shortName?: string;
  seed?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const textSizes = {
  xs: 'text-[8px]',
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

// Generate a consistent color based on team name
function getTeamColor(name: string): string {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-red-500 to-red-700',
    'from-green-500 to-green-700',
    'from-purple-500 to-purple-700',
    'from-orange-500 to-orange-700',
    'from-cyan-500 to-cyan-700',
    'from-pink-500 to-pink-700',
    'from-indigo-500 to-indigo-700',
    'from-emerald-500 to-emerald-700',
    'from-amber-500 to-amber-700',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export default function TeamLogo({
  logoUrl,
  teamName,
  shortName,
  seed,
  size = 'md',
  className = '',
  showFallback = true,
}: TeamLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClass = sizeClasses[size];
  const textSize = textSizes[size];
  const displayText = shortName?.slice(0, 3).toUpperCase() || teamName.slice(0, 3).toUpperCase();

  // Show logo if available and not errored
  if (logoUrl && !imageError) {
    return (
      <div className={`${sizeClass} ${className} relative flex-shrink-0 rounded-lg overflow-hidden bg-white/10`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
        )}
        <Image
          src={logoUrl}
          alt={`${teamName} logo`}
          fill
          className={`object-contain p-0.5 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={() => setImageError(true)}
          onLoad={() => setIsLoading(false)}
          sizes={size === 'xl' ? '64px' : size === 'lg' ? '48px' : size === 'md' ? '40px' : size === 'sm' ? '32px' : '24px'}
          unoptimized // Use unoptimized for external URLs
        />
      </div>
    );
  }

  // Fallback: show seed number or initials
  if (!showFallback) {
    return null;
  }

  const colorClass = getTeamColor(teamName);

  return (
    <div
      className={`${sizeClass} ${className} flex-shrink-0 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-sm`}
      title={teamName}
    >
      {seed ? (
        <span className={`font-bold text-white ${textSize}`}>#{seed}</span>
      ) : (
        <span className={`font-bold text-white ${textSize}`}>{displayText}</span>
      )}
    </div>
  );
}

// Compact version for inline use
export function TeamLogoInline({
  logoUrl,
  teamName,
  shortName,
  className = '',
}: {
  logoUrl?: string | null;
  teamName: string;
  shortName?: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt={teamName}
        className={`w-5 h-5 object-contain ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return null;
}


