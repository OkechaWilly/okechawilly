"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/admin/actions";

export default function LoginForm({
  next,
  unauthorized,
  signedInAs,
}: {
  next: string;
  unauthorized: boolean;
  signedInAs: string | null;
}) {
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
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
      setLoading(false);
    }
  }

  const input = "mt-2 w-full border border-[#dedad2] bg-white px-4 py-3 text-sm text-[#242320] outline-none focus:border-[#9c8062]";
  const label = "block text-[10px] uppercase tracking-[.13em] text-[#77736d]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1efe9] px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="serif text-2xl">Okecha Willy<span className="text-[#9c8062]">.</span></Link>
        <div className="mt-10 border border-[#dedad2] bg-[#f7f6f2] p-7 md:p-10">
          <p className="eyebrow">Private workspace</p>
          <h1 className="display mt-3 text-4xl">Studio sign in.</h1>
          <p className="mt-3 text-sm leading-6 text-[#77736d]">Sign in with the administrator account created in Supabase.</p>

          {unauthorized && (
            <div role="alert" className="mt-5 border border-[#e3c9c4] bg-[#fbf1ef] p-4 text-xs leading-5 text-[#8a3a2f]">
              {signedInAs ? <>The account <strong>{signedInAs}</strong> does not have administrator access.</> : <>This account does not have administrator access.</>}
              {signedInAs && (
                <form action={signOut} className="mt-2">
                  <button type="submit" className="underline underline-offset-4">Sign out and use a different account</button>
                </form>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-5 text-xs text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className={label}>
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </label>
            <label className={label}>
              Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            </label>
            <button disabled={loading} className="w-full bg-[#242320] px-6 py-4 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062] disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in to studio"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-[10px] text-[#89847c]">Private access · Okecha Willy</p>
      </div>
    </main>
  );
}
