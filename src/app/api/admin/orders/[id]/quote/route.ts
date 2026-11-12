import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const { id } = await context.params;
    const body = await request.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0 || String(body.amount).trim() === "") {
      return NextResponse.json({ error: "Enter a valid delivery amount." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("create_order_shipping_quote", {
      p_order_id: id, p_shipping_amount: amount,
      p_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
    });
    if (error) {
      console.error("Quote creation failed:", error.message);
      return NextResponse.json({ error: error.message.includes("ORDER_") || error.message.includes("QUOTE_") ? error.message.replaceAll("_", " ").toLowerCase() : "Could not save the delivery quote." }, { status: 400 });
    }
    const quote = data as { token: string; order_number: string; customer_name: string; customer_email: string; currency: string; subtotal: number; shipping_total: number; total: number; shipping_quote_note: string | null; shipping_quote_expires_at: string };
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const quoteUrl = `${origin}/order-quote/${quote.token}`;
    const customerHtml = orderEmailShell(`
      <h1 style="font-size:28px;font-weight:400">Your delivery quote is ready.</h1>
      <p style="font-size:14px;line-height:1.7">Hello ${emailText(quote.customer_name)}, we have checked the delivery details for order <strong>${emailText(quote.order_number)}</strong>.</p>
      <p style="font-size:14px;line-height:1.8">Items: ${emailText(quote.currency)} ${Number(quote.subtotal).toLocaleString("en-UG")}<br>Delivery: ${emailText(quote.currency)} ${Number(quote.shipping_total).toLocaleString("en-UG")}<br><strong>Complete total: ${emailText(quote.currency)} ${Number(quote.total).toLocaleString("en-UG")}</strong></p>
      ${quote.shipping_quote_note ? `<p style="font-size:14px;line-height:1.7">${emailText(quote.shipping_quote_note)}</p>` : ""}
      <p style="margin:28px 0"><a href="${quoteUrl}" style="display:inline-block;background:#242320;color:#fff;padding:15px 22px;text-decoration:none;font-size:12px">Review and respond to quote</a></p>
      <p style="font-size:12px;color:#77736d">This link expires in seven days. No payment is taken by reviewing this quote.</p>`);
    const customerEmail = await sendOrderEmail(quote.customer_email, `Delivery quote for order ${quote.order_number}`, customerHtml);
    const adminEmail = process.env.ORDER_NOTIFICATION_EMAIL;
    if (adminEmail) await sendOrderEmail(adminEmail, `Delivery quote created · ${quote.order_number}`, orderEmailShell(`<h2>Quote created</h2><p><a href="${quoteUrl}">Customer quote link</a></p><p>${emailText(quote.customer_name)} · ${emailText(quote.customer_email)}</p>`));
    return NextResponse.json({ quoteUrl, quote, emailSent: customerEmail.sent, emailReason: customerEmail.reason });
  } catch (error) {
    console.error("Quote route error:", error);
    return NextResponse.json({ error: "We could not prepare the delivery quote. Please try again." }, { status: 500 });
  }
}
