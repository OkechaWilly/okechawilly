import { NextResponse } from "next/server";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

export const runtime = "nodejs";

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
