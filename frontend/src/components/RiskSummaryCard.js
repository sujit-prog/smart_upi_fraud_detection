import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const RiskSummaryCard = ({ transactions }) => {
    if (!transactions || transactions.length === 0) return null;

    const highRiskCount = transactions.filter(t => t.risk.level === 'High').length;
    const mediumRiskCount = transactions.filter(t => t.risk.level === 'Medium').length;
    const totalTransactions = transactions.length;
    const safePercentage = Math.round(((totalTransactions - highRiskCount) / totalTransactions) * 100);

    const riskMessage = highRiskCount > 0 
        ? `ALERT: ${highRiskCount} transactions flagged as HIGH Risk.`
        : `Overall security is ${safePercentage}%. No HIGH risk transactions found.`;

    const icon = highRiskCount > 0 ? <AlertTriangle size={28} className="text-red-400" /> : <CheckCircle size={28} className="text-green-400" />;
    const bgColor = highRiskCount > 0 ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700';

    return (
        <div className={`p-5 rounded-xl border-l-4 ${bgColor} shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all`}>
            <div className="flex items-start gap-4 mb-4 sm:mb-0">
                {icon}
                <div>
                    <h2 className="text-xl font-bold text-white">Risk Summary (Last 30 Days)</h2>
                    <p className={`text-sm ${highRiskCount > 0 ? 'text-red-300' : 'text-green-300'}`}>{riskMessage}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold text-white">{totalTransactions}</p>
                <p className="text-sm text-gray-400">Total Transactions</p>
                <div className="flex justify-end gap-3 mt-2">
                    <span className="text-red-400 font-semibold">{highRiskCount} High</span>
                    <span className="text-yellow-400 font-semibold">{mediumRiskCount} Medium</span>
                </div>
            </div>
        </div>
    );
};

export default RiskSummaryCard;