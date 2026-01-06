import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Welcome: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Pool: { id: string };
  Draft: { id: string };
  Notifications: undefined;
  PoolCreate: undefined;
  PoolJoin: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Pools: undefined;
  Market: undefined;
  Wallet: undefined;
  Profile: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Global declaration for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

