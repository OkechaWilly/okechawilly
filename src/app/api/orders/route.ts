import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailText, orderEmailShell, sendOrderEmail } from "@/lib/order-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = body?.customer;
    const address = body?.shippingAddress;
    const items = body?.items;
    const requestId = body?.requestId;
    if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return NextResponse.json({ error: "This checkout session has expired. Please refresh and try again." }, { status: 400 });
    }
    if (!customer || typeof customer.name !== "string" || typeof customer.email !== "string" ||
        typeof customer.phone !== "string" || !address || !Array.isArray(items) || items.length < 1 || items.length > 30) {
      return NextResponse.json({ error: "Please provide valid contact, delivery and order details." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("submit_public_order_idempotent", {
      p_request_id: requestId,
      p_customer_name: customer.name.trim(),
      p_customer_email: customer.email.trim().toLowerCase(),
      p_customer_phone: customer.phone.trim(),
      p_shipping_address: address,
      p_customer_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      p_currency: body.currency === "USD" ? "USD" : "UGX",
      p_items: items,
    });
    if (error) {
      console.error("Order submission failed:", error.message);
      return NextResponse.json({ error: error.message.includes("ORDER_") ? error.message.replace("ORDER_", "").replaceAll("_", " ").toLowerCase() : "We could not submit this order. Please check the details and try again." }, { status: 400 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.order_number) return NextResponse.json({ error: "The order could not be confirmed. Please contact the studio." }, { status: 500 });
    if (result.created) {
      try {
        const adminEmail = process.env.ORDER_NOTIFICATION_EMAIL;
        await sendOrderEmail(
          customer.email.trim().toLowerCase(),
          "We received your order request · " + result.order_number,
          orderEmailShell(`<h1 style="font-size:26px;font-weight:400">Your order request is with the studio.</h1>
            <p style="font-size:14px;line-height:1.7">Hello ${emailText(customer.name.trim())}, thank you. We have received order <strong>${emailText(result.order_number)}</strong>.</p>
            <p style="font-size:14px;line-height:1.7">We will review availability and calculate delivery individually, then send you the complete total for approval. No payment has been taken.</p>`)
        );
        if (adminEmail) await sendOrderEmail(
          adminEmail,
          "New order request · " + result.order_number,
          orderEmailShell(`<h2>New order request</h2><p><strong>${emailText(result.order_number)}</strong></p><p>${emailText(customer.name.trim())} · ${emailText(customer.email.trim())}</p><p>Open Studio → Orders to review availability and prepare a delivery quote.</p>`)
        );
      } catch (emailError) {
        // The order is already committed. Never tell the customer the order failed
        // just because a notification provider is unavailable; Studio can still see it.
        console.error("Order saved but notification delivery failed:", emailError);
      }
    }
    return NextResponse.json({ orderNumber: result.order_number, reused: !result.created }, { status: 201 });
  } catch (error) {
    console.error("Unexpected order submission error:", error);
    return NextResponse.json({ error: "We could not submit this order. Please try again." }, { status: 500 });
  }
}
