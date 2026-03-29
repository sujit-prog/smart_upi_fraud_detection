import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    SafeAreaView, KeyboardAvoidingView, Platform, Modal,
    Animated, StatusBar, ScrollView, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, T, S, SPACE, RADIUS } from '../theme';

export default function PaymentScreen({ navigation, route }) {
    const { upiId = 'unknown@upi', isHighRisk = false, riskFactors = [] } = route.params || {};
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [showRiskModal, setShowRiskModal] = useState(isHighRisk);

    const sheetAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (showRiskModal) {
            Animated.spring(sheetAnim, {
                toValue: 0, friction: 9, tension: 50, useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(sheetAnim, {
                toValue: 400, duration: 300, useNativeDriver: true,
            }).start();
        }
    }, [showRiskModal]);

    const handlePay = () => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
        
        const url = `upi://pay?pa=${upiId}&pn=Receiver&am=${amount}&cu=INR&tn=${encodeURIComponent(note || 'Payment')}`;
        
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                console.log("No UPI apps installed");
                // Navigate to success mock if no UPI app installed on this dev device
                navigation.navigate('Success', { amount, upiId });
            }
        }).catch(err => console.error("An error occurred", err));
    };

    const amountValid = amount && !isNaN(amount) && parseFloat(amount) > 0;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Make Payment</Text>
                    <View style={{ width: 44 }} />
                </View>

                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={{ opacity: fadeAnim }}
                >
                    {/* Receiver Card */}
                    <Animated.View style={[styles.receiverCard, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.receiverAvatar}>
                            <Text style={styles.receiverInitial}>
                                {upiId.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.receiverInfo}>
                            <Text style={styles.receiverUpi}>{upiId}</Text>
                            <Text style={styles.receiverBank}>Registered UPI Account</Text>
                        </View>
                        <View style={[
                            styles.riskBadge,
                            { backgroundColor: isHighRisk ? C.errorContainer : C.tertiaryFixed }
                        ]}>
                            <Text style={[styles.riskBadgeText, { color: isHighRisk ? C.error : C.tertiary }]}>
                                {isHighRisk ? '⚠ Risk' : '✓ Safe'}
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Amount Input */}
                    <View style={styles.amountSection}>
                        <Text style={styles.amountLabel}>Enter Amount</Text>
                        <View style={styles.amountRow}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                placeholderTextColor={C.outlineVariant}
                                keyboardType="numeric"
                                autoFocus={!isHighRisk}
                            />
                        </View>
                        {/* Quick amount chips */}
                        <View style={styles.quickAmounts}>
                            {['500', '1000', '2000', '5000'].map(q => (
                                <TouchableOpacity
                                    key={q}
                                    style={styles.quickChip}
                                    onPress={() => setAmount(q)}
                                >
                                    <Text style={styles.quickChipText}>₹{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Note input */}
                    <View style={styles.noteWrapper}>
                        <Text style={styles.noteLabel}>Add a note (optional)</Text>
                        <View style={styles.noteBox}>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="e.g. Rent, Food, etc."
                                placeholderTextColor={C.textMuted}
                                value={note}
                                onChangeText={setNote}
                            />
                        </View>
                    </View>

                    {/* High Risk Warning Banner */}
                    {isHighRisk && (
                        <TouchableOpacity
                            style={styles.riskBanner}
                            onPress={() => setShowRiskModal(true)}
                        >
                            <Text style={styles.riskBannerText}>⚠ High risk detected — Tap to review</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 120 }} />
                </Animated.ScrollView>

                {/* Fixed Pay Button */}
                <View style={styles.payBtnWrapper}>
                    <TouchableOpacity
                        onPress={handlePay}
                        disabled={!amountValid}
                        activeOpacity={0.85}
                        style={styles.payBtnOuter}
                    >
                        <LinearGradient
                            colors={amountValid
                                ? (isHighRisk ? [C.error, '#d62929'] : [C.primary, C.primaryContainer])
                                : [C.surfaceHigh, C.surfaceHigh]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.payBtn}
                        >
                            <Text style={[styles.payBtnText, !amountValid && { color: C.textMuted }]}>
                                {amountValid ? `Pay ₹${parseFloat(amount).toLocaleString('en-IN')}` : 'Enter Amount'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* ── Risk Alert Modal ─────────────────────────────────────────── */}
            <Modal visible={showRiskModal} transparent animationType="none" statusBarTranslucent>
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowRiskModal(false)}
                />
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
                    {isHighRisk ? (
                        <>
                            <View style={styles.sheetHandle} />
                            <View style={[styles.alertIconCircle, { backgroundColor: C.errorContainer }]}>
                                <Text style={{ fontSize: 32 }}>⚠️</Text>
                            </View>
                            <Text style={[styles.sheetTitle, { color: C.error }]}>High Fraud Risk Detected</Text>
                            <Text style={styles.sheetDesc}>
                                Our AI engine has flagged this UPI ID as suspicious. Proceeding may result in financial loss.
                            </Text>
                            {riskFactors.length > 0 && (
                                <View style={styles.factorBox}>
                                    <Text style={styles.factorBoxTitle}>RISK FACTORS</Text>
                                    {riskFactors.map((f, i) => (
                                        <View key={i} style={styles.factorItem}>
                                            <View style={styles.factorDot} />
                                            <Text style={styles.factorText}>{f}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            <View style={styles.sheetBtnGroup}>
                                <TouchableOpacity
                                    style={styles.sheetCancelBtn}
                                    onPress={() => navigation.navigate('Home')}
                                >
                                    <Text style={styles.sheetCancelText}>Cancel Payment</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.sheetProceedBtnOuter}
                                    onPress={() => setShowRiskModal(false)}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient colors={[C.error, '#d62929']} style={styles.sheetProceedBtn}>
                                        <Text style={styles.sheetProceedText}>I Understand, Proceed</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.sheetHandle} />
                            <View style={[styles.alertIconCircle, { backgroundColor: C.tertiaryFixed }]}>
                                <Text style={{ fontSize: 32 }}>✅</Text>
                            </View>
                            <Text style={[styles.sheetTitle, { color: C.tertiary }]}>Verified & Safe</Text>
                            <Text style={styles.sheetDesc}>
                                This UPI ID has a clean transaction history. Your payment is protected by AI fraud detection.
                            </Text>
                            <TouchableOpacity
                                style={styles.sheetProceedBtnOuter}
                                onPress={() => setShowRiskModal(false)}
                            >
                                <LinearGradient
                                    colors={[C.primary, C.primaryContainer]}
                                    style={styles.sheetProceedBtn}
                                >
                                    <Text style={styles.sheetProceedText}>Continue to Pay</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:        { flex: 1, backgroundColor: C.bg },
    header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
    backBtn:          { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: C.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
    backArrow:        { fontSize: 22, color: C.text },
    headerTitle:      { ...T.headlineSm, color: C.text },

    scrollContent:    { paddingHorizontal: SPACE.lg },

    // Receiver card
    receiverCard:     { backgroundColor: C.surfaceLowest, borderRadius: RADIUS.xl, padding: SPACE.md, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.xl, ...S.md },
    receiverAvatar:   { width: 52, height: 52, borderRadius: RADIUS.full, backgroundColor: C.primaryFixed, justifyContent: 'center', alignItems: 'center' },
    receiverInitial:  { ...T.headlineMd, color: C.primary },
    receiverInfo:     { flex: 1 },
    receiverUpi:      { ...T.titleSm, color: C.text, marginBottom: 2 },
    receiverBank:     { ...T.bodySm, color: C.textMuted },
    riskBadge:        { borderRadius: RADIUS.full, paddingHorizontal: SPACE.sm, paddingVertical: 4 },
    riskBadgeText:    { ...T.labelSm },

    // Amount
    amountSection:    { alignItems: 'center', marginBottom: SPACE.xl },
    amountLabel:      { ...T.labelMd, color: C.textSecondary, marginBottom: SPACE.sm },
    amountRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.md },
    currencySymbol:   { ...T.displayMd, color: C.textSecondary },
    amountInput:      { ...T.displayLg, color: C.text, minWidth: 100 },
    quickAmounts:     { flexDirection: 'row', gap: SPACE.sm },
    quickChip:        { backgroundColor: C.surfaceContainer, borderRadius: RADIUS.full, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs },
    quickChipText:    { ...T.labelMd, color: C.primary },

    // Note
    noteWrapper:      { marginBottom: SPACE.md },
    noteLabel:        { ...T.labelMd, color: C.textSecondary, marginBottom: SPACE.xs },
    noteBox:          { backgroundColor: C.surfaceLow, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
    noteInput:        { ...T.bodyMd, color: C.text, height: 44 },

    riskBanner:       { backgroundColor: C.errorContainer, borderRadius: RADIUS.md, padding: SPACE.md, alignItems: 'center' },
    riskBannerText:   { ...T.labelMd, color: C.error },

    // Pay button
    payBtnWrapper:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACE.lg, backgroundColor: C.bg, paddingBottom: SPACE.xl },
    payBtnOuter:      { borderRadius: RADIUS.lg, overflow: 'hidden' },
    payBtn:           { height: 58, justifyContent: 'center', alignItems: 'center' },
    payBtnText:       { ...T.headlineSm, fontSize: 18, color: C.onPrimary },

    // Modal
    modalBackdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,27,41,0.5)' },
    bottomSheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surfaceLowest, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, padding: SPACE.xl, paddingBottom: 40 },
    sheetHandle:      { width: 40, height: 4, backgroundColor: C.outlineVariant, borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACE.lg },
    alertIconCircle:  { width: 80, height: 80, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: SPACE.md },
    sheetTitle:       { ...T.headlineMd, textAlign: 'center', marginBottom: SPACE.sm },
    sheetDesc:        { ...T.bodyMd, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACE.lg },
    factorBox:        { backgroundColor: C.surfaceLow, borderRadius: RADIUS.md, padding: SPACE.md, width: '100%', marginBottom: SPACE.lg },
    factorBoxTitle:   { ...T.labelSm, color: C.textMuted, marginBottom: SPACE.sm },
    factorItem:       { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
    factorDot:        { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: C.error },
    factorText:       { ...T.bodyMd, color: C.text },
    sheetBtnGroup:    { gap: SPACE.sm },
    sheetCancelBtn:   { height: 52, backgroundColor: C.surfaceHigh, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
    sheetCancelText:  { ...T.titleSm, color: C.textSecondary },
    sheetProceedBtnOuter: { borderRadius: RADIUS.lg, overflow: 'hidden' },
    sheetProceedBtn:  { height: 52, justifyContent: 'center', alignItems: 'center' },
    sheetProceedText: { ...T.titleMd, color: C.onPrimary },
});
