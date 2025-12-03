import React from 'react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center">
          {/* Icon for the application */}
          <svg className="w-8 h-8 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944c-1.474.965-2.868 2.053-4.148 3.253C4.195 9.423 2 12.01 2 15a6 6 0 006 6h8a6 6 0 006-6c0-2.99-2.195-5.577-5.852-8.799z" />
          </svg>
          <span className="text-2xl font-bold text-gray-800">FraudShield</span>
        </div>
        <div className="text-sm font-medium text-gray-500 hidden sm:block">
          Risk Analysis Dashboard
        </div>
      </div>
    </nav>
  );
}