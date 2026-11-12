"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";

const navigation = [
  { href: "/artwork", label: "Artwork" },
  { href: "/collections", label: "Collections" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/journal", label: "Journal" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname();
  const darkHeader = ["/artwork", "/collections", "/shop", "/prints", "/journal"].includes(pathname);
  const [scrolled, setScrolled] = useState(false);

  // On pages with a banner the header floats over the picture at the top of the page, then turns
  // into a solid bar once the visitor scrolls (or opens the mobile menu) so it stays readable.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  const overOverlay = darkHeader && !scrolled && !menuOpen;
  const headerStyle = !darkHeader
    ? "border-[#e8e5de] bg-[#f7f6f2]/95 text-[#242320] backdrop-blur"
    : overOverlay
      ? "border-transparent bg-transparent text-[#f7f6f2]"
      : "border-white/10 bg-[#242320]/90 text-[#f7f6f2] backdrop-blur";

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${headerStyle}`}>
      {darkHeader && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#171614]/70 via-[#171614]/35 to-transparent transition-opacity duration-300 ${overOverlay ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <div className="container flex h-[76px] items-center justify-between gap-3 sm:gap-4">
        <Link href="/" onClick={closeMenu} className="serif shrink-0 text-[21px] tracking-[-.04em] max-[359px]:text-[19px] sm:text-[25px]">
          Okecha Willy<span className="text-[#9c8062]">.</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-9 text-[11px] uppercase tracking-[.13em] lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={`transition-colors hover:text-[#d0aa83] ${darkHeader ? "text-[#f7f6f2]" : "text-[#242320]"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/cart" onClick={closeMenu} aria-label={`Shopping bag, ${count} items`} className="border border-current/40 px-3 py-3 text-[9px] uppercase tracking-[.12em] transition-colors hover:border-[#9c8062] hover:text-[#d0aa83]">Bag ({count})</Link>
          <Link
            href="/contact"
            onClick={closeMenu}
            className={`border px-3 py-3 text-[9px] uppercase tracking-[.12em] transition-colors sm:px-5 sm:text-[10px] sm:tracking-[.14em] ${darkHeader ? "border-white/60 text-[#f7f6f2] hover:bg-[#f7f6f2] hover:!text-[#242320]" : "border-[#242320] text-[#242320] hover:bg-[#242320] hover:!text-[#f7f6f2]"}`}
          >
            <span className="sm:hidden">Contact</span>
            <span className="hidden sm:inline">Get in touch</span> <span aria-hidden="true">↗</span>
          </Link>

          <button
            type="button"
            className={`flex h-11 items-center gap-2 border px-3 text-[10px] uppercase tracking-[.12em] lg:hidden ${darkHeader ? "border-white/30 text-[#f7f6f2]" : "border-[#e8e5de] text-[#242320]"}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="max-[359px]:sr-only">{menuOpen ? "Close" : "Menu"}</span>
            <span aria-hidden="true" className="text-sm">{menuOpen ? "×" : "＋"}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-site-navigation"
          aria-label="Mobile navigation"
          className={`border-t px-6 py-5 lg:hidden ${darkHeader ? "border-white/10 bg-[#242320] text-[#f7f6f2]" : "border-[#e8e5de] bg-[#f7f6f2] text-[#242320]"}`}
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
            <Link href="/cart" onClick={closeMenu} className="flex items-center justify-between border-b border-current/10 py-4 text-[12px] uppercase tracking-[.14em]">Shopping bag <span className="text-[#9c8062]">{count} items</span></Link>
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
