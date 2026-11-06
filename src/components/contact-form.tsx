"use client";

import { useState, useTransition } from "react";
import { submitEnquiry } from "@/app/contact/actions";
import { BASE_SUBJECTS, DEFAULT_SUBJECT, SUBJECT_MAX } from "@/lib/contact";

export default function ContactForm({ initialSubject = DEFAULT_SUBJECT }: { initialSubject?: string }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // A pre-filled subject such as "Enquiry about <artwork>" is not one of the
  // standard options, so add it to the list; otherwise the dropdown would show
  // the wrong value while a different one is sent.
  const options = BASE_SUBJECTS.includes(initialSubject) ? BASE_SUBJECTS : [initialSubject, ...BASE_SUBJECTS];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await submitEnquiry(formData);
        setNotice({ ok: result.ok, text: result.message });
        if (result.ok) form.reset();
      } catch {
        setNotice({ ok: false, text: "Sorry, something went wrong. Please try again, or email me directly." });
      }
    });
  }

  const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-4 py-3 text-sm outline-none focus:border-[#9c8062]";
  const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";

  return (
    <form onSubmit={submit} className="mt-12 max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Your name
          <input name="name" required maxLength={120} autoComplete="name" className={field} />
        </label>
        <label className={label}>Email address
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={field} />
        </label>
      </div>
      <label className={label}>Enquiry type
        <select name="subject" defaultValue={initialSubject} className={field}>
          {options.map((option) => (
            <option key={option} value={option}>{option.length > SUBJECT_MAX ? option.slice(0, SUBJECT_MAX) : option}</option>
          ))}
        </select>
      </label>
      <label className={label}>Message
        <textarea name="message" required minLength={10} maxLength={5000} rows={6} className={field} placeholder="Tell me a little about what you're interested in..." />
      </label>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <button disabled={pending} className="bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062] disabled:opacity-50">
        {pending ? "Sending..." : "Send enquiry ↗"}
      </button>
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`text-sm ${notice.ok ? "text-[#5f7a5a]" : "text-[#a4493d]"}`}>{notice.text}</p>
      )}
      <p className="text-[10px] leading-5 text-[#89847c]">Your details will only be used to respond to this enquiry.</p>
    </form>
  );
}
