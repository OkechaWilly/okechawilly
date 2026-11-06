import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
  async redirects() {
    // There is one login page. Older bookmarks to /admin/login land there.
    return [{ source: "/admin/login", destination: "/studio-login", permanent: false }];
  },
};
export default nextConfig;
