"use client";

import React, { useState, useEffect } from "react";

const box = {
  maxWidth: "700px",
  margin: "40px auto",
  padding: "20px",
  borderRadius: "8px",
  background: "#fafafa",
  border: "1px solid #ccc",
};

export default function RiskPage() {
  const [info, setInfo] = useState("Loading...");

  useEffect(() => {
    // No missing dependency warning anymore
    setTimeout(() => {
      setInfo("This page provides high-level information about UPI risk scenarios.");
    }, 500);
  }, []);

  return (
    <div style={box}>
      <div
        style={{
          fontSize: "40px",
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        ⚡
      </div>

      <h1
        style={{
          textAlign: "center",
          marginBottom: "12px",
          fontSize: "26px",
        }}
      >
        UPI Fraud Risk Insights
      </h1>

      <p style={{ lineHeight: 1.6, color: "#444" }}>{info}</p>
    </div>
  );
}
