import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token) || !["accepted", "declined"].includes(body.decision)) {
      return NextResponse.json({ error: "This quote link or response is invalid." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("respond_order_shipping_quote", {
      p_token: body.token, p_accept: body.decision === "accepted",
    });
    if (error) {
      const message = error.message.includes("QUOTE_") ? error.message.replaceAll("_", " ").toLowerCase() : "We could not record your response.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const result = data as { order_number: string; customer_name: string; customer_email: string; currency: string; total: number; decision: string };
    const adminEmail = process.env.ORDER_NOTIFICATION_EMAIL;
    if (adminEmail) {
      const action = result.decision === "accepted" ? "accepted" : "declined";
      await sendOrderEmail(adminEmail, `Customer ${action} delivery quote · ${result.order_number}`, orderEmailShell(`
        <h2>Delivery quote ${action}</h2><p>${emailText(result.customer_name)} (${emailText(result.customer_email)}) has ${action} the quote for <strong>${emailText(result.order_number)}</strong>.</p>
        <p>Order total: ${emailText(result.currency)} ${Number(result.total).toLocaleString("en-UG")}</p><p>Open Studio → Orders to continue.</p>`));
    }
    await sendOrderEmail(result.customer_email, `Quote response received · ${result.order_number}`, orderEmailShell(`
      <h2>Thank you for responding.</h2><p>Your delivery quote for <strong>${emailText(result.order_number)}</strong> has been ${emailText(result.decision)}.</p>
      <p>${result.decision === "accepted" ? "Your approval is recorded. Return to the same quote link to continue to secure payment if online checkout is enabled. No payment has been collected yet." : "The studio has been notified and will contact you if any clarification is needed."}</p>`));
    return NextResponse.json({ decision: result.decision, orderNumber: result.order_number });
  } catch (error) {
    console.error("Quote response error:", error);
    return NextResponse.json({ error: "We could not record your response. Please try again." }, { status: 500 });
  }
}
