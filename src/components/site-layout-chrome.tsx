"use client";

import { usePathname } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function SiteLayoutChrome() {
  const pathname = usePathname();
  const isStudio = pathname.startsWith("/admin") || pathname.startsWith("/studio-login");
  if (isStudio) return null;
  return <><SiteHeader /><SiteFooter /></>;
}
