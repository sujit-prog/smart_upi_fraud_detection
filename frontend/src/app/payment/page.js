'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './payment.module.css';

function PaymentContent() {
  const sp         = useSearchParams();
  const router     = useRouter();
  const upiId      = sp.get('upiId')      || 'unknown@upi';
  const isHighRisk = sp.get('isHighRisk') === 'true';
  const riskFactors = JSON.parse(sp.get('riskFactors') || '[]');

  const [amount, setAmount]           = useState('');
  const [note, setNote]               = useState('');
  const [showModal, setShowModal]     = useState(isHighRisk);
  const [visible, setVisible]         = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const amountValid = amount && !isNaN(amount) && parseFloat(amount) > 0;

  const handlePay = () => {
    if (!amountValid) return;
    router.push(`/success?amount=${amount}&upiId=${encodeURIComponent(upiId)}`);
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>←</button>
        <h1 className="headline-sm" style={{ color: 'var(--text)' }}>Make Payment</h1>
        <div style={{ width: 44 }} />
      </header>

      <div className={`${styles.page} ${visible ? 'fade-in-up' : ''}`} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s' }}>

        {/* Receiver card */}
        <div className={`card ${styles.receiverCard} scale-in`}>
          <div className={styles.receiverAvatar}>
            <span className="headline-md" style={{ color: 'var(--primary)' }}>
              {upiId.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className={styles.receiverInfo}>
            <p className="title-sm" style={{ color: 'var(--text)' }}>{upiId}</p>
            <p className="body-sm" style={{ color: 'var(--text-muted)' }}>Registered UPI Account</p>
          </div>
          <span className={`chip ${isHighRisk ? 'chip-risk' : 'chip-safe'}`}>
            {isHighRisk ? '⚠ Risk' : '✓ Safe'}
          </span>
        </div>

        {/* Amount section */}
        <div className={styles.amountSection}>
          <p className="label-md" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>Enter Amount</p>
          <div className={styles.amountRow}>
            <span className="display-md" style={{ color: 'var(--text-secondary)' }}>₹</span>
            <input
              id="amount-input"
              type="number"
              className={styles.amountInput}
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              autoFocus={!isHighRisk}
            />
          </div>
          {/* Quick amounts */}
          <div className={styles.quickAmounts}>
            {['500', '1000', '2000', '5000'].map(q => (
              <button key={q} className={styles.quickChip} onClick={() => setAmount(q)}>₹{q}</button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <p className="label-md" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>Add a note (optional)</p>
          <input
            id="note-input"
            type="text"
            className={styles.noteInput}
            placeholder="e.g. Rent, Food, etc."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* High risk banner */}
        {isHighRisk && (
          <button className={styles.riskBanner} onClick={() => setShowModal(true)}>
            ⚠ High risk detected — Click to review
          </button>
        )}

        {/* Pay button */}
        <button
          id="pay-btn"
          className={`btn ${amountValid ? (isHighRisk ? 'btn-error' : 'btn-primary') : 'btn-ghost'}`}
          onClick={handlePay}
          disabled={!amountValid}
          style={{ marginTop: 'var(--space-md)' }}
        >
          {amountValid ? `Pay ₹${parseFloat(amount).toLocaleString('en-IN')}` : 'Enter Amount'}
        </button>
      </div>

      {/* Risk Modal */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />

            {isHighRisk ? (
              <>
                <div className={styles.modalIconCircle} style={{ background: 'var(--error-container)' }}>
                  <span style={{ fontSize: 36 }}>⚠️</span>
                </div>
                <h2 className="headline-sm" style={{ color: 'var(--error)', textAlign: 'center' }}>High Fraud Risk Detected</h2>
                <p className="body-md" style={{ color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '22px' }}>
                  Our AI engine has flagged this UPI ID as suspicious. Proceeding may result in financial loss.
                </p>
                {riskFactors.length > 0 && (
                  <div className={styles.factorBox}>
                    <p className="label-sm" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>RISK FACTORS</p>
                    {riskFactors.map((f, i) => (
                      <div key={i} className={styles.factorItem}>
                        <div className={styles.factorDot} />
                        <span className="body-md" style={{ color: 'var(--text)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.modalBtns}>
                  <button className={`btn btn-ghost`} onClick={() => router.push('/')}>Cancel Payment</button>
                  <button className={`btn btn-error`} onClick={() => setShowModal(false)}>I Understand, Proceed</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.modalIconCircle} style={{ background: 'var(--tertiary-fixed)' }}>
                  <span style={{ fontSize: 36 }}>✅</span>
                </div>
                <h2 className="headline-sm" style={{ color: 'var(--tertiary)', textAlign: 'center' }}>Verified &amp; Safe</h2>
                <p className="body-md" style={{ color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '22px' }}>
                  This UPI ID has a clean transaction history. Your payment is protected by AI fraud detection.
                </p>
                <button className={`btn btn-primary`} onClick={() => setShowModal(false)}>Continue to Pay</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>}>
      <PaymentContent />
    </Suspense>
  );
}
