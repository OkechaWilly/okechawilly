import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.FLW_SECRET_KEY;
  if (process.env.ONLINE_PAYMENTS_ENABLED !== "true" || !secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Online payment is not enabled yet. The studio will contact you with the next steps." }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return NextResponse.json({ error: "Invalid quote link." }, { status: 400 });
    const supabase = createAdminClient();
    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from("orders")
      .select("payment_status,payment_reference,payment_checkout_url,payment_checkout_expires_at,shipping_quote_status")
      .eq("shipping_quote_token_hash", tokenHash)
      .maybeSingle();
    if (existingOrderError || !existingOrder) return NextResponse.json({ error: "This order could not be found." }, { status: 404 });
    if (existingOrder.shipping_quote_status !== "accepted") return NextResponse.json({ error: "Please approve the delivery quote before payment." }, { status: 409 });
    if (existingOrder.payment_status === "paid") return NextResponse.json({ error: "This order has already been paid." }, { status: 409 });
    if (existingOrder.payment_status === "refunded") return NextResponse.json({ error: "This order has been refunded. Please contact the studio if you would like to place a new order." }, { status: 409 });
    if (existingOrder.payment_status === "pending" && existingOrder.payment_checkout_url &&
        existingOrder.payment_checkout_expires_at && new Date(existingOrder.payment_checkout_expires_at).getTime() > Date.now()) {
      return NextResponse.json({ paymentUrl: existingOrder.payment_checkout_url, reused: true });
    }
    if (existingOrder.payment_status === "pending") {
      return NextResponse.json({ error: "A previous payment session is still pending or expired. The studio must verify its status before another payment attempt can begin." }, { status: 409 });
    }
    const txRef = "OW-" + randomUUID();
    const { data, error } = await supabase.rpc("prepare_flutterwave_payment", { p_token: body.token, p_tx_ref: txRef });
    if (error || !data) return NextResponse.json({ error: error?.message.includes("QUOTE_") ? error.message.replaceAll("_", " ").toLowerCase() : "This order is not ready for payment." }, { status: 400 });
    const order = data as { order_number: string; customer_name: string; customer_email: string; customer_phone: string; currency: string; amount: number };
    const origin = new URL(request.url).origin;
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: order.amount,
        currency: order.currency,
        redirect_url: origin + "/api/payments/flutterwave/verify?quote=" + encodeURIComponent(body.token),
        customer: { email: order.customer_email, name: order.customer_name, phonenumber: order.customer_phone },
        customizations: { title: "Okecha Willy", description: "Payment for order " + order.order_number },
        meta: { order_number: order.order_number },
      }),
      cache: "no-store",
    });
    const result = await response.json();
    const link = result?.data?.link;
    if (!response.ok || result?.status !== "success" || typeof link !== "string") {
      // Keep the attempt pending: a provider error can be ambiguous, and releasing
      // inventory automatically could allow a second charge if checkout was created.
      console.error("Flutterwave initialization failed:", response.status, JSON.stringify(result).slice(0, 500));
      return NextResponse.json({ error: "Flutterwave could not start this payment. Please try again or contact the studio." }, { status: 502 });
    }
    const { error: saveLinkError } = await supabase.from("orders")
      .update({ payment_checkout_url: link })
      .eq("payment_reference", txRef)
      .eq("payment_status", "pending");
    if (saveLinkError) {
      // Preserve the pending reference for manual provider reconciliation; do not
      // release stock when a hosted session may already exist.
      console.error("Could not persist Flutterwave checkout URL:", saveLinkError.message);
      return NextResponse.json({ error: "We could not save your secure payment session. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ paymentUrl: link });
  } catch (error) {
    console.error("Flutterwave initialization error:", error);
    return NextResponse.json({ error: "We could not start the payment. Please try again." }, { status: 500 });
  }
}
