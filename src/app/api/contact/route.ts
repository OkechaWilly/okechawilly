import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, validateContact } from "@/lib/contact";

export const runtime = "nodejs";

const THANKS = "Thank you. Your enquiry has been sent to the studio.";
const FAILED = "Sorry, your enquiry couldn't be sent just now. Please try again, or email okechawill@gmail.com directly.";

async function notifyStudio(data: { name: string; email: string; subject: string; message: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY is not set; enquiry saved but no email was sent.");
    return;
  }
  const to = process.env.CONTACT_TO_EMAIL || "okechawill@gmail.com";
  const from = process.env.CONTACT_FROM_EMAIL || "Okecha Willy Studio <onboarding@resend.dev>";
  const text = `New enquiry from ${data.name} <${data.email}>\nSubject: ${data.subject}\n\n${data.message}\n\n— Reply to this email to answer ${data.name} directly.`;
  const html = `<div style="font-family:Georgia,serif;color:#242320;line-height:1.6">
    <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9c8062;margin:0 0 8px">New studio enquiry</p>
    <p style="margin:0"><strong>${escapeHtml(data.name)}</strong> &lt;${escapeHtml(data.email)}&gt;</p>
    <p style="margin:4px 0 16px">Subject: ${escapeHtml(data.subject)}</p>
    <p style="white-space:pre-wrap;margin:0;padding:16px;background:#f7f6f2;border:1px solid #e7e3dc">${escapeHtml(data.message)}</p>
    <p style="font-size:12px;color:#77736d;margin-top:16px">Reply to this email to answer ${escapeHtml(data.name)} directly.</p>
  </div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: data.email, subject: `New enquiry: ${data.subject}`, text, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("[contact] Resend rejected the email:", response.status, await response.text());
  } catch (error) {
    console.error("[contact] Could not reach Resend:", error);
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 16_384) return NextResponse.json({ ok: false, message: "Your message is too large." }, { status: 413 });

    const raw = await request.json();
    // Honeypot: real visitors never see or fill this field. Pretend success to bots.
    if (String(raw?.website ?? "").trim() !== "") return NextResponse.json({ ok: true, message: THANKS });

    const parsed = validateContact(raw ?? {});
    if (!parsed.ok) return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("inquiries").insert(parsed.data);
    if (error) {
      console.error("[contact] Could not save enquiry:", error.message);
      return NextResponse.json({ ok: false, message: FAILED }, { status: 503 });
    }

    // Persist first; email remains best-effort and cannot undo the enquiry.
    await notifyStudio(parsed.data);
    return NextResponse.json({ ok: true, message: THANKS }, { status: 201 });
  } catch (error) {
    console.error("[contact] Submission failed:", error);
    return NextResponse.json({ ok: false, message: FAILED }, { status: 503 });
  }
}
