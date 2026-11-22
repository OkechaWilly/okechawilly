"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Variant = { id: string; label: string; size: string | null; finish: string | null; stock_quantity: number | null; is_available: boolean };

export default function ProductVariantPicker({ productTitle, productType, variants, isSoldOut = false }: {
  productTitle: string;
  productType: string;
  variants: Variant[];
  isSoldOut?: boolean;
}) {
  const available = useMemo(
    () => isSoldOut ? [] : variants.filter((variant) => variant.is_available && (variant.stock_quantity == null || variant.stock_quantity > 0)),
    [variants, isSoldOut]
  );
  const [selectedSize, setSelectedSize] = useState(available[0]?.size || "");
  const [selectedFinish, setSelectedFinish] = useState(available[0]?.finish || "");
  const [selectedVariantId, setSelectedVariantId] = useState(available[0]?.id || "");
  const sizeOptions = [...new Set(available.map((variant) => variant.size).filter((value): value is string => Boolean(value)))];
  const finishOptions = [...new Set(available
    .filter((variant) => !sizeOptions.length || variant.size === selectedSize)
    .map((variant) => variant.finish)
    .filter((value): value is string => Boolean(value)))];
  const hasSeparateChoices = sizeOptions.length > 0 || finishOptions.length > 0;
  const selected = hasSeparateChoices
    ? available.find((variant) => (!sizeOptions.length || variant.size === selectedSize) && (!finishOptions.length || variant.finish === selectedFinish)) || null
    : available.find((variant) => variant.id === selectedVariantId) || available[0] || null;
  const subject = selected
    ? `Enquiry about ${productTitle} — ${selected.label}`
    : `Enquiry about ${productTitle}`;

  function changeSize(value: string) {
    setSelectedSize(value);
    const matchingFinishes = available.filter((variant) => variant.size === value)
      .map((variant) => variant.finish)
      .filter((finish): finish is string => Boolean(finish));
    if (selectedFinish && !matchingFinishes.includes(selectedFinish)) setSelectedFinish(matchingFinishes[0] || "");
  }

  return (
    <div>
      {available.length > 0 && <div className="mt-7 space-y-4">
        {sizeOptions.length > 0 && <div>
          <label htmlFor="product-size" className="eyebrow">{productType === "limited_print" || productType === "open_print" ? "Choose print size" : "Choose size"}</label>
          <select id="product-size" value={selectedSize} onChange={(event) => changeSize(event.target.value)} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
            {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>}
        {finishOptions.length > 0 && <div>
          <label htmlFor="product-finish" className="eyebrow">{productType === "limited_print" || productType === "open_print" ? "Choose paper / presentation" : "Choose colour / finish"}</label>
          <select id="product-finish" value={selectedFinish} onChange={(event) => setSelectedFinish(event.target.value)} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
            {finishOptions.map((finish) => <option key={finish} value={finish}>{finish}</option>)}
          </select>
        </div>}
        {!hasSeparateChoices && <div>
          <label htmlFor="product-option" className="eyebrow">Choose a format</label>
          <select id="product-option" value={selected?.id || ""} onChange={(event) => setSelectedVariantId(event.target.value)} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
            {available.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
          </select>
        </div>}
      </div>}
      <p className="mt-5 text-sm text-[#77736d]">Price and availability are confirmed personally by the studio.</p>
      {isSoldOut && <p className="mt-2 text-xs text-[#9b5947]">This listing is not currently available. You can still enquire about future availability or a similar work.</p>}
      {!isSoldOut && variants.length > 0 && available.length === 0 && <p className="mt-2 text-xs text-[#9b5947]">All configured formats are currently unavailable. Please contact the studio about future availability.</p>}
      <Link href={`/contact?subject=${encodeURIComponent(subject)}`} className="mt-7 inline-flex w-full items-center justify-center bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-[#f7f6f2] transition-colors hover:bg-[#9c8062] hover:!text-white">
        Enquire about this work <span className="ml-5">↗</span>
      </Link>
    </div>
  );
}
