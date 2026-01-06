export const APP_NAME = 'Cutta';

// Auction settings
export const AUCTION_TIMER_DURATION = 15; // seconds
export const AUCTION_TIMER_EXTENSION = 10; // seconds added on new bid
export const MIN_BID_INCREMENT = 1; // $1 minimum increment

// Secondary market
export const PLATFORM_FEE_RATE = 0.01; // 1%
export const MIN_LISTING_PRICE = 1; // $1
export const MAX_LISTING_DURATION_DAYS = 30;

// Payout defaults
export const DEFAULT_PAYOUT_STRUCTURE = [
  { name: 'Champion', trigger: 'championship_win', percentage: 50 },
  { name: 'Runner-up', trigger: 'final_four', percentage: 25 },
  { name: 'Final Four', trigger: 'final_four', percentage: 15 },
  { name: 'Elite Eight', trigger: 'elite_eight', percentage: 10 },
] as const;

// UI Constants
export const AVATAR_PLACEHOLDER = '/images/avatar-placeholder.png';
export const TEAM_LOGO_PLACEHOLDER = '/images/team-placeholder.png';

// Socket events
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_POOL: 'joinPool',
  LEAVE_POOL: 'leavePool',
  PLACE_BID: 'placeBid',
  SEND_MESSAGE: 'sendMessage',
  SEND_REACTION: 'sendReaction',
  START_TYPING: 'startTyping',
  STOP_TYPING: 'stopTyping',
  
  // Server -> Client
  CONNECTED: 'connected',
  ERROR: 'error',
  AUCTION_STATE_UPDATE: 'auctionStateUpdate',
  ITEM_ACTIVE: 'itemActive',
  NEW_BID: 'newBid',
  TIMER_UPDATE: 'timerUpdate',
  ITEM_SOLD: 'itemSold',
  AUCTION_PAUSED: 'auctionPaused',
  AUCTION_RESUMED: 'auctionResumed',
  AUCTION_COMPLETED: 'auctionCompleted',
  NEW_MESSAGE: 'newMessage',
  MESSAGE_REACTION: 'messageReaction',
  USER_TYPING: 'userTyping',
  USER_STOPPED_TYPING: 'userStoppedTyping',
  MEMBER_JOINED: 'memberJoined',
  MEMBER_LEFT: 'memberLeft',
  POOL_UPDATED: 'poolUpdated',
  GAME_UPDATE: 'gameUpdate',
  TEAM_ELIMINATED: 'teamEliminated',
  PAYOUT_PROCESSED: 'payoutProcessed',
  BALANCE_UPDATE: 'balanceUpdate',
} as const;

// API Routes
export const API_ROUTES = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    PAYMENT_METHODS: '/users/payment-methods',
    BALANCE: '/users/balance',
    WITHDRAW: '/users/withdraw',
  },
  POOLS: {
    BASE: '/pools',
    JOIN: '/pools/:id/join',
    MEMBERS: '/pools/:id/members',
    AUCTION: '/pools/:id/auction',
    PAYOUTS: '/pools/:id/payouts',
  },
  AUCTION: {
    BID: '/auction/:itemId/bid',
    START: '/auction/:poolId/start',
    PAUSE: '/auction/:poolId/pause',
    RESUME: '/auction/:poolId/resume',
    NEXT: '/auction/:poolId/next',
  },
  MARKET: {
    LISTINGS: '/market/listings',
    MY_LISTINGS: '/market/my-listings',
    OFFERS: '/market/offers',
    TRANSACTIONS: '/market/transactions',
  },
  TOURNAMENT: {
    BASE: '/tournaments',
    TEAMS: '/tournaments/:id/teams',
    GAMES: '/tournaments/:id/games',
    STANDINGS: '/tournaments/:id/standings',
  },
} as const;

