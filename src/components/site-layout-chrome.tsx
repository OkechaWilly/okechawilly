"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function SiteLayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isStudio = pathname.startsWith("/admin") || pathname.startsWith("/studio-login");

  if (isStudio) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <SiteFooter />
    </>
  );
}
