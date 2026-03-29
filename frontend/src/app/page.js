"use client";
import React, { useState, useEffect } from "react";

const VIEWS = {
  HOME: "HOME",
  SCAN: "SCAN",
  ANALYZING: "ANALYZING",
  PAYMENT: "PAYMENT",
  SUCCESS: "SUCCESS",
};

export default function MobileApp() {
  const [currentView, setCurrentView] = useState(VIEWS.HOME);
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");

  // Risk State
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [riskFactors, setRiskFactors] = useState([]);
  const [showRiskSheet, setShowRiskSheet] = useState(false);
  const [error, setError] = useState(null);

  // Bottom Nav
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered", reg))
        .catch((err) => console.error("SW error", err));
    }
  }, []);

  const startScan = () => {
    setUpiId("");
    setAmount("");
    setIsHighRisk(false);
    setRiskFactors([]);
    setShowRiskSheet(false);
    setError(null);
    setCurrentView(VIEWS.SCAN);
    setActiveTab("scan");
  };

  const goHome = () => {
    setCurrentView(VIEWS.HOME);
    setActiveTab("home");
  };

  const analyzeRisk = async (e) => {
    e.preventDefault();
    if (!upiId) return;

    setCurrentView(VIEWS.ANALYZING);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/v1/fraud/analyze-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upi_id: upiId }),
      });

      if (!response.ok) throw new Error("Backend connection failed");
      const data = await response.json();

      let highRiskFound = false;
      let highestRiskFactors = [];

      // Check the latest generated transaction for risk
      if (data && data.length > 0) {
        const latestTxn = data[0];
        if (latestTxn.risk.level === "High") {
          highRiskFound = true;
          highestRiskFactors = latestTxn.risk.factors.split(', ');
        }
      }

      setTimeout(() => {
        setIsHighRisk(highRiskFound);
        setRiskFactors(highestRiskFactors);

        if (highRiskFound) {
          setCurrentView(VIEWS.PAYMENT); // Set background view
          setShowRiskSheet(true); // Pop up sheet
        } else {
          setCurrentView(VIEWS.PAYMENT);
        }
      }, 1500); // Artificial delay to show "Analyzing" animation

    } catch (err) {
      console.error(err);
      setError("Failed to connect to AI engine");
      setCurrentView(VIEWS.SCAN);
    }
  };

  const processPayment = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    setCurrentView(VIEWS.SUCCESS);
  };

  return (
    <div className="mobile-app-container">
      {/* ----------------- HOME VIEW ----------------- */}
      {currentView === VIEWS.HOME && (
        <div className="app-content">
          <header className="top-header">
            <div className="profile-pic">SJ</div>
            <div className="notif-btn">🔔</div>
          </header>

          <div className="balance-card">
            <div className="balance-label">Total Balance</div>
            <div className="balance-amount">₹42,500.00</div>
          </div>

          <div className="section-title">Quick Actions</div>
          <div className="action-grid">
            <div className="action-item" onClick={startScan}>
              <div className="action-icon scan">📷</div>
              <div className="action-label">Scan & Pay</div>
            </div>
            <div className="action-item" onClick={startScan}>
              <div className="action-icon">👥</div>
              <div className="action-label">Pay Contacts</div>
            </div>
            <div className="action-item">
              <div className="action-icon">🏦</div>
              <div className="action-label">To Bank</div>
            </div>
            <div className="action-item">
              <div className="action-icon">🔁</div>
              <div className="action-label">Self Transfer</div>
            </div>
          </div>

          <div className="section-title">Recent Payments</div>
          <div className="contacts-scroller">
            {["Priya", "Rahul", "Zomato", "Uber", "Mom", "Gym"].map((name, i) => (
              <div className="contact-item" key={i}>
                <div className="contact-avatar">{name.charAt(0)}</div>
                <div className="contact-name">{name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- SCAN VIEW ----------------- */}
      {currentView === VIEWS.SCAN && (
        <div className="screen-overlay">
          <header className="screen-header">
            <button className="back-btn" onClick={goHome}>←</button>
            <div className="screen-title">Scan & Pay</div>
          </header>

          <div className="scan-container">
            <div className="scanner-frame">
              <div className="scanner-line"></div>
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>Aim at QR Code</p>
            </div>

            <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>OR</p>

            <form onSubmit={analyzeRisk} style={{ width: '100%' }}>
              <div className="input-group">
                <input
                  type="text"
                  className="pay-input"
                  placeholder="Enter UPI ID or Number"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p style={{ color: 'var(--danger)', marginBottom: 15, textAlign: 'center' }}>{error}</p>}
              <button
                type="submit"
                className="primary-btn"
                disabled={!upiId}
              >
                Verify & Proceed
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- ANALYZING VIEW ----------------- */}
      {currentView === VIEWS.ANALYZING && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <div className="loading-text">AI Risk Assessment Running...</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing {upiId}</p>
        </div>
      )}

      {/* ----------------- PAYMENT VIEW & ALERTS ----------------- */}
      {currentView === VIEWS.PAYMENT && (
        <div className="screen-overlay">
          <header className="screen-header">
            <button className="back-btn" onClick={startScan}>←</button>
            <div className="screen-title">Make Payment</div>
          </header>

          <div className="app-content" style={{ textAlign: 'center' }}>

            <div className="receiver-info">
              <div className="receiver-avatar">{upiId.charAt(0).toUpperCase()}</div>
              <div className="receiver-details" style={{ textAlign: 'left' }}>
                <h3>{upiId}</h3>
                <p>Banking Name: Not Available</p>
              </div>
            </div>

            <form onSubmit={processPayment}>
              <div className="amount-input-wrapper">
                <span className="currency-sym">₹</span>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus={!showRiskSheet}
                />
              </div>

              <div style={{ position: 'absolute', bottom: 100, left: 24, right: 24 }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={!amount || amount <= 0}
                >
                  Pay ₹{amount || 0}
                </button>
              </div>
            </form>
          </div>

          {/* RISK ALERT BOTTOM SHEET */}
          {showRiskSheet && (
            <div className="sheet-backdrop">
              <div className="bottom-sheet">
                <div className="risk-alert-card">

                  {isHighRisk ? (
                    <>
                      <div className="risk-icon-wrapper">
                        <div className="risk-icon">⚠️</div>
                      </div>
                      <h2 className="risk-title">High Risk Detected</h2>
                      <p className="risk-desc">
                        Our AI has flagged this UPI ID for suspicious behavior. Paying this user may result in financial loss.
                      </p>

                      <div className="risk-factors">
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Risk Factors Identified:</p>
                        {riskFactors.map((factor, i) => (
                          <div className="factor-item" key={i}>
                            <span style={{ color: 'var(--danger)' }}>•</span> {factor}
                          </div>
                        ))}
                      </div>

                      <div className="btn-group">
                        <button className="primary-btn secondary-btn" onClick={goHome}>Cancel Payment</button>
                        <button className="primary-btn danger-btn" onClick={() => setShowRiskSheet(false)}>I Understand, Proceed</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="risk-icon-wrapper trust-icon-wrapper">
                        <div className="trust-icon">✓</div>
                      </div>
                      <h2 className="risk-title trust-title">Verified Receiver</h2>
                      <p className="risk-desc" style={{ marginBottom: 30 }}>
                        This UPI ID exhibits normal transaction patterns and is considered safe.
                      </p>
                      <button className="primary-btn" onClick={() => setShowRiskSheet(false)}>Continue to Pay</button>
                    </>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- SUCCESS VIEW ----------------- */}
      {currentView === VIEWS.SUCCESS && (
        <div className="screen-overlay success-screen" style={{ justifyContent: 'center', padding: 24, alignItems: 'center', textAlign: 'center' }}>
          <div className="checkmark-circle">
            <span className="checkmark">✓</span>
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>Payment Sent!</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: 40 }}>₹{amount} to {upiId}</p>

          <button
            className="primary-btn"
            style={{ background: 'white', color: 'var(--success)', marginTop: 40 }}
            onClick={goHome}
          >
            Back to Home
          </button>
        </div>
      )}

      {/* ----------------- BOTTOM NAVIGATION ----------------- */}
      {(currentView === VIEWS.HOME || currentView === VIEWS.SCAN) && (
        <div className="bottom-nav">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={goHome}>
            <div className="nav-icon">🏠</div>
            <div className="nav-label">Home</div>
          </div>
          <div className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={startScan}>
            <div className="nav-icon">📱</div>
            <div className="nav-label">Scan</div>
          </div>
          <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}>
            <div className="nav-icon">📜</div>
            <div className="nav-label">History</div>
          </div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
            <div className="nav-icon">👤</div>
            <div className="nav-label">Profile</div>
          </div>
        </div>
      )}
    </div>
  );
}
