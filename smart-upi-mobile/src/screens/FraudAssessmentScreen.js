import React, { useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    SafeAreaView, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, T, S, SPACE, RADIUS } from '../theme';

const RISK_FACTORS = {
    safe: [
        { label: 'User History',         status: 'Trusted',       safe: true },
        { label: 'Transaction Amount',    status: 'Normal Range',  safe: true },
        { label: 'Transaction Velocity', status: 'Within Limit',  safe: true },
        { label: 'Device Fingerprint',   status: 'Verified',      safe: true },
        { label: 'Merchant Category',    status: 'Whitelisted',   safe: true },
    ],
    risky: [
        { label: 'User History',         status: 'New / Unknown',    safe: false },
        { label: 'Transaction Amount',   status: 'Unusually Large',  safe: false },
        { label: 'Transaction Velocity', status: 'High Frequency',   safe: false },
        { label: 'Device Fingerprint',   status: 'Unrecognised',     safe: true  },
        { label: 'Merchant Category',    status: 'High-Risk',        safe: false },
    ],
};

function RiskScoreArc({ score, isHighRisk }) {
    const animScore = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animScore, {
            toValue: score,
            duration: 1000,
            delay: 300,
            useNativeDriver: false,
        }).start();
    }, []);

    const arcColor = isHighRisk ? C.error : C.tertiary;
    const arcBg    = isHighRisk ? C.errorContainer : C.tertiaryFixed;

    return (
        <View style={styles.arcContainer}>
            <View style={[styles.arcOuter, { borderColor: C.outlineVariant }]}>
                <View style={[styles.arcInner, { backgroundColor: arcBg }]}>
                    <Text style={[styles.arcScore, { color: arcColor }]}>{score}</Text>
                    <Text style={[styles.arcLabel, { color: arcColor }]}>
                        {isHighRisk ? 'HIGH RISK' : 'LOW RISK'}
                    </Text>
                </View>
            </View>
            {/* Progress bar below arc */}
            <View style={styles.barTrack}>
                <Animated.View style={[
                    styles.barFill,
                    {
                        backgroundColor: arcColor,
                        width: animScore.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                        }),
                    }
                ]} />
            </View>
            <View style={styles.barLabels}>
                <Text style={[styles.barLabelText, { color: C.tertiary }]}>Safe</Text>
                <Text style={[styles.barLabelText, { color: C.error }]}>High Risk</Text>
            </View>
        </View>
    );
}

export default function FraudAssessmentScreen({ navigation, route }) {
    const { upiId = 'unknown@upi', isHighRisk = false, riskScore = 18, riskFactors = [] } = route.params || {};
    const factors = isHighRisk ? RISK_FACTORS.risky : RISK_FACTORS.safe;

    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleProceed = () => {
        navigation.navigate('Payment', { upiId, isHighRisk, riskFactors: isHighRisk ? factors.filter(f => !f.safe).map(f => f.label) : [] });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Risk Assessment</Text>
                <View style={{ width: 44 }} />
            </View>

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
            >
                {/* UPI ID chip */}
                <View style={styles.upiChip}>
                    <Text style={styles.upiChipText}>UPI: {upiId}</Text>
                </View>

                {/* Risk Score Arc */}
                <View style={[styles.card, styles.scoreCard]}>
                    <Text style={styles.cardTitle}>Overall Risk Score</Text>
                    <RiskScoreArc score={riskScore} isHighRisk={isHighRisk} />
                    <View style={[
                        styles.overallBadge,
                        { backgroundColor: isHighRisk ? C.errorContainer : C.tertiaryFixed }
                    ]}>
                        <Text style={[
                            styles.overallBadgeText,
                            { color: isHighRisk ? C.error : C.tertiary }
                        ]}>
                            {isHighRisk ? '⚠ HIGH FRAUD RISK DETECTED' : '✓ TRANSACTION APPEARS SAFE'}
                        </Text>
                    </View>
                </View>

                {/* Risk Factor Breakdown */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Risk Factor Breakdown</Text>
                    <View style={styles.factorList}>
                        {factors.map((f, i) => (
                            <View key={i} style={[styles.factorRow, i > 0 && styles.factorRowBorder]}>
                                <View style={styles.factorIcon}>
                                    <Text>{f.safe ? '✓' : '✗'}</Text>
                                </View>
                                <Text style={styles.factorLabel}>{f.label}</Text>
                                <View style={[
                                    styles.factorChip,
                                    { backgroundColor: f.safe ? C.tertiaryFixed : C.errorContainer }
                                ]}>
                                    <Text style={[
                                        styles.factorChipText,
                                        { color: f.safe ? C.tertiary : C.error }
                                    ]}>
                                        {f.status}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* AI Explanation */}
                <View style={[styles.card, { backgroundColor: C.primaryFixed }]}>
                    <Text style={styles.aiTitle}>🤖 AI Analysis</Text>
                    <Text style={styles.aiBody}>
                        {isHighRisk
                            ? 'Multiple high-risk signals detected for this UPI ID. Our model has flagged this transaction with a high confidence score. Proceeding is strongly discouraged.'
                            : 'This UPI ID shows normal, trusted transaction patterns. Our AI model has analyzed historical data and found no suspicious indicators for this receiver.'}
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.btnGroup}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={styles.cancelBtnText}>Cancel Payment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleProceed} activeOpacity={0.85} style={styles.proceedWrapper}>
                        <LinearGradient
                            colors={isHighRisk ? [C.error, '#d62929'] : [C.primary, C.primaryContainer]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.proceedBtn}
                        >
                            <Text style={styles.proceedBtnText}>
                                {isHighRisk ? 'Proceed Anyway →' : 'Proceed to Pay →'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:        { flex: 1, backgroundColor: C.bg },
    header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
    backBtn:          { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: C.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
    backArrow:        { fontSize: 22, color: C.text },
    headerTitle:      { ...T.headlineSm, color: C.text },

    scrollContent:    { paddingHorizontal: SPACE.lg, paddingBottom: 40 },

    upiChip:          { backgroundColor: C.surfaceContainer, borderRadius: RADIUS.full, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, alignSelf: 'center', marginBottom: SPACE.lg },
    upiChipText:      { ...T.labelMd, color: C.textSecondary },

    card:             { backgroundColor: C.surfaceLowest, borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md, ...S.md },
    scoreCard:        { alignItems: 'center' },
    cardTitle:        { ...T.titleMd, color: C.text, marginBottom: SPACE.lg, alignSelf: 'flex-start' },

    // Arc / Score
    arcContainer:     { alignItems: 'center', width: '100%', marginBottom: SPACE.md },
    arcOuter:         { width: 160, height: 160, borderRadius: RADIUS.full, borderWidth: 12, borderColor: C.outlineVariant, justifyContent: 'center', alignItems: 'center', marginBottom: SPACE.md },
    arcInner:         { width: 120, height: 120, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
    arcScore:         { ...T.displayMd, fontSize: 40 },
    arcLabel:         { ...T.labelMd, fontSize: 10 },
    barTrack:         { width: '100%', height: 8, backgroundColor: C.surfaceHigh, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 6 },
    barFill:          { height: '100%', borderRadius: RADIUS.full },
    barLabels:        { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    barLabelText:     { ...T.labelSm, fontSize: 10 },

    overallBadge:     { borderRadius: RADIUS.full, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs },
    overallBadgeText: { ...T.labelMd },

    // Factors
    factorList:       {},
    factorRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACE.sm, gap: SPACE.sm },
    factorRowBorder:  { borderTopWidth: 1, borderTopColor: C.surfaceDim },
    factorIcon:       { width: 24, height: 24, borderRadius: RADIUS.full, backgroundColor: C.surfaceLow, justifyContent: 'center', alignItems: 'center' },
    factorLabel:      { ...T.bodyMd, color: C.text, flex: 1 },
    factorChip:       { borderRadius: RADIUS.full, paddingHorizontal: SPACE.sm, paddingVertical: 2 },
    factorChipText:   { ...T.labelSm, fontSize: 10 },

    // AI explainer
    aiTitle:          { ...T.titleSm, color: C.primary, marginBottom: SPACE.xs },
    aiBody:           { ...T.bodyMd, color: C.textSecondary, lineHeight: 22 },

    // Buttons
    btnGroup:         { gap: SPACE.sm, marginTop: SPACE.sm },
    cancelBtn:        { height: 56, borderRadius: RADIUS.lg, backgroundColor: C.surfaceHigh, justifyContent: 'center', alignItems: 'center' },
    cancelBtnText:    { ...T.titleSm, color: C.textSecondary },
    proceedWrapper:   { borderRadius: RADIUS.lg, overflow: 'hidden' },
    proceedBtn:       { height: 56, justifyContent: 'center', alignItems: 'center' },
    proceedBtnText:   { ...T.titleMd, color: C.onPrimary },
});
