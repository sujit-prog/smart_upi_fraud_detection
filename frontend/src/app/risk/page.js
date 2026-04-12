'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './risk.module.css';

const RISK_FACTORS_MAP = {
  safe: [
    { label: 'User History',         status: 'Trusted',       safe: true },
    { label: 'Transaction Amount',    status: 'Normal Range',  safe: true },
    { label: 'Transaction Velocity', status: 'Within Limit',  safe: true },
    { label: 'Device Fingerprint',   status: 'Verified',      safe: true },
    { label: 'Merchant Category',    status: 'Whitelisted',   safe: true },
  ],
  risky: [
    { label: 'User History',         status: 'New / Unknown',   safe: false },
    { label: 'Transaction Amount',   status: 'Unusually Large', safe: false },
    { label: 'Transaction Velocity', status: 'High Frequency',  safe: false },
    { label: 'Device Fingerprint',   status: 'Unrecognised',    safe: true  },
    { label: 'Merchant Category',    status: 'High-Risk',       safe: false },
  ],
};

function RiskContent() {
  const sp         = useSearchParams();
  const router     = useRouter();
  const upiId      = sp.get('upiId')      || 'unknown@upi';
  const isHighRisk = sp.get('isHighRisk') === 'true';
  const riskScore  = parseInt(sp.get('riskScore') || '22', 10);
  const factors    = isHighRisk ? RISK_FACTORS_MAP.risky : RISK_FACTORS_MAP.safe;

  const [barWidth, setBarWidth] = useState(0);
  const [visible, setVisible]  = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(true); setBarWidth(riskScore); }, 100);
    return () => clearTimeout(t);
  }, [riskScore]);

  const handleProceed = () => {
    const badFactors = factors.filter(f => !f.safe).map(f => f.label);
    router.push(
      `/payment?upiId=${encodeURIComponent(upiId)}&isHighRisk=${isHighRisk}&riskFactors=${encodeURIComponent(JSON.stringify(badFactors))}`
    );
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>←</button>
        <h1 className="headline-sm" style={{ color: 'var(--text)' }}>Risk Assessment</h1>
        <div style={{ width: 44 }} />
      </header>

      <div className={`${styles.page} ${visible ? 'fade-in-up' : ''}`} style={{ opacity: visible ? 1 : 0 }}>

        {/* UPI chip */}
        <div className={styles.upiChip}>
          <span className="label-md" style={{ color: 'var(--text-secondary)' }}>UPI: {upiId}</span>
        </div>

        {/* Score card */}
        <div className={`card ${styles.scoreCard}`}>
          <p className="title-md" style={{ color: 'var(--text)', marginBottom: 'var(--space-lg)', alignSelf: 'flex-start' }}>
            Overall Risk Score
          </p>

          <div className={styles.scoreRing} style={{
            borderColor: isHighRisk ? 'var(--error)' : 'var(--tertiary)',
            boxShadow: `0 0 0 4px ${isHighRisk ? 'var(--error-container)' : 'var(--tertiary-fixed)'}`,
          }}>
            <div className={styles.scoreInner} style={{ background: isHighRisk ? 'var(--error-container)' : 'var(--tertiary-fixed)' }}>
              <span className="display-md" style={{ color: isHighRisk ? 'var(--error)' : 'var(--tertiary)', fontSize: 40 }}>
                {riskScore}
              </span>
              <span className="label-sm" style={{ color: isHighRisk ? 'var(--error)' : 'var(--tertiary)' }}>
                {isHighRisk ? 'HIGH RISK' : 'LOW RISK'}
              </span>
            </div>
          </div>

          <div className={styles.barArea}>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${barWidth}%`,
                  background: isHighRisk ? 'linear-gradient(90deg, var(--error), #d62929)' : 'linear-gradient(90deg, var(--tertiary), var(--tertiary-container))',
                }}
              />
            </div>
            <div className={styles.barLabels}>
              <span className="label-sm" style={{ color: 'var(--tertiary)' }}>Safe</span>
              <span className="label-sm" style={{ color: 'var(--error)' }}>High Risk</span>
            </div>
          </div>

          <div className={`${styles.overallBadge} ${isHighRisk ? styles.badgeRisk : styles.badgeSafe}`}>
            <span className="label-md">
              {isHighRisk ? '⚠ HIGH FRAUD RISK DETECTED' : '✓ TRANSACTION APPEARS SAFE'}
            </span>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="card" style={{ marginTop: 'var(--space-md)' }}>
          <p className="title-md" style={{ color: 'var(--text)', marginBottom: 'var(--space-md)' }}>Risk Factor Breakdown</p>
          <div className={styles.factorList}>
            {factors.map((f, i) => (
              <div key={i} className={`${styles.factorRow} ${i > 0 ? styles.factorRowBorder : ''}`}>
                <div className={`${styles.factorIcon} ${f.safe ? styles.factorIconSafe : styles.factorIconRisk}`}>
                  {f.safe ? '✓' : '✗'}
                </div>
                <span className="body-md" style={{ flex: 1, color: 'var(--text)' }}>{f.label}</span>
                <span className={`chip ${f.safe ? 'chip-safe' : 'chip-risk'}`}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI explanation */}
        <div className="card" style={{ marginTop: 'var(--space-md)', background: 'var(--primary-fixed)' }}>
          <p className="title-sm" style={{ color: 'var(--primary)', marginBottom: 'var(--space-xs)' }}>🤖 AI Analysis</p>
          <p className="body-md" style={{ color: 'var(--text-secondary)', lineHeight: '22px' }}>
            {isHighRisk
              ? 'Multiple high-risk signals detected for this UPI ID. Our model has flagged this transaction with a high confidence score. Proceeding is strongly discouraged.'
              : 'This UPI ID shows normal, trusted transaction patterns. Our AI model has analyzed historical data and found no suspicious indicators for this receiver.'}
          </p>
        </div>

        {/* Action buttons */}
        <div className={styles.btnGroup}>
          <Link href="/" className={`btn btn-ghost ${styles.cancelBtn}`}>
            Cancel Payment
          </Link>
          <button
            id="proceed-btn"
            className={`btn ${isHighRisk ? 'btn-error' : 'btn-primary'}`}
            onClick={handleProceed}
          >
            {isHighRisk ? 'Proceed Anyway →' : 'Proceed to Pay →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiskPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>}>
      <RiskContent />
    </Suspense>
  );
}
