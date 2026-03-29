import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
    initialRouteName: 'index',
};

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Manrope-Regular':  Manrope_400Regular,
        'Manrope-SemiBold': Manrope_600SemiBold,
        'Manrope-Bold':     Manrope_700Bold,
        'Inter-Regular':    Inter_400Regular,
        'Inter-Medium':     Inter_500Medium,
        'Inter-SemiBold':   Inter_600SemiBold,
    });

    useEffect(() => {
        if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#faf8ff' },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="scanner" />
                <Stack.Screen name="fraud-assessment" />
                <Stack.Screen name="payment" />
                <Stack.Screen name="success" options={{ animation: 'fade_from_bottom' }} />
            </Stack>
        </>
    );
}
