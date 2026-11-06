import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/admin-auth";
import LoginForm from "@/components/admin/login-form";

export const metadata = {
  title: "Studio sign in",
  robots: { index: false, follow: false },
};

export default async function StudioLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const unauthorized = params.error === "unauthorized";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Already signed in as an admin: skip the form.
  if (user && !unauthorized) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") redirect(next);
  }

  return <LoginForm next={next} unauthorized={unauthorized} signedInAs={unauthorized ? user?.email ?? null : null} />;
}
