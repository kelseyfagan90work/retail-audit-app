import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'RADAR',
  description: 'RAD store audits, scoring, and reporting',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
