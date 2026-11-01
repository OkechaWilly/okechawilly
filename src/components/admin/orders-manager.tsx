"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; product_title: string; sku: string | null; quantity: number; unit_price: number; line_total: number; selected_options: Record<string, unknown> };
type Order = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string | null;
  currency: string; subtotal: number; shipping_total: number; total: number;
  shipping_address: Record<string, unknown> | null; status: string; payment_status: string;
  payment_provider: string | null; payment_reference: string | null; customer_note: string | null;
  created_at: string; order_items: Item[];
};
const statuses = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled", "refunded"];
const label = (value: string) => value.replaceAll("_", " ");
const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency: currency || "UGX", maximumFractionDigits: 0 }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toLocaleString("en-UG")}`; }
};
const field = "border border-[#d9d4ca] bg-white px-3 py-2 text-xs outline-none focus:border-[#9c8062]";

export default function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const visible = orders.filter((order) => filter === "all" || order.status === filter);
  const totalValue = orders.filter((o) => !["cancelled", "refunded"].includes(o.status)).reduce((sum, o) => sum + Number(o.total || 0), 0);

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

  return <section>
    <p className="eyebrow">Studio workspace</p>
    <h1 className="display mt-3 text-5xl md:text-6xl">Orders.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Review customer orders and follow each one through confirmation, preparation and delivery. Payment records are shown separately from fulfilment.</p>
    {notice && <p className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm text-[#625e57]">{notice}</p>}
    <div className="mt-9 grid gap-3 sm:grid-cols-3">
      <div className="border border-[#dedad2] bg-white p-5"><p className="eyebrow">All orders</p><p className="display mt-2 text-3xl">{orders.length}</p></div>
      <div className="border border-[#dedad2] bg-white p-5"><p className="eyebrow">Awaiting action</p><p className="display mt-2 text-3xl">{orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status)).length}</p></div>
      <div className="border border-[#dedad2] bg-white p-5"><p className="eyebrow">Order value · not revenue</p><p className="display mt-2 text-2xl">{orders.length ? money(totalValue, orders[0].currency) : "—"}</p></div>
    </div>
    <div className="mt-10 flex flex-col justify-between gap-4 border-b border-[#dedad2] pb-4 sm:flex-row sm:items-center">
      <p className="eyebrow">{visible.length} {filter === "all" ? "orders" : label(filter) + " orders"}</p>
      <select className={field} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
    </div>
    {visible.length ? <div className="divide-y divide-[#e2ded6]">
      {visible.map((order) => <button key={order.id} onClick={() => setSelected(order)} className="grid w-full gap-3 py-5 text-left transition-colors hover:bg-[#f7f6f2] sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <div><p className="text-[10px] uppercase tracking-[.14em] text-[#9c8062]">{order.order_number}</p><p className="display mt-1 text-xl">{order.customer_name}</p><p className="mt-1 text-xs text-[#89847c]">{order.customer_email}</p></div>
        <div><p className="text-xs">{order.order_items?.length || 0} line item(s) · {new Date(order.created_at).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</p><p className="mt-1 text-xs text-[#89847c]">Payment: {label(order.payment_status)}</p></div>
        <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-sm">{money(order.total, order.currency)}</span><span className="border border-[#d9d4ca] px-3 py-1 text-[9px] uppercase tracking-[.12em]">{label(order.status)}</span></div>
      </button>)}
    </div> : <div className="mt-8 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-14 text-center"><p className="display text-2xl">No orders yet.</p><p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-[#89847c]">Orders will appear here once the studio begins recording customer purchases. Online checkout is still disabled.</p></div>}
    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-[#f8f7f3] p-6 md:p-9">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Order details</p><h2 className="display mt-2 text-3xl">{selected.order_number}</h2></div><button onClick={() => setSelected(null)} className="text-xs underline underline-offset-4">Close</button></div>
        <div className="mt-8 border-y border-[#dedad2] py-5"><p className="eyebrow">Customer</p><p className="mt-3 text-sm">{selected.customer_name}</p><p className="mt-1 text-sm text-[#77736d]">{selected.customer_email}</p>{selected.customer_phone && <p className="mt-1 text-sm text-[#77736d]">{selected.customer_phone}</p>}</div>
        <div className="py-6"><p className="eyebrow">Items</p>{(selected.order_items || []).map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-[#e6e2da] py-4 text-sm"><div><p>{item.product_title}</p><p className="mt-1 text-xs text-[#89847c]">Qty {item.quantity}{item.sku ? " · " + item.sku : ""}</p></div><p className="whitespace-nowrap">{money(item.line_total, selected.currency)}</p></div>)}</div>
        <div className="space-y-2 border-b border-[#dedad2] pb-6 text-sm"><div className="flex justify-between"><span className="text-[#77736d]">Subtotal</span><span>{money(selected.subtotal, selected.currency)}</span></div><div className="flex justify-between"><span className="text-[#77736d]">Shipping</span><span>{money(selected.shipping_total, selected.currency)}</span></div><div className="flex justify-between pt-2 font-medium"><span>Total</span><span>{money(selected.total, selected.currency)}</span></div></div>
        <div className="py-6"><p className="eyebrow">Fulfilment status</p><select disabled={busy === selected.id} className={field + " mt-3 w-full"} value={selected.status} onChange={(e) => updateStatus(selected, e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select><p className="mt-2 text-[10px] leading-5 text-[#89847c]">Changing this updates fulfilment only. It does not mark a payment as received.</p></div>
        <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Payment record</p><p className="mt-3 text-sm">Status: <span className="capitalize">{label(selected.payment_status)}</span></p>{selected.payment_provider && <p className="mt-1 text-xs text-[#77736d]">Provider: {selected.payment_provider}</p>}{selected.payment_reference && <p className="mt-1 text-xs text-[#77736d]">Reference: {selected.payment_reference}</p>}</div>
        {selected.customer_note && <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Customer note</p><p className="mt-3 whitespace-pre-line text-sm leading-6">{selected.customer_note}</p></div>}
        {selected.shipping_address && <div className="border-t border-[#dedad2] py-6"><p className="eyebrow">Shipping details</p><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-6 text-[#77736d]">{JSON.stringify(selected.shipping_address, null, 2)}</pre></div>}
      </aside>
    </div>}
  </section>;
}
