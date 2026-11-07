import type { Metadata } from "next";
import { isSupabaseImage } from "@/lib/images";

export const SITE_NAME = "Okecha Willy";
export const SITE_DESCRIPTION = "Original art, paintings and visual explorations by Ugandan artist Okecha Willy.";

// The address the site is published at. When a custom domain is added later,
// set NEXT_PUBLIC_SITE_URL in Vercel (for example https://okechawilly.com) and redeploy.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://okechawilly.vercel.app").replace(/\/+$/, "");

// Shown in link previews for pages that have no picture of their own (shop, contact, FAQ...).
export const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Okecha Willy, artist" };

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Picture for link previews (WhatsApp, Instagram, Facebook, X, Google).
 * Our own storage images go through the site's image optimiser so the preview
 * downloads a small 1200px file instead of the full-size original (WhatsApp
 * skips images that are too heavy). Anything else is used as it is.
 */
export function shareImage(url: string | null | undefined, width = 1200) {
  if (!url) return undefined;
  return isSupabaseImage(url) ? `${SITE_URL}/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75` : url;
}

/** Turn longer text (possibly with Markdown or line breaks) into one clean sentence-style description. */
export function plainText(text: string | null | undefined, max = 155) {
  const cleaned = (text ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * Title, description, address and preview image for one page. Open Graph and
 * Twitter settings of a page replace the site-wide ones completely, so each
 * page states them in full here.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  publishedTime,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: path,
      ...(publishedTime ? { publishedTime } : {}),
      images: image ? [{ url: image, alt: imageAlt || title }] : [DEFAULT_SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image ?? DEFAULT_SHARE_IMAGE.url],
    },
  };
}
