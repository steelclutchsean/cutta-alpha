export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  balance: number;
  kycVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface UserProfile extends User {
  ownedTeams: number;
  totalWinnings: number;
  poolsJoined: number;
}

