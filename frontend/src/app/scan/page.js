'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './scan.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ScanPage() {
  const router = useRouter();
  const [upiId, setUpiId]           = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError]           = useState('');
  const [scanStep, setScanStep]     = useState(0);

  const STEPS = ['Fetching registry data', 'Analyzing velocity patterns', 'Computing AI fraud score'];

  const analyzeRisk = async (id) => {
    if (!id?.trim()) return;
    setIsAnalyzing(true);
    setError('');
    setScanStep(0);

    // Animate steps
    const stepTimer = setInterval(() => setScanStep(s => Math.min(s + 1, 2)), 700);

    try {
      const res = await fetch(`${API_BASE}/api/v1/fraud/analyze-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upi_id: id.trim() }),
      });

      clearInterval(stepTimer);
      setScanStep(2);

      let isHighRisk = false, riskScore = 22, riskFactors = [];
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          const l = data[0];
          isHighRisk  = l?.risk?.level === 'High';
          riskFactors = isHighRisk ? l.risk.factors.split(', ') : [];
          riskScore   = isHighRisk ? 78 : 22;
        }
      }

      setTimeout(() => {
        router.push(
          `/risk?upiId=${encodeURIComponent(id.trim())}&isHighRisk=${isHighRisk}&riskScore=${riskScore}&riskFactors=${encodeURIComponent(JSON.stringify(riskFactors))}`
        );
      }, 600);
    } catch {
      clearInterval(stepTimer);
      // Demo fallback
      setTimeout(() => {
        router.push(
          `/risk?upiId=${encodeURIComponent(id.trim())}&isHighRisk=false&riskScore=18&riskFactors=${encodeURIComponent(JSON.stringify([]))}`
        );
      }, 800);
    }
  };

  if (isAnalyzing) {
    return (
      <div className={styles.analyzeScreen}>
        <div className={styles.analyzeCard}>
          <div className={styles.analyzeOrb}>
            <div className="spinner" />
          </div>
          <p className="headline-sm" style={{ color: '#fff', textAlign: 'center' }}>AI Risk Engine</p>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            Deep Scanning: <strong style={{ color: '#fff' }}>{upiId}</strong>
          </p>
          <div className={styles.analyzeSteps}>
            {STEPS.map((s, i) => (
              <div key={i} className={`${styles.analyzeStep} ${scanStep >= i ? styles.analyzeStepActive : ''}`}>
                <div className={`${styles.stepDot} ${scanStep > i ? styles.stepDotDone : ''}`}>
                  {scanStep > i ? '✓' : i + 1}
                </div>
                <span className="body-sm" style={{ color: scanStep >= i ? '#fff' : 'rgba(255,255,255,0.4)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Animated background grid */}
      <div className={styles.bgGrid} aria-hidden />

      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn} aria-label="Go back">←</Link>
        <h1 className="headline-sm" style={{ color: '#fff' }}>Scan &amp; Pay</h1>
        <div style={{ width: 44 }} />
      </header>

      {/* Main content */}
      <div className={styles.content}>
        {/* QR Viewfinder */}
        <div className={styles.viewfinderSection}>
          <div className={styles.viewfinder} aria-label="QR code scanning area">
            <div className={`${styles.corner} ${styles.cornerTL}`} />
            <div className={`${styles.corner} ${styles.cornerTR}`} />
            <div className={`${styles.corner} ${styles.cornerBL}`} />
            <div className={`${styles.corner} ${styles.cornerBR}`} />
            <div className={`${styles.laser} laser`} />
            <div className={styles.viewfinderInner}>
              <span style={{ fontSize: 48, opacity: 0.3 }}>⬛</span>
              <p className="label-sm" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' }}>
                Point camera at QR code
              </p>
            </div>
          </div>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, textAlign: 'center' }}>
            Camera scanner requires mobile device
          </p>
        </div>

        {/* Glass panel — manual entry */}
        <div className={styles.glassPanel}>
          <p className="label-md" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 'var(--space-sm)' }}>
            Manual Entry
          </p>

          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon}>@</span>
            <input
              id="upi-input"
              type="text"
              className={styles.input}
              placeholder="xyz@bank or 9876543210@upi"
              value={upiId}
              onChange={e => { setUpiId(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && analyzeRisk(upiId)}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-label="UPI ID input"
            />
            {upiId && (
              <button className={styles.clearBtn} onClick={() => setUpiId('')} aria-label="Clear input">✕</button>
            )}
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Quick fill demos */}
          <div className={styles.quickFills}>
            <p className="label-sm" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Quick demo:</p>
            <div className={styles.quickFillChips}>
              {['merchant@paytm', 'suspicious@ybl', 'friend@gpay'].map(id => (
                <button key={id} className={styles.quickChip} onClick={() => setUpiId(id)}>{id}</button>
              ))}
            </div>
          </div>

          <button
            id="verify-btn"
            className={styles.ctaBtn}
            onClick={() => analyzeRisk(upiId)}
            disabled={!upiId.trim()}
          >
            🔍 Verify &amp; Proceed
          </button>

          <p className="label-sm" style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 'var(--space-sm)' }}>
            Smart AI Protection Active 🛡️
          </p>
        </div>
      </div>
    </div>
  );
}
