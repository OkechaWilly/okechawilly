import type { Metadata } from "next";
import "./globals.css";
import SiteLayoutChrome from "@/components/site-layout-chrome";
import { JsonLd } from "@/components/json-ld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Okecha Willy — Artist", template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Okecha Willy — Artist",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Okecha Willy — Artist", description: SITE_DESCRIPTION },
};

const siteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: SITE_DESCRIPTION },
    { "@type": "Person", "@id": `${SITE_URL}/#artist`, name: SITE_NAME, url: SITE_URL, jobTitle: "Artist" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={siteSchema} />
        <SiteLayoutChrome>{children}</SiteLayoutChrome>
      </body>
    </html>
  );
}
