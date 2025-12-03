import React from 'react';
import { Zap } from 'lucide-react';

const RealtimeIntegrationBox = () => (
    <div className="p-6 mt-8 bg-indigo-900/30 border border-indigo-700 rounded-xl shadow-2xl max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
            <Zap size={32} className="text-indigo-400" />
            <h1 className="text-2xl font-bold text-indigo-300">Real-Time Risk Integration Protocol</h1>
        </div>
        <p className="mt-3 text-lg text-gray-300">
            This feature describes the conceptual integration with a live UPI payment application to provide security at the moment of transaction.
        </p>
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Protocol Steps:</h3>
            <ul className="mt-3 space-y-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                    <span className="font-semibold text-indigo-300 flex-shrink-0 w-24">1. Pre-PIN Trigger:</span>
                    <span>The UPI app sends transaction metadata (amount, beneficiary VPA, device ID, location) to the Risk Engine API *before* the user enters their PIN.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="font-semibold text-indigo-300 flex-shrink-0 w-24">2. Instant Scoring:</span>
                    <span>The secure backend ML model analyzes the data against known fraud patterns (velocity, blacklists, behavioral biometrics) and returns a risk score (0-100) within 100ms.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="font-semibold text-indigo-300 flex-shrink-0 w-24">3. Adaptive Action:</span>
                    <span>
                        <p>Based on the score, the UPI app takes immediate action:</p>
                        <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Score &lt; 30 (Low Risk): Transaction proceeds normally.</li>
                            <li>Score 30-65 (Medium Risk): Displays a *soft warning* and requires user to confirm transaction details again.</li>
                            <li>Score &gt; 65 (High Risk): Automatically **BLOCKS** the transaction and displays a **CRITICAL FRAUD WARNING**.</li>
                        </ul>
                    </span>
                </li>
            </ul>
        </div>
    </div>
);

export default RealtimeIntegrationBox;