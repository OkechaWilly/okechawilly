"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1efe9] px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="serif text-2xl">Okecha Willy<span className="text-[#9c8062]">.</span></Link>
        <div className="mt-10 border border-[#dedad2] bg-[#f7f6f2] p-7 md:p-10">
          <p className="eyebrow">Private workspace</p>
          <h1 className="display mt-3 text-4xl">Studio sign in.</h1>
          <p className="mt-3 text-sm leading-6 text-[#77736d]">Sign in with the administrator account created in Supabase.</p>
          {error && <p role="alert" className="mt-5 text-xs text-red-700">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-[10px] uppercase tracking-[.13em] text-[#77736d]">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border border-[#dedad2] bg-white px-4 py-3 text-sm text-[#242320] outline-none focus:border-[#9c8062]" />
            </label>
            <label className="block text-[10px] uppercase tracking-[.13em] text-[#77736d]">
              Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full border border-[#dedad2] bg-white px-4 py-3 text-sm text-[#242320] outline-none focus:border-[#9c8062]" />
            </label>
            <button disabled={loading} className="w-full bg-[#242320] px-6 py-4 text-[10px] uppercase tracking-[.15em] text-white transition hover:bg-[#514b43] disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in to studio"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-[10px] text-[#89847c]">Private access · Okecha Willy</p>
      </div>
    </main>
  );
}
