// src/app/layout.js
import "./globals.css";

export const metadata = {
  title: "FraudGuard UPI",
  description: "Smart AI-powered UPI Payment Application",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#000" }}>
        {children}
      </body>
    </html>
  );
}
