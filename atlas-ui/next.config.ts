import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
];
const STRICT_TRANSPORT_SECURITY = {
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains'
};

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/:path*',
        headers: isProduction ? [...SECURITY_HEADERS, STRICT_TRANSPORT_SECURITY] : SECURITY_HEADERS
      },
      {
        source: '/verify-email',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }]
      }
    ];
  }
};

export default nextConfig;
