/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  // @react-pdf/renderer uses pdfkit internally, which reads its built-in font
  // files (Helvetica, etc.) at runtime rather than importing them normally —
  // Vercel's build-time file tracing can't see that and leaves them out of
  // the deployed function, causing "Cannot find module .../Helvetica.cjs".
  // This forces those files to be bundled alongside the PDF export route.
  experimental: {
    outputFileTracingIncludes: {
      '/api/audits/[id]/export-pdf': ['./node_modules/pdfkit/js/**/*'],
      '/api/reports/send-bulk': ['./node_modules/pdfkit/js/**/*'],
    },
  },
};

module.exports = nextConfig;
