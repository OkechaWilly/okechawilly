import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RemoteImage } from "@/components/remote-image";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Journal",
  description: "Notes on art, process, materials, research and ideas from the studio of Okecha Willy.",
  path: "/journal",
});

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })
    : "From the studio";
}

export default async function Journal() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("journal_posts")
    .select("id,title,slug,excerpt,cover_image,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const entries = posts ?? [];
  const featured = entries[0];
  const archive = entries.slice(1);

  return (
    <main>
      <section className="container pb-12 pt-16 md:pb-16 md:pt-24">
        <div className="grid gap-8 border-b border-[#dedad2] pb-12 md:grid-cols-[1.15fr_.85fr] md:items-end md:gap-16 md:pb-16">
          <div>
            <p className="eyebrow">Okecha Willy · Notes from the practice</p>
            <h1 className="display mt-5 max-w-4xl text-6xl leading-[.98] md:text-7xl lg:text-[6.5rem]">Journal.</h1>
          </div>
          <p className="max-w-xl text-sm leading-8 text-[#77736d] md:pb-2 md:text-base">
            A notebook of ideas, observations, materials and processes. Reflections on the work, the world around it and the questions that keep the practice moving.
          </p>
        </div>
      </section>

      <section className="container pb-20 md:pb-28">
        {featured ? (
          <>
            <div className="mb-7 flex items-center justify-between gap-4">
              <p className="eyebrow">Latest entry</p>
              <p className="text-[10px] uppercase tracking-[.15em] text-[#89847c]">{formatDate(featured.published_at)}</p>
            </div>
            <Link href={"/journal/" + featured.slug} className="group grid gap-7 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)] md:items-center md:gap-14">
              <div className="relative aspect-[16/10] overflow-hidden bg-[#e9e6df]">
                {featured.cover_image && <RemoteImage src={featured.cover_image} alt={featured.title} fill priority sizes="(min-width:768px) 65vw,100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"/>}
              </div>
              <div className="max-w-lg py-2">
                <p className="eyebrow">From the studio notebook</p>
                <h2 className="display mt-4 text-4xl leading-tight transition-colors group-hover:text-[#8e745b] md:text-5xl">{featured.title}</h2>
                {featured.excerpt && <p className="mt-5 text-sm leading-8 text-[#77736d]">{featured.excerpt}</p>}
                <p className="mt-8 inline-flex rounded-full border border-[#dedad2] px-5 py-3 text-[9px] font-semibold uppercase tracking-[.14em] transition-colors group-hover:border-[#9c8062]">Read entry</p>
              </div>
            </Link>
          </>
        ) : (
          <div className="border-y border-[#dedad2] py-12">
            <p className="eyebrow">The studio notebook</p>
            <h2 className="display mt-4 max-w-2xl text-4xl md:text-5xl">Ideas, processes and things worth looking at.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#77736d]">New notes from the studio will appear here. In the meantime, explore the artwork archive.</p>
            <Link href="/artwork" className="mt-7 inline-flex rounded-full border border-[#242320] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.14em] transition-colors hover:bg-[#242320] hover:text-white">Explore artwork</Link>
          </div>
        )}
      </section>

      {archive.length > 0 && (
        <section className="bg-[#eeece6] py-16 md:py-24">
          <div className="container">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">The archive</p>
                <h2 className="display mt-3 text-4xl md:text-5xl">More from the journal</h2>
              </div>
              <p className="text-[10px] uppercase tracking-[.15em] text-[#89847c]">{archive.length.toString().padStart(2, "0")} entries</p>
            </div>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {archive.map((post) => (
                <article key={post.id}>
                  <Link href={"/journal/" + post.slug} className="group block">
                    <div className="relative mb-5 aspect-[4/3] overflow-hidden bg-[#e9e6df]">
                      {post.cover_image && <RemoteImage src={post.cover_image} alt={post.title} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"/>}
                    </div>
                    <p className="eyebrow">{formatDate(post.published_at)}</p>
                    <h3 className="display mt-3 text-2xl leading-tight transition-colors group-hover:text-[#8e745b]">{post.title}</h3>
                    {post.excerpt && <p className="mt-3 text-sm leading-7 text-[#77736d]">{post.excerpt}</p>}
                    <p className="mt-5 text-[9px] font-semibold uppercase tracking-[.15em] text-[#625e57]">Read entry</p>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
