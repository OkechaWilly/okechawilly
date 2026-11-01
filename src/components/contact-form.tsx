"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ContactForm({ initialSubject = "Artwork enquiry" }: { initialSubject?: string }) {


  const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [subject,setSubject]=useState(initialSubject); const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false); const [notice,setNotice]=useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setNotice("");
    const supabase=createClient();
    const {error}=await supabase.from("inquiries").insert({name:name.trim(),email:email.trim(),subject,message:message.trim()});
    if(error) setNotice("We couldn't send your enquiry just now. Please try again or use email.");
    else {setNotice("Thank you. Your enquiry has been sent to the studio.");setName("");setEmail("");setSubject(initialSubject);setMessage("");}
    setBusy(false);
  }
  const field="mt-2 w-full border border-[#d9d4ca] bg-white px-4 py-3 text-sm outline-none focus:border-[#9c8062]";
  const label="block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
  return <form onSubmit={submit} className="mt-12 max-w-2xl space-y-5">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className={label}>Your name<input required maxLength={120} className={field} value={name} onChange={e=>setName(e.target.value)} /></label>
      <label className={label}>Email address<input required type="email" maxLength={254} className={field} value={email} onChange={e=>setEmail(e.target.value)} /></label>
    </div>
    <label className={label}>Enquiry type<select className={field} value={subject} onChange={e=>setSubject(e.target.value)}><option>Artwork enquiry</option><option>Commission request</option><option>Print enquiry</option><option>Exhibition or collaboration</option><option>Shipping question</option><option>Other</option></select></label>
    <label className={label}>Message<textarea required minLength={10} maxLength={5000} rows={6} className={field} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell me a little about what you're interested in..." /></label>
    <button disabled={busy} className="bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy?"Sending...":"Send enquiry ↗"}</button>
    {notice&&<p role="status" className="text-sm text-[#77736d]">{notice}</p>}
    <p className="text-[10px] leading-5 text-[#89847c]">Your details will only be used to respond to this enquiry.</p>
  </form>;
}
