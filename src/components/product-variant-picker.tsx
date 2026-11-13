"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";

type Variant = { id: string; label: string; size: string | null; finish: string | null; price: number; currency: string; price_ugx?: number | null; price_usd?: number | null; stock_quantity: number | null; is_available: boolean };

function formatPrice(price: number, currency: string) {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency: currency || "UGX", maximumFractionDigits: 0 }).format(Number(price)); }
  catch { return `${currency} ${Number(price).toLocaleString("en-UG")}`; }
}

export default function ProductVariantPicker({ productId, productSlug, productImage, productTitle, productType, variants, fallbackPrice, fallbackCurrency, fallbackPriceUGX, fallbackPriceUSD, isSoldOut = false }: { productId: string; productSlug: string; productImage: string | null; productTitle: string; productType: string; variants: Variant[]; fallbackPrice: number | null; fallbackCurrency: string; fallbackPriceUGX?: number | null; fallbackPriceUSD?: number | null; isSoldOut?: boolean }) {
  const { addItem, currency } = useCart();
  const [addError, setAddError] = useState("");
  const available = useMemo(() => isSoldOut ? [] : variants.filter((v) => v.is_available && (v.stock_quantity == null || v.stock_quantity > 0)), [variants, isSoldOut]);
  const [selectedSize, setSelectedSize] = useState(available[0]?.size || "");
  const [selectedFinish, setSelectedFinish] = useState(available[0]?.finish || "");
  const sizeOptions = [...new Set(available.map((v) => v.size).filter((v): v is string => Boolean(v)))];
  const finishOptions = [...new Set(available.filter((v) => !selectedSize || !v.size || v.size === selectedSize).map((v) => v.finish).filter((v): v is string => Boolean(v)))];
  const selected = available.find((v) => (!sizeOptions.length || v.size === selectedSize) && (!finishOptions.length || v.finish === selectedFinish)) || available[0] || null;
  const hasSeparateChoices = sizeOptions.length > 0 || finishOptions.length > 0;
  const selectedPrice = selected ? (currency === "UGX" ? selected.price_ugx ?? (selected.currency === "UGX" ? selected.price : null) : selected.price_usd ?? (selected.currency === "USD" ? selected.price : null)) : (currency === "UGX" ? fallbackPriceUGX ?? (fallbackCurrency === "UGX" ? fallbackPrice : null) : fallbackPriceUSD ?? (fallbackCurrency === "USD" ? fallbackPrice : null));
  const price = isSoldOut ? "Currently unavailable" : productType === "original" ? "Price on request" : selected && selectedPrice != null ? formatPrice(Number(selectedPrice), currency) : selected || variants.length === 0 ? (selectedPrice == null ? `Not yet priced in ${currency}` : formatPrice(Number(selectedPrice), currency)) : "Currently unavailable";
  const subject = selected ? `Enquiry about ${productTitle} — ${selected.label}` : `Enquiry about ${productTitle}`;
  const canAdd = productType !== "original" && !isSoldOut && selectedPrice !== null && selectedPrice !== undefined && (selected !== null || variants.length === 0);
  const chosenPrice = selectedPrice;
  const chosenCurrency = currency;

  function changeSize(value: string) {
    setSelectedSize(value);
    const matchingFinishes = available.filter((v) => v.size === value).map((v) => v.finish).filter((v): v is string => Boolean(v));
    if (selectedFinish && !matchingFinishes.includes(selectedFinish)) setSelectedFinish(matchingFinishes[0] || "");
  }

  return <div>
    {available.length > 0 && <div className="mt-7 space-y-4">
      {sizeOptions.length > 0 && <div>
        <label htmlFor="product-size" className="eyebrow">{productType === "limited_print" || productType === "open_print" ? "Choose print size" : "Choose size"}</label>
        <select id="product-size" value={selectedSize} onChange={(e) => changeSize(e.target.value)} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
          {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>}
      {finishOptions.length > 0 && <div>
        <label htmlFor="product-finish" className="eyebrow">{productType === "limited_print" || productType === "open_print" ? "Choose paper / presentation" : "Choose colour / finish"}</label>
        <select id="product-finish" value={selectedFinish} onChange={(e) => setSelectedFinish(e.target.value)} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
          {finishOptions.map((finish) => <option key={finish} value={finish}>{finish}</option>)}
        </select>
      </div>}
      {!hasSeparateChoices && <div>
        <label htmlFor="print-option" className="eyebrow">Choose a format</label>
        <select id="print-option" value={selected?.id || ""} onChange={(e) => { const choice = available.find((v) => v.id === e.target.value); if (choice) { setSelectedSize(choice.size || ""); setSelectedFinish(choice.finish || ""); } }} className="mt-3 w-full border border-[#d9d4ca] bg-white px-4 py-4 text-sm outline-none focus:border-[#9c8062]">
          {available.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
        </select>
      </div>}
    </div>}
    <p className="mt-5 text-lg font-medium">{price}</p>
    {isSoldOut && <p className="mt-2 text-xs text-[#9b5947]">This listing is not available to buy at the moment. You can still contact the studio about the work, something similar, or future availability.</p>}
    {!isSoldOut && variants.length > 0 && available.length === 0 && <p className="mt-2 text-xs text-[#9b5947]">All configured formats are currently unavailable. Please contact the studio about future availability.</p>}
    {canAdd && <button type="button" onClick={() => { setAddError(""); const added = addItem({ productId, slug: productSlug, image: productImage, title: productTitle, variantId: selected?.id || null, variantLabel: selected?.label || null, unitPrice: Number(chosenPrice), currency: chosenCurrency }); if (!added) setAddError("Your bag uses a different currency. Empty it before changing market currency."); }} className="mt-7 block w-full bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-[#f7f6f2] transition-colors hover:bg-[#9c8062]">Add to bag ↗</button>}
    {addError && <p role="alert" className="mt-3 text-xs text-[#9b5947]">{addError}</p>}
    <Link href={`/contact?subject=${encodeURIComponent(subject)}`} className="mt-3 inline-block border border-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-[#242320] transition-colors hover:bg-[#242320] hover:text-white">Enquire about this product</Link>
  </div>;
}
