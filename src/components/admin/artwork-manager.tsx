"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { prepareImageForUpload } from "@/lib/image-resize";

type ImageRecord = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type ArtworkRecord = {
  id: string;
  title: string;
  slug: string;
  year: number | null;
  medium: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  description: string | null;
  story: string | null;
  category: string | null;
  status: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  artwork_images: ImageRecord[];
  collection_artworks?: { collection_id: string }[];
};

type Collection = { id: string; title: string };

const emptyForm = {
  title: "",
  year: new Date().getFullYear().toString(),
  medium: "Oil on canvas",
  width_cm: "",
  height_cm: "",
  depth_cm: "",
  description: "",
  story: "",
  category: "Painting",
  status: "draft",
  is_featured: false,
  is_published: false,
  sort_order: "0",
};

const inputClass = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#9c8062]";
const labelClass = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";

function makeSlug(value: string) {
  const base = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base || "artwork";
}

function imageUrl(path: string) {
  const supabase = createClient();
  return supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
}

export default function ArtworkManager({
  initialArtworks,
  collections,
  loadError,
}: {
  initialArtworks: ArtworkRecord[];
  collections: Collection[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [artworks, setArtworks] = useState(initialArtworks);
  const [editing, setEditing] = useState<ArtworkRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const visibleArtworks = artworks.filter((artwork) => {
    const matchesSearch = artwork.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || artwork.status === filter;
    return matchesSearch && matchesFilter;
  });

  function startNew() {
    setFormOpen(true);
    setEditing(null);
    setForm(emptyForm);
    setSelectedCollections([]);
    setFiles([]);
    setNotice("");
  }

  function startEdit(artwork: ArtworkRecord) {
    setFormOpen(true);
    setEditing(artwork);
    setSelectedCollections((artwork.collection_artworks ?? []).map((item) => item.collection_id));
    setForm({
      title: artwork.title ?? "",
      year: artwork.year?.toString() ?? "",
      medium: artwork.medium ?? "",
      width_cm: artwork.width_cm?.toString() ?? "",
      height_cm: artwork.height_cm?.toString() ?? "",
      depth_cm: artwork.depth_cm?.toString() ?? "",
      description: artwork.description ?? "",
      story: artwork.story ?? "",
      category: artwork.category ?? "Painting",
      status: artwork.status ?? "draft",
      is_featured: artwork.is_featured ?? false,
      is_published: artwork.is_published ?? false,
      sort_order: artwork.sort_order?.toString() ?? "0",
    });
    setFiles([]);
    setNotice("");
  }

  function updateField(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleCollection(id: string) {
    setSelectedCollections((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function saveArtwork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setNotice("Please enter an artwork title.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const existingImageCount = editing?.artwork_images?.length ?? 0;
      const payload = {
        title: form.title.trim(),
        slug: editing?.slug || `${makeSlug(form.title)}-${Date.now().toString().slice(-6)}`,
        year: form.year ? Number(form.year) : null,
        medium: form.medium.trim() || null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        depth_cm: form.depth_cm ? Number(form.depth_cm) : null,
        description: form.description.trim() || null,
        story: form.story.trim() || null,
        category: form.category || null,
        status: form.status,
        is_featured: form.is_featured,
        is_published: form.is_published,
        sort_order: Number(form.sort_order) || 0,
      };

      let artworkId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("artworks").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("artworks").insert(payload).select("id").single();
        if (error) throw error;
        artworkId = data.id;
      }

      if (!artworkId) throw new Error("The artwork record could not be identified.");

      const { error: clearCollectionsError } = await supabase
        .from("collection_artworks").delete().eq("artwork_id", artworkId);
      if (clearCollectionsError) throw clearCollectionsError;

      if (selectedCollections.length) {
        const { error } = await supabase.from("collection_artworks").insert(
          selectedCollections.map((collection_id, index) => ({
            artwork_id: artworkId,
            collection_id,
            sort_order: index,
          }))
        );
        if (error) throw error;
      }

      for (let index = 0; index < files.length; index++) {
        const file = await prepareImageForUpload(files[index]);
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${artworkId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("artwork-images").upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) throw uploadError;

        const { data: imageData, error: imageError } = await supabase
          .from("artwork_images")
          .insert({
            artwork_id: artworkId,
            storage_path: path,
            alt_text: `${form.title} — image ${index + 1}`,
            is_primary: existingImageCount === 0 && index === 0,
            sort_order: existingImageCount + index,
          })
          .select("*")
          .single();
        if (imageError) throw imageError;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("artworks").select("*, artwork_images(*), collection_artworks(collection_id)").eq("id", artworkId).single();
      if (refreshError) throw refreshError;

      setArtworks((current) => {
        const next = current.filter((item) => item.id !== artworkId);
        return [refreshed as ArtworkRecord, ...next];
      });
      setEditing(null);
      setFormOpen(false);
      setFiles([]);
      setNotice("Artwork saved successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong while saving.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteArtwork(artwork: ArtworkRecord) {
    if (!window.confirm(`Delete “${artwork.title}” and its image records? This cannot be undone.`)) return;
    setBusy(true);
    setNotice("");
    try {
      const paths = (artwork.artwork_images ?? []).map((image) => image.storage_path);
      const { error } = await supabase.from("artworks").delete().eq("id", artwork.id);
      if (error) throw error;
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("artwork-images").remove(paths);
        if (storageError) setNotice("Artwork deleted, but one or more stored images may need manual cleanup.");
      }
      setArtworks((current) => current.filter((item) => item.id !== artwork.id));
      setNotice("Artwork deleted.");
      if (editing?.id === artwork.id) setEditing(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete this artwork.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Studio workspace</p>
          <h1 className="display mt-3 text-5xl md:text-6xl">Artwork management.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">
            Catalogue your work, organise collections and decide what appears in the public archive.
          </p>
        </div>
        <button onClick={startNew} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062]">
          + Add artwork
        </button>
      </div>

      {loadError && <p className="mt-8 border border-[#d9b7a9] bg-[#fbf2ee] p-4 text-sm text-[#8b4937]">Could not load the catalogue: {loadError}</p>}
      {notice && <p className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm text-[#625e57]">{notice}</p>}

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <div className="border border-[#e2ded6] bg-[#f7f6f2] p-5"><p className="eyebrow">Total works</p><p className="display mt-3 text-3xl">{artworks.length}</p></div>
        <div className="border border-[#e2ded6] bg-[#f7f6f2] p-5"><p className="eyebrow">Published</p><p className="display mt-3 text-3xl">{artworks.filter((item) => item.is_published).length}</p></div>
        <div className="border border-[#e2ded6] bg-[#f7f6f2] p-5"><p className="eyebrow">Available</p><p className="display mt-3 text-3xl">{artworks.filter((item) => item.status === "available").length}</p></div>
      </div>

      <div className="mt-10 flex flex-col gap-3 border-b border-[#dedad2] pb-5 sm:flex-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search artworks..." className="min-w-0 flex-1 border border-[#d9d4ca] bg-white px-4 py-3 text-sm outline-none focus:border-[#9c8062]" />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-[#d9d4ca] bg-white px-4 py-3 text-xs uppercase tracking-[.12em] outline-none">
          <option value="all">All statuses</option>
          {["draft", "available", "reserved", "sold", "not_for_sale", "study"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
      </div>

      {visibleArtworks.length ? (
        <div className="mt-5 divide-y divide-[#e2ded6]">
          {visibleArtworks.map((artwork) => {
            const cover = artwork.artwork_images?.find((image) => image.is_primary) ?? artwork.artwork_images?.[0];
            return (
              <article key={artwork.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[#e8e5de]">
                  {cover ? <Image src={imageUrl(cover.storage_path)} alt={cover.alt_text || artwork.title} fill sizes="96px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-widest text-[#89847c]">No image</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="serif text-2xl">{artwork.title}</h2>
                  <p className="mt-1 text-xs text-[#77736d]">{[artwork.year, artwork.medium].filter(Boolean).join(" · ") || "Details not added"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[9px] uppercase tracking-[.12em]">
                    <span className="bg-[#e9e5dc] px-2 py-1 text-[#625e57]">{artwork.status.replaceAll("_", " ")}</span>
                    <span className={artwork.is_published ? "bg-[#e3e9df] px-2 py-1 text-[#53664e]" : "bg-[#eeeae3] px-2 py-1 text-[#77736d]"}>{artwork.is_published ? "Published" : "Unpublished"}</span>
                    {artwork.is_featured && <span className="bg-[#eee5d9] px-2 py-1 text-[#806344]">Featured</span>}
                  </div>
                </div>
                <div className="flex gap-4 text-[10px] uppercase tracking-[.13em]">
                  <button onClick={() => startEdit(artwork)} className="text-[#806344] hover:text-[#242320]">Edit</button>
                  <button onClick={() => deleteArtwork(artwork)} disabled={busy} className="text-[#9a5a4a] hover:text-[#242320] disabled:opacity-40">Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-[#cfcac0] px-6 py-16 text-center">
          <p className="display text-3xl">{artworks.length ? "No matching works." : "Your archive starts here."}</p>
          <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#89847c]">{artworks.length ? "Try another search or status filter." : "Add your first painting to begin building your digital catalogue."}</p>
          {!artworks.length && <button onClick={startNew} className="mt-6 border border-[#242320] px-5 py-3 text-[10px] uppercase tracking-[.14em]">Add your first artwork</button>}
        </div>
      )}

      <ArtworkForm
        open={formOpen}
        editing={!!editing}
        form={form}
        collections={collections}
        selectedCollections={selectedCollections}
        files={files}
        busy={busy}
        onClose={() => { setFormOpen(false); setEditing(null); setForm(emptyForm); setFiles([]); }}
        onChange={updateField}
        onToggleCollection={toggleCollection}
        onFiles={setFiles}
        onSubmit={saveArtwork}
      />
    </section>
  );
}

function ArtworkForm({
  open, editing, form, collections, selectedCollections, files, busy,
  onClose, onChange, onToggleCollection, onFiles, onSubmit,
}: {
  open: boolean;
  editing: boolean;
  form: typeof emptyForm;
  collections: Collection[];
  selectedCollections: string[];
  files: File[];
  busy: boolean;
  onClose: () => void;
  onChange: (name: string, value: string | boolean) => void;
  onToggleCollection: (id: string) => void;
  onFiles: (files: File[]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-8">
      <div className="mx-auto my-4 max-w-4xl bg-[#f7f6f2] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#dedad2] px-6 py-5 sm:px-8">
          <div><p className="eyebrow">Studio catalogue</p><h2 className="display mt-2 text-3xl">{editing ? "Edit artwork" : "New artwork"}</h2></div>
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-widest text-[#77736d]">Close ×</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-7 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Artwork title<input required value={form.title} onChange={(e) => onChange("title", e.target.value)} className={inputClass} placeholder="Give this work a title" /></label>
            <label className={labelClass}>Year<input type="number" min="1900" max="2100" value={form.year} onChange={(e) => onChange("year", e.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Medium<input value={form.medium} onChange={(e) => onChange("medium", e.target.value)} className={inputClass} placeholder="Oil on canvas" /></label>
            <label className={labelClass}>Category<select value={form.category} onChange={(e) => onChange("category", e.target.value)} className={inputClass}><option>Painting</option><option>Drawing</option><option>Photography</option><option>Mixed media</option><option>Digital</option><option>Sculpture</option><option>Study</option></select></label>
          </div>

          <div>
            <p className={labelClass}>Dimensions (centimetres)</p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <label className="text-[10px] text-[#77736d]">Width<input type="number" min="0" step="0.1" value={form.width_cm} onChange={(e) => onChange("width_cm", e.target.value)} className={inputClass} placeholder="W" /></label>
              <label className="text-[10px] text-[#77736d]">Height<input type="number" min="0" step="0.1" value={form.height_cm} onChange={(e) => onChange("height_cm", e.target.value)} className={inputClass} placeholder="H" /></label>
              <label className="text-[10px] text-[#77736d]">Depth<input type="number" min="0" step="0.1" value={form.depth_cm} onChange={(e) => onChange("depth_cm", e.target.value)} className={inputClass} placeholder="D" /></label>
            </div>
          </div>

          <label className={labelClass}>Short description<textarea rows={3} value={form.description} onChange={(e) => onChange("description", e.target.value)} className={inputClass} placeholder="A concise description for the artwork page." /></label>
          <label className={labelClass}>Story / artist notes<textarea rows={5} value={form.story} onChange={(e) => onChange("story", e.target.value)} className={inputClass} placeholder="The thinking, context or story behind this work." /></label>

          <div>
            <p className={labelClass}>Collections</p>
            {collections.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{collections.map((collection) => <label key={collection.id} className="flex items-center gap-3 text-sm text-[#625e57]"><input type="checkbox" checked={selectedCollections.includes(collection.id)} onChange={() => onToggleCollection(collection.id)} />{collection.title}</label>)}</div> : <p className="mt-2 text-xs text-[#89847c]">No collections have been created yet. You can add these later.</p>}
          </div>

          <label className={labelClass}>Artwork photographs<input type="file" accept="image/*" multiple onChange={(e) => onFiles(Array.from(e.target.files ?? []))} className="mt-2 block w-full text-xs text-[#77736d] file:mr-4 file:border-0 file:bg-[#e9e5dc] file:px-4 file:py-3 file:text-[10px] file:uppercase file:tracking-widest" /></label>
          {files.length > 0 && <p className="text-xs text-[#77736d]">{files.length} image{files.length === 1 ? "" : "s"} selected: {files.map((file) => file.name).join(", ")}</p>}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Availability<select value={form.status} onChange={(e) => onChange("status", e.target.value)} className={inputClass}><option value="draft">Draft</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="not_for_sale">Not for sale</option><option value="study">Study</option></select></label>
            <label className={labelClass}>Display order<input type="number" value={form.sort_order} onChange={(e) => onChange("sort_order", e.target.value)} className={inputClass} /></label>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-[#dedad2] pt-5">
            <label className="flex items-center gap-2 text-xs text-[#625e57]"><input type="checkbox" checked={form.is_published} onChange={(e) => onChange("is_published", e.target.checked)} /> Publish to public archive</label>
            <label className="flex items-center gap-2 text-xs text-[#625e57]"><input type="checkbox" checked={form.is_featured} onChange={(e) => onChange("is_featured", e.target.checked)} /> Feature on homepage</label>
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#dedad2] pt-6 sm:flex-row">
            <button type="button" onClick={onClose} className="border border-[#d9d4ca] px-6 py-3 text-[10px] uppercase tracking-[.14em]">Cancel</button>
            <button disabled={busy} type="submit" className="bg-[#242320] px-7 py-3 text-[10px] uppercase tracking-[.14em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy ? "Saving..." : editing ? "Save changes" : "Create artwork"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
