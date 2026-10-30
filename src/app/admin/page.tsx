import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const sections = [
  { title: "Artwork archive", description: "Add paintings, update details, organise collections and publish portfolio entries.", href: "/admin/artworks", label: "Manage artworks" },
  { title: "Shop catalogue", description: "Prepare originals, print editions and merchandise for future sale.", href: "/admin/products", label: "Manage products" },
  { title: "Orders", description: "Review customer orders and track fulfilment once checkout is enabled.", href: "/admin/orders", label: "View orders" },
  { title: "Collector enquiries", description: "Keep track of questions about works, commissions and availability.", href: "/admin/inquiries", label: "View enquiries" },
];

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [artworks, products, orders, inquiries] = await Promise.all([
    supabase.from("artworks").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("inquiries").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    ["Artworks", artworks.count ?? 0],
    ["Products", products.count ?? 0],
    ["Orders", orders.count ?? 0],
    ["Enquiries", inquiries.count ?? 0],
  ];

  return (
    <div>
      <p className="eyebrow">Studio overview</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Good to see you.</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[#77736d]">
        This is your private workspace for managing the artwork archive and, when ready, your online shop.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="border border-[#dedad2] bg-[#f7f6f2] p-5">
            <p className="text-[9px] uppercase tracking-[.15em] text-[#77736d]">{label}</p>
            <p className="display mt-3 text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {sections.map((section, index) => (
          <article key={section.href} className="border-t border-[#cfcac0] py-6">
            <p className="text-[10px] tracking-[.15em] text-[#9c8062]">0{index + 1} / WORKSPACE</p>
            <h2 className="display mt-3 text-3xl">{section.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#77736d]">{section.description}</p>
            <Link href={section.href} className="mt-5 inline-block text-[10px] uppercase tracking-[.14em] underline underline-offset-4">{section.label} ↗</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
