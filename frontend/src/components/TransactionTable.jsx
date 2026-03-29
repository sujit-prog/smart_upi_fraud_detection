import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const TransactionTable = ({ transactions }) => {
    // FIX: Add a safeguard to ensure transactions is an array before mapping
    const transactionList = transactions || [];

    return (
        <div className="overflow-x-auto shadow-2xl rounded-xl">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/80 sticky top-0">
                    <tr>
                        {['Date', 'Time', 'Amount (₹)', 'Type', 'Beneficiary', 'Risk Score', 'Risk Level', 'Key Factors'].map((header) => (
                            <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {transactionList.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{txn.date}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{txn.time}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${txn.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                                {txn.type === 'Debit' ? <TrendingDown size={14} className="inline mr-1" /> : <TrendingUp size={14} className="inline mr-1" />}
                                ₹{txn.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {txn.type}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-[120px] sm:max-w-none">
                                {txn.beneficiary}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-center">
                                <span className="p-1 rounded-full text-xs font-mono bg-gray-700 text-white">
                                    {txn.risk.score}
                                </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${txn.risk.colorClass}`}>
                                    {txn.risk.level}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 max-w-[150px] truncate">
                                {txn.risk.factors}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {transactionList.length === 0 && (
                <div className="text-center py-10 text-gray-400 bg-gray-800">No transactions found for this UPI ID.</div>
            )}
        </div>
    );
};

export default TransactionTable;