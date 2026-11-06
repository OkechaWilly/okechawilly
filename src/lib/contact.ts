// Shared by the contact page, the form and the server action.
// SUBJECT_MAX must match the database policy on public.inquiries
// (subject length <= 120), otherwise inserts are rejected.
export const SUBJECT_MAX = 120;
export const DEFAULT_SUBJECT = "Artwork enquiry";

export const BASE_SUBJECTS = [
  "Artwork enquiry",
  "Commission request",
  "Print enquiry",
  "Exhibition or collaboration",
  "Shipping question",
  "Other",
];

export type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

/** Collapse whitespace, trim and cap to the database limit. */
export function cleanSubject(value: string | null | undefined, fallback = DEFAULT_SUBJECT) {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim().slice(0, SUBJECT_MAX);
  return cleaned || fallback;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(raw: {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
}): { ok: true; data: ContactInput } | { ok: false; error: string } {
  const name = String(raw.name ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const message = String(raw.message ?? "").trim();
  const subject = cleanSubject(String(raw.subject ?? ""));

  if (!name || name.length > 120) return { ok: false, error: "Please enter your name." };
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (message.length < 10) return { ok: false, error: "Please write a little more in your message (at least 10 characters)." };
  if (message.length > 5000) return { ok: false, error: "Your message is too long (5,000 characters maximum)." };

  return { ok: true, data: { name, email, subject, message } };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
