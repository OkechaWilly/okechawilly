"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { CurrencySelector } from "@/components/currency-selector";

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
  catch { return currency + " " + value.toLocaleString("en-UG"); }
}

export default function CartPage() {
  const { items, setQuantity, removeItem, currency, currencyError } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return <main className="container min-h-[55vh] py-14 md:py-20">
    <div className="flex items-center justify-between gap-4"><p className="eyebrow">Your selection</p><CurrencySelector /></div>
    <h1 className="display mt-3 text-5xl md:text-6xl">Shopping bag.</h1>
    {!items.length ? <div className="mt-12 border-t border-[#e8e5de] py-12"><p className="display text-2xl">Your bag is currently empty.</p><Link href="/shop" className="mt-6 inline-block bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white">Explore the shop ↗</Link></div> :
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
      <div className="divide-y divide-[#e8e5de] border-y border-[#e8e5de]">
        {items.map((item) => <article key={item.key} className="flex gap-5 py-6">
          {item.image ? <img src={item.image} alt="" className="h-28 w-24 bg-[#efede7] object-cover" /> : <div className="h-28 w-24 bg-[#efede7]" />}
          <div className="min-w-0 flex-1">
            <Link href={`/shop/${item.slug}`} className="display text-xl hover:text-[#9c8062]">{item.title}</Link>
            {item.variantLabel && <p className="mt-1 text-xs text-[#77736d]">{item.variantLabel}</p>}
            <p className="mt-2 text-sm">{money(item.unitPrice, item.currency)}</p>
            <div className="mt-4 flex items-center gap-4">
              <label className="text-xs text-[#77736d]">Qty <input aria-label={`Quantity for ${item.title}`} type="number" min="1" max="20" value={item.quantity} onChange={(e) => setQuantity(item.key, Number(e.target.value))} className="ml-2 w-16 border border-[#d9d4ca] bg-white px-2 py-2 text-center text-sm" /></label>
              <button onClick={() => removeItem(item.key)} className="text-xs text-[#77736d] underline underline-offset-4">Remove</button>
            </div>
          </div>
          <p className="whitespace-nowrap text-sm">{money(item.unitPrice * item.quantity, item.currency)}</p>
        </article>)}
      </div>
      <aside className="h-fit border border-[#dedad2] bg-[#f7f6f2] p-6">
        <p className="eyebrow">Order summary</p>
        <div className="mt-5 flex justify-between text-sm"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
        <div className="mt-3 flex justify-between text-sm"><span>Delivery</span><span className="text-[#77736d]">Quoted after order</span></div>
        <p className="mt-5 border-t border-[#dedad2] pt-4 text-xs leading-6 text-[#77736d]">The studio will confirm delivery cost and your final total before you are asked to pay.</p>
        {currencyError && <p className="mt-3 text-[10px] text-[#77736d]">{currencyError}</p>}
        {items.length > 0 && items.some((item) => item.currency !== currency) && <p className="mt-3 text-xs text-[#9b5947]">Your bag contains a different currency. Remove the items before switching currency.</p>}
        <p className="mt-3 text-[10px] text-[#77736d]">Currency is locked while your bag contains items, so prices cannot be mixed.</p>
        <Link href="/checkout" className="mt-6 block bg-[#242320] px-6 py-4 text-center text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062]">Continue to checkout ↗</Link>
        <Link href="/shop" className="mt-4 block text-center text-xs text-[#77736d] underline underline-offset-4">Continue browsing</Link>
      </aside>
    </div>}
  </main>;
}
