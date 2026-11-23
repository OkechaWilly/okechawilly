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
    <main className="grid min-h-[calc(100svh-5rem)] lg:grid-cols-2">
      <section className="flex min-w-0 flex-col justify-center px-6 py-14 sm:px-10 lg:px-[clamp(3rem,7vw,7.5rem)] lg:py-16">
        <div className="mx-auto w-full max-w-[620px]">
          <p className="eyebrow">Okecha Willy · Uganda</p>
          <h1 className="display mt-5 text-5xl sm:text-6xl xl:text-7xl">Let’s talk<br/><em className="text-[#9c8062]">about art.</em></h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-[#77736d]">
            For artwork enquiries, commissions, collaborations, exhibitions or just to say hello, reach out. I welcome conversations with collectors in Uganda and internationally.
          </p>
          <ContactForm initialSubject={initialSubject}/>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[#e8e5de] pt-5">
            <a href="mailto:okechawill@gmail.com" className="text-xs text-[#77736d] transition-colors hover:text-[#242320]">okechawill@gmail.com ↗</a>
            <Link href="/" className="text-[10px] uppercase tracking-[.14em] text-[#77736d] underline underline-offset-4 hover:text-[#242320]">Return home</Link>
          </div>
        </div>
      </section>

      <aside className="relative min-h-[480px] overflow-hidden bg-[#d8d0c1] lg:min-h-full" aria-label="The Ports, artwork by Okecha Willy">
        <Image
          src="https://afxbvymvsqeekmznsalo.supabase.co/storage/v1/object/public/artwork-images/826c77b6-8fc1-4ccf-84bd-9f0a4bfcfb10/4978d3da-914b-4849-8a2a-5b35517237e2.jpg"
          alt="The Ports, an original artwork by Okecha Willy"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" aria-hidden="true" />
        <div className="absolute left-7 right-7 top-7 flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-white/80 sm:left-10 sm:right-10 sm:top-10">
          <span>From the studio archive</span>
          <span>01 / Artwork</span>
        </div>
        <div className="absolute bottom-8 left-7 right-7 text-white sm:bottom-12 sm:left-10 sm:right-10">
          <p className="text-[10px] uppercase tracking-[.2em] text-white/75">A conversation begins somewhere</p>
          <p className="serif mt-2 text-3xl sm:text-4xl">The Ports</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/35 pt-3 text-[10px] uppercase tracking-[.16em] text-white/75">
            <span>Okecha Willy</span>
            <span>Wakiso, Uganda</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
