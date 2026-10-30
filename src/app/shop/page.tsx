import Link from "next/link";

const shopCategories = [
  {
    number: "01",
    title: "Original paintings",
    description:
      "One-of-a-kind works on canvas and other surfaces. Each original is individually catalogued with its story, medium, dimensions and availability.",
    note: "Original works · One of one",
  },
  {
    number: "02",
    title: "Limited-edition prints",
    description:
      "Selected artworks reproduced as carefully produced editions, with edition details and availability clearly stated.",
    note: "Numbered editions · Selected works",
  },
  {
    number: "03",
    title: "Open-edition prints",
    description:
      "Accessible art prints made from selected works, available in a range of sizes as the collection develops.",
    note: "Unnumbered · Selected works",
  },
  {
    number: "04",
    title: "Objects & merchandise",
    description:
      "A developing collection of wearable pieces and objects for everyday spaces, informed by the artwork and visual language of the studio.",
    note: "Apparel · Objects · Home",
  },
];

export default function Shop() {
  return (
    <main>
      <section className="container py-20 md:py-28">
        <p className="eyebrow">Collect art</p>
        <h1 className="display mt-4 text-6xl md:text-8xl">
          The shop<span className="text-[#9c8062]">.</span>
        </h1>
        <div className="mt-7 grid gap-8 md:grid-cols-[1fr_.7fr] md:items-end">
          <p className="max-w-2xl text-base leading-8 text-[#77736d]">
            A growing selection of original paintings, fine art prints and
            objects. The shop is being prepared as the collection is
            catalogued. In the meantime, you are welcome to enquire about
            works and upcoming releases.
          </p>
          <p className="text-xs leading-6 text-[#77736d] md:justify-self-end md:text-right">
            Based in Uganda
            <br />
            Enquiries welcome from collectors worldwide
          </p>
        </div>
      </section>

      <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
        <div className="container py-16 md:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">What you will find</p>
              <h2 className="display mt-3 text-4xl md:text-5xl">
                Art to live with.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#77736d]">
              Each category will have its own catalogue, with clear details
              about the work, edition, price and availability.
            </p>
          </div>

          <div className="mt-12 grid gap-x-10 md:grid-cols-2">
            {shopCategories.map((category) => (
              <article
                key={category.number}
                className="border-t border-[#d8d4cb] py-7 md:py-9"
              >
                <div className="flex items-start justify-between gap-5">
                  <p className="text-[10px] tracking-[.16em] text-[#9c8062]">
                    {category.number} / CATEGORY
                  </p>
                  <span className="text-[9px] uppercase tracking-[.14em] text-[#8a857d]">
                    In preparation
                  </span>
                </div>
                <h3 className="display mt-5 text-3xl md:text-4xl">
                  {category.title}
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-[#77736d]">
                  {category.description}
                </p>
                <p className="mt-6 text-[10px] uppercase tracking-[.12em] text-[#8a857d]">
                  {category.note}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-8 md:grid-cols-[1fr_.8fr] md:items-end">
          <div>
            <p className="eyebrow">Interested in collecting?</p>
            <h2 className="display mt-4 max-w-xl text-4xl leading-tight md:text-5xl">
              Start a conversation about a work.
            </h2>
          </div>
          <div>
            <p className="text-sm leading-7 text-[#77736d]">
              For current availability, commissions, print enquiries or
              questions about shipping, get in touch. I can share details and
              discuss the best way to get a work to you.
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex border border-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition-colors hover:bg-[#242320] hover:text-white"
            >
              Make an enquiry <span className="ml-5">↗</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
