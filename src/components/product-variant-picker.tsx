"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Variant = { id: string; label: string; size: string | null; finish: string | null; price: number; currency: string; stock_quantity: number | null; is_available: boolean };

function formatPrice(price: number, currency: string) {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency: currency || "UGX", maximumFractionDigits: 0 }).format(Number(price)); }
  catch { return `${currency} ${Number(price).toLocaleString("en-UG")}`; }
}

export default function ProductVariantPicker({ productTitle, variants, fallbackPrice, fallbackCurrency, isSoldOut = false }: { productTitle: string; variants: Variant[]; fallbackPrice: number | null; fallbackCurrency: string; isSoldOut?: boolean }) {
  const available = useMemo(() => isSoldOut ? [] : variants.filter((v) => v.is_available && (v.stock_quantity == null || v.stock_quantity > 0)), [variants, isSoldOut]);
  const [selectedId, setSelectedId] = useState(available[0]?.id || "");
  const selected = available.find((v) => v.id === selectedId) || null;
  const price = isSoldOut ? "Currently unavailable" : selected ? formatPrice(selected.price, selected.currency) : variants.length > 0 ? "Currently unavailable" : fallbackPrice == null ? "Price on request" : formatPrice(fallbackPrice, fallbackCurrency);
  const details = selected ? [selected.size, selected.finish].filter(Boolean).join(" · ") : "";
  const subject = selected ? `Enquiry about ${productTitle} — ${selected.label}` : `Enquiry about ${productTitle}`;
  return <div>
    {available.length > 0 && <div className="mt-7">
      <label htmlFor="print-option" className="eyebrow">Choose a format</label>
      <select id="print-option" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
        {available.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
      </select>
      {details && <p className="mt-2 text-xs text-[#77736d]">{details}</p>}
    </div>}
    <p className="mt-5 text-lg font-medium">{price}</p>
    {isSoldOut && <p className="mt-2 text-xs text-[#9b5947]">This listing is not available to buy at the moment. You can still contact the studio about the work, something similar, or future availability.</p>}
    {!isSoldOut && variants.length > 0 && available.length === 0 && <p className="mt-2 text-xs text-[#9b5947]">All configured formats are currently unavailable. Please contact the studio about future availability.</p>}
    <Link href={`/contact?subject=${encodeURIComponent(subject)}`} className="mt-7 inline-block bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062]">Enquire about this product ↗</Link>
  </div>;
}
