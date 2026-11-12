type EmailResult = { sent: boolean; reason?: string };

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

export async function sendOrderEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "email_sender_not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
      cache: "no-store",
    });
    if (!response.ok) {
      const message = await response.text();
      console.error("Order email delivery failed:", response.status, message.slice(0, 500));
      return { sent: false, reason: "email_provider_rejected" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Order email request failed:", error);
    return { sent: false, reason: "email_provider_unavailable" };
  }
}

export function emailText(value: unknown) {
  return escapeHtml(value);
}

export function orderEmailShell(content: string) {
  return `<div style="background:#f7f6f2;padding:32px 16px;font-family:Arial,sans-serif;color:#242320"><div style="max-width:600px;margin:auto;background:#fff;padding:32px"><p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9c8062">OKECHA WILLY · UGANDA</p>${content}<p style="margin-top:32px;padding-top:18px;border-top:1px solid #e8e5de;font-size:12px;color:#77736d">Thank you for supporting independent art.</p></div></div>`;
}
