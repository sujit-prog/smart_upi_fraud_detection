'use client';

import React, { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function TransactionForm() {
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTransactions([]);

    if (!upiId) {
      setError('Please enter a UPI ID.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/fraud/analyze-upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upi_id: upiId }),
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }

      const data = await res.json();

      if (!data || data.length === 0) {
        setError(`No recent transactions found for ${upiId}.`);
        setLoading(false);
        return;
      }

      const mapped = data.map((t) => ({
        ...t,
        riskScore: t.risk_score ?? t.riskScore ?? 0,
        riskLevel: (() => {
          const lvl = (t.risk_level ?? '').toUpperCase();
          if (lvl === 'HIGH') return { label: 'HIGH', className: 'badge badge-high' };
          if (lvl === 'MEDIUM') return { label: 'MEDIUM', className: 'badge badge-medium' };
          return { label: 'LOW', className: 'badge badge-low' };
        })(),
      }));

      setTransactions(mapped.sort((a, b) => b.riskScore - a.riskScore));
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to fetch data from backend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-root">
      <div className="card">
        <h2 className="card-title">
          <span>UPI</span> Fraud Scanner
        </h2>

        {/* UPI ID Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-input-wrapper">
              <label htmlFor="upi-id" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
                UPI ID
              </label>
              <input
                id="upi-id"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g., john.doe@okicici"
                className="input-text"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="button-spinner">
                  <span>⏳</span>
                  <span>Scanning...</span>
                </div>
              ) : (
                'Check Transactions'
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}

        {/* Info Section */}
        <div className="info-box">
          <div className="info-box-title">Real-Time Integration Concept</div>
          <p className="info-box-text">
            To integrate the app for real-time risk checks, a companion UPI app or middleware would
            send transaction details (amount, destination VPA, etc.) to this backend API{' '}
            <strong>before</strong> the payment is finalized, and use the risk score to warn or block
            the user.
          </p>
          <button
            type="button"
            className="info-box-button"
            onClick={() => alert('Here you could show technical API docs, curl examples, etc.')}
          >
            Learn about API integration
          </button>
        </div>

        {/* Transaction Table */}
        {transactions.length > 0 && (
          <div>
            <h3 className="section-title">
              Recent Transactions for <span style={{ color: '#4f46e5' }}>{upiId}</span>
            </h3>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount (INR)</th>
                    <th>Destination VPA</th>
                    <th>Time</th>
                    <th style={{ textAlign: 'center' }}>Risk Score</th>
                    <th style={{ textAlign: 'center' }}>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>
                        <span
                          className={
                            t.type === 'DEBIT' ? 'amount-debit' : 'amount-credit'
                          }
                        >
                          {t.type === 'DEBIT' ? '- ' : '+ '}
                          ₹{Number(t.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>{t.destination}</td>
                      <td>{new Date(t.timestamp).toLocaleString()}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {t.riskScore}%
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={t.riskLevel.className}>{t.riskLevel.label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
