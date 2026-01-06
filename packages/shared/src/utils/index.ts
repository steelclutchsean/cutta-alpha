import { PLATFORM_FEE_RATE } from '../constants';

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, showCents = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate platform fee for secondary market transaction
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
}

/**
 * Calculate net amount after platform fee
 */
export function calculateNetAmount(amount: number): number {
  const fee = calculatePlatformFee(amount);
  return Math.round((amount - fee) * 100) / 100;
}

/**
 * Generate a random invite code
 */
export function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format time remaining for auction
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from display name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate random color for avatar backgrounds
 */
export function getAvatarColor(id: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  ];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

/**
 * Sort teams by seed
 */
export function sortBySeed<T extends { seed: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.seed === null) return 1;
    if (b.seed === null) return -1;
    return a.seed - b.seed;
  });
}

/**
 * Group teams by region
 */
export function groupByRegion<T extends { region: string | null }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const region = item.region || 'Unknown';
    if (!acc[region]) acc[region] = [];
    acc[region].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

