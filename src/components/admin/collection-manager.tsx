"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Artwork = { id: string; title: string; is_published: boolean };
type Collection = {
  id: string; title: string; slug: string; description: string | null;
  cover_image: string | null; sort_order: number; is_published: boolean;
  collection_artworks: { artwork_id: string }[];
};

const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "collection";

export default function CollectionManager({ initialCollections, artworks }: { initialCollections: Collection[]; artworks: Artwork[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [collections, setCollections] = useState(initialCollections);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [published, setPublished] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function reset() {
    setEditing(null); setTitle(""); setSlug(""); setDescription("");
    setSortOrder("0"); setPublished(false); setSelected([]); setCover(null);
    setOpen(false);
  }
  function createNew() { reset(); setNotice(""); setOpen(true); }
  function edit(item: Collection) {
    setEditing(item); setTitle(item.title); setSlug(item.slug); setDescription(item.description || "");
    setSortOrder(String(item.sort_order ?? 0)); setPublished(item.is_published);
    setSelected((item.collection_artworks || []).map((row) => row.artwork_id));
    setCover(null); setNotice(""); setOpen(true);
  }
  function toggleArtwork(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { setNotice("Please enter a collection title."); return; }
    setBusy(true); setNotice("");
    try {
      const payload = { title: title.trim(), slug: slugify(slug || title), description: description.trim() || null, sort_order: Number(sortOrder) || 0, is_published: published };
      let id = editing?.id;
      if (editing) {
        const { error } = await supabase.from("collections").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("collections").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (!id) throw new Error("Collection could not be identified.");
      let coverPath = editing?.cover_image || null;
      if (cover) {
        const ext = cover.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `collections/${id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("artwork-images").upload(path, cover, { contentType: cover.type || undefined });
        if (error) throw error;
        coverPath = path;
        const { error: updateError } = await supabase.from("collections").update({ cover_image: coverPath }).eq("id", id);
        if (updateError) throw updateError;
      }
      const { error: clearError } = await supabase.from("collection_artworks").delete().eq("collection_id", id);
      if (clearError) throw clearError;
      if (selected.length) {
        const { error } = await supabase.from("collection_artworks").insert(selected.map((artwork_id, index) => ({ collection_id: id, artwork_id, sort_order: index })));
        if (error) throw error;
      }
      const updated: Collection = { id, ...payload, cover_image: coverPath, collection_artworks: selected.map((artwork_id) => ({ artwork_id })) };
      setCollections((current) => [updated, ...current.filter((item) => item.id !== id)].sort((a, b) => a.sort_order - b.sort_order));
      reset(); setNotice("Collection saved successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this collection.");
    } finally { setBusy(false); }
  }

  async function remove(item: Collection) {
    if (!window.confirm(`Delete “${item.title}”? Its artwork will remain in your archive.`)) return;
    setBusy(true); setNotice("");
    try {
      const { error } = await supabase.from("collections").delete().eq("id", item.id);
      if (error) throw error;
      setCollections((current) => current.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) reset();
      setNotice("Collection deleted. Artwork records were kept.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this collection."); }
    finally { setBusy(false); }
  }

  const publicUrl = (path: string) => supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;

  return <section>
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div><p className="eyebrow">Studio workspace</p><h1 className="display mt-3 text-5xl md:text-6xl">Collections.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Group artworks into thoughtful themes and decide which collections appear in the public gallery.</p></div>
      <button onClick={createNew} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] !text-[#f7f6f2] hover:bg-[#9c8062]">+ New collection</button>
    </div>
    {notice && <p className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm text-[#625e57]">{notice}</p>}
    {open && <form onSubmit={save} className="mt-10 border border-[#dedad2] bg-[#f7f6f2] p-5 md:p-8">
      <div className="flex items-center justify-between gap-4"><h2 className="display text-3xl">{editing ? "Edit collection" : "Create a collection"}</h2><button type="button" onClick={reset} className="text-xs underline underline-offset-4">Close</button></div>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className={label}>Collection title<input className={field} value={title} onChange={(e) => { setTitle(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} placeholder="The Sacred & Ordinary" required /></label>
        <label className={label}>URL slug<input className={field} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="the-sacred-ordinary" /></label>
        <label className={label + " md:col-span-2"}>Description<textarea className={field + " min-h-24"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short introduction to this body of work." /></label>
        <label className={label}>Cover image<input className={field} type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} />{editing?.cover_image && <span className="mt-2 block text-[10px] normal-case tracking-normal text-[#89847c]">A cover image is already uploaded. Choose a new file to replace it.</span>}</label>
        <label className={label}>Display order<input className={field} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></label>
      </div>
      <div className="mt-8 border-t border-[#dedad2] pt-6">
        <p className={label}>Assign artworks <span className="normal-case tracking-normal">— {selected.length} selected</span></p>
        {artworks.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{artworks.map((artwork) => <label key={artwork.id} className="flex items-start gap-3 border border-[#e2ded6] bg-white p-3 text-sm"><input type="checkbox" checked={selected.includes(artwork.id)} onChange={() => toggleArtwork(artwork.id)} className="mt-1 accent-[#9c8062]" /><span>{artwork.title}<span className="mt-1 block text-[9px] uppercase tracking-widest text-[#89847c]">{artwork.is_published ? "Published" : "Draft"}</span></span></label>)}</div> : <p className="mt-3 text-xs text-[#89847c]">Add artworks to your archive first.</p>}
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-5 border-t border-[#dedad2] pt-6">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-[#9c8062]" /> Publish collection on website</label>
        <button disabled={busy} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] !text-[#f7f6f2] disabled:opacity-50">{busy ? "Saving..." : "Save collection"}</button>
        <button type="button" onClick={reset} className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Cancel</button>
      </div>
    </form>}
    <div className="mt-10 flex items-center justify-between border-b border-[#dedad2] pb-4"><p className="eyebrow">{collections.length} collections</p><p className="text-[10px] uppercase tracking-[.12em] text-[#89847c]">Ordered by display priority</p></div>
    {collections.length ? <div className="mt-3 divide-y divide-[#e2ded6]">{collections.map((item, index) => <article key={item.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
      <div className="h-24 w-32 shrink-0 overflow-hidden bg-[#e8e5de]">{item.cover_image ? <img src={publicUrl(item.cover_image)} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-widest text-[#89847c]">No cover</div>}</div>
      <div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[.15em] text-[#9c8062]">0{index + 1} / {item.is_published ? "Published" : "Draft"}</p><h2 className="serif mt-2 text-2xl">{item.title}</h2><p className="mt-1 text-xs text-[#89847c]">{item.collection_artworks?.length || 0} artworks · /collections/{item.slug}</p>{item.description && <p className="mt-2 line-clamp-2 text-xs leading-6 text-[#77736d]">{item.description}</p>}</div>
      <div className="flex gap-4 text-[10px] uppercase tracking-[.12em]"><button onClick={() => edit(item)} className="underline underline-offset-4">Edit</button><button disabled={busy} onClick={() => remove(item)} className="text-[#9b5947] underline underline-offset-4">Delete</button></div>
    </article>)}</div> : <div className="mt-8 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-14 text-center"><p className="display text-2xl">Your collections will live here.</p><p className="mt-3 text-xs text-[#89847c]">Start with themes such as The Sacred & Ordinary, Portraits, African Stories, Nature & Environment, or Studies & Experiments.</p></div>}
  </section>;
}
