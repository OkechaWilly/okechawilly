"use server";

import { createClient } from "@/lib/supabase/server";
import { escapeHtml, validateContact, type ContactInput } from "@/lib/contact";

export type ContactResult = { ok: boolean; message: string };

const THANKS = "Thank you. Your enquiry has been sent to the studio.";
const FAILED =
  "Sorry, your enquiry couldn't be sent just now. Please try again, or email okechawill@gmail.com directly.";

async function notifyStudio(data: ContactInput) {
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
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: `New enquiry: ${data.subject}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("[contact] Resend rejected the email:", response.status, await response.text());
    }
  } catch (error) {
    console.error("[contact] Could not reach Resend:", error);
  }
}

export async function submitEnquiry(formData: FormData): Promise<ContactResult> {
  // Honeypot: real visitors never see or fill this field. Pretend success to bots.
  if (String(formData.get("website") ?? "").trim() !== "") return { ok: true, message: THANKS };

  const parsed = validateContact({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert(parsed.data);
  if (error) {
    console.error("[contact] Could not save enquiry:", error.message);
    return { ok: false, message: FAILED };
  }

  // The enquiry is safely stored; a failed email must never fail the submission.
  await notifyStudio(parsed.data);
  return { ok: true, message: THANKS };
}
