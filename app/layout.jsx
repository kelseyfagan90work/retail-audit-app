import './globals.css';

export const metadata = {
  title: 'Retail Audit',
  description: 'Store audits, scoring, and reporting',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
