/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' }
    ]
  }
};
export default nextConfig; 