import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// ── Fonts ─────────────────────────────────────────────────────────────────────
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

// ── Screens ───────────────────────────────────────────────────────────────────
import HomeScreen             from './src/screens/HomeScreen';
import ScannerScreen          from './src/screens/ScannerScreen';
import FraudAssessmentScreen  from './src/screens/FraudAssessmentScreen';
import PaymentScreen          from './src/screens/PaymentScreen';
import SuccessScreen          from './src/screens/SuccessScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Match Stitch light theme
const StitchTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background:  '#faf8ff',
        card:        '#ffffff',
        text:        '#151b29',
        border:      '#c3c6d6',
        primary:     '#0040a1',
        notification:'#ba1a1a',
    },
};

export default function App() {
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
            <NavigationContainer theme={StitchTheme}>
                <Stack.Navigator
                    initialRouteName="Home"
                    screenOptions={{
                        headerShown: false,
                        animation: 'slide_from_right',
                        contentStyle: { backgroundColor: '#faf8ff' },
                    }}
                >
                    <Stack.Screen name="Home"            component={HomeScreen} />
                    <Stack.Screen name="Scanner"         component={ScannerScreen} />
                    <Stack.Screen name="FraudAssessment" component={FraudAssessmentScreen} />
                    <Stack.Screen name="Payment"         component={PaymentScreen} />
                    <Stack.Screen
                        name="Success"
                        component={SuccessScreen}
                        options={{ animation: 'fade_from_bottom' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </>
    );
}
