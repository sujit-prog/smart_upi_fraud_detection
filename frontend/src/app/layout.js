// src/app/layout.js
import "./globals.css";

export const metadata = {
  title: "UPI FraudGuard Dashboard",
  description: "Your Personal Transaction Monitoring Hub",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
