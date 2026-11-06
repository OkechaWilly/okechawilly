import type { NextConfig } from "next";

// Host of the Supabase project that stores artwork, product and journal images.
// Derived from the same env var the site already uses; the fallback keeps
// builds working where it is not set (for example preview deployments).
function supabaseHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "afxbvymvsqeekmznsalo.supabase.co";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost(), pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Uploaded images get a unique file name and are never overwritten, so the
    // resized copies can safely be cached for a long time (30 days).
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async redirects() {
    // There is one login page. Older bookmarks to /admin/login land there.
    return [{ source: "/admin/login", destination: "/studio-login", permanent: false }];
  },
};
export default nextConfig;
