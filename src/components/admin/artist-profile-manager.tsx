"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareImageForUpload } from "@/lib/image-resize";
import { errorMessage } from "@/lib/errors";

type Theme = { title: string; description: string };
type GalleryItem = { path: string; alt: string; caption?: string };
type Profile = {
  display_name: string; location: string; introduction: string;
  artist_statement: string; biography: string; themes: Theme[];
  portrait_path: string | null; gallery: GalleryItem[]; is_published: boolean;
};

const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#9c8062]";
const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
const bucket = "artwork-images";

function publicUrl(path: string) {
  return createClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export default function ArtistProfileManager({ initialProfile }: { initialProfile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [portrait, setPortrait] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(current => ({ ...current, [key]: value }));
  }

  async function upload(original: File, folder: string) {
    const file = await prepareImageForUpload(original);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `artist-profile/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false, contentType: file.type || undefined,
    });
    if (error) throw error;
    return path;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice("");
    try {
      let portraitPath = profile.portrait_path;
      if (portrait) portraitPath = await upload(portrait, "portrait");
      const gallery = [...profile.gallery];
      for (const file of galleryFiles) {
        const path = await upload(file, "gallery");
        gallery.push({ path, alt: `${profile.display_name} — studio photograph`, caption: "" });
      }
      const payload = { ...profile, portrait_path: portraitPath, gallery };
      const { error } = await supabase.from("artist_profile").upsert({ id: 1, ...payload });
      if (error) throw error;
      setProfile(payload); setPortrait(null); setGalleryFiles([]);
      setNotice("Artist profile saved.");
    } catch (error) {
      setNotice(errorMessage(error, "Could not save the profile."));
    } finally { setBusy(false); }
  }

  async function removeGalleryItem(index: number) {
    const item = profile.gallery[index];
    if (!window.confirm("Remove this image from the About page?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.storage.from(bucket).remove([item.path]);
      if (error) throw error;
      update("gallery", profile.gallery.filter((_, i) => i !== index));
      setNotice("Image removed. Save the profile to publish the change.");
    } catch (error) {
      setNotice(errorMessage(error, "Could not remove image."));
    } finally { setBusy(false); }
  }

  return <section>
    <p className="eyebrow">Website content</p>
    <h1 className="display mt-3 text-5xl md:text-6xl">Artist profile.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Manage the story visitors see on your About page. These images are independent of your artwork catalogue.</p>
    {notice && <p className="mt-6 border border-[#dedad2] bg-white p-4 text-sm">{notice}</p>}
    <form onSubmit={save} className="mt-9 space-y-10">
      <section className="grid gap-8 border-t border-[#d9d4ca] pt-7 md:grid-cols-[.65fr_1.35fr]">
        <div><p className="eyebrow">01 / Profile</p><h2 className="display mt-2 text-3xl">Introduction</h2><p className="mt-3 text-xs leading-6 text-[#89847c]">Your name, location and short introduction.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>Display name<input className={field} value={profile.display_name} onChange={e=>update("display_name",e.target.value)} required /></label>
          <label className={label}>Location<input className={field} value={profile.location} onChange={e=>update("location",e.target.value)} /></label>
          <label className={label+" sm:col-span-2"}>Short introduction<textarea rows={4} className={field} value={profile.introduction} onChange={e=>update("introduction",e.target.value)} /></label>
        </div>
      </section>
      <section className="grid gap-8 border-t border-[#d9d4ca] pt-7 md:grid-cols-[.65fr_1.35fr]">
        <div><p className="eyebrow">02 / Portrait</p><h2 className="display mt-2 text-3xl">Artist photograph</h2><p className="mt-3 text-xs leading-6 text-[#89847c]">A profile image for the About page. It will not be listed as an artwork.</p></div>
        <div>
          {profile.portrait_path && <img src={publicUrl(profile.portrait_path)} alt="Current artist portrait" className="mb-4 max-h-[420px] w-full object-cover object-center sm:w-2/3" />}
          <label className={label}>Replace portrait<input type="file" accept="image/*" className="mt-3 block w-full text-xs file:mr-4 file:border-0 file:bg-[#e9e5dc] file:px-4 file:py-3 file:text-[10px] file:uppercase file:tracking-widest" onChange={e=>setPortrait(e.target.files?.[0] ?? null)} /></label>
          {portrait && <p className="mt-2 text-xs text-[#77736d]">Selected: {portrait.name}</p>}
        </div>
      </section>
      <section className="grid gap-8 border-t border-[#d9d4ca] pt-7 md:grid-cols-[.65fr_1.35fr]">
        <div><p className="eyebrow">03 / Writing</p><h2 className="display mt-2 text-3xl">Your story</h2></div>
        <div className="space-y-5">
          <label className={label}>Artist statement<textarea rows={9} className={field} value={profile.artist_statement} onChange={e=>update("artist_statement",e.target.value)} /></label>
          <label className={label}>Biography / background<textarea rows={8} className={field} value={profile.biography} onChange={e=>update("biography",e.target.value)} /></label>
        </div>
      </section>
      <section className="grid gap-8 border-t border-[#d9d4ca] pt-7 md:grid-cols-[.65fr_1.35fr]">
        <div><p className="eyebrow">04 / Themes</p><h2 className="display mt-2 text-3xl">Areas of inquiry</h2><p className="mt-3 text-xs leading-6 text-[#89847c]">Add or edit the themes that guide your practice.</p></div>
        <div className="space-y-4">
          {profile.themes.map((theme,index)=><div key={index} className="border border-[#dedad2] bg-white p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-widest text-[#9c8062]">Theme 0{index+1}</span><button type="button" className="text-[10px] uppercase tracking-widest text-[#9a5a4a]" onClick={()=>update("themes",profile.themes.filter((_,i)=>i!==index))}>Remove</button></div>
            <input className={field} value={theme.title} placeholder="Theme title" onChange={e=>update("themes",profile.themes.map((t,i)=>i===index?{...t,title:e.target.value}:t))} />
            <textarea rows={2} className={field} value={theme.description} placeholder="Short description" onChange={e=>update("themes",profile.themes.map((t,i)=>i===index?{...t,description:e.target.value}:t))} />
          </div>)}
          <button type="button" onClick={()=>update("themes",[...profile.themes,{title:"",description:""}])} className="border border-[#cfcac0] px-4 py-3 text-[10px] uppercase tracking-widest">+ Add theme</button>
        </div>
      </section>
      <section className="grid gap-8 border-t border-[#d9d4ca] pt-7 md:grid-cols-[.65fr_1.35fr]">
        <div><p className="eyebrow">05 / Images</p><h2 className="display mt-2 text-3xl">About gallery</h2><p className="mt-3 text-xs leading-6 text-[#89847c]">Add studio, process or exhibition photographs.</p></div>
        <div>
          {profile.gallery.length>0 && <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{profile.gallery.map((item,index)=><div key={item.path} className="relative bg-white p-2"><img src={publicUrl(item.path)} alt={item.alt} className="aspect-[4/5] w-full object-cover" /><button type="button" disabled={busy} onClick={()=>removeGalleryItem(index)} className="mt-2 text-[9px] uppercase tracking-widest text-[#9a5a4a]">Remove image</button></div>)}</div>}
          <label className={label}>Upload images<input type="file" accept="image/*" multiple className="mt-3 block w-full text-xs file:mr-4 file:border-0 file:bg-[#e9e5dc] file:px-4 file:py-3 file:text-[10px] file:uppercase file:tracking-widest" onChange={e=>setGalleryFiles(Array.from(e.target.files ?? []))} /></label>
          {galleryFiles.length>0 && <p className="mt-2 text-xs text-[#77736d]">{galleryFiles.length} image(s) selected.</p>}
        </div>
      </section>
      <section className="border-t border-[#d9d4ca] pt-7">
        <p className="eyebrow">06 / Live preview</p>
        <h2 className="display mt-2 text-3xl">How the page will read</h2>
        <div className="mt-5 grid overflow-hidden border border-[#dedad2] bg-[#f7f6f2] md:grid-cols-[1fr_.8fr]">
          <div className="p-6 md:p-9">
            <p className="text-[9px] uppercase tracking-[.16em] text-[#9c8062]">The artist</p>
            <h3 className="display mt-5 text-4xl">{profile.display_name || "Your name"}</h3>
            <p className="mt-4 text-sm leading-7 text-[#77736d]">{profile.introduction || "Your introduction will appear here."}</p>
            <p className="mt-5 text-[9px] uppercase tracking-[.14em] text-[#9c8062]">Based in {profile.location || "your location"}</p>
            <div className="mt-8 border-t border-[#dedad2] pt-5"><p className="text-[9px] uppercase tracking-[.14em] text-[#9c8062]">Areas of inquiry</p>{profile.themes.slice(0,3).map((t,i)=><p key={i} className="mt-3 text-sm">{t.title || "Untitled theme"}</p>)}</div>
          </div>
          <div className="relative min-h-[260px] bg-[#e9e5dc]">
            {(portrait ? URL.createObjectURL(portrait) : profile.portrait_path ? publicUrl(profile.portrait_path) : "") && <img src={portrait ? URL.createObjectURL(portrait) : publicUrl(profile.portrait_path!)} alt="Portrait preview" className="absolute inset-0 h-full w-full object-cover" />}
          </div>
        </div>
      </section>
      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-4 border border-[#dedad2] bg-[#f7f6f2]/95 p-4 shadow-lg backdrop-blur">
        <label className="flex items-center gap-3 text-xs"><input type="checkbox" checked={profile.is_published} onChange={e=>update("is_published",e.target.checked)} className="accent-[#9c8062]" /> Make profile visible on website</label>
        <button disabled={busy} className="bg-[#242320] px-7 py-3 text-[10px] uppercase tracking-[.16em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy?"Saving...":"Save profile"}</button>
      </div>
    </form>
  </section>;
}
