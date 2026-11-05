import Link from "next/link";

const questions = [
  {
    question: "How do I purchase an artwork or print?",
    answer: "Open the listing you are interested in and use the enquiry link. The studio will personally confirm the work’s availability, price and delivery arrangements before you decide how to proceed. Online checkout is not currently available.",
  },
  {
    question: "Are the artworks original paintings or prints?",
    answer: "Each listing identifies the work as an original painting, limited-edition print, open-edition print or another studio product. Please refer to the individual listing for its specific details.",
  },
  {
    question: "What sizes and materials are available for prints?",
    answer: "Print formats, dimensions and materials can vary from one work to another. Any confirmed details are included in the product listing. If something is not specified, contact the studio before making a purchase enquiry.",
  },
  {
    question: "Are limited-edition prints numbered or signed?",
    answer: "Edition information is provided on the individual listing where available. If you would like to confirm signing, numbering or a certificate of authenticity for a particular work, please ask the studio before purchase.",
  },
  {
    question: "Do you deliver outside Uganda?",
    answer: "International enquiries are welcome. Delivery options and costs depend on the destination and the work being purchased, so these are discussed and confirmed individually before an order is agreed.",
  },
  {
    question: "Can I commission a painting or request a particular work?",
    answer: "You are welcome to enquire about a commission or discuss an idea with the studio. Share a little about the subject, size and intended timeline through the contact page. Each request is considered individually.",
  },
  {
    question: "Can I ask about a work that has been sold?",
    answer: "Yes. You can enquire about a sold work to learn more about it or discuss the possibility of a related commission. A sold original is not available for purchase, but it remains part of the artist’s portfolio.",
  },
];

export default function CollectorFAQ() {
  return (
    <main>
      <section className="container py-20 md:py-28">
        <p className="eyebrow">For collectors</p>
        <h1 className="display mt-4 text-6xl md:text-8xl">A few questions<span className="text-[#9c8062]">.</span></h1>
        <p className="mt-7 max-w-2xl text-base leading-8 text-[#77736d]">
          A little more information about collecting original works and prints,
          making an enquiry and arranging delivery.
        </p>
      </section>

      <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
        <div className="container grid gap-12 py-16 md:grid-cols-[.65fr_1.35fr] md:py-24">
          <div>
            <p className="eyebrow">Collector information</p>
            <h2 className="display mt-4 max-w-sm text-4xl leading-tight md:text-5xl">Good to know before you enquire.</h2>
          </div>
          <div className="divide-y divide-[#ded9d0]">
            {questions.map((item, index) => (
              <details key={item.question} className="group py-6 first:pt-0">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <span className="flex gap-4">
                    <span className="pt-1 text-[10px] tracking-[.14em] text-[#9c8062]">0{index + 1}</span>
                    <span className="display text-xl md:text-2xl">{item.question}</span>
                  </span>
                  <span aria-hidden="true" className="pt-1 text-lg text-[#9c8062] transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="ml-9 mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-8 md:grid-cols-[1fr_.8fr] md:items-end">
          <div>
            <p className="eyebrow">Still have a question?</p>
            <h2 className="display mt-4 max-w-xl text-4xl leading-tight md:text-5xl">Let’s talk about the work.</h2>
          </div>
          <div>
            <p className="text-sm leading-7 text-[#77736d]">If you need more information about a particular artwork, print or delivery arrangement, please get in touch directly.</p>
            <Link href="/contact?subject=Collector%20enquiry" className="mt-7 inline-flex border border-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition-colors hover:bg-[#242320] hover:!text-[#f7f6f2]">Contact the studio <span className="ml-5">↗</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
