import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Selected Projects",
  description: "Commissioned work, creative collaborations and selected projects by Okecha Willy.",
  path: "/projects",
});

type Project = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  project_type: string | null;
  location: string | null;
  cover_image: string | null;
  image: string;
  clientName: string;
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id,title,slug,summary,project_type,location,cover_image,client:clients(name)")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const projects: Project[] = (data ?? []).map((project) => ({
    ...project,
    image: project.cover_image
      ? project.cover_image.startsWith("http")
        ? project.cover_image
        : supabase.storage.from("artwork-images").getPublicUrl(project.cover_image).data.publicUrl
      : "",
    clientName: (() => {
      const relation = (project as unknown as { client?: { name?: string } | { name?: string }[] | null }).client;
      return Array.isArray(relation) ? relation[0]?.name ?? "" : relation?.name ?? "";
    })(),
  }));
  const categories = Array.from(
    new Set(projects.map((project) => project.project_type?.trim()).filter((value): value is string => Boolean(value))),
  );
  const activeCategory = categories.find((value) => value.toLowerCase() === category?.toLowerCase()) ?? "";
  const visibleProjects = activeCategory
    ? projects.filter((project) => project.project_type?.toLowerCase() === activeCategory.toLowerCase())
    : projects;

  return (
    <main className="pb-24">
      <section className="container pb-12 pt-16 md:pb-16 md:pt-24">
        <div className="grid gap-8 border-b border-[#dedad2] pb-12 md:grid-cols-[1.15fr_.85fr] md:items-end md:gap-16 md:pb-16">
          <div>
            <p className="eyebrow">Okecha Willy · Selected work</p>
            <h1 className="display mt-5 max-w-4xl text-5xl leading-[.98] md:text-7xl lg:text-[6rem]">
              A selection of works.
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-8 text-[#77736d] md:pb-2 md:text-base">
            Commissions, collaborations and creative projects shaped by people, places and ideas. Each work begins with its own context and develops through a considered visual approach.
          </p>
        </div>
      </section>

      <section className="container">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Portfolio archive</p>
            <h2 className="display mt-2 text-3xl md:text-4xl">Selection of works</h2>
          </div>
          <p className="text-[10px] uppercase tracking-[.15em] text-[#89847c]">{visibleProjects.length.toString().padStart(2, "0")} {visibleProjects.length === 1 ? "project" : "projects"}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5 border-y border-[#dedad2] py-5">
          <nav aria-label="Filter projects by category" className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/projects"
              aria-current={!activeCategory ? "page" : undefined}
              className={"text-[10px] font-semibold uppercase tracking-[.15em] transition-colors " + (!activeCategory ? "text-[#242320]" : "text-[#89847c] hover:text-[#242320]")}
            >
              All work
            </Link>
            {categories.map((item) => (
              <Link
                key={item}
                href={"/projects?category=" + encodeURIComponent(item)}
                aria-current={activeCategory === item ? "page" : undefined}
                className={"text-[10px] font-semibold uppercase tracking-[.15em] transition-colors " + (activeCategory === item ? "text-[#242320]" : "text-[#89847c] hover:text-[#242320]")}
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>

        {visibleProjects.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:mt-12 md:gap-x-7 md:gap-y-14 lg:grid-cols-3">
            {visibleProjects.map((project, index) => (
              <Link key={project.id} href={"/projects/" + project.slug} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#e8e5de]">
                  {project.image ? (
                    <Image
                      src={project.image}
                      alt={project.title + " — selected project by Okecha Willy"}
                      fill
                      priority={index < 3}
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.025]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                      <span className="display text-3xl">{project.title}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="eyebrow">{project.project_type || "Selected project"}</p>
                    <h2 className="display mt-2 text-2xl leading-tight md:text-3xl">{project.title}</h2>
                    <p className="mt-2 text-xs leading-6 text-[#89847c]">{project.clientName || project.location || "Commission & collaboration"}</p>
                  </div>
                  <span aria-hidden="true" className="mt-1 shrink-0 text-[10px] uppercase tracking-[.14em] text-[#89847c]">View</span>
                </div>
                {project.summary && (
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#77736d]">{project.summary}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="border-b border-[#dedad2] py-16 md:py-24">
            <p className="eyebrow">No projects in this category yet</p>
            <h2 className="display mt-4 max-w-2xl text-4xl md:text-6xl">More work is being prepared.</h2>
            <Link href="/projects" className="mt-7 inline-flex rounded-full border border-[#dedad2] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.15em] transition-colors hover:border-[#9c8062]">
              View all work
            </Link>
          </div>
        )}
      </section>

      <section className="container mt-24 md:mt-32">
        <div className="grid gap-6 border-t border-[#dedad2] pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">Have something in mind?</p>
            <h2 className="display mt-3 max-w-3xl text-4xl md:text-6xl">Let’s make something meaningful.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#77736d]">
              For commissions, creative collaborations or a project you would like to discuss, get in touch.
            </p>
          </div>
          <Link href="/contact" className="inline-flex w-fit rounded-full bg-[#242320] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062]">
            Discuss a project
          </Link>
        </div>
      </section>
    </main>
  );
}
