"use client";

import { useState } from "react";

export default function OrderPayment({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payments/flutterwave/initialize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok || !result.paymentUrl) throw new Error(result.error || "Payment could not be started.");
      window.location.assign(result.paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be started.");
      setBusy(false);
    }
  }
  return <div className="mt-6">
    {error && <p role="alert" className="mb-3 text-xs leading-5 text-red-700">{error}</p>}
    <button onClick={pay} disabled={busy} className="w-full bg-[#242320] px-5 py-4 text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy ? "Connecting securely…" : "Pay securely with Flutterwave"}</button>
  </div>;
}
