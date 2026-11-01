import type { Metadata } from "next";
import "./globals.css";
import SiteLayoutChrome from "@/components/site-layout-chrome";

export const metadata: Metadata = {
  title: "Okecha Willy — Artist",
  description: "Original art, paintings and visual explorations by Ugandan artist Okecha Willy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteLayoutChrome />{children}</body></html>;
}
