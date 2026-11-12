import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Online payment is not available yet. The studio will send payment instructions." }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return NextResponse.json({ error: "Invalid quote link." }, { status: 400 });
    const supabase = await createClient();
    const txRef = "OW-" + randomUUID();
    const { data, error } = await supabase.rpc("prepare_flutterwave_payment", { p_token: body.token, p_tx_ref: txRef });
    if (error || !data) return NextResponse.json({ error: error?.message.includes("QUOTE_") ? error.message.replaceAll("_", " ").toLowerCase() : "This order is not ready for payment." }, { status: 400 });
    const order = data as { order_number: string; customer_name: string; customer_email: string; customer_phone: string; currency: string; amount: number };
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
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
      await supabase.rpc("reset_flutterwave_payment", { p_tx_ref: txRef });
      console.error("Flutterwave initialization failed:", response.status, JSON.stringify(result).slice(0, 500));
      return NextResponse.json({ error: "Flutterwave could not start this payment. Please try again or contact the studio." }, { status: 502 });
    }
    return NextResponse.json({ paymentUrl: link });
  } catch (error) {
    console.error("Flutterwave initialization error:", error);
    return NextResponse.json({ error: "We could not start the payment. Please try again." }, { status: 500 });
  }
}
