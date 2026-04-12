'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './success.module.css';

function SuccessContent() {
  const sp     = useSearchParams();
  const amount = sp.get('amount') || '0';
  const upiId  = sp.get('upiId')  || 'receiver@upi';

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
    <div className={styles.root}>
      <div className={styles.page}>

        {/* Animated checkmark */}
        <div className={`${styles.checkWrapper} check-bounce`}>
          <div className={`${styles.checkCircle} gradient-success`}>
            <span className={styles.checkIcon}>✓</span>
          </div>
        </div>

        {/* Title */}
        <div className={`${styles.titleSection} fade-in-up`} style={{ animationDelay: '0.3s' }}>
          <h1 className="headline-sm" style={{ color: 'var(--text)' }}>Payment Successful</h1>
          <p className="display-md" style={{ color: 'var(--primary)', margin: 'var(--space-xs) 0 var(--space-md)' }}>
            ₹{parseFloat(amount).toLocaleString('en-IN')}
          </p>
          <span className="chip chip-safe" style={{ padding: '6px 16px', fontSize: 12 }}>
            🛡️ AI Fraud Protection Active
          </span>
        </div>

        {/* Transaction details */}
        <div className={`card ${styles.detailsCard} fade-in-up`} style={{ animationDelay: '0.45s' }}>
          <p className="title-md" style={{ color: 'var(--text)', marginBottom: 'var(--space-md)' }}>Transaction Details</p>
          {details.map((d, i) => (
            <div key={i} className={`${styles.detailRow} ${i > 0 ? styles.detailRowBorder : ''}`}>
              <span className="body-md" style={{ color: 'var(--text-secondary)', flex: 1 }}>{d.label}</span>
              <span
                className="title-sm"
                style={{
                  color: d.highlight ? 'var(--tertiary)' : 'var(--text)',
                  textAlign: 'right',
                  flex: 1.5,
                  fontWeight: d.highlight ? 600 : 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.value}
              </span>
            </div>
          ))}
        </div>

        {/* Share / report row */}
        <div className={`${styles.actionRow} fade-in-up`} style={{ animationDelay: '0.6s' }}>
          <button id="share-receipt-btn" className={styles.shareBtn}>📤  Share Receipt</button>
          <button id="report-issue-btn"  className={styles.reportBtn}>🚩  Report Issue</button>
        </div>

        {/* Home button */}
        <Link
          id="home-btn"
          href="/"
          className={`btn btn-primary fade-in-up`}
          style={{ animationDelay: '0.7s', marginTop: 'var(--space-sm)' }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
