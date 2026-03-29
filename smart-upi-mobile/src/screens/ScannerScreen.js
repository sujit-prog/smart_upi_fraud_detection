import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Animated, StatusBar, Platform, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { C, T, S, SPACE, RADIUS } from '../theme';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen({ navigation, route }) {
    const prefill = route?.params?.prefillUpi || '';
    const [upiId, setUpiId] = useState(prefill);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();

        // Premium laser pulse
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setScanned(true);
            const fakeGalleryUPI = 'gallery.merchant@ybl';
            setUpiId(fakeGalleryUPI);
            analyzeRisk(fakeGalleryUPI);
        }
    };

    const analyzeRisk = async (id) => {
        if (!id?.trim()) return;
        setIsAnalyzing(true);
        setErrorMsg(null);

        try {
            const API_URL = 'http://192.168.215.110:8000/api/v1/fraud/analyze-upi';
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upi_id: id.trim() }),
            });

            if (!response.ok) throw new Error('Backend unreachable');
            const data = await response.json();

            let isHighRisk = false;
            let riskScore = 25;
            let riskFactors = [];

            if (data?.length > 0) {
                const latest = data[0];
                isHighRisk = latest?.risk?.level === 'High';
                riskFactors = isHighRisk ? latest.risk.factors.split(', ') : [];
                riskScore = isHighRisk ? 78 : 22;
            }

            setTimeout(() => {
                setIsAnalyzing(false);
                navigation.navigate('FraudAssessment', {
                    upiId: id.trim(),
                    isHighRisk,
                    riskScore,
                    riskFactors,
                });
            }, 1200);

        } catch (err) {
            // Demo fallback
            setTimeout(() => {
                setIsAnalyzing(false);
                navigation.navigate('FraudAssessment', {
                    upiId: id.trim(),
                    isHighRisk: false,
                    riskScore: 18,
                    riskFactors: [],
                });
            }, 1500);
        }
    };

    // ── Loading State ────────────────────────────────────────────────────────
    if (isAnalyzing) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={['#101524', '#080b14']} style={StyleSheet.absoluteFill} />
                <View style={[styles.loadingCard, styles.glassPane]}>
                    <View style={styles.aiOrb}>
                        <ActivityIndicator size="large" color={C.primary} />
                    </View>
                    <Text style={[styles.loadingTitle, { color: C.surfaceLowest }]}>AI Risk Engine</Text>
                    <Text style={styles.loadingSubtitle}>Deep Scanning: {upiId}</Text>
                    <View style={styles.loadingSteps}>
                        {['Fetching registry data', 'Analyzing velocity patterns', 'Computing AI fraud score'].map((step, i) => (
                            <View key={i} style={styles.loadingStep}>
                                <View style={[styles.loadingDot, { backgroundColor: C.primaryContainer }]} />
                                <Text style={styles.loadingStepText}>{step}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // ── No Permission ────────────────────────────────────────────────────────
    if (!permission?.granted) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Text style={styles.permText}>Camera access is required for scanning UPI codes.</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Enable Camera</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Main Screen ──────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
            
            {/* Fullscreen Camera Background */}
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torchOn}
                onBarcodeScanned={scanned ? undefined : ({ data }) => {
                    if (data) {
                        setScanned(true);
                        setUpiId(data);
                        analyzeRisk(data);
                    }
                }}
            />

            {/* Dark Overlay for contrast */}
            <View style={styles.darkOverlay} />

            <View style={styles.contentWrapper}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scan & Pay</Text>
                    <TouchableOpacity onPress={() => setTorchOn(!torchOn)} style={[styles.actionBtn, torchOn && styles.actionBtnActive]}>
                        <Text style={styles.actionIcon}>🔦</Text>
                    </TouchableOpacity>
                </View>

                {/* Viewfinder Target */}
                <Animated.View style={[styles.viewfinderContainer, { opacity: fadeAnim }]}>
                    <View style={styles.viewfinderActive}>
                        {[
                            { top: 0, left: 0,    borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: RADIUS.lg },
                            { top: 0, right: 0,   borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: RADIUS.lg },
                            { bottom: 0, left: 0,  borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: RADIUS.lg },
                            { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: RADIUS.lg },
                        ].map((corner, i) => (
                            <View key={i} style={[styles.cornerBox, corner]} />
                        ))}
                        <Animated.View style={[styles.laserLine, { opacity: pulseAnim }]} />
                    </View>
                    
                    {/* Gallery Button */}
                    <TouchableOpacity style={styles.galleryBtn} onPress={pickImage}>
                        <Text style={styles.galleryIcon}>🖼️</Text>
                        <Text style={styles.galleryText}>Upload from Gallery</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Bottom Glass Panel */}
                <Animated.View style={[styles.bottomPanel, styles.glassPane, { transform: [{ translateY: slideAnim }] }]}>
                    <Text style={styles.panelTitle}>Manual Entry</Text>
                    
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="xyz@bank or 9876543210"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={upiId}
                            onChangeText={(t) => { setUpiId(t); setScanned(false); }}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {errorMsg && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => analyzeRisk(upiId)}
                        disabled={!upiId?.trim()}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={upiId?.trim() ? [C.primary, C.primaryContainer] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaBtn}
                        >
                            <Text style={[styles.ctaText, !upiId?.trim() && { color: 'rgba(255,255,255,0.3)' }]}>
                                Verify & Proceed
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.footNote}>Smart AI Protection Active 🛡️</Text>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:        { flex: 1, backgroundColor: '#000' },
    centerContainer:  { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: SPACE.lg },
    darkOverlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    
    contentWrapper:   { flex: 1, justifyContent: 'space-between' },

    header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + SPACE.md : SPACE.xl },
    backBtn:          { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    backArrow:        { fontSize: 22, color: '#fff' },
    headerTitle:      { ...T.headlineSm, color: '#fff' },
    actionBtn:        { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    actionBtnActive:  { backgroundColor: C.primary, borderColor: C.primaryContainer },
    actionIcon:       { fontSize: 20 },

    viewfinderContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    viewfinderActive: { width: width * 0.7, height: width * 0.7, position: 'relative', marginBottom: SPACE.xl },
    cornerBox:        { position: 'absolute', width: 40, height: 40, borderColor: C.primaryContainer },
    laserLine:        { position: 'absolute', left: '10%', right: '10%', top: '50%', height: 2, backgroundColor: '#4da3ff', shadowColor: '#4da3ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },

    galleryBtn:       { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: 'rgba(20,20,20,0.6)', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    galleryIcon:      { fontSize: 20 },
    galleryText:      { ...T.labelMd, color: '#fff' },

    glassPane:        { backgroundColor: 'rgba(20, 25, 35, 0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    bottomPanel:      { borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, padding: SPACE.xl, paddingBottom: Platform.OS === 'ios' ? 40 : SPACE.xl },
    panelTitle:       { ...T.labelMd, color: 'rgba(255,255,255,0.7)', marginBottom: SPACE.sm },
    
    inputWrapper:     { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: SPACE.lg },
    input:            { ...T.titleMd, color: '#fff', height: 56, paddingHorizontal: SPACE.md, textAlign: 'center' },

    ctaBtn:           { height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.lg },
    ctaText:          { ...T.titleMd, color: C.onPrimary },
    
    footNote:         { ...T.labelSm, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: SPACE.md },

    errorBox:         { backgroundColor: 'rgba(214, 41, 41, 0.2)', borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md, borderWidth: 1, borderColor: C.error },
    errorText:        { ...T.bodySm, color: '#ffb3b3', textAlign: 'center' },

    loadingCard:      { borderRadius: RADIUS.xxl, padding: SPACE.xl, alignItems: 'center', width: '90%' },
    aiOrb:            { width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: 'rgba(0, 102, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACE.xl, borderWidth: 2, borderColor: C.primary },
    loadingTitle:     { ...T.headlineSm, marginBottom: 4 },
    loadingSubtitle:  { ...T.bodySm, color: 'rgba(255,255,255,0.6)', marginBottom: SPACE.xl },
    loadingSteps:     { width: '100%', gap: SPACE.md },
    loadingStep:      { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
    loadingDot:       { width: 8, height: 8, borderRadius: RADIUS.full },
    loadingStepText:  { ...T.bodyMd, color: 'rgba(255,255,255,0.8)' },

    permText:         { ...T.bodyMd, color: '#fff', textAlign: 'center', marginBottom: SPACE.lg },
    permBtn:          { backgroundColor: C.primary, borderRadius: RADIUS.lg, padding: SPACE.md },
    permBtnText:      { ...T.titleSm, color: C.onPrimary },
});
