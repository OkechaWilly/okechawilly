import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";

export const runtime = "nodejs";

export async function verifyFlutterwaveTransaction(transactionId: string, expectedTxRef?: string) {
  const secret = process.env.FLW_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) throw new Error("Payment verification is not configured.");
  const response = await fetch("https://api.flutterwave.com/v3/transactions/" + encodeURIComponent(transactionId) + "/verify", {
    headers: { Authorization: "Bearer " + secret }, cache: "no-store",
  });
  const result = await response.json();
  const payment = result?.data;
  if (!response.ok || result?.status !== "success" || payment?.status !== "successful") throw new Error("PAYMENT_NOT_SUCCESSFUL");
  if (expectedTxRef && payment?.tx_ref !== expectedTxRef) throw new Error("PAYMENT_REFERENCE_MISMATCH");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("complete_flutterwave_payment", {
    p_tx_ref: payment.tx_ref,
    p_transaction_id: String(payment.id),
    p_amount: Number(payment.amount),
    p_currency: String(payment.currency),
  });
  if (error) throw new Error(error.message);
  const order = data as { order_number: string; payment_status: string };
  const notify = process.env.ORDER_NOTIFICATION_EMAIL;
  if (notify) await sendOrderEmail(notify, "Payment received · " + order.order_number, orderEmailShell("<h2>Payment verified</h2><p>Flutterwave confirmed payment for <strong>" + emailText(order.order_number) + "</strong>.</p><p>Open Studio → Orders to continue fulfilment.</p>"));
  return order;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const transactionId = url.searchParams.get("transaction_id");
  const txRef = url.searchParams.get("tx_ref");
  const quoteToken = url.searchParams.get("quote");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  if (status !== "successful" || !transactionId || !txRef || !quoteToken || !/^[a-f0-9]{64}$/.test(quoteToken)) return NextResponse.redirect(origin + "/shop?payment=not-completed");
  try {
    await verifyFlutterwaveTransaction(transactionId, txRef);
    return NextResponse.redirect(origin + "/order-quote/" + quoteToken + "?payment=confirmed");
  } catch (error) {
    console.error("Flutterwave callback verification failed:", error);
    return NextResponse.redirect(origin + "/order-quote/" + quoteToken + "?payment=verification-pending");
  }
}
