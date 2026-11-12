import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = body?.customer;
    const address = body?.shippingAddress;
    const items = body?.items;
    if (!customer || typeof customer.name !== "string" || typeof customer.email !== "string" ||
        typeof customer.phone !== "string" || !address || !Array.isArray(items) || items.length < 1 || items.length > 30) {
      return NextResponse.json({ error: "Please provide valid contact, delivery and order details." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("submit_public_order", {
      p_customer_name: customer.name.trim(),
      p_customer_email: customer.email.trim().toLowerCase(),
      p_customer_phone: customer.phone.trim(),
      p_shipping_address: address,
      p_customer_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      p_items: items,
    });
    if (error) {
      console.error("Order submission failed:", error.message);
      return NextResponse.json({ error: error.message.includes("ORDER_") ? error.message.replace("ORDER_", "").replaceAll("_", " ").toLowerCase() : "We could not submit this order. Please check the details and try again." }, { status: 400 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.order_number) return NextResponse.json({ error: "The order could not be confirmed. Please contact the studio." }, { status: 500 });
    return NextResponse.json({ orderNumber: result.order_number }, { status: 201 });
  } catch (error) {
    console.error("Unexpected order submission error:", error);
    return NextResponse.json({ error: "We could not submit this order. Please try again." }, { status: 500 });
  }
}
