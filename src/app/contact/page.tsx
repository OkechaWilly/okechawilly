import Link from "next/link";
import ContactForm from "@/components/contact-form";
import LivingSpaceShowcase from "@/components/living-space-showcase";
import { cleanSubject } from "@/lib/contact";
import { pageMetadata } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = pageMetadata({
  title: "Contact",
  description: "Enquire about artwork, commissions, collaborations or exhibitions with Okecha Willy. Collectors in Uganda and worldwide are welcome.",
  path: "/contact",
});

export default async function Contact({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const params = await searchParams;
  const initialSubject = cleanSubject(params.subject);
  const supabase = await createClient();
  const { data: galleryPhotos } = await supabase
    .from("living_space_photos")
    .select("id, title, caption, location, alt_text, storage_path")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(20);

  const photos = (galleryPhotos ?? []).map(photo => ({
    ...photo,
    image_url: supabase.storage.from("living-space-images").getPublicUrl(photo.storage_path).data.publicUrl,
  }));

  return (
    <main className="grid min-h-[calc(100svh-5rem)] bg-[#f5f3ef] lg:grid-cols-2">
      <LivingSpaceShowcase photos={photos} />
      <section className="flex min-w-0 flex-col justify-center bg-[#242320] px-6 py-14 sm:px-10 lg:px-[clamp(3rem,7vw,7.5rem)] lg:py-16">
        <div className="mx-auto w-full max-w-[560px]">
          <p className="eyebrow !text-[#c2b9aa]">Okecha Willy · Uganda</p>
          <h1 className="display mt-5 text-5xl text-[#f7f6f2] sm:text-6xl xl:text-7xl">Let’s talk.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#c2bdb4]">
            Have a question, an idea or an artwork in mind? I welcome conversations about original works, commissions, collaborations and exhibitions.
          </p>
          <ContactForm initialSubject={initialSubject}/>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/20 pt-5">
            <a href="mailto:okechawill@gmail.com" className="text-xs text-[#d5cfc5] transition-colors hover:text-white">okechawill@gmail.com ↗</a>
            <Link href="/" className="text-[10px] uppercase tracking-[.14em] text-[#d5cfc5] underline underline-offset-4 hover:text-white">Return home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
