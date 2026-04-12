import './globals.css';

export const metadata = {
  title: 'Smart UPI — AI Fraud Detection',
  description: 'Secure UPI payments powered by real-time AI fraud detection. Scan, verify, and pay with confidence.',
  keywords: 'UPI payment, fraud detection, AI security, secure payment',
  openGraph: {
    title: 'Smart UPI — AI Fraud Detection',
    description: 'Secure UPI payments powered by real-time AI fraud detection.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
