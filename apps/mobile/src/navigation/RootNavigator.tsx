import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { colors } from '../lib/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.dark[800],
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: colors.dark[900],
        },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Pool"
        component={PlaceholderScreen}
        options={{ title: 'Pool' }}
      />
      <Stack.Screen
        name="Draft"
        component={PlaceholderScreen}
        options={{
          title: 'Draft Room',
          presentation: 'fullScreenModal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={PlaceholderScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="PoolCreate"
        component={PlaceholderScreen}
        options={{ title: 'Create Pool' }}
      />
      <Stack.Screen
        name="PoolJoin"
        component={PlaceholderScreen}
        options={{ title: 'Join Pool' }}
      />
    </Stack.Navigator>
  );
}

// Placeholder for screens not yet implemented
function PlaceholderScreen() {
  return null;
}

