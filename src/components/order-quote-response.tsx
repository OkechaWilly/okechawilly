"use client";

import { useState } from "react";

export default function OrderQuoteResponse({ token, status }: { token: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState(status);
  async function respond(next: "accepted" | "declined") {
    if (busy || decision !== "quoted") return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/orders/quote-response", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not record your response.");
      setDecision(result.decision);
      setMessage(next === "accepted"
        ? "Thank you. Your approval has been sent to the studio. We will follow up with payment instructions; no payment has been taken."
        : "Your response has been sent to the studio. We will be in touch if needed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally { setBusy(false); }
  }
  if (decision !== "quoted") {
    return <div className="mt-8 border border-[#dedad2] bg-[#f7f6f2] p-5 text-sm leading-6">
      {decision === "accepted" ? "You have already approved this delivery quote." :
       decision === "declined" ? "You have declined this delivery quote. The studio has been notified." :
       "This delivery quote is no longer active. Please contact the studio for an updated quote."}
    </div>;
  }
  return <div className="mt-8">
    {message && <p role="status" className="mb-5 border border-[#dedad2] bg-[#f7f6f2] p-4 text-sm leading-6">{message}</p>}
    <div className="flex flex-col gap-3 sm:flex-row">
      <button disabled={busy} onClick={() => respond("accepted")} className="bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy ? "Please wait…" : "Approve quote"}</button>
      <button disabled={busy} onClick={() => respond("declined")} className="border border-[#d9d4ca] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition-colors hover:bg-[#f7f6f2] disabled:opacity-50">Decline quote</button>
    </div>
  </div>;
}
