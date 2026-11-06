// Same fallback as next.config.ts.
const FALLBACK_HOST = "afxbvymvsqeekmznsalo.supabase.co";

function hostOf(value: string | undefined) {
  try {
    return new URL(value ?? "").hostname;
  } catch {
    return "";
  }
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${FALLBACK_HOST}`;
const SUPABASE_HOST = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL) || FALLBACK_HOST;

/** Public URL of a file in one of the Supabase storage buckets. */
export function storageUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** True only for images next/image is allowed to optimise (our own storage). */
export function isSupabaseImage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === SUPABASE_HOST && parsed.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}
