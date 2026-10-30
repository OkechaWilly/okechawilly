export default function AdminSection() {
  return (
    <section>
      <p className="eyebrow">Studio workspace</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Artwork management.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-[#77736d]">Your artwork catalogue will appear here once the Supabase project is connected. You will be able to add a title, year, medium, dimensions, story, images, collection and publication status for each work.</p>
      <div className="mt-10 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-12 text-center">
        <p className="display text-2xl">Workspace being prepared</p>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-[#89847c]">Artwork records are not yet connected to the live portfolio.</p>
      </div>
    </section>
  );
}
