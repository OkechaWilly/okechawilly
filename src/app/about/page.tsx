const principles = [
  {
    number: "01",
    title: "Memory & identity",
    description:
      "I am interested in the ways personal and collective histories shape how we understand ourselves and the places we belong to.",
  },
  {
    number: "02",
    title: "Faith & the everyday",
    description:
      "I explore the presence of belief in ordinary life — through places of worship, people, symbols, rituals and the questions they leave behind.",
  },
  {
    number: "03",
    title: "Nature & our environment",
    description:
      "The natural world is both subject and context: a source of form, material, reflection and questions about our relationship with the earth.",
  },
];

export default function About() {
  return (
    <main>
      <section className="container py-20 md:py-28">
        <p className="eyebrow">The artist</p>
        <div className="mt-6 grid gap-12 md:grid-cols-[1.1fr_.8fr] md:items-end">
          <div>
            <h1 className="display text-6xl leading-[.98] md:text-8xl">
              Okecha
              <br />
              <em className="text-[#9c8062]">Willy.</em>
            </h1>
            <p className="mt-9 max-w-2xl text-lg leading-8 text-[#77736d]">
              I am a Ugandan visual artist working across painting, drawing and
              visual storytelling. My practice explores identity, spirituality,
              culture, nature and the many ways we experience being human.
            </p>
          </div>
          <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-[#e9e5dc] p-8 md:p-10">
            <p className="eyebrow">Based in Uganda · Working everywhere</p>
            <div>
              <p className="display text-5xl leading-[1.04]">Looking closely.<br/><em className="text-[#9c8062]">Asking questions.</em></p>
              <div className="mt-8 h-px w-16 bg-[#9c8062]"/>
              <p className="mt-5 max-w-xs text-sm leading-7 text-[#77736d]">Painting and image-making as ways to explore the stories, beliefs and environments that shape us.</p>
            </div>
            <p className="text-[10px] uppercase tracking-[.16em] text-[#9c8062]">Okecha Willy — Artist</p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
        <div className="container grid gap-10 py-16 md:grid-cols-[.7fr_1.3fr] md:py-24">
          <div>
            <p className="eyebrow">Artist statement</p>
            <h2 className="display mt-4 max-w-sm text-4xl leading-tight md:text-5xl">
              Images as a way of asking questions.
            </h2>
          </div>
          <div className="max-w-2xl space-y-5 text-sm leading-8 text-[#6f6b64] md:text-base">
            <p>
              I make work to look more closely at the things that shape our
              lives: the stories we inherit, the beliefs we carry, the
              environments we inhabit and the relationships we form with one
              another. I am drawn to subjects that hold more than one meaning,
              where the visible world can open a path toward memory, feeling or
              reflection.
            </p>
            <p>
              I approach painting and image-making as forms of inquiry. A
              church, a portrait, a landscape or an everyday object can become
              a starting point for thinking about belonging, power, faith,
              change and the passage of time. I want the work to remain open
              enough for viewers to bring their own experiences to it.
            </p>
            <p>
              Working from Uganda, I draw from the textures and complexities
              of the world around me while remaining curious about the
              connections between local stories and wider human experience.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="eyebrow">Areas of inquiry</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">
              What I return to.
            </h2>
          </div>
          <div className="divide-y divide-[#e7e3dc]">
            {principles.map((item) => (
              <article
                key={item.number}
                className="grid gap-3 py-7 first:pt-0 md:grid-cols-[60px_1fr]"
              >
                <span className="pt-1 text-xs tracking-[.16em] text-[#9c8062]">
                  {item.number}
                </span>
                <div>
                  <h3 className="display text-2xl">{item.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#77736d]">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e7e3dc]">
        <div className="container grid gap-8 py-16 md:grid-cols-[.7fr_1.3fr] md:py-20">
          <div>
            <p className="eyebrow">Background</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">
              A path between art and technology.
            </h2>
          </div>
          <div className="max-w-2xl space-y-5 text-sm leading-8 text-[#77736d] md:text-base">
            <p>
              My relationship with art began in childhood, making and
              experimenting alongside my four brothers. I returned to a more
              deliberate visual-art practice in 2019, while completing a
              Computer Science degree at Ndejje University.
            </p>
            <p>
              That meeting of creative practice and technology continues to
              inform how I think about images, process and communication. It
              has also kept me curious about the possibilities of different
              materials and ways of telling stories.
            </p>
            <p>
              My current painting direction includes an ongoing exploration
              of religion and its place in society, with particular attention
              to churches, church leaders and portraiture.
            </p>
          </div>
        </div>
      </section>

      <section className="container pb-20 md:pb-28">
        <div className="flex flex-col gap-6 border-t border-[#e7e3dc] pt-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Explore the work</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">
              Ideas become images.
            </h2>
          </div>
          <a
            href="/artwork"
            className="inline-flex w-fit border-b border-[#9c8062] pb-2 text-xs uppercase tracking-[.16em] text-[#4d4943] transition-colors hover:text-[#9c8062]"
          >
            View selected artwork <span className="ml-4">↗</span>
          </a>
        </div>
      </section>
    </main>
  );
}
