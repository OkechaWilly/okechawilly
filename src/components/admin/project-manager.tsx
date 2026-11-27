"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { prepareImageForUpload } from "@/lib/image-resize";
import { errorMessage } from "@/lib/errors";

type Client = { id: string; name: string };
type Project = { id: string; client_id: string | null; title: string; slug: string; summary: string | null; brief: string | null; approach: string | null; outcome: string | null; project_type: string; location: string | null; timeframe: string | null; cover_image: string | null; gallery: string[]; sort_order: number; is_featured: boolean; is_published: boolean };
const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
const slugify = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";

export default function ProjectManager({ initialProjects, clients }: { initialProjects: Project[]; clients: Client[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initialProjects);
  const [editing, setEditing] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("Commission");
  const [summary, setSummary] = useState("");
  const [brief, setBrief] = useState("");
  const [approach, setApproach] = useState("");
  const [outcome, setOutcome] = useState("");
  const [location, setLocation] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [order, setOrder] = useState("0");
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function reset() {
    setEditing(null); setTitle(""); setSlug(""); setClientId(""); setType("Commission");
    setSummary(""); setBrief(""); setApproach(""); setOutcome(""); setLocation(""); setTimeframe("");
    setGallery([]); setGalleryFiles([]); setOrder("0"); setFeatured(false); setPublished(false); setCover(null);
  }
  function edit(p: Project) {
    setEditing(p); setTitle(p.title); setSlug(p.slug); setClientId(p.client_id || ""); setType(p.project_type);
    setSummary(p.summary || ""); setBrief(p.brief || ""); setApproach(p.approach || ""); setOutcome(p.outcome || "");
    setLocation(p.location || ""); setTimeframe(p.timeframe || ""); setGallery(p.gallery || []); setGalleryFiles([]);
    setOrder(String(p.sort_order)); setFeatured(p.is_featured); setPublished(p.is_published); setCover(null); setNotice("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      const payload = { title: title.trim(), slug: slugify(slug || title), client_id: clientId || null, project_type: type, summary: summary.trim() || null, brief: brief.trim() || null, approach: approach.trim() || null, outcome: outcome.trim() || null, location: location.trim() || null, timeframe: timeframe.trim() || null, gallery, sort_order: Number(order) || 0, is_featured: featured, is_published: published };
      let id = editing?.id;
      let coverPath = editing?.cover_image || null;
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("projects").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (!id) throw new Error("Project record could not be identified.");
      if (cover) {
        const file = await prepareImageForUpload(cover);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = "projects/" + id + "/" + crypto.randomUUID() + "." + ext;
        const { error } = await supabase.storage.from("artwork-images").upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        coverPath = path;
      }
      const uploadedGallery: string[] = [];
      for (const selected of galleryFiles) {
        const file = await prepareImageForUpload(selected);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = "projects/" + id + "/gallery/" + crypto.randomUUID() + "." + ext;
        const { error } = await supabase.storage.from("artwork-images").upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        uploadedGallery.push(path);
      }
      const finalGallery = [...gallery, ...uploadedGallery];
      const { error: updateError } = await supabase.from("projects").update({ cover_image: coverPath, gallery: finalGallery }).eq("id", id);
      if (updateError) throw updateError;
      const item: Project = { id, ...payload, cover_image: coverPath, gallery: finalGallery };
      setItems(old => [item, ...old.filter(x => x.id !== id)].sort((a, b) => a.sort_order - b.sort_order));
      reset(); setNotice("Project and photographs saved. Publish it when the case study is ready.");
    } catch (err) {
      setNotice(errorMessage(err, "Could not save this project."));
    } finally { setBusy(false); }
  }
  async function remove(p: Project) {
    if (!window.confirm("Delete project “" + p.title + "”?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", p.id);
      if (error) throw error;
      setItems(old => old.filter(x => x.id !== p.id)); setNotice("Project deleted.");
    } catch (err) { setNotice(errorMessage(err, "Could not delete project.")); }
    finally { setBusy(false); }
  }
  const image = (path: string) => supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;

  return <section>
    <div><p className="eyebrow">Studio workspace</p><h1 className="display mt-3 text-5xl md:text-6xl">Projects.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Build case studies around commissions and collaborations. Add the brief, creative approach, outcome, photographs and client when ready.</p></div>
    {notice && <p role="status" className="mt-6 border border-[#dedad2] bg-white p-4 text-sm">{notice}</p>}
    <form onSubmit={save} className="mt-8 border border-[#dedad2] bg-[#f7f6f2] p-5 md:p-7">
      <div className="flex items-center justify-between"><h2 className="display text-3xl">{editing ? "Edit project" : "New project"}</h2>{editing && <button type="button" onClick={reset} className="text-xs underline">Cancel</button>}</div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className={label}>Project title<input required className={field} value={title} onChange={e => { setTitle(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} placeholder="A commissioned mural" /></label>
        <label className={label}>URL slug<input required className={field} value={slug} onChange={e => setSlug(e.target.value)} /></label>
        <label className={label}>Client<select className={field} value={clientId} onChange={e => setClientId(e.target.value)}><option value="">No linked client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className={label}>Project type<input className={field} value={type} onChange={e => setType(e.target.value)} placeholder="Commission, mural, collaboration" /></label>
        <label className={label + " md:col-span-2"}>Short summary<textarea rows={2} className={field} value={summary} onChange={e => setSummary(e.target.value)} placeholder="A concise introduction to the project." /></label>
        <label className={label}>Brief<textarea rows={4} className={field} value={brief} onChange={e => setBrief(e.target.value)} placeholder="What was requested?" /></label>
        <label className={label}>Creative approach<textarea rows={4} className={field} value={approach} onChange={e => setApproach(e.target.value)} placeholder="How did you approach the work?" /></label>
        <label className={label}>Outcome / client response<textarea rows={4} className={field} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="What was delivered? Include feedback only when approved." /></label>
        <label className={label}>Location<input className={field} value={location} onChange={e => setLocation(e.target.value)} placeholder="Kampala, Uganda" /></label>
        <label className={label}>Timeframe<input className={field} value={timeframe} onChange={e => setTimeframe(e.target.value)} placeholder="Five days" /></label>
        <label className={label}>Cover photograph<input type="file" accept="image/jpeg,image/png,image/webp" className={field} onChange={e => setCover(e.target.files?.[0] || null)} /><span className="mt-1 block text-[10px] normal-case tracking-normal text-[#89847c]">Main project image. You can replace it whenever you like.</span></label>
        <div className="md:col-span-2">
          <label className={label}>Project image gallery</label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: Math.max(4, gallery.length + galleryFiles.length) }).map((_, i) => {
              const existing = gallery[i];
              const selected = galleryFiles[i - gallery.length];
              return <div key={i} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border border-dashed border-[#cfc9bd] bg-[#eeece6]">
                {selected ? <div className="p-2 text-center text-[10px] text-[#625e57]">{selected.name}</div> : existing ? <><Image src={image(existing)} alt={"Project gallery image " + (i + 1)} fill sizes="180px" className="object-cover" /><button type="button" onClick={() => setGallery(old => old.filter((_, index) => index !== i))} className="absolute inset-x-1 bottom-1 bg-white/95 px-2 py-1 text-[9px] uppercase tracking-wider text-[#625e57]">Remove image</button></> : <div className="px-2 text-center"><span className="block text-2xl text-[#aaa49a]">+</span><span className="text-[9px] uppercase tracking-wider text-[#89847c]">Image placeholder</span></div>}
              </div>;
            })}
          </div>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className={field} onChange={e => setGalleryFiles(Array.from(e.target.files || []))} />
          <p className="mt-2 text-[10px] normal-case tracking-normal text-[#89847c]">Remove an existing gallery image, then upload its replacement or add more photographs. The cover photograph can also be replaced.</p>
        </div>
        <label className={label}>Display order<input type="number" className={field} value={order} onChange={e => setOrder(e.target.value)} /></label>
      </div>
      <div className="mt-6 flex flex-wrap gap-6 border-t border-[#dedad2] pt-5 text-xs"><label className="flex gap-2"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> Feature on homepage</label><label className="flex gap-2"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Publish project</label></div>
      <button disabled={busy} className="mt-6 bg-[#242320] px-7 py-3 text-[10px] uppercase tracking-[.15em] text-white disabled:opacity-50">{busy ? "Saving..." : "Save project"}</button>
    </form>
    <div className="mt-10 border-b border-[#dedad2] pb-4"><p className="eyebrow">{items.length} projects</p></div>
    <div className="mt-4 grid gap-5 md:grid-cols-2">{items.map(p => <article key={p.id} className="border border-[#dedad2] bg-[#f7f6f2] p-4"><div className="relative aspect-[16/10] bg-[#e8e5de]">{p.cover_image && <Image src={image(p.cover_image)} alt={p.title} fill sizes="(min-width:768px) 50vw,100vw" className="object-cover" />}</div><h3 className="serif mt-4 text-2xl">{p.title}</h3><p className="mt-1 text-[10px] uppercase tracking-widest text-[#89847c]">{p.is_published ? "Published" : "Draft"} · {p.project_type}</p><p className="mt-2 text-sm text-[#77736d]">{p.summary}</p><div className="mt-4 flex gap-4 text-[10px] uppercase tracking-widest"><button type="button" onClick={() => edit(p)} className="underline">Edit</button><button type="button" disabled={busy} onClick={() => remove(p)} className="text-[#9b5947] underline">Delete</button></div></article>)}</div>
  </section>;
}
