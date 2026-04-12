'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [token, setToken]           = useState(null);
  const [stats, setStats]           = useState(null);
  const [transactions, setTxns]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('Home');
  const [showAll, setShowAll]       = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const form = new URLSearchParams();
        form.append('username', 'testuser');
        form.append('password', 'Password123!');
        const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        if (!loginRes.ok) throw new Error('Login failed');
        const { access_token: jwt } = await loginRes.json();
        setToken(jwt);

        const [statsRes, txRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/transactions/summary/stats`, { headers: { Authorization: `Bearer ${jwt}` } }),
          fetch(`${API_BASE}/api/v1/transactions/?limit=20`,     { headers: { Authorization: `Bearer ${jwt}` } }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (txRes.ok)    setTxns(await txRes.json());
      } catch (e) {
        console.error('Dashboard error:', e);
        // Demo fallback data
        setStats({ total_amount: 124850.50, total_transactions: 248, fraud_rate: 3.2, blocked_transactions: 8 });
        setTxns(DEMO_TRANSACTIONS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt  = v => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';
  const fmtD = s => s ? new Date(s).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const displayed = showAll ? transactions : transactions.slice(0, 6);

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingCard}>
        <div className={styles.aiOrb}><div className="spinner" /></div>
        <p className={`headline-sm ${styles.loadingTitle}`}>Securing Connection…</p>
        <p className={`body-sm ${styles.loadingSubtitle}`}>Connecting to AI fraud detection engine</p>
        {['Fetching registry data', 'Analyzing velocity patterns', 'Computing AI fraud score'].map((s, i) => (
          <div key={i} className={styles.loadingStep}>
            <span className={styles.loadingDot} />
            <span className="body-md" style={{ color: 'rgba(255,255,255,0.7)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.root}>
      {/* ── Sidebar nav ─────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>🛡️</div>
          <div>
            <p className="label-md" style={{ color: 'var(--text-muted)' }}>Smart UPI</p>
            <p className="title-sm" style={{ color: 'var(--text)' }}>Dashboard</p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map(({ icon, label, href, tab }) => (
            <Link
              key={label}
              href={href}
              className={`${styles.navItem} ${activeTab === tab ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className="title-sm">{label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>TU</div>
            <div>
              <p className="title-sm" style={{ color: 'var(--text)' }}>Test User</p>
              <p className="body-sm" style={{ color: 'var(--text-muted)' }}>testuser@upi</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────── */}
      <main className={styles.main}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <div>
            <p className="label-md" style={{ color: 'var(--text-muted)' }}>Secure Dashboard</p>
            <h1 className="headline-sm" style={{ color: 'var(--text)' }}>Good morning, Test User 👋</h1>
          </div>
          <div className={styles.topBarRight}>
            <Link href="/scan" className={styles.scanCta}>
              <span>📷</span> Scan & Pay
            </Link>
          </div>
        </header>

        {/* Stat cards */}
        <section className={styles.statsGrid} aria-label="Summary statistics">
          <div className={`${styles.balanceCard} gradient-primary fade-in-up`}>
            <div className={styles.balanceHeader}>
              <p className="label-md" style={{ color: 'rgba(255,255,255,0.75)' }}>Total Value Transferred</p>
              <span className={`chip ${styles.protectedChip}`}>Protected ✓</span>
            </div>
            <p className={`display-md ${styles.balanceValue}`}>{fmt(stats?.total_amount)}</p>
            <div className={styles.balanceFooter}>
              <div>
                <p className="label-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Risk Level</p>
                <p className="title-sm" style={{ color: stats?.fraud_rate > 10 ? '#ffb3b3' : '#a3f0c3' }}>
                  {stats?.fraud_rate?.toFixed(1) || '0.0'}% AI Detected
                </p>
              </div>
              <div>
                <p className="label-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Txns</p>
                <p className="title-sm" style={{ color: '#fff' }}>{stats?.total_transactions || 0}</p>
              </div>
              <div>
                <p className="label-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Blocked</p>
                <p className="title-sm" style={{ color: '#ffb3b3' }}>{stats?.blocked_transactions || 0}</p>
              </div>
            </div>
          </div>

          {STAT_TILES(stats).map(({ label, value, icon, color, bg }) => (
            <div key={label} className={`card ${styles.statTile} scale-in`} style={{ animationDelay: '0.1s' }}>
              <div className={styles.statIcon} style={{ background: bg }}>{icon}</div>
              <p className="label-sm" style={{ color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>{label}</p>
              <p className="headline-sm" style={{ color }}>{value}</p>
            </div>
          ))}
        </section>

        {/* Quick actions */}
        <section className={styles.actionsSection}>
          <h2 className="title-md" style={{ color: 'var(--text)', marginBottom: 'var(--space-md)' }}>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            {QUICK_ACTIONS.map(({ icon, label, href, bg }) => (
              <Link key={label} href={href} className={styles.actionCard}>
                <div className={styles.actionIcon} style={{ background: bg }}>{icon}</div>
                <p className="label-md" style={{ color: 'var(--text)', marginTop: 'var(--space-sm)' }}>{label}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Transactions */}
        <section className={styles.txSection}>
          <div className={styles.txHeader}>
            <h2 className="title-md" style={{ color: 'var(--text)' }}>Recent Network Activity</h2>
            <button className={styles.seeAllBtn} onClick={() => setShowAll(p => !p)}>
              {showAll ? 'Show less' : 'See all'}
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <span style={{ fontSize: 40 }}>📭</span>
              <p className="body-md" style={{ color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>No transactions found in database.</p>
            </div>
          ) : (
            <div className={styles.txList}>
              {displayed.map(tx => (
                <div key={tx.id} className={`${styles.txItem} fade-in-up`}>
                  <div className={`${styles.txIcon} ${tx.is_fraudulent ? styles.txIconDanger : styles.txIconSafe}`}>
                    {tx.is_fraudulent ? '⚠' : '↔'}
                  </div>
                  <div className={styles.txDetails}>
                    <p className="title-sm" style={{ color: 'var(--text)' }}>{tx.receiver_account}</p>
                    <p className="body-sm" style={{ color: 'var(--text-muted)' }}>{fmtD(tx.transaction_time)}</p>
                    {tx.is_fraudulent && (
                      <p className="label-sm" style={{ color: 'var(--error)', marginTop: 2 }}>
                        Blocked • {tx.fraud_reason}
                      </p>
                    )}
                  </div>
                  <div className={styles.txRight}>
                    <p className="title-sm" style={{
                      color: tx.is_fraudulent ? 'var(--error)' : 'var(--text)',
                      textDecoration: tx.is_fraudulent ? 'line-through' : 'none',
                    }}>
                      -{fmt(tx.amount)}
                    </p>
                    <p className="body-sm" style={{ color: 'var(--text-muted)' }}>{tx.transaction_type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Mobile bottom bar ────────────────────── */}
      <nav className={styles.mobileBar}>
        {NAV_ITEMS.map(({ icon, label, href, tab }) => (
          <Link key={label} href={href}
            className={`${styles.mobileNavItem} ${activeTab === tab ? styles.mobileNavActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className={styles.mobileNavIcon}>{icon}</span>
            <span className="label-sm">{label}</span>
          </Link>
        ))}
        <Link href="/scan" id="scan-fab" className={styles.scanFab} aria-label="Scan QR Code">
          📷
        </Link>
      </nav>
    </div>
  );
}

/* ── Constants ───────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',    href: '/',          tab: 'Home' },
  { icon: '🕐', label: 'History', href: '/#history',  tab: 'History' },
  { icon: '🛡️', label: 'Security',href: '/#security', tab: 'Security' },
];

const STAT_TILES = stats => [
  { label: 'Safe Transactions', value: ((stats?.total_transactions || 0) - (stats?.blocked_transactions || 0)).toLocaleString(), icon: '✅', color: 'var(--tertiary)', bg: 'rgba(111,251,190,0.25)' },
  { label: 'Fraud Blocked',     value: (stats?.blocked_transactions || 0).toString(), icon: '🚫', color: 'var(--error)', bg: 'rgba(186,26,26,0.1)' },
  { label: 'AI Fraud Rate',     value: `${stats?.fraud_rate?.toFixed(1) || '0.0'}%`, icon: '🤖', color: 'var(--primary)', bg: 'rgba(0,64,161,0.1)' },
];

const QUICK_ACTIONS = [
  { icon: '📤', label: 'Send',     href: '/scan',      bg: 'rgba(0,102,255,0.12)' },
  { icon: '📥', label: 'Receive',  href: '/#receive',  bg: 'rgba(0,204,153,0.12)' },
  { icon: '📄', label: 'Bills',    href: '/#bills',    bg: 'rgba(255,153,51,0.12)' },
  { icon: '🔒', label: 'Security', href: '/#security', bg: 'rgba(153,51,255,0.12)' },
];

const DEMO_TRANSACTIONS = [
  { id: 1, receiver_account: 'merchant@paytm',  amount: 2500, transaction_time: new Date().toISOString(), transaction_type: 'UPI', is_fraudulent: false },
  { id: 2, receiver_account: 'suspicious@ybl',  amount: 15000, transaction_time: new Date(Date.now()-3600000).toISOString(), transaction_type: 'UPI', is_fraudulent: true,  fraud_reason: 'High velocity' },
  { id: 3, receiver_account: 'friend@gpay',     amount: 500,  transaction_time: new Date(Date.now()-7200000).toISOString(), transaction_type: 'UPI', is_fraudulent: false },
  { id: 4, receiver_account: 'shop@phonepe',    amount: 1200, transaction_time: new Date(Date.now()-86400000).toISOString(), transaction_type: 'UPI', is_fraudulent: false },
  { id: 5, receiver_account: 'unknown@okicici', amount: 8000, transaction_time: new Date(Date.now()-172800000).toISOString(), transaction_type: 'UPI', is_fraudulent: true,  fraud_reason: 'New account' },
  { id: 6, receiver_account: 'salary@hdfcbank', amount: 50000, transaction_time: new Date(Date.now()-259200000).toISOString(), transaction_type: 'NEFT', is_fraudulent: false },
];
