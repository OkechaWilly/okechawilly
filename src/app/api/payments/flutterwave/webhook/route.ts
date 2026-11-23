import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expected = process.env.FLW_WEBHOOK_SECRET_HASH;
  const received = request.headers.get("verif-hash") || "";
  if (!expected || received.length !== expected.length) return NextResponse.json({ received: false }, { status: 401 });
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) return NextResponse.json({ received: false }, { status: 401 });
  try {
    const body = await request.json();
    const id = body?.data?.id;
    if (!id) return NextResponse.json({ received: true });
    try {
      await verifyFlutterwaveTransaction(String(id));
      return NextResponse.json({ received: true });
    } catch (error) {
      if (error instanceof Error && error.message === "PAYMENT_REQUIRES_RECONCILIATION") {
        return NextResponse.json({ received: true, reconciliationRequired: true });
      }
      throw error;
    }
  } catch (error) {
    console.error("Flutterwave webhook verification failed:", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
