import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/contact-form";
import { cleanSubject } from "@/lib/contact";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contact",
  description: "Enquire about artwork, commissions, collaborations or exhibitions with Okecha Willy. Collectors in Uganda and worldwide are welcome.",
  path: "/contact",
});

export default async function Contact({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const params = await searchParams;
  // Capped at the database limit (120) so a long artwork title can't make the insert fail.
  const initialSubject = cleanSubject(params.subject);

  return (
    <main className="container py-16 md:py-20">
      <div className="grid items-start gap-16 lg:grid-cols-[1fr_.82fr] lg:gap-20">
        <section className="min-w-0">
          <p className="eyebrow">Start a conversation</p>
          <h1 className="display mt-4 max-w-2xl text-6xl md:text-7xl">Let’s talk<br/><em className="text-[#9c8062]">about art.</em></h1>
          <p className="mt-7 max-w-lg text-sm leading-7 text-[#77736d]">
            For artwork enquiries, commissions, collaborations, exhibitions or just to say hello, reach out. I welcome conversations with collectors in Uganda and internationally.
          </p>
          <ContactForm initialSubject={initialSubject}/>
        </section>

        <aside className="relative mx-auto w-full max-w-[560px] lg:mt-8" aria-label="A glimpse of the artist’s work">
          <div className="absolute -right-3 -top-3 h-full w-full border border-[#d9d2c6]" aria-hidden="true" />
          <div className="relative aspect-[4/4.8] overflow-hidden bg-[#e7e2d9]">
            <Image
              src="https://afxbvymvsqeekmznsalo.supabase.co/storage/v1/object/public/artwork-images/826c77b6-8fc1-4ccf-84bd-9f0a4bfcfb10/4978d3da-914b-4849-8a2a-5b35517237e2.jpg"
              alt="The Ports, an original artwork by Okecha Willy"
              fill
              sizes="(min-width: 1024px) 40vw, (min-width: 700px) 70vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">From the studio archive</p>
              <p className="serif mt-1 text-2xl">The Ports</p>
            </div>
            <span className="pt-1 text-[10px] uppercase tracking-[.14em] text-[#aaa49a]">Okecha Willy · Uganda</span>
          </div>
        </aside>
      </div>

      <div className="mt-16 grid gap-8 border-y border-[#e8e5de] py-8 sm:grid-cols-2 sm:items-center">
        <div>
          <p className="eyebrow">Prefer email?</p>
          <a href="mailto:okechawill@gmail.com" className="serif mt-2 inline-block text-2xl sm:text-3xl">okechawill@gmail.com ↗</a>
          <p className="mt-2 text-xs text-[#77736d]">For direct enquiries, you can also email me here.</p>
        </div>
        <div className="sm:text-right">
          <p className="eyebrow">Based in</p>
          <p className="serif mt-2 text-2xl">Wakiso, Uganda</p>
          <p className="mt-2 text-xs text-[#77736d]">Open to international enquiries.</p>
        </div>
      </div>
      <Link href="/" className="mt-10 inline-block text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Return home</Link>
    </main>
  );
}
