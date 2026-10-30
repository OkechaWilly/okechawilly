import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/admin/login?error=unauthorized");

  return (
    <div className="min-h-screen bg-[#f1efe9]">
      <header className="border-b border-[#dedad2] bg-[#f7f6f2]">
        <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <Link href="/admin" className="serif text-2xl">Okecha Willy <span className="text-[#9c8062]">/ Studio</span></Link>
            <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-[#77736d]">Artist administration</p>
          </div>
          <nav className="flex flex-wrap gap-5 text-[10px] uppercase tracking-[.12em] text-[#625e57]">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/artworks">Artworks</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/inquiries">Enquiries</Link>
            <Link href="/">View website ↗</Link>
          </nav>
        </div>
      </header>
      <main className="container py-10 md:py-14">{children}</main>
      <footer className="container border-t border-[#dedad2] py-6 text-[10px] text-[#89847c]">
        Signed in as {profile.display_name || user.email}
      </footer>
    </div>
  );
}
