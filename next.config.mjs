/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Prisma ต้องเป็น external ใน server bundle
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  images: {
    // รูปทรัพย์อยู่ใน Supabase Storage bucket `property-images` (public)
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' }],
  },
  async headers() {
    return [
      {
        // API เป็น data layer — ห้าม cache และห้าม sniff content type
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        // ชั้น admin ห้าม index / ห้าม cache แม้ middleware หรือ metadata จะพลาด
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, private' },
        ],
      },
    ];
  },
};

export default nextConfig;
