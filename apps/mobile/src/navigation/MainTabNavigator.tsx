import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/tabs/HomeScreen';
import { PoolsScreen } from '../screens/tabs/PoolsScreen';
import { MarketScreen } from '../screens/tabs/MarketScreen';
import { WalletScreen } from '../screens/tabs/WalletScreen';
import { ProfileScreen } from '../screens/tabs/ProfileScreen';
import { colors } from '../lib/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.dark[400],
        tabBarStyle: {
          backgroundColor: colors.dark[900],
          borderTopColor: colors.dark[700],
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.dark[800],
          borderBottomWidth: 1,
          borderBottomColor: colors.dark[700],
        },
        headerTitleStyle: {
          color: colors.text.primary,
          fontWeight: 'bold',
        },
        headerTintColor: colors.text.primary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Pools"
        component={PoolsScreen}
        options={{
          title: 'Pools',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          title: 'Market',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

