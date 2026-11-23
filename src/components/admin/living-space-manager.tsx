"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareImageForUpload } from "@/lib/image-resize";
import { errorMessage } from "@/lib/errors";

type Photo = {
  id: string; title: string; caption: string | null; location: string | null;
  storage_path: string; alt_text: string; sort_order: number;
  is_featured: boolean; is_published: boolean; created_at: string;
  image_url: string;
};
const bucket = "living-space-images";
const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";

export default function LivingSpaceManager({ initialPhotos, loadError }: { initialPhotos: Photo[]; loadError: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [photos, setPhotos] = useState(initialPhotos);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function reset() {
    setEditing(null); setTitle(""); setCaption(""); setLocation(""); setAlt("");
    setFile(null); setFeatured(false); setPublished(false);
  }
  function edit(photo: Photo) {
    setEditing(photo); setTitle(photo.title); setCaption(photo.caption ?? "");
    setLocation(photo.location ?? ""); setAlt(photo.alt_text);
    setFeatured(photo.is_featured); setPublished(photo.is_published); setFile(null);
    setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing && !file) { setNotice("Choose a photograph to upload."); return; }
    setBusy(true); setNotice("");
    let uploadedPath: string | null = null;
    let recordSaved = false;
    try {
      let storagePath = editing?.storage_path ?? "";
      if (file) {
        const prepared = await prepareImageForUpload(file);
        const extension = prepared.name.split(".").pop()?.toLowerCase() || "jpg";
        uploadedPath = `living-spaces/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(bucket).upload(uploadedPath, prepared, {
          upsert: false, contentType: prepared.type || undefined, cacheControl: "3600",
        });
        if (error) throw error;
        storagePath = uploadedPath;
      }
      const payload = {
        title: title.trim(), caption: caption.trim() || null,
        location: location.trim() || null, alt_text: alt.trim(),
        storage_path: storagePath, is_featured: featured, is_published: published,
        sort_order: editing?.sort_order ?? photos.length,
      };
      const query = editing
        ? supabase.from("living_space_photos").update(payload).eq("id", editing.id)
        : supabase.from("living_space_photos").insert(payload);
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      recordSaved = true;

      const { data: signed, error: signError } = await supabase.storage
        .from(bucket).createSignedUrl(storagePath, 4 * 60 * 60);
      const savedPhoto = { ...(data as Omit<Photo, "image_url">), image_url: signed?.signedUrl ?? "" } as Photo;

      if (editing && file && editing.storage_path) {
        const { error: removeError } = await supabase.storage.from(bucket).remove([editing.storage_path]);
        if (removeError) setNotice("Saved, but the previous image may need manual storage cleanup.");
      }
      setPhotos(current => {
        const next = current.filter(item => item.id !== savedPhoto.id);
        return [...next, savedPhoto].sort((a,b) => a.sort_order-b.sort_order);
      });
      reset();
      setNotice(signError ? "Photograph saved. Refresh the page if its preview does not appear." : "Photograph saved.");
    } catch (error) {
      if (uploadedPath && !recordSaved) await supabase.storage.from(bucket).remove([uploadedPath]);
      setNotice(errorMessage(error, "Could not save this photograph."));
    } finally { setBusy(false); }
  }

  async function toggle(photo: Photo, key: "is_published" | "is_featured") {
    setBusy(true); setNotice("");
    try {
      const { error } = await supabase.from("living_space_photos").update({ [key]: !photo[key] }).eq("id", photo.id);
      if (error) throw error;
      setPhotos(current => current.map(item => item.id === photo.id ? { ...item, [key]: !photo[key] } : item));
    } catch (error) { setNotice(errorMessage(error, "Could not update this photograph.")); }
    finally { setBusy(false); }
  }

  async function move(photo: Photo, direction: -1 | 1) {
    const index = photos.findIndex(item => item.id === photo.id);
    const target = index + direction;
    if (target < 0 || target >= photos.length || busy) return;
    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const updates = reordered.map((item, order) => ({ ...item, sort_order: order }));
    setBusy(true); setNotice("");
    try {
      for (const item of updates) {
        const { error } = await supabase.from("living_space_photos").update({ sort_order: item.sort_order }).eq("id", item.id);
        if (error) throw error;
      }
      setPhotos(updates);
    } catch (error) { setNotice(errorMessage(error, "Could not reorder photographs. Refresh and try again.")); }
    finally { setBusy(false); }
  }

  async function remove(photo: Photo) {
    if (!window.confirm(`Delete “${photo.title}” and its photograph? This cannot be undone.`)) return;
    setBusy(true); setNotice("");
    try {
      const { error } = await supabase.from("living_space_photos").delete().eq("id", photo.id);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from(bucket).remove([photo.storage_path]);
      setPhotos(current => current.filter(item => item.id !== photo.id));
      setNotice(storageError ? "Record deleted; the image file may need manual cleanup." : "Photograph deleted.");
      if (editing?.id === photo.id) reset();
    } catch (error) { setNotice(errorMessage(error, "Could not delete this photograph.")); }
    finally { setBusy(false); }
  }

  return <section>
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="eyebrow">Studio workspace</p><h1 className="display mt-3 text-5xl md:text-6xl">Art in living spaces.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Manage photographs showing your artwork in collectors’ homes. Only published photographs appear in the public contact-page showcase.</p></div>
      <button type="button" onClick={() => { reset(); setNotice(""); }} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.15em] !text-white">+ Add photograph</button>
    </div>
    {loadError && <p className="mt-7 border border-[#d9b7a9] bg-[#fbf2ee] p-4 text-sm text-[#8b4937]">Could not load gallery: {loadError}</p>}
    {notice && <p role="status" className="mt-6 border border-[#dedad2] bg-white p-4 text-sm text-[#625e57]">{notice}</p>}

    <form onSubmit={save} className="mt-9 border border-[#dedad2] bg-[#f7f6f2] p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">{editing ? "Edit entry" : "New entry"}</p><h2 className="display mt-2 text-3xl">{editing ? "Update photograph" : "Add to the showcase."}</h2></div>
        {editing && <button type="button" onClick={reset} className="text-[10px] uppercase tracking-widest text-[#77736d]">Cancel edit ×</button>}</div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className={label}>Photograph title<input required maxLength={160} className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Artwork title or installation name" /></label>
        <label className={label}>Location (optional)<input maxLength={120} className={field} value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Kampala, Uganda" /></label>
        <label className={label+" md:col-span-2"}>Caption<textarea rows={2} maxLength={500} className={field} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="A short note about the artwork in this space." /></label>
        <label className={label+" md:col-span-2"}>Image description for accessibility<input required maxLength={250} className={field} value={alt} onChange={e=>setAlt(e.target.value)} placeholder="Describe the artwork and its setting" /></label>
        <label className={label+" md:col-span-2"}>{editing ? "Replace photograph (optional)" : "Photograph"}<input type="file" required={!editing} accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs file:mr-4 file:border-0 file:bg-[#e9e5dc] file:px-4 file:py-3 file:text-[10px] file:uppercase file:tracking-widest" /><span className="mt-2 block text-[10px] normal-case tracking-normal text-[#89847c]">JPG, PNG or WebP · maximum 20 MB before optimization</span></label>
      </div>
      <div className="mt-6 flex flex-wrap gap-6 border-t border-[#dedad2] pt-5">
        <label className="flex items-center gap-2 text-xs text-[#625e57]"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)} /> Featured photograph</label>
        <label className="flex items-center gap-2 text-xs text-[#625e57]"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)} /> Publish on contact page</label>
      </div>
      <button disabled={busy} className="mt-6 bg-[#242320] px-7 py-3 text-[10px] uppercase tracking-[.15em] !text-white disabled:opacity-50">{busy ? "Saving..." : editing ? "Save changes" : "Upload photograph"}</button>
    </form>

    <div className="mt-12 flex items-end justify-between border-b border-[#dedad2] pb-4"><div><p className="eyebrow">Your collection</p><h2 className="display mt-2 text-3xl">{photos.length} photograph{photos.length===1?"":"s"}</h2></div><p className="text-[10px] uppercase tracking-widest text-[#89847c]">{photos.filter(p=>p.is_published).length} published</p></div>
    {photos.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {photos.map((photo,index)=><article key={photo.id} className="border border-[#dedad2] bg-[#f7f6f2] p-3">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#e8e5de]">{photo.image_url ? <Image src={photo.image_url} alt={photo.alt_text} fill sizes="(min-width:1280px) 30vw, (min-width:640px) 45vw, 100vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#89847c]">Preview unavailable · refresh page</div>}</div>
        <div className="p-2"><h3 className="serif text-2xl">{photo.title}</h3><p className="mt-1 text-xs text-[#77736d]">{photo.location || "Location not specified"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[9px] uppercase tracking-widest"><span className={photo.is_published?"bg-[#e3e9df] px-2 py-1 text-[#53664e]":"bg-[#eeeae3] px-2 py-1 text-[#77736d]"}>{photo.is_published?"Published":"Draft"}</span>{photo.is_featured&&<span className="bg-[#eee5d9] px-2 py-1 text-[#806344]">Featured</span>}</div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[#dedad2] pt-3 text-[9px] uppercase tracking-widest">
            <button type="button" disabled={busy||index===0} onClick={()=>move(photo,-1)} className="disabled:opacity-30">↑ Move up</button>
            <button type="button" disabled={busy||index===photos.length-1} onClick={()=>move(photo,1)} className="disabled:opacity-30">↓ Move down</button>
            <button type="button" onClick={()=>edit(photo)} className="text-[#806344]">Edit</button>
            <button type="button" disabled={busy} onClick={()=>toggle(photo,"is_published")} className="disabled:opacity-40">{photo.is_published?"Unpublish":"Publish"}</button>
            <button type="button" disabled={busy} onClick={()=>remove(photo)} className="text-[#9a5a4a] disabled:opacity-40">Delete</button>
          </div>
        </div>
      </article>)}
    </div> : <div className="mt-5 border border-dashed border-[#cfcac0] px-6 py-16 text-center"><p className="display text-3xl">Your showcase starts here.</p><p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#89847c]">Upload your first photograph when you have an artwork installation to share. Drafts stay private until you publish them.</p></div>}
  </section>;
}
