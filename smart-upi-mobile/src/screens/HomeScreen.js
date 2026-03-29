import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    SafeAreaView, Image, ActivityIndicator, StatusBar, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, T, S, SPACE, RADIUS } from '../theme';

export default function HomeScreen({ navigation }) {
    const [token, setToken] = useState(null);
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Home');

    // Silent Demo Login
    useEffect(() => {
        const silentLoginAndFetch = async () => {
            try {
                // 1. Login to get token for testuser
                const formData = new URLSearchParams();
                formData.append('username', 'testuser');
                formData.append('password', 'Password123!');

                const loginRes = await fetch('http://192.168.215.110:8000/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
                
                if (!loginRes.ok) throw new Error('Login failed');
                const authData = await loginRes.json();
                const jwt = authData.access_token;
                setToken(jwt);

                // 2. Fetch Dashboard Statistics
                const statsRes = await fetch('http://192.168.215.110:8000/api/v1/transactions/summary/stats', {
                    headers: { Authorization: `Bearer ${jwt}` }
                });
                if (statsRes.ok) setStats(await statsRes.json());

                // 3. Fetch Transaction List
                const txRes = await fetch('http://192.168.215.110:8000/api/v1/transactions/?limit=10', {
                    headers: { Authorization: `Bearer ${jwt}` }
                });
                if (txRes.ok) setTransactions(await txRes.json());

            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        silentLoginAndFetch();
    }, []);

    const formatCurrency = (val) => {
        if (!val) return '₹0.00';
        return `₹${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: SPACE.md }}>Connecting to Secure Server...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#050505" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Secure Dashboard</Text>
                        <Text style={styles.userName}>Hello, Test User</Text>
                    </View>
                    <View style={styles.profileBadge}>
                        <Text style={styles.profileInitials}>TU</Text>
                    </View>
                </View>

                {/* Main Balance Card */}
                <LinearGradient
                    colors={[C.primary, '#0047b3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.balanceCard}
                >
                    <View style={styles.balanceHeader}>
                        <Text style={styles.balanceLabel}>Total Value Transfer</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Protected ✓</Text>
                        </View>
                    </View>
                    <Text style={styles.balanceValue}>{formatCurrency(stats?.total_amount)}</Text>
                    
                    <View style={styles.cardFooter}>
                        <View>
                            <Text style={styles.footerLabel}>Risk Level</Text>
                            <Text style={[styles.footerValue, { color: stats?.fraud_rate > 10 ? '#ffb3b3' : '#a3f0c3' }]}>
                                {stats?.fraud_rate?.toFixed(1) || '0.0'}% AI Detected
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.footerLabel}>Total txns</Text>
                            <Text style={styles.footerValue}>{stats?.total_transactions || 0}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Quick Actions (Visually pleasing but static for now except Scanner) */}
                <View style={styles.actionsGrid}>
                    {[
                        { icon: 'send', label: 'Send', bg: 'rgba(0, 102, 255, 0.15)' },
                        { icon: 'arrow-down', label: 'Receive', bg: 'rgba(0, 204, 153, 0.15)' },
                        { icon: 'document-text', label: 'Bills', bg: 'rgba(255, 153, 51, 0.15)' },
                        { icon: 'shield-checkmark', label: 'Security', bg: 'rgba(153, 51, 255, 0.15)' }
                    ].map((btn, i) => (
                        <TouchableOpacity key={i} style={styles.actionBtn}>
                            <View style={[styles.actionIconWrapper, { backgroundColor: btn.bg }]}>
                                <Ionicons name={btn.icon} size={24} color="#fff" />
                            </View>
                            <Text style={styles.actionLabel}>{btn.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Live Transactions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Network Activity</Text>
                    <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
                </View>

                {transactions.length === 0 ? (
                    <Text style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>No transactions found in DB.</Text>
                ) : (
                    <View style={styles.transactionsList}>
                        {transactions.map((tx) => (
                            <View key={tx.id} style={styles.txItem}>
                                <View style={[styles.txIconBase, tx.is_fraudulent ? styles.txIconDanger : styles.txIconSafe]}>
                                    <Ionicons name={tx.is_fraudulent ? "warning" : "swap-horizontal"} size={18} color={tx.is_fraudulent ? "#ffb3b3" : "#fff"} />
                                </View>
                                
                                <View style={styles.txDetails}>
                                    <Text style={styles.txName} numberOfLines={1}>{tx.receiver_account}</Text>
                                    <Text style={styles.txDate}>{formatDate(tx.transaction_time)}</Text>
                                    {tx.is_fraudulent && (
                                        <Text style={styles.txFraudWarning}>Blocked • {tx.fraud_reason}</Text>
                                    )}
                                </View>

                                <View style={styles.txAmountWrap}>
                                    <Text style={[styles.txAmount, tx.is_fraudulent && { color: C.error, textDecorationLine: 'line-through' }]}>
                                        -{formatCurrency(tx.amount)}
                                    </Text>
                                    <Text style={styles.txType}>{tx.transaction_type}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Functional Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Home')}>
                    <Ionicons name="home" size={24} color={activeTab === 'Home' ? C.primary : '#666'} />
                    <Text style={[styles.navLabel, activeTab === 'Home' && { color: C.primary }]}>Home</Text>
                </TouchableOpacity>

                {/* Refined Scan Button */}
                <TouchableOpacity 
                    style={styles.scanPrimaryBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                        setActiveTab('Scan');
                        navigation.navigate('Scanner');
                    }}
                >
                    <LinearGradient
                        colors={[C.primary, '#3385ff']}
                        style={styles.scanIconBg}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="qr-code-outline" size={32} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('History')}>
                    <Ionicons name="time" size={24} color={activeTab === 'History' ? C.primary : '#666'} />
                    <Text style={[styles.navLabel, activeTab === 'History' && { color: C.primary }]}>History</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    scrollContent: { padding: SPACE.lg, paddingBottom: 100 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.xl, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    greeting: { ...T.labelMd, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
    userName: { ...T.headlineSm, color: '#fff' },
    profileBadge: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: 'rgba(0, 102, 255, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 102, 255, 0.5)' },
    profileInitials: { ...T.titleMd, color: C.primaryContainer },

    balanceCard: { borderRadius: RADIUS.xl, padding: SPACE.xl, marginBottom: SPACE.xl, ...S.shadowLg },
    balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm },
    balanceLabel: { ...T.labelMd, color: 'rgba(255,255,255,0.8)' },
    statusBadge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: SPACE.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
    statusText: { ...T.labelSm, color: '#a3f0c3' },
    balanceValue: { ...T.displayMd, color: '#fff', marginBottom: SPACE.xl },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: SPACE.md },
    footerLabel: { ...T.labelSm, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
    footerValue: { ...T.titleSm, color: '#fff' },

    actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.xxl },
    actionBtn: { alignItems: 'center', gap: SPACE.sm },
    actionIconWrapper: { width: 56, height: 56, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { ...T.labelSm, color: '#fff' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
    sectionTitle: { ...T.titleMd, color: '#fff' },
    seeAll: { ...T.labelMd, color: C.primary },

    transactionsList: { gap: SPACE.md },
    txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#11151c', padding: SPACE.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    txIconBase: { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginRight: SPACE.md },
    txIconSafe: { backgroundColor: 'rgba(255,255,255,0.1)' },
    txIconDanger: { backgroundColor: 'rgba(214, 41, 41, 0.2)', borderColor: C.error, borderWidth: 1 },
    
    txDetails: { flex: 1 },
    txName: { ...T.titleSm, color: '#fff', marginBottom: 2 },
    txDate: { ...T.labelSm, color: 'rgba(255,255,255,0.4)' },
    txFraudWarning: { ...T.labelSm, color: C.error, marginTop: 4 },
    
    txAmountWrap: { alignItems: 'flex-end' },
    txAmount: { ...T.titleMd, color: '#fff', marginBottom: 2 },
    txType: { ...T.labelSm, color: 'rgba(255,255,255,0.4)' },

    bottomBar: { 
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 85 : 70, 
        backgroundColor: '#0a0d14', 
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 15 : 0
    },
    navItem: { alignItems: 'center', justifyContent: 'center', width: 60, height: 50 },
    navLabel: { ...T.labelSm, marginTop: 4 },
    
    scanPrimaryBtn: { top: -20, justifyContent: 'center', alignItems: 'center', ...S.shadowLg },
    scanIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#050505' },
});
