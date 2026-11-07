"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/artwork", label: "Artwork" },
  { href: "/collections", label: "Collections" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/journal", label: "Journal" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const darkHeader = ["/artwork", "/collections", "/shop", "/prints", "/journal"].includes(pathname);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur transition-colors duration-300 ${darkHeader ? "border-white/10 bg-[#242320]/95 text-[#f7f6f2]" : "border-[#e8e5de] bg-[#f7f6f2]/95 text-[#242320]"}`}>
      <div className="container flex h-[76px] items-center justify-between gap-4">
        <Link href="/" onClick={closeMenu} className="serif shrink-0 text-[25px] tracking-[-.04em]">
          Okecha Willy<span className="text-[#9c8062]">.</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-9 text-[11px] uppercase tracking-[.13em] md:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={`transition-colors hover:text-[#d0aa83] ${darkHeader ? "text-[#f7f6f2]" : "text-[#242320]"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/contact"
            onClick={closeMenu}
            className={`border px-3 py-3 text-[9px] uppercase tracking-[.12em] transition-colors sm:px-5 sm:text-[10px] sm:tracking-[.14em] ${darkHeader ? "border-white/60 text-[#f7f6f2] hover:bg-[#f7f6f2] hover:!text-[#242320]" : "border-[#242320] text-[#242320] hover:bg-[#242320] hover:!text-[#f7f6f2]"}`}
          >
            Get in touch <span aria-hidden="true">↗</span>
          </Link>

          <button
            type="button"
            className={`flex h-11 items-center gap-2 border px-3 text-[10px] uppercase tracking-[.12em] md:hidden ${darkHeader ? "border-white/30 text-[#f7f6f2]" : "border-[#e8e5de] text-[#242320]"}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span>{menuOpen ? "Close" : "Menu"}</span>
            <span aria-hidden="true" className="text-sm">{menuOpen ? "×" : "＋"}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-site-navigation"
          aria-label="Mobile navigation"
          className={`border-t px-6 py-5 md:hidden ${darkHeader ? "border-white/10 bg-[#242320] text-[#f7f6f2]" : "border-[#e8e5de] bg-[#f7f6f2] text-[#242320]"}`}
        >
          <div className="container flex flex-col">
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`flex items-center justify-between border-b py-4 text-[12px] uppercase tracking-[.14em] transition-colors hover:text-[#d0aa83] ${darkHeader ? "border-white/10" : "border-[#e8e5de]"}`}
              >
                <span>{item.label}</span>
                <span aria-hidden="true" className="text-[#9c8062]">0{index + 1}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[#e8e5de]">
      <div className="container grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="serif text-3xl">Okecha Willy.</div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#77736d]">
            An independent Ugandan artist exploring identity, spirituality, culture and the human experience through visual art.
          </p>
        </div>
        <div>
          <p className="eyebrow">Explore</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/artwork">Artwork</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/faq">Collector FAQ</Link>
            <Link href="/about">About the artist</Link>
            <Link href="/contact">Commissions &amp; enquiries</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow">Studio</p>
          <p className="mt-4 text-sm leading-6 text-[#77736d]">
            Based in Wakiso, Uganda<br />
            Working locally and internationally.
          </p>
          <p className="mt-8 text-xs text-[#77736d]">
            © {new Date().getFullYear()} Okecha Willy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
