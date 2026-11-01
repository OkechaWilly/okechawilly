"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function SiteLayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname.startsWith("/admin") || pathname.startsWith("/studio-login");

  if (isStudio) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
