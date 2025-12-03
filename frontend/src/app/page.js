"use client";

"use client";
import React from "react";


// =================================================================
// --- BASIC UTILS (no Tailwind, no external icon libs) ---
// =================================================================

// Helper to generate a random number within a range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Mock list of beneficiaries
const mockBeneficiaries = [
  "Manoj_KiranaStore@okicici",
  "Priya_Tuition@ybl",
  "ElectricityBill@biz",
  "NetflixSubscription@paytm",
  "OldFriendRamesh@axl",
  "NEW_MERCHANT_XYZ@sbi",
];

/**
 * Mock transaction data generator.
 */
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
    const isNewBeneficiary = beneficiary.includes("NEW_MERCHANT");
    const isLateNight = date.getHours() >= 23 || date.getHours() <= 5;

    transactions.push({
      id: `TXN${Date.now()}-${i}${randomInt(100, 999)}`,
      date: date.toISOString().split("T")[0],
      time: date.toTimeString().split(" ")[0].substring(0, 5),
      amount,
      type: randomInt(0, 1) === 0 ? "Debit" : "Credit",
      beneficiary,
      isNewBeneficiary,
      isLateNight,
    });
  }

  return transactions.sort(
    (a, b) =>
      new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`)
  );
};

/**
 * Calculates a risk score (0-100) and assigns a risk level based on transaction properties.
 */
const calculateRiskScore = (transaction) => {
  let score = 0;
  let factors = [];

  // Factor 1: High Transaction Amount
  if (transaction.amount > 15000) {
    score += 35;
    factors.push("Large Amount (High)");
  } else if (transaction.amount > 5000) {
    score += 15;
    factors.push("Large Amount (Medium)");
  }

  // Factor 2: New/Suspicious Beneficiary
  if (transaction.isNewBeneficiary) {
    score += 40;
    factors.push("New/Untrusted Beneficiary");
  }

  // Factor 3: Time of Day (Late Night/Early Morning is often riskier)
  if (transaction.isLateNight) {
    score += 20;
    factors.push("Unusual Transaction Time (Late Night)");
  }

  // Factor 4: Type of transaction (Debits are generally higher risk than Credits)
  if (transaction.type === "Debit") {
    score += 5;
  }

  // Cap the score at 100
  score = Math.min(score, 100);

  let level;
  let colorClass;
  if (score > 65) {
    level = "High";
    colorClass = "badge badge-high";
  } else if (score > 30) {
    level = "Medium";
    colorClass = "badge badge-medium";
  } else {
    level = "Low";
    colorClass = "badge badge-low";
  }

  return {
    score,
    level,
    colorClass,
    factors: factors.length > 0 ? factors.join(", ") : "Standard Behavior",
  };
};

// =================================================================
// --- COMPONENTS (plain CSS classes + emojis) ---
// =================================================================

const TransactionForm = ({ upiId, setUpiId, onFetch, isLoading }) => {
  return (
    <div className="tf-container">
      <input
        type="text"
        placeholder="Enter UPI ID (e.g., user123@bank)"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        className="input-text tf-input"
      />
      <button
        onClick={onFetch}
        disabled={isLoading || !upiId}
        className="button button-primary tf-button"
      >
        <span role="img" aria-label="search">
          🔍
        </span>
        <span style={{ marginLeft: 6 }}>
          {isLoading ? "Fetching..." : "Check Transactions"}
        </span>
      </button>
    </div>
  );
};

const RiskSummaryCard = ({ transactions }) => {
  if (!transactions || transactions.length === 0) return null;

  const highRiskCount = transactions.filter(
    (t) => t.risk.level === "High"
  ).length;
  const mediumRiskCount = transactions.filter(
    (t) => t.risk.level === "Medium"
  ).length;
  const totalTransactions = transactions.length;
  const safePercentage = Math.round(
    ((totalTransactions - highRiskCount) / totalTransactions) * 100
  );

  const riskMessage =
    highRiskCount > 0
      ? `ALERT: ${highRiskCount} transactions flagged as HIGH Risk.`
      : `Overall security is ${safePercentage}%. No HIGH risk transactions found.`;

  const icon =
    highRiskCount > 0 ? (
      <span className="risk-summary-icon risk-summary-icon--alert">⚠️</span>
    ) : (
      <span className="risk-summary-icon risk-summary-icon--ok">✅</span>
    );

  const boxClass =
    highRiskCount > 0
      ? "risk-summary risk-summary--alert"
      : "risk-summary risk-summary--ok";

  return (
    <div className={boxClass}>
      <div className="risk-summary-main">
        {icon}
        <div>
          <h2 className="risk-summary-title">Risk Summary (Last 30 Days)</h2>
          <p
            className={
              highRiskCount > 0
                ? "risk-summary-text risk-summary-text--alert"
                : "risk-summary-text risk-summary-text--ok"
            }
          >
            {riskMessage}
          </p>
        </div>
      </div>
      <div className="risk-summary-side">
        <p className="risk-summary-total">{totalTransactions}</p>
        <p className="risk-summary-total-label">Total Transactions</p>
        <div className="risk-summary-badges">
          <span className="risk-summary-count risk-summary-count--high">
            {highRiskCount} High
          </span>
          <span className="risk-summary-count risk-summary-count--medium">
            {mediumRiskCount} Medium
          </span>
        </div>
      </div>
    </div>
  );
};

const TransactionTable = ({ transactions }) => {
  const transactionList = transactions || [];

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {[
              "Date",
              "Time",
              "Amount (₹)",
              "Type",
              "Beneficiary",
              "Risk Score",
              "Risk Level",
              "Key Factors",
            ].map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactionList.map((txn) => (
            <tr key={txn.id}>
              <td>{txn.date}</td>
              <td>{txn.time}</td>
              <td>
                <span
                  className={
                    txn.type === "Debit" ? "amount-debit" : "amount-credit"
                  }
                >
                  {txn.type === "Debit" ? "↓ " : "↑ "}
                  ₹{txn.amount.toLocaleString("en-IN")}
                </span>
              </td>
              <td>{txn.type}</td>
              <td>{txn.beneficiary}</td>
              <td style={{ textAlign: "center" }}>
                <span className="badge badge-neutral">{txn.risk.score}</span>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className={txn.risk.colorClass}>{txn.risk.level}</span>
              </td>
              <td className="table-factors-cell">{txn.risk.factors}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {transactionList.length === 0 && (
        <div className="status-message status-message--empty">
          No transactions found for this UPI ID.
        </div>
      )}
    </div>
  );
};

// =================================================================
// --- DASHBOARD PAGE (MAIN EXPORT) ---
// =================================================================

const DashboardPage = () => {
  const [upiId, setUpiId] = useState("user123@bank");
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDataFetched, setIsDataFetched] = useState(false);

  const handleFetchTransactions = () => {
    if (!upiId) {
      setError("Please enter a valid UPI ID.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTransactions([]);
    setIsDataFetched(false);

    setTimeout(() => {
      try {
        const rawTransactions = generateMockTransactions();
        const processedTransactions = rawTransactions.map((txn) => ({
          ...txn,
          risk: calculateRiskScore(txn),
        }));

        setTransactions(processedTransactions);
        setIsDataFetched(true);
      } catch (e) {
        setError("Failed to process data. Try again.");
      } finally {
        setIsLoading(false);
      }
    }, 1500);
  };

  useEffect(() => {
    handleFetchTransactions();
  }, []);

  const summaryData = useMemo(() => {
    if (!isDataFetched || transactions.length === 0) return null;
    return transactions;
  }, [transactions, isDataFetched]);

  return (
    <div className="dashboard-root">
      <header className="dashboard-header">
        <div className="dashboard-title-row">
          <span className="dashboard-icon" role="img" aria-label="shield">
            🛡️
          </span>
          <h1 className="dashboard-title">UPI FraudGuard Dashboard</h1>
        </div>
        <p className="dashboard-subtitle">
          Your Personal Transaction Monitoring Hub
        </p>
      </header>

      {/* UPI ID Input Section */}
      <TransactionForm
        upiId={upiId}
        setUpiId={setUpiId}
        onFetch={handleFetchTransactions}
        isLoading={isLoading}
      />

      {/* Loading/Error Messages */}
      {isLoading && (
        <div className="status-message status-message--info">
          <span className="status-icon" role="img" aria-label="clock">
            ⏳
          </span>
          <span>Analyzing UPI transactions...</span>
        </div>
      )}
      {error && (
        <div className="status-message status-message--error">
          Error: {error}
        </div>
      )}

      {/* Dashboard Content */}
      {isDataFetched && !isLoading && transactions.length > 0 && (
        <div className="dashboard-content">
          <RiskSummaryCard transactions={summaryData} />

          <div>
            <h2 className="section-title" style={{ marginTop: 8 }}>
              Recent Transactions (Last 30 Days)
            </h2>
            <TransactionTable transactions={transactions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
