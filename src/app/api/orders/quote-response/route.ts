import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";
import { readJsonBody } from "@/lib/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsedBody = await readJsonBody(request, 4_096);
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.reason === "too_large" ? "This response is too large." : "This quote link or response is invalid." }, { status: parsedBody.reason === "too_large" ? 413 : 400 });
    const body = parsedBody.data && typeof parsedBody.data === "object" && !Array.isArray(parsedBody.data)
      ? parsedBody.data as Record<string, unknown>
      : {};
    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token) || typeof body.decision !== "string" || !["accepted", "declined"].includes(body.decision)) {
      return NextResponse.json({ error: "This quote link or response is invalid." }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Quote responses are temporarily unavailable. Please contact the studio." }, { status: 503 });
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("respond_order_shipping_quote", {
      p_token: body.token, p_accept: body.decision === "accepted",
    });
    if (error) {
      const message = error.message.includes("QUOTE_") ? error.message.replaceAll("_", " ").toLowerCase() : "We could not record your response.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const result = data as { order_number: string; customer_name: string; customer_email: string; currency: string; total: number; decision: string; reused?: boolean };
    if (!result.reused) {
      const action = result.decision === "accepted" ? "accepted" : "declined";
      const adminEmail = process.env.ORDER_NOTIFICATION_EMAIL;
      if (adminEmail) {
        try {
          await sendOrderEmail(adminEmail, `Customer ${action} delivery quote · ${result.order_number}`, orderEmailShell(`
            <h2>Delivery quote ${action}</h2><p>${emailText(result.customer_name)} (${emailText(result.customer_email)}) has ${action} the quote for <strong>${emailText(result.order_number)}</strong>.</p>
            <p>Order total: ${emailText(result.currency)} ${Number(result.total).toLocaleString("en-UG")}</p><p>Open Studio → Orders to continue.</p>`));
        } catch (emailError) {
          console.error("Quote response saved but Studio notification failed:", emailError);
        }
      }
      try {
        await sendOrderEmail(result.customer_email, `Quote response received · ${result.order_number}`, orderEmailShell(`
          <h2>Thank you for responding.</h2><p>Your delivery quote for <strong>${emailText(result.order_number)}</strong> has been ${emailText(result.decision)}.</p>
          <p>${result.decision === "accepted" ? "Your approval is recorded. The studio will contact you directly to arrange payment. No payment has been collected." : "The studio has been notified and will contact you if any clarification is needed."}</p>`));
      } catch (emailError) {
        console.error("Quote response saved but customer confirmation failed:", emailError);
      }
    }
    return NextResponse.json({ decision: result.decision, orderNumber: result.order_number, reused: Boolean(result.reused) });
  } catch (error) {
    console.error("Quote response error:", error);
    return NextResponse.json({ error: "We could not record your response. Please try again." }, { status: 500 });
  }
}
