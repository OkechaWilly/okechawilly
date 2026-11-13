"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";

const inputClass = "mt-2 w-full border border-[#d9d4ca] bg-white px-4 py-3 text-sm outline-none focus:border-[#9c8062]";
export default function CheckoutPage() {
  const { items, clearCart, currency } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "Uganda", address: "", city: "", postalCode: "", note: "" });
  useEffect(() => { fetch("/api/shop/currency", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => { if (data?.countryName) setForm((current) => current.country === "Uganda" ? { ...current, country: data.countryName } : current); }).catch(() => {}); }, []);
  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || busy) return;
    if (items.some((item) => item.currency !== currency)) { setError("Your bag contains mixed currencies. Please return to the bag and resolve this before checkout."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customer: { name: form.name, email: form.email, phone: form.phone },
        shippingAddress: { country: form.country, address: form.address, city: form.city, postalCode: form.postalCode },
        note: form.note,
        currency,
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not submit your order. Please try again.");
      clearCart();
      router.push(`/order-received?order=${encodeURIComponent(result.orderNumber)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }
  if (!items.length) return <main className="container py-20"><p className="eyebrow">Checkout</p><h1 className="display mt-3 text-5xl">Your bag is empty.</h1><Link href="/shop" className="mt-6 inline-block underline">Return to the shop</Link></main>;
  return <main className="container py-14 md:py-20">
    <p className="eyebrow">Almost there</p><h1 className="display mt-3 text-5xl md:text-6xl">Checkout.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Share your contact and delivery details. This places an order request; it does not charge you. The studio will check availability, calculate delivery and send you the complete amount for approval before payment.</p>
    <form onSubmit={submit} className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
      <div className="space-y-9">
        <section><h2 className="display text-2xl">Contact details</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-xs">Full name<input required maxLength={120} autoComplete="name" value={form.name} onChange={(e)=>update("name",e.target.value)} className={inputClass}/></label>
          <label className="text-xs">Email address<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e)=>update("email",e.target.value)} className={inputClass}/></label>
          <label className="text-xs sm:col-span-2">Phone / WhatsApp<input required type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={(e)=>update("phone",e.target.value)} className={inputClass}/></label>
        </div></section>
        <section><h2 className="display text-2xl">Delivery address</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-xs sm:col-span-2">Country<input required maxLength={80} autoComplete="country-name" value={form.country} onChange={(e)=>update("country",e.target.value)} className={inputClass}/></label>
          <label className="text-xs sm:col-span-2">Street address / delivery location<input required maxLength={300} autoComplete="street-address" value={form.address} onChange={(e)=>update("address",e.target.value)} className={inputClass}/></label>
          <label className="text-xs">Town / city<input required maxLength={100} autoComplete="address-level2" value={form.city} onChange={(e)=>update("city",e.target.value)} className={inputClass}/></label>
          <label className="text-xs">Postal code (if applicable)<input maxLength={30} autoComplete="postal-code" value={form.postalCode} onChange={(e)=>update("postalCode",e.target.value)} className={inputClass}/></label>
        </div></section>
        <section><h2 className="display text-2xl">Anything we should know?</h2><label className="mt-4 block text-xs">Delivery instructions or note<textarea maxLength={1000} rows={4} value={form.note} onChange={(e)=>update("note",e.target.value)} className={inputClass}/></label></section>
        {error && <p role="alert" className="border border-[#b77b68] bg-white p-4 text-sm text-[#8d4937]">{error}</p>}
        <button disabled={busy} className="bg-[#242320] px-8 py-4 text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy ? "Submitting order…" : "Submit order request ↗"}</button>
      </div>
      <aside className="h-fit border border-[#dedad2] bg-[#f7f6f2] p-6">
        <p className="eyebrow">Your order · {currency}</p>{items.map((item)=><div key={item.key} className="flex justify-between gap-4 border-b border-[#dedad2] py-4 text-sm"><div><p>{item.title}</p><p className="mt-1 text-xs text-[#77736d]">Qty {item.quantity}{item.variantLabel ? " · "+item.variantLabel : ""}</p></div><span className="whitespace-nowrap">{(item.unitPrice*item.quantity).toLocaleString("en-UG")} {item.currency}</span></div>)}
        <p className="mt-5 text-xs leading-6 text-[#77736d]">No payment is collected at this stage. Your final total will include delivery only after the studio confirms the quote with you.</p>
      </aside>
    </form>
  </main>;
}
