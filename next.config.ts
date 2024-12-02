import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  images: {
    domains: [
      'lh3.googleusercontent.com', // Google
      'avatars.githubusercontent.com', // GitHub
      'platform-lookaside.fbsbx.com', // Facebook
      'pbs.twimg.com' // Twitter
    ]
  },
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' }
        ]
      }
    ];
  },
  typescript: {
    ignoreBuildErrors: false
  },
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
