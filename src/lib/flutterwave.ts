import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";

export async function verifyFlutterwaveTransaction(transactionId: string, expectedTxRef?: string, expectedQuoteToken?: string) {
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
  if (expectedQuoteToken) {
    const tokenHash = createHash("sha256").update(expectedQuoteToken).digest("hex");
    const { data: matchingOrder, error: lookupError } = await admin.from("orders")
      .select("id")
      .eq("payment_reference", payment.tx_ref)
      .eq("shipping_quote_token_hash", tokenHash)
      .maybeSingle();
    if (lookupError) throw new Error("PAYMENT_QUOTE_MISMATCH");
    if (!matchingOrder) {
      // The Studio may have released an expired session after checking the
      // provider. A late success must still be tied to the original quote.
      const { data: priorSession, error: sessionError } = await admin.from("payment_session_events")
        .select("order_id")
        .eq("payment_reference", payment.tx_ref)
        .maybeSingle();
      if (sessionError || !priorSession) throw new Error("PAYMENT_QUOTE_MISMATCH");
      const { data: priorOrder, error: orderError } = await admin.from("orders")
        .select("id")
        .eq("id", priorSession.order_id)
        .eq("shipping_quote_token_hash", tokenHash)
        .maybeSingle();
      if (orderError || !priorOrder) throw new Error("PAYMENT_QUOTE_MISMATCH");
    }
  }
  const { data, error } = await admin.rpc("complete_flutterwave_payment", {
    p_tx_ref: payment.tx_ref,
    p_transaction_id: String(payment.id),
    p_amount: Number(payment.amount),
    p_currency: String(payment.currency),
  });
  if (error) {
    const reconciliationReasons = ["PAYMENT_STOCK_RESERVATION_EXPIRED", "PAYMENT_STOCK_CHANGED", "PAYMENT_DETAILS_MISMATCH", "PAYMENT_SESSION_RELEASED_AFTER_PROVIDER_CHECK"];
    if (reconciliationReasons.some((reason) => error.message.includes(reason)) || error.message.includes("PAYMENT_NOT_FOUND")) {
      const { error: reconciliationError } = await admin.rpc("record_flutterwave_reconciliation", {
        p_tx_ref: payment.tx_ref,
        p_transaction_id: String(payment.id),
        p_amount: Number(payment.amount),
        p_currency: String(payment.currency),
        p_reason: reconciliationReasons.find((reason) => error.message.includes(reason)) || "PAYMENT_SESSION_RELEASED_AFTER_PROVIDER_CHECK",
      });
      if (reconciliationError) {
        console.error("Payment reconciliation record failed:", reconciliationError.message);
        throw new Error("PAYMENT_RECONCILIATION_RECORD_FAILED");
      }
      throw new Error("PAYMENT_REQUIRES_RECONCILIATION");
    }
    throw new Error(error.message);
  }
  const order = data as { order_number: string; customer_name: string; customer_email: string; payment_status: string; already_paid?: boolean };
  if (!order.already_paid) {
    try {
      await sendOrderEmail(order.customer_email, "Payment received · " + order.order_number, orderEmailShell("<h2>Payment confirmed</h2><p>Thank you. We have received payment for order <strong>" + emailText(order.order_number) + "</strong>.</p><p>The studio will now proceed with fulfilment and keep you updated.</p>"));
      const notify = process.env.ORDER_NOTIFICATION_EMAIL;
      if (notify) await sendOrderEmail(notify, "Payment received · " + order.order_number, orderEmailShell("<h2>Payment verified</h2><p>Flutterwave confirmed payment for <strong>" + emailText(order.order_number) + "</strong>.</p><p>Open Studio → Orders to continue fulfilment.</p>"));
    } catch (emailError) {
      // Payment is already committed. Do not make the provider retry a settled
      // transaction just because a notification service is temporarily unavailable.
      console.error("Payment verified but notification delivery failed:", emailError);
    }
  }
  return order;
}
