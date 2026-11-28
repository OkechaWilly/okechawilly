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
      <section className="container pb-10 pt-16 md:pb-14 md:pt-24">
        <div className="max-w-5xl">
          <p className="eyebrow">Commissions, collaborations & selected work</p>
          <h1 className="display mt-6 max-w-5xl text-5xl leading-[.98] md:text-7xl lg:text-[6.5rem]">
            Work shaped by people, places and ideas.
          </h1>
          <p className="mt-7 max-w-2xl text-sm leading-8 text-[#77736d] md:mt-9 md:text-base">
            A considered selection of projects, each shaped by its own story, setting and creative brief.
          </p>
        </div>
      </section>

      <section className="container">
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
          <p className="text-[10px] uppercase tracking-[.15em] text-[#89847c]">
            {visibleProjects.length.toString().padStart(2, "0")} {visibleProjects.length === 1 ? "project" : "projects"}
          </p>
        </div>

        {visibleProjects.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:mt-12 md:gap-x-7 md:gap-y-14 lg:grid-cols-3">
            {visibleProjects.map((project, index) => (
              <Link key={project.id} href={"/projects/" + project.slug} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#e8e5de]">
                  {project.image ? (
                    <Image
                      src={project.image}
                      alt={project.title + " — selected project by Okecha Willy"}
                      fill
                      priority={index < 3}
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.035]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                      <span className="display text-3xl">{project.title}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
                    <p className="text-[9px] font-semibold uppercase tracking-[.17em] text-white/75">
                      {project.project_type || "Selected project"}
                    </p>
                    <h2 className="display mt-2 text-3xl leading-tight md:text-4xl">{project.title}</h2>
                    <p className="mt-2 text-xs leading-5 text-white/80">
                      {project.clientName || project.location || "Commission & collaboration"}
                    </p>
                  </div>
                </div>
                {project.summary && (
                  <p className="mt-4 max-w-md text-sm leading-7 text-[#77736d]">{project.summary}</p>
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
