"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; product_title: string; sku: string | null; quantity: number; unit_price: number; line_total: number; selected_options: Record<string, unknown> };
type ReconciliationCase = {
  id: string; order_id: string; order_number: string; tx_ref: string;
  transaction_id: string; amount: number; currency: string; reason: string;
  status: string; admin_note: string | null; created_at: string;
};
type Order = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string | null;
  currency: string; subtotal: number; shipping_total: number; total: number;
  shipping_address: Record<string, unknown> | null; status: string; payment_status: string;
  payment_provider: string | null; payment_reference: string | null; payment_checkout_expires_at?: string | null; customer_note: string | null;
  shipping_quote_status?: string; shipping_quote_total?: number | null; shipping_quote_currency?: string | null; shipping_quote_note?: string | null; shipping_quote_sent_at?: string | null;
  created_at: string; order_items: Item[];
};
const statuses = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled", "refunded"];
const label = (value: string) => value.replaceAll("_", " ");
const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency: currency || "UGX", maximumFractionDigits: 0 }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toLocaleString("en-UG")}`; }
};
const field = "border border-[#d9d4ca] bg-white px-3 py-2 text-xs outline-none focus:border-[#9c8062]";

export default function OrdersManager({ initialOrders, initialReconciliationCases = [] }: { initialOrders: Order[]; initialReconciliationCases?: ReconciliationCase[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState(initialOrders);
  const [reconciliationCases, setReconciliationCases] = useState(initialReconciliationCases);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [quoteLink, setQuoteLink] = useState("");

  useEffect(() => {
    setQuoteAmount(selected?.shipping_quote_total == null ? "" : String(selected.shipping_quote_total));
    setQuoteNote(selected?.shipping_quote_note || "");
  }, [selected?.id, selected?.shipping_quote_total, selected?.shipping_quote_note]);

  const visible = orders.filter((order) => filter === "all" || order.status === filter);
  const activeOrders = orders.filter((order) => !["cancelled", "refunded"].includes(order.status));
  const totalValueUGX = activeOrders.filter((order) => order.currency === "UGX").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalValueUSD = activeOrders.filter((order) => order.currency === "USD").reduce((sum, order) => sum + Number(order.total || 0), 0);

  async function updateStatus(order: Order, status: string) {
    setBusy(order.id); setNotice("");
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) setNotice(error.message);
    else {
      const updated = { ...order, status };
      setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
      setSelected(updated);
      setNotice(`Order ${order.order_number} updated.`);
    }
    setBusy("");
  }

  async function updateReconciliationCase(item: ReconciliationCase, status: string) {
    setBusy(item.id); setNotice("");
    const { error } = await supabase.rpc("resolve_payment_reconciliation_case", {
      p_case_id: item.id, p_outcome: status, p_admin_note: null,
    });
    if (error) setNotice("Could not update reconciliation case: " + error.message);
    else {
      setReconciliationCases((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
      if (status === "refunded") {
        setOrders((current) => current.map((order) => order.id === item.order_id ? { ...order, payment_status: "refunded" } : order));
        setSelected((current) => current?.id === item.order_id ? { ...current, payment_status: "refunded" } : current);
      }
      setNotice(`Payment case for ${item.order_number} updated to ${label(status)}.`);
    }
    setBusy("");
  }

  async function releaseExpiredPaymentSession(order: Order) {
    const note = window.prompt("Confirm you checked Flutterwave and verified that this payment was not successful. Add the provider check details (at least 12 characters):");
    if (!note || note.trim().length < 12) return;
    setBusy(order.id); setNotice("");
    const { error } = await supabase.rpc("release_expired_flutterwave_session", {
      p_order_id: order.id, p_admin_note: note.trim(),
    });
    if (error) setNotice("Could not release payment session: " + error.message);
    else {
      const updated = { ...order, payment_status: "unpaid", payment_provider: null, payment_reference: null, payment_checkout_url: null, payment_checkout_expires_at: null };
      setOrders((current) => current.map((entry) => entry.id === order.id ? updated : entry));
      setSelected(updated);
      setNotice(`Expired payment session for ${order.order_number} released and recorded.`);
    }
    setBusy("");
  }

  async function saveShippingQuote(order: Order) {
    const amount = Number(quoteAmount);
    if (!Number.isFinite(amount) || amount < 0 || quoteAmount.trim() === "") { setNotice("Enter a valid delivery amount, including 0 if delivery is complimentary."); return; }
    setBusy(order.id); setNotice("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/quote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: quoteNote.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare the delivery quote.");
      const quote = result.quote;
      const updated = {
        ...order,
        shipping_total: Number(quote.shipping_total),
        total: Number(quote.total),
        shipping_quote_total: Number(quote.shipping_total),
        shipping_quote_currency: quote.currency,
        shipping_quote_note: quote.shipping_quote_note,
        shipping_quote_status: "quoted",
        shipping_quote_sent_at: new Date().toISOString(),
      };
      setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
      setSelected(updated);
      setQuoteLink(result.quoteUrl);
      setNotice(result.emailSent
        ? "Delivery quote saved and emailed to the customer."
        : "Delivery quote saved. Email is not configured yet; copy the secure link below and share it manually.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not prepare the delivery quote.");
    } finally { setBusy(""); }
  }

  return <section>
    <p className="eyebrow">Studio workspace</p>
    <h1 className="display mt-3 text-5xl md:text-6xl">Orders.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Review customer orders and follow each one through confirmation, preparation and delivery. Payment records are shown separately from fulfilment. Delivery quotes can now be securely sent for customer approval.</p>
    {notice && <p className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm text-[#625e57]">{notice}</p>}
    {reconciliationCases.some((item) => item.status === "pending_review") && <div className="mt-6 border border-[#c9a77f] bg-[#fbf7ef] p-5">
      <p className="text-[10px] uppercase tracking-[.15em] text-[#8b6943]">Payment attention required</p>
      <p className="mt-2 text-sm leading-6">{reconciliationCases.filter((item) => item.status === "pending_review").length} provider-confirmed payment(s) need manual reconciliation. Review the affected order records below before fulfilment or refund decisions.</p>
    </div>}
    <div className="mt-9 grid gap-3 sm:grid-cols-3">
      <div className="border border-[#dedad2] bg-white p-5"><p className="eyebrow">All orders</p><p className="display mt-2 text-3xl">{orders.length}</p></div>
      <div className="border border-[#dedad2] bg-white p-5"><p className="eyebrow">Awaiting action</p><p className="display mt-2 text-3xl">{orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status)).length}</p></div>
      <div className="border border-[#dedad2] bg-white p-5"><p className="eyebrow">Order value · not revenue</p><div className="mt-3 flex items-baseline justify-between gap-3"><span className="text-xs text-[#77736d]">UGX</span><p className="display text-xl">{money(totalValueUGX,"UGX")}</p></div><div className="mt-2 flex items-baseline justify-between gap-3"><span className="text-xs text-[#77736d]">USD</span><p className="display text-xl">{money(totalValueUSD,"USD")}</p></div></div>
    </div>
    <div className="mt-10 flex flex-col justify-between gap-4 border-b border-[#dedad2] pb-4 sm:flex-row sm:items-center">
      <p className="eyebrow">{visible.length} {filter === "all" ? "orders" : label(filter) + " orders"}</p>
      <select className={field} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
    </div>
    {visible.length ? <div className="divide-y divide-[#e2ded6]">
      {visible.map((order) => <button key={order.id} onClick={() => { setQuoteLink(""); setSelected(order); }} className="grid w-full gap-3 py-5 text-left transition-colors hover:bg-[#f7f6f2] sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <div><p className="text-[10px] uppercase tracking-[.14em] text-[#9c8062]">{order.order_number}</p><p className="display mt-1 text-xl">{order.customer_name}</p><p className="mt-1 text-xs text-[#89847c]">{order.customer_email}</p></div>
        <div><p className="text-xs">{order.order_items?.length || 0} line item(s) · {new Date(order.created_at).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</p><p className="mt-1 text-xs text-[#89847c]">Payment: {label(order.payment_status)} · Delivery: {label(order.shipping_quote_status || "not_requested")}</p></div>
        <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-sm">{money(order.total, order.currency)}</span><span className="border border-[#d9d4ca] px-3 py-1 text-[9px] uppercase tracking-[.12em]">{label(order.status)}</span></div>
      </button>)}
    </div> : <div className="mt-8 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-14 text-center"><p className="display text-2xl">No orders yet.</p><p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-[#89847c]">Orders will appear here once the studio begins recording customer purchases. Online checkout is still disabled.</p></div>}
    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-[#f8f7f3] p-6 md:p-9">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Order details</p><h2 className="display mt-2 text-3xl">{selected.order_number}</h2></div><button onClick={() => setSelected(null)} className="text-xs underline underline-offset-4">Close</button></div>
        <div className="mt-8 border-y border-[#dedad2] py-5"><p className="eyebrow">Customer</p><p className="mt-3 text-sm">{selected.customer_name}</p><p className="mt-1 text-sm text-[#77736d]">{selected.customer_email}</p>{selected.customer_phone && <p className="mt-1 text-sm text-[#77736d]">{selected.customer_phone}</p>}</div>
        <div className="py-6"><p className="eyebrow">Items</p>{(selected.order_items || []).map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-[#e6e2da] py-4 text-sm"><div><p>{item.product_title}</p><p className="mt-1 text-xs text-[#89847c]">Qty {item.quantity}{item.sku ? " · " + item.sku : ""}</p></div><p className="whitespace-nowrap">{money(item.line_total, selected.currency)}</p></div>)}</div>
        <div className="space-y-2 border-b border-[#dedad2] pb-6 text-sm"><div className="flex justify-between"><span className="text-[#77736d]">Subtotal</span><span>{money(selected.subtotal, selected.currency)}</span></div><div className="flex justify-between"><span className="text-[#77736d]">Shipping</span><span>{money(selected.shipping_total, selected.currency)}</span></div><div className="flex justify-between pt-2 font-medium"><span>Total</span><span>{money(selected.total, selected.currency)}</span></div></div>
        <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Delivery quote</p><p className="mt-2 text-xs leading-5 text-[#77736d]">Enter the delivery fee after checking the destination. Saving sets the complete order total, but does not request or record payment.</p><label className="mt-4 block text-xs">Delivery fee ({selected.currency})<input type="number" min="0" step="1" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} className={field + " mt-2 w-full"} /></label><label className="mt-4 block text-xs">Message / delivery details<textarea rows={3} maxLength={1000} value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} className={field + " mt-2 w-full"} /></label><div className="mt-4 flex justify-between text-sm"><span className="text-[#77736d]">Final total</span><strong>{money(Number(selected.subtotal) + (Number(quoteAmount) || 0), selected.currency)}</strong></div><button disabled={busy === selected.id} onClick={() => saveShippingQuote(selected)} className="mt-4 w-full bg-[#242320] px-4 py-3 text-[10px] uppercase tracking-[.14em] text-white disabled:opacity-50">{busy === selected.id ? "Saving…" : "Save delivery quote"}</button>{quoteLink && <div className="mt-4 border border-[#dedad2] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#77736d]">Secure customer quote link</p><p className="mt-2 break-all text-xs">{quoteLink}</p><button onClick={() => { void navigator.clipboard.writeText(quoteLink); setNotice("Quote link copied."); }} className="mt-3 text-[10px] uppercase tracking-[.12em] underline underline-offset-4">Copy quote link</button></div>}{selected.shipping_quote_status === "quoted" && <p className="mt-3 text-[10px] leading-5 text-[#77736d]">Quote saved {selected.shipping_quote_sent_at ? "on " + new Date(selected.shipping_quote_sent_at).toLocaleString("en-UG") : ""}. Customer approval is pending.</p>}</div>
        <div className="py-6"><p className="eyebrow">Fulfilment status</p><select disabled={busy === selected.id} className={field + " mt-3 w-full"} value={selected.status} onChange={(e) => updateStatus(selected, e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select><p className="mt-2 text-[10px] leading-5 text-[#89847c]">Changing this updates fulfilment only. It does not mark a payment as received.</p></div>
        <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Payment record</p><p className="mt-3 text-sm">Status: <span className="capitalize">{label(selected.payment_status)}</span></p>{selected.payment_provider && <p className="mt-1 text-xs text-[#77736d]">Provider: {selected.payment_provider}</p>}{selected.payment_reference && <p className="mt-1 text-xs text-[#77736d]">Reference: {selected.payment_reference}</p>}
          {selected.payment_status === "pending" && selected.payment_provider === "flutterwave" && selected.payment_checkout_expires_at && new Date(selected.payment_checkout_expires_at).getTime() <= Date.now() && <div className="mt-5 border border-[#c9a77f] bg-[#fbf7ef] p-4">
            <p className="text-[10px] uppercase tracking-[.14em] text-[#8b6943]">Hosted payment session expired</p>
            <p className="mt-2 text-xs leading-5 text-[#77736d]">Do not release this order until you have checked Flutterwave and confirmed that no successful payment exists. The action is recorded in the payment audit log.</p>
            <button disabled={busy === selected.id} onClick={() => releaseExpiredPaymentSession(selected)} className="mt-4 border border-[#8b6943] px-3 py-2 text-[9px] uppercase tracking-wider disabled:opacity-50">Release after provider check</button>
          </div>}
          {reconciliationCases.filter((item) => item.order_id === selected.id).map((item) => <div key={item.id} className="mt-5 border border-[#c9a77f] bg-[#fbf7ef] p-4">
            <p className="text-[10px] uppercase tracking-[.14em] text-[#8b6943]">Payment reconciliation · {label(item.status)}</p>
            <p className="mt-3 text-sm">Flutterwave reports a successful transaction, but automatic order completion needs review.</p>
            <dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#77736d]">Amount</dt><dd>{money(item.amount,item.currency)}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#77736d]">Transaction</dt><dd className="max-w-[65%] break-all text-right">{item.transaction_id}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#77736d]">Reason</dt><dd>{label(item.reason)}</dd></div></dl>
            {item.status === "pending_review" && <><p className="mt-4 text-[10px] leading-5 text-[#77736d]">Verify the transaction in the provider dashboard before recording a fulfilment or refund outcome. These controls record the outcome after you have handled it in the provider dashboard. They do not initiate a refund. Recording a completed refund also updates the order payment status.</p><div className="mt-4 flex flex-wrap gap-2">
              
              <button disabled={busy === item.id} onClick={() => updateReconciliationCase(item,"refund_initiated")} className="border border-[#c9a77f] px-3 py-2 text-[9px] uppercase tracking-wider disabled:opacity-50">Refund initiated</button>
              <button disabled={busy === item.id} onClick={() => updateReconciliationCase(item,"refunded")} className="border border-[#c9a77f] px-3 py-2 text-[9px] uppercase tracking-wider disabled:opacity-50">Record refunded</button>
              <button disabled={busy === item.id} onClick={() => updateReconciliationCase(item,"dismissed")} className="border border-[#d9d4ca] px-3 py-2 text-[9px] uppercase tracking-wider disabled:opacity-50">Dismiss</button>
            </div></>}
          </div>)}
        </div>
        {selected.customer_note && <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Customer note</p><p className="mt-3 whitespace-pre-line text-sm leading-6">{selected.customer_note}</p></div>}
        {selected.shipping_address && <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Shipping details</p><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-6 text-[#77736d]">{JSON.stringify(selected.shipping_address, null, 2)}</pre></div>}
      </aside>
    </div>}
  </section>;
}
