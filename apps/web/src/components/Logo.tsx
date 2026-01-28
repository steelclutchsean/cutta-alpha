'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  xs: { container: 'w-6 h-6', image: 24, src: '/favicon-32x32.png' },
  sm: { container: 'w-8 h-8', image: 32, src: '/favicon-32x32.png' },
  md: { container: 'w-10 h-10', image: 40, src: '/favicon-48x48.png' },
  lg: { container: 'w-12 h-12', image: 48, src: '/favicon-48x48.png' },
  xl: { container: 'w-14 h-14', image: 56, src: '/icon-192.png' },
};

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const { container, image, src } = sizeMap[size];
  
  return (
    <div className={`${container} ${className} flex-shrink-0`}>
      <Image
        src={src}
        alt="Cutta"
        width={image}
        height={image}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
}

// Icon-only version for use within buttons or inline contexts
export function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/favicon-32x32.png"
      alt="Cutta"
      width={24}
      height={24}
      className={className}
      priority
    />
  );
}
