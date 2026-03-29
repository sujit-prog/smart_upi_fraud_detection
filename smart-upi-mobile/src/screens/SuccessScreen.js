import React, { useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
    Animated, Easing, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, T, S, SPACE, RADIUS } from '../theme';

function AnimatedCheckmark() {
    const scaleAnim  = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(200),
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1, duration: 400, useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <Animated.View style={[
            styles.checkmarkWrapper,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
        ]}>
            <LinearGradient
                colors={[C.tertiary, C.tertiaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkmarkCircle}
            >
                <Text style={styles.checkmarkIcon}>✓</Text>
            </LinearGradient>
        </Animated.View>
    );
}

export default function SuccessScreen({ navigation, route }) {
    const { amount = '0', upiId = 'receiver@upi' } = route.params || {};

    const slideAnim = useRef(new Animated.Value(60)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 600, delay: 400, useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0, duration: 600, delay: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const txnId = 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const time  = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const details = [
        { label: 'To',             value: upiId },
        { label: 'Date',           value: `${today}, ${time}` },
        { label: 'Transaction ID', value: txnId },
        { label: 'Fraud Risk',     value: '✓ Safe — Verified by AI', highlight: true },
        { label: 'Payment Method', value: 'UPI' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Checkmark animation */}
                <AnimatedCheckmark />

                {/* Title */}
                <Animated.View style={[styles.titleSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <Text style={styles.successLabel}>Payment Successful</Text>
                    <Text style={styles.successAmount}>₹{parseFloat(amount).toLocaleString('en-IN')}</Text>
                    <View style={styles.safeChip}>
                        <Text style={styles.safeChipText}>🛡️ AI Fraud Protection Active</Text>
                    </View>
                </Animated.View>

                {/* Transaction Details Card */}
                <Animated.View style={[styles.detailsCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <Text style={styles.detailsTitle}>Transaction Details</Text>
                    {details.map((d, i) => (
                        <View key={i} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                            <Text style={styles.detailLabel}>{d.label}</Text>
                            <Text style={[styles.detailValue, d.highlight && { color: C.tertiary, fontFamily: 'Inter-SemiBold' }]}
                                numberOfLines={1}
                            >
                                {d.value}
                            </Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Share Receipt row */}
                <Animated.View style={[styles.shareRow, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={styles.shareBtn}>
                        <Text style={styles.shareBtnText}>📤  Share Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reportBtn}>
                        <Text style={styles.reportBtnText}>🚩  Report Issue</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Bottom Button */}
            <Animated.View style={[styles.fixedBottom, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Home')}
                    activeOpacity={0.85}
                    style={styles.homeBtn}
                >
                    <LinearGradient
                        colors={[C.primary, C.primaryContainer]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.homeBtnGradient}
                    >
                        <Text style={styles.homeBtnText}>Back to Home</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: C.bg },
    scrollContent:   { alignItems: 'center', paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl },

    // Checkmark
    checkmarkWrapper: { alignItems: 'center', marginBottom: SPACE.lg },
    checkmarkCircle: { width: 100, height: 100, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
    checkmarkIcon:   { fontSize: 44, color: C.onPrimary, fontWeight: 'bold' },

    // Title section
    titleSection:    { alignItems: 'center', marginBottom: SPACE.xl },
    successLabel:    { ...T.headlineSm, color: C.text, marginBottom: SPACE.xs },
    successAmount:   { ...T.displayLg, color: C.primary, marginBottom: SPACE.md },
    safeChip:        { backgroundColor: C.tertiaryFixed, borderRadius: RADIUS.full, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs },
    safeChipText:    { ...T.labelMd, color: C.tertiary },

    // Details card
    detailsCard:     { width: '100%', backgroundColor: C.surfaceLowest, borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md, ...S.md },
    detailsTitle:    { ...T.titleMd, color: C.text, marginBottom: SPACE.md },
    detailRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACE.sm },
    detailRowBorder: { borderTopWidth: 1, borderTopColor: C.surfaceDim },
    detailLabel:     { ...T.bodyMd, color: C.textSecondary, flex: 1 },
    detailValue:     { ...T.titleSm, color: C.text, flex: 1.5, textAlign: 'right' },

    // Share row
    shareRow:        { flexDirection: 'row', gap: SPACE.sm, width: '100%' },
    shareBtn:        { flex: 1, backgroundColor: C.primaryFixed, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, alignItems: 'center' },
    shareBtnText:    { ...T.labelMd, color: C.primary },
    reportBtn:       { flex: 1, backgroundColor: C.surfaceHighest, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, alignItems: 'center' },
    reportBtnText:   { ...T.labelMd, color: C.textSecondary },

    // Fixed bottom
    fixedBottom:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACE.lg, paddingBottom: SPACE.xl, backgroundColor: C.bg },
    homeBtn:         { borderRadius: RADIUS.lg, overflow: 'hidden' },
    homeBtnGradient: { height: 58, justifyContent: 'center', alignItems: 'center' },
    homeBtnText:     { ...T.headlineSm, fontSize: 18, color: C.onPrimary },
});
