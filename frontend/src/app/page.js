"use client";

import React, { useState, useEffect, useMemo } from "react";

// =================================================================
// Helpers
// =================================================================

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const mockBeneficiaries = [
  "Manoj_KiranaStore@okicici",
  "Priya_Tuition@ybl",
  "ElectricityBill@biz",
  "NetflixSubscription@paytm",
  "OldFriendRamesh@axl",
  "NEW_MERCHANT_XYZ@sbi",
];

const generateMockTransactions = () => {
  const today = new Date();
  const transactions = [];

  for (let i = 0; i < 20; i++) {
    const date = new Date(
      today.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000
    );

    const amount = randomInt(50, 25000);
    const beneficiary =
      mockBeneficiaries[randomInt(0, mockBeneficiaries.length - 1)];

    transactions.push({
      id: `TXN${Date.now()}-${i}${randomInt(100, 999)}`,
      date: date.toISOString().split("T")[0],
      time: date.toTimeString().substring(0, 5),
      amount,
      type: Math.random() < 0.5 ? "Debit" : "Credit",
      beneficiary,
      isNewBeneficiary: beneficiary.includes("NEW_MERCHANT"),
      isLateNight: date.getHours() >= 23 || date.getHours() <= 5,
    });
  }

  return transactions.sort(
    (a, b) =>
      new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`)
  );
};

const calculateRisk = (txn) => {
  let score = 0;
  const reasons = [];

  if (txn.amount > 15000) {
    score += 35;
    reasons.push("High Transaction Amount");
  } else if (txn.amount > 5000) {
    score += 15;
    reasons.push("Medium Transaction Amount");
  }

  if (txn.isNewBeneficiary) {
    score += 40;
    reasons.push("New Beneficiary");
  }

  if (txn.isLateNight) {
    score += 20;
    reasons.push("Odd Transaction Time");
  }

  if (txn.type === "Debit") score += 5;

  score = Math.min(score, 100);

  let level = "Low";
  if (score > 65) level = "High";
  else if (score > 30) level = "Medium";

  return { score, level, reasons };
};

// =================================================================
// UI Components
// =================================================================

const TransactionForm = ({ upiId, onChange, onFetch, loading }) => (
  <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
    <input
      value={upiId}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter UPI ID (e.g., user@bank)"
      style={{
        flex: 1,
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid #ccc",
      }}
    />
    <button
      onClick={onFetch}
      disabled={loading || !upiId}
      style={{
        padding: "10px 16px",
        background: loading ? "#888" : "#007bff",
        color: "#fff",
        borderRadius: "8px",
        border: "none",
      }}
    >
      {loading ? "Loading..." : "Check"}
    </button>
  </div>
);

const TransactionTable = ({ list }) => (
  <table
    style={{
      width: "100%",
      borderCollapse: "collapse",
      background: "#fff",
    }}
  >
    <thead>
      <tr>
        {[
          "Date",
          "Time",
          "Amount",
          "Type",
          "Beneficiary",
          "Risk Score",
          "Level",
          "Reasons",
        ].map((h) => (
          <th
            key={h}
            style={{
              padding: "8px",
              borderBottom: "2px solid #ddd",
              textAlign: "left",
            }}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {list.map((t) => (
        <tr key={t.id}>
          <td style={{ padding: "8px" }}>{t.date}</td>
          <td style={{ padding: "8px" }}>{t.time}</td>
          <td style={{ padding: "8px" }}>₹{t.amount}</td>
          <td style={{ padding: "8px" }}>{t.type}</td>
          <td style={{ padding: "8px" }}>{t.beneficiary}</td>
          <td style={{ padding: "8px" }}>{t.risk.score}</td>
          <td style={{ padding: "8px" }}>{t.risk.level}</td>
          <td style={{ padding: "8px" }}>{t.risk.reasons.join(", ")}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// =================================================================
// Main Page
// =================================================================

export default function Dashboard() {
  const [upiId, setUpiId] = useState("");
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTxns = () => {
    setLoading(true);
    setTimeout(() => {
      const generated = generateMockTransactions();
      const processed = generated.map((t) => ({
        ...t,
        risk: calculateRisk(t),
      }));
      setTxns(processed);
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>
        🛡️ UPI FraudGuard Dashboard
      </h1>

      <TransactionForm
        upiId={upiId}
        onChange={setUpiId}
        onFetch={fetchTxns}
        loading={loading}
      />

      {loading && <p>Analyzing transactions...</p>}

      {txns.length > 0 && (
        <>
          <h2 style={{ margin: "20px 0" }}>Recent Transactions</h2>
          <TransactionTable list={txns} />
        </>
      )}
    </div>
  );
}
