import { createAdminClient } from "@/lib/supabase/admin";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";

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
  const order = data as { order_number: string; customer_name: string; customer_email: string; payment_status: string; already_paid?: boolean };
  if (!order.already_paid) {
    await sendOrderEmail(order.customer_email, "Payment received · " + order.order_number, orderEmailShell("<h2>Payment confirmed</h2><p>Thank you. We have received payment for order <strong>" + emailText(order.order_number) + "</strong>.</p><p>The studio will now proceed with fulfilment and keep you updated.</p>"));
    const notify = process.env.ORDER_NOTIFICATION_EMAIL;
    if (notify) await sendOrderEmail(notify, "Payment received · " + order.order_number, orderEmailShell("<h2>Payment verified</h2><p>Flutterwave confirmed payment for <strong>" + emailText(order.order_number) + "</strong>.</p><p>Open Studio → Orders to continue fulfilment.</p>"));
  }
  return order;
}
