import './globals.css';

export const metadata = {
  title: 'RADAR',
  description: 'RAD store audits, scoring, and reporting',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
