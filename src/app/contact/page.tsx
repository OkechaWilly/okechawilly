import Link from "next/link";
import ContactForm from "@/components/contact-form";

export default async function Contact({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const params = await searchParams;
  const requestedSubject = params.subject?.trim().slice(0, 160);
  const initialSubject = requestedSubject || "Artwork enquiry";

  return <main className="container py-20">
    <p className="eyebrow">Start a conversation</p>
    <h1 className="display mt-4 max-w-3xl text-6xl md:text-8xl">Let’s talk<br/><em className="text-[#9c8062]">about art.</em></h1>
    <p className="mt-8 max-w-lg text-sm leading-7 text-[#77736d]">For artwork enquiries, commissions, collaborations, exhibitions or just to say hello, reach out. I welcome conversations with collectors in Uganda and internationally.</p>
    <ContactForm initialSubject={initialSubject}/>
    <div className="mt-12 border-y border-[#e8e5de] py-8"><p className="eyebrow">Prefer email?</p><a href="mailto:okechawill@gmail.com" className="serif mt-2 inline-block text-3xl">okechawill@gmail.com ↗</a><p className="mt-2 text-xs text-[#77736d]">For direct enquiries, you can also email me here.</p></div>
    <p className="mt-8 text-sm text-[#77736d]">Based in Wakiso, Uganda · Open to international enquiries.</p>
    <Link href="/" className="mt-10 inline-block text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Return home</Link>
  </main>;
}
