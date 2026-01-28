const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'An error occurred', data.code);
  }

  return data;
}

// Auth
export const authApi = {
  signup: (data: { email: string; password: string; displayName: string }) =>
    fetchApi<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchApi<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    fetchApi<any>('/auth/me', { token }),
};

// Users
export const usersApi = {
  me: (token: string) =>
    fetchApi<any>('/users/me', { token }),

  syncGoogleUser: (token: string, data: { googleId?: string; email: string; displayName: string; avatarUrl?: string | null }) =>
    fetchApi<any>('/users/sync', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getProfile: (token: string) =>
    fetchApi<any>('/users/profile', { token }),

  updateProfile: (token: string, data: { 
    displayName?: string; 
    avatarUrl?: string | null; 
    avatarType?: 'CUSTOM' | 'PRESET' | 'GOOGLE';
    presetAvatarId?: string | null;
    phone?: string | null;
  }) =>
    fetchApi<any>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  getPresetAvatars: (token: string) =>
    fetchApi<Array<{ id: string; name: string; category: string; url: string }>>('/users/avatars/presets', { token }),

  getPaymentMethods: (token: string) =>
    fetchApi<any[]>('/users/payment-methods', { token }),

  addPaymentMethod: (token: string, data: { paymentMethodId: string; setAsDefault: boolean }) =>
    fetchApi<any>('/users/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  deletePaymentMethod: (token: string, id: string) =>
    fetchApi<any>(`/users/payment-methods/${id}`, {
      method: 'DELETE',
      token,
    }),

  getBalance: (token: string) =>
    fetchApi<{ balance: number; transactions: any[] }>('/users/balance', { token }),

  withdraw: (token: string, amount: number) =>
    fetchApi<any>('/users/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
      token,
    }),

  getOwnerships: (token: string, poolId?: string) =>
    fetchApi<any[]>(`/users/ownerships${poolId ? `?poolId=${poolId}` : ''}`, { token }),

  getTransactionAnalytics: (token: string) =>
    fetchApi<{
      summary: {
        totalSpent: number;
        totalEarned: number;
        totalWinnings: number;
        netPnL: number;
        transactionCount: number;
      };
      byType: Array<{ type: string; count: number; total: number }>;
      byPool: Array<{ poolId: string; poolName: string; spent: number; earned: number; winnings: number }>;
      monthlyTrends: Array<{ month: string; spent: number; earned: number; winnings: number }>;
    }>('/users/transactions/analytics', { token }),

  getTransactions: (token: string, params?: { 
    type?: string; 
    poolId?: string; 
    startDate?: string; 
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.poolId) searchParams.set('poolId', params.poolId);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const queryString = searchParams.toString();
    return fetchApi<{
      transactions: any[];
      pagination: { total: number; limit: number; offset: number };
    }>(`/users/transactions${queryString ? `?${queryString}` : ''}`, { token });
  },

  getDeletedPools: (token: string) =>
    fetchApi<Array<{
      id: string;
      originalPoolId: string;
      name: string;
      description: string | null;
      commissionerId: string;
      deletedStatus: string;
      buyIn: string;
      totalPot: string;
      maxParticipants: number | null;
      auctionStartTime: string;
      tournamentId: string;
      tournamentName: string;
      tournamentYear: number;
      memberCount: number;
      auctionMode: string;
      isPublic: boolean;
      deletedAt: string;
      deletionReason: string | null;
    }>>('/users/deleted-pools', { token }),
};

// Pools
export const poolsApi = {
  list: (token: string) =>
    fetchApi<any[]>('/pools', { token }),

  commissioned: (token: string) =>
    fetchApi<any[]>('/pools/commissioned', { token }),

  discover: (token: string) =>
    fetchApi<any[]>('/pools/discover', { token }),

  get: (token: string, id: string) =>
    fetchApi<any>(`/pools/${id}`, { token }),

  create: (token: string, data: any) =>
    fetchApi<any>('/pools', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: any) =>
    fetchApi<any>(`/pools/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  join: (token: string, inviteCode: string) =>
    fetchApi<any>('/pools/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
      token,
    }),

  leave: (token: string, id: string) =>
    fetchApi<any>(`/pools/${id}/leave`, {
      method: 'POST',
      token,
    }),

  open: (token: string, id: string) =>
    fetchApi<any>(`/pools/${id}/open`, {
      method: 'POST',
      token,
    }),

  getStandings: (token: string, id: string) =>
    fetchApi<any[]>(`/pools/${id}/standings`, { token }),

  updatePayouts: (token: string, id: string, rules: any[]) =>
    fetchApi<any>(`/pools/${id}/payouts`, {
      method: 'PUT',
      body: JSON.stringify({ rules }),
      token,
    }),

  updatePayoutRules: (token: string, id: string, rules: any[]) =>
    fetchApi<any>(`/pools/${id}/payouts`, {
      method: 'PUT',
      body: JSON.stringify({ rules }),
      token,
    }),

  delete: (token: string, id: string, reason?: string) =>
    fetchApi<{ message: string; deletedPoolId: string }>(`/pools/${id}`, {
      method: 'DELETE',
      ...(reason ? { body: JSON.stringify({ reason }) } : {}),
      token,
    }),
};

// LiveKit
export const livekitApi = {
  getToken: (token: string, poolId: string) =>
    fetchApi<{ token: string; roomName: string; isHost: boolean }>(`/livekit/token/${poolId}`, { token }),

  enableStreaming: (token: string, poolId: string) =>
    fetchApi<{ message: string; roomName: string }>(`/livekit/${poolId}/enable`, {
      method: 'POST',
      token,
    }),

  disableStreaming: (token: string, poolId: string) =>
    fetchApi<{ message: string }>(`/livekit/${poolId}/disable`, {
      method: 'POST',
      token,
    }),
};

// Auction
export const auctionApi = {
  getState: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/state`, { token }),

  placeBid: (token: string, auctionItemId: string, amount: number) =>
    fetchApi<any>('/auction/bid', {
      method: 'POST',
      body: JSON.stringify({ auctionItemId, amount }),
      token,
    }),

  start: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/start`, {
      method: 'POST',
      token,
    }),

  pause: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/pause`, {
      method: 'POST',
      token,
    }),

  resume: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/resume`, {
      method: 'POST',
      token,
    }),

  next: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/next`, {
      method: 'POST',
      token,
    }),

  // Wheel spin auction endpoints
  wheelSpinInit: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/wheel-spin/init`, {
      method: 'POST',
      token,
    }),

  wheelSpinSpin: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/wheel-spin/spin`, {
      method: 'POST',
      token,
    }),

  wheelSpinComplete: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/wheel-spin/complete`, {
      method: 'POST',
      token,
    }),

  getWheelSpinState: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/wheel-spin/state`, { token }),

  getWheelTeams: (token: string, poolId: string) =>
    fetchApi<{ teams: Array<{ id: string; name: string; shortName: string; seed: number | null; region: string | null }> }>(`/auction/${poolId}/wheel-spin/teams`, { token }),

  getMatchupBrief: (token: string, poolId: string) =>
    fetchApi<{ matchupBrief: string | null }>(`/auction/${poolId}/matchup-brief`, { token }),

  // Studio/Commissioner endpoints
  sellNow: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/sell-now`, {
      method: 'POST',
      token,
    }),

  startItem: (token: string, poolId: string, itemId: string) =>
    fetchApi<any>(`/auction/${poolId}/start-item/${itemId}`, {
      method: 'POST',
      token,
    }),

  reorderQueue: (token: string, poolId: string, itemOrder: Array<{ itemId: string; order: number }>) =>
    fetchApi<any>(`/auction/${poolId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ itemOrder }),
      token,
    }),

  revertAuction: (token: string, poolId: string, itemId: string) =>
    fetchApi<any>(`/auction/${poolId}/revert/${itemId}`, {
      method: 'POST',
      token,
    }),

  endAuction: (token: string, poolId: string) =>
    fetchApi<any>(`/auction/${poolId}/end`, {
      method: 'POST',
      token,
    }),

  // Chat moderation
  getMutedUsers: (token: string, poolId: string) =>
    fetchApi<Array<{ id: string; displayName: string; mutedUntil: string | null }>>(`/auction/${poolId}/chat/muted`, { token }),

  muteUser: (token: string, poolId: string, userId: string, duration?: number) =>
    fetchApi<any>(`/auction/${poolId}/chat/mute/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
      token,
    }),

  unmuteUser: (token: string, poolId: string, userId: string) =>
    fetchApi<any>(`/auction/${poolId}/chat/unmute/${userId}`, {
      method: 'POST',
      token,
    }),

  deleteMessage: (token: string, poolId: string, messageId: string) =>
    fetchApi<any>(`/auction/${poolId}/chat/message/${messageId}`, {
      method: 'DELETE',
      token,
    }),
};

// Market
export const marketApi = {
  getListings: (token: string, params?: { poolId?: string; teamId?: string }) =>
    fetchApi<any[]>(`/market/listings${params ? `?${new URLSearchParams(params as any)}` : ''}`, { token }),

  getMyListings: (token: string) =>
    fetchApi<any[]>('/market/my-listings', { token }),

  createListing: (token: string, data: any) =>
    fetchApi<any>('/market/listings', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  cancelListing: (token: string, id: string) =>
    fetchApi<any>(`/market/listings/${id}`, {
      method: 'DELETE',
      token,
    }),

  buyNow: (token: string, listingId: string) =>
    fetchApi<any>(`/market/listings/${listingId}/buy`, {
      method: 'POST',
      token,
    }),

  makeOffer: (token: string, listingId: string, amount: number) =>
    fetchApi<any>('/market/offers', {
      method: 'POST',
      body: JSON.stringify({ listingId, amount }),
      token,
    }),

  getMyOffers: (token: string) =>
    fetchApi<any[]>('/market/my-offers', { token }),

  respondToOffer: (token: string, offerId: string, action: 'accept' | 'reject') =>
    fetchApi<any>(`/market/offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
      token,
    }),

  cancelOffer: (token: string, offerId: string) =>
    fetchApi<any>(`/market/offers/${offerId}`, {
      method: 'DELETE',
      token,
    }),

  getTransactions: (token: string) =>
    fetchApi<any[]>('/market/transactions', { token }),
};

// Tournament types
export interface DiscoveredEvent {
  sport: string;
  sportName: string;
  eventId: string;
  eventName: string;
  year: number;
  teamCount: number;
  status: 'upcoming' | 'in_progress' | 'completed';
  startDate?: string;
  endDate?: string;
  tournamentId?: string | null;
  dbTeamCount?: number;
  existsInDb?: boolean;
}

export interface SportInfo {
  id: string;
  name: string;
  events: { id: string; name: string; teamCount: number }[];
}

export interface EventsDiscoveryResponse {
  sport: string;
  sportName: string;
  year: number;
  events: DiscoveredEvent[];
  availableYears: number[];
}

export interface SportsListResponse {
  sports: SportInfo[];
  availableYears: number[];
}

export interface EventPreviewResponse {
  sport: string;
  year: number;
  eventId?: string;
  teamCount: number;
  teams: any[];
  hasMore: boolean;
}

export interface CreateTournamentResponse {
  tournament: any;
  created: boolean;
  message: string;
}

// Tournaments
export const tournamentsApi = {
  // Standard tournament endpoints
  list: (params?: { status?: string; sport?: string; year?: string }) =>
    fetchApi<any[]>(`/tournaments${params ? `?${new URLSearchParams(params as any)}` : ''}`),

  get: (id: string) =>
    fetchApi<any>(`/tournaments/${id}`),

  getTeams: (id: string, params?: { region?: string; eliminated?: string }) =>
    fetchApi<any[]>(`/tournaments/${id}/teams${params ? `?${new URLSearchParams(params as any)}` : ''}`),

  getGames: (id: string, params?: { round?: string; status?: string }) =>
    fetchApi<any[]>(`/tournaments/${id}/games${params ? `?${new URLSearchParams(params as any)}` : ''}`),

  getBracket: (id: string) =>
    fetchApi<any>(`/tournaments/${id}/bracket`),

  getStandings: (id: string) =>
    fetchApi<any[]>(`/tournaments/${id}/standings`),

  // ESPN Event Discovery endpoints
  getSports: () =>
    fetchApi<SportsListResponse>('/tournaments/events/sports'),

  discoverEvents: (sport: string, year: number) =>
    fetchApi<EventsDiscoveryResponse>(`/tournaments/events/discover?sport=${sport}&year=${year}`),

  previewEvent: (sport: string, year: number, eventId?: string) =>
    fetchApi<EventPreviewResponse>(
      `/tournaments/events/preview?sport=${sport}&year=${year}${eventId ? `&eventId=${eventId}` : ''}`
    ),

  createFromEvent: (data: { sport: string; year: number; eventId?: string; eventName?: string }, token: string) =>
    fetchApi<CreateTournamentResponse>('/tournaments/events/create', {
      method: 'POST',
      body: data,
      token,
    }),
};

export { ApiError };

