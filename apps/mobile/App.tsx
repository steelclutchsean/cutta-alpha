import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from './src/lib/auth-context';
import { SocketProvider } from './src/lib/socket-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/lib/theme';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary[500],
    background: colors.dark[900],
    card: colors.dark[800],
    text: colors.text.primary,
    border: colors.dark[700],
    notification: colors.primary[500],
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={navTheme}>
        <AuthProvider>
          <SocketProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </SocketProvider>
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

