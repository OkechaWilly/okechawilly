import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderQuoteResponse from "@/components/order-quote-response";
import OrderPayment from "@/components/order-payment";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Order quote | Okecha Willy",
  robots: { index: false, follow: false },
};

type Quote = {
  order_number: string; customer_name: string; currency: string; subtotal: number;
  shipping_total: number; total: number; shipping_quote_note: string | null;
  shipping_quote_status: string; shipping_quote_expires_at: string | null;
  payment_status: string; payment_checkout_expires_at: string | null; payment_checkout_available: boolean; payment_reconciliation_status: string | null; items: { title: string; quantity: number; line_total: number; options: { variant_label?: string | null } }[];
};
const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount)); }
  catch { return currency + " " + Number(amount).toLocaleString("en-UG"); }
};

export default async function OrderQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_shipping_quote", { p_token: token });
  if (error || !data) notFound();
  const quote = data as Quote;
  return <main className="container min-h-[65vh] py-14 md:py-20">
    <p className="eyebrow">Okecha Willy · Order {quote.order_number}</p>
    <h1 className="display mt-3 max-w-3xl text-5xl md:text-6xl">Your delivery quote.</h1>
    <p className="mt-5 max-w-2xl text-sm leading-7 text-[#77736d]">Hello {quote.customer_name}, here is the complete amount for your order. Please review the delivery details and approve or decline below. If you approve, secure online payment will be available here when enabled.</p>
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h2 className="display text-2xl">Order items</h2>
        <div className="mt-4 divide-y divide-[#e8e5de] border-y border-[#e8e5de]">
          {(quote.items || []).map((item, index) => <div key={index} className="flex justify-between gap-4 py-5 text-sm"><div><p>{item.title}</p><p className="mt-1 text-xs text-[#77736d]">Quantity {item.quantity}{item.options?.variant_label ? ` · ${item.options.variant_label}` : ""}</p></div><p className="whitespace-nowrap">{money(item.line_total, quote.currency)}</p></div>)}
        </div>
        {quote.shipping_quote_note && <div className="mt-8"><p className="eyebrow">Delivery details</p><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#77736d]">{quote.shipping_quote_note}</p></div>}
        <OrderQuoteResponse token={token} status={quote.shipping_quote_status} />
        {quote.payment_status === "paid" && <p className="mt-6 border border-[#dedad2] bg-[#f7f6f2] p-5 text-sm">Payment received. Thank you — the studio will be in touch about fulfilment.</p>}
        {quote.payment_status === "refunded" && <p className="mt-6 border border-[#dedad2] bg-[#f7f6f2] p-5 text-sm leading-6">This payment has been recorded as refunded. Please contact the studio if you need any further assistance.</p>}
        {["pending_review","refund_initiated"].includes(quote.payment_reconciliation_status || "") && <p role="status" className="mt-6 border border-[#c9a77f] bg-[#fbf7ef] p-5 text-sm leading-6">A payment for this order is being reviewed by the studio with the payment provider. Please do not attempt another payment. We will update you as soon as the review is complete.</p>}
        {quote.shipping_quote_status === "accepted" && quote.payment_status !== "paid" && quote.payment_status !== "refunded" && !["pending_review","refund_initiated"].includes(quote.payment_reconciliation_status || "") && (process.env.ONLINE_PAYMENTS_ENABLED === "true"
          ? quote.payment_status === "pending"
            ? quote.payment_checkout_available
              ? <OrderPayment token={token} />
              : <p role="status" className="mt-6 border border-[#dedad2] bg-[#f7f6f2] p-5 text-sm leading-6">A payment attempt is already being checked or its secure session has expired. Please contact the studio before trying again. This helps prevent duplicate charges.</p>
            : <OrderPayment token={token} />
          : <p className="mt-6 border border-[#dedad2] bg-[#f7f6f2] p-5 text-sm leading-6">Your delivery quote has been approved. Online payment is not enabled yet; the studio will contact you with the next steps. No payment has been taken.</p>)}
      </section>
      <aside className="h-fit border border-[#dedad2] bg-[#f7f6f2] p-6">
        <p className="eyebrow">Cost summary</p>
        <div className="mt-5 flex justify-between gap-4 text-sm"><span>Items subtotal</span><span>{money(quote.subtotal, quote.currency)}</span></div>
        <div className="mt-3 flex justify-between gap-4 text-sm"><span>Delivery</span><span>{money(quote.shipping_total, quote.currency)}</span></div>
        <div className="mt-5 flex justify-between gap-4 border-t border-[#dedad2] pt-5 text-base font-medium"><span>Total</span><span>{money(quote.total, quote.currency)}</span></div>
        {quote.shipping_quote_expires_at && <p className="mt-5 text-xs leading-6 text-[#77736d]">Please respond by {new Date(quote.shipping_quote_expires_at).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}.</p>}
        <p className="mt-4 text-xs leading-6 text-[#77736d]">After approval, the studio will arrange the next step. Online payment will become available here once checkout is fully configured. Your order is not paid until payment is verified.</p>
      </aside>
    </div>
    <Link href="/shop" className="mt-12 inline-block text-xs underline underline-offset-4">Return to the shop ↗</Link>
  </main>;
}
