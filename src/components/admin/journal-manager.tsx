"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Post = { id:string; title:string; slug:string; excerpt:string|null; content:string|null; cover_image:string|null; status:"draft"|"published"|"archived"; published_at:string|null; created_at:string };
type PostStatus = "draft" | "published" | "archived";
type JournalArtwork = { id:string; title:string; artwork_images:{storage_path:string;alt_text:string|null;is_primary:boolean;sort_order:number}[] };
type JournalForm = { title:string; slug:string; excerpt:string; content:string; cover_image:string; status:PostStatus };
const blank:JournalForm = { title:"", slug:"", excerpt:"", content:"", cover_image:"", status:"draft" };
const field = "w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const slugify = (value:string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

export default function JournalManager({initialPosts,artworks}:{initialPosts:Post[];artworks:JournalArtwork[]}) {
  const supabase=createClient();
  const [posts,setPosts]=useState(initialPosts);
  const [form,setForm]=useState<JournalForm>(blank);
  const [editing,setEditing]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [filter,setFilter]=useState("all");
  const [uploading,setUploading]=useState(false);

  function publicImage(path:string) { return supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl; }
  async function uploadImage(file:File, inline:boolean) {
    setUploading(true); setNotice("");
    const extension=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path="journal/"+crypto.randomUUID()+"."+extension;
    const {error}=await supabase.storage.from("artwork-images").upload(path,file,{contentType:file.type||undefined,upsert:false});
    if(error){setNotice(error.message);setUploading(false);return;}
    const url=publicImage(path);
    if(inline)setForm(current=>({...current,content:current.content+(current.content?"\n\n":"")+"!["+file.name.replace(/\.[^.]+$/,"")+"]("+url+")"+"\n\n"}));
    else setForm(current=>({...current,cover_image:url}));
    setNotice(inline?"Image uploaded and added to the article.":"Cover image uploaded.");
    setUploading(false);
  }
  function insertArtworkImage(id:string, inline:boolean) {
    const artwork=artworks.find(item=>item.id===id); const image=artwork?.artwork_images?.find(item=>item.is_primary)||artwork?.artwork_images?.[0];
    if(!artwork||!image)return;
    const url=publicImage(image.storage_path);
    const markdown="!["+(image.alt_text||artwork.title)+"]("+url+")";
    if(inline)setForm(current=>({...current,content:current.content+(current.content?"\n\n":"")+markdown+"\n\n"}));
    else setForm(current=>({...current,cover_image:url}));
  }
  function start(post?:Post) {
    if(post){setEditing(post.id);setForm({title:post.title,slug:post.slug,excerpt:post.excerpt||"",content:post.content||"",cover_image:post.cover_image||"",status:post.status});}
    else {setEditing(null);setForm(blank);}
    setNotice("");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setNotice("");
    const payload={title:form.title.trim(),slug:slugify(form.slug||form.title),excerpt:form.excerpt.trim()||null,content:form.content.trim()||null,cover_image:form.cover_image.trim()||null,status:form.status,published_at:form.status==="published"?(posts.find(p=>p.id===editing)?.published_at||new Date().toISOString()):null};
    const result=editing?await supabase.from("journal_posts").update(payload).eq("id",editing).select().single():await supabase.from("journal_posts").insert(payload).select().single();
    if(result.error){setNotice(result.error.message);}
    else {setPosts(old=>editing?old.map(p=>p.id===editing?result.data as Post:p):[result.data as Post,...old]);setNotice("Journal post saved.");setEditing(null);setForm(blank);}
    setBusy(false);
  }
  async function remove(post:Post) {
    if(!window.confirm(`Delete “${post.title}”? This cannot be undone.`))return;
    const {error}=await supabase.from("journal_posts").delete().eq("id",post.id);
    if(error)setNotice(error.message);else{setPosts(old=>old.filter(p=>p.id!==post.id));if(editing===post.id)start();setNotice("Post deleted.");}
  }
  const shown=posts.filter(p=>filter==="all"||p.status===filter);
  return <section>
    <p className="eyebrow">Studio workspace</p><h1 className="display mt-3 text-5xl md:text-6xl">Journal.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Publish studio notes, artwork stories, research and reflections from your creative practice.</p>
    {notice&&<p role="status" className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm">{notice}</p>}
    <form onSubmit={save} className="mt-9 border border-[#dedad2] bg-[#f7f6f2] p-5 md:p-7">
      <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">{editing?"Edit article":"New article"}</p><h2 className="display mt-2 text-2xl">{editing?"Update journal post":"Write for the journal"}</h2></div>{editing&&<button type="button" onClick={()=>start()} className="text-xs underline">Cancel edit</button>}</div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-[10px] uppercase tracking-[.14em] text-[#77736d]">Title<input required maxLength={180} className={field+" mt-2"} value={form.title} onChange={e=>setForm({...form,title:e.target.value,slug:editing?form.slug:slugify(e.target.value)})}/></label>
        <label className="text-[10px] uppercase tracking-[.14em] text-[#77736d]">URL slug<input required className={field+" mt-2"} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></label>
        <label className="text-[10px] uppercase tracking-[.14em] text-[#77736d] md:col-span-2">Short introduction<textarea rows={2} maxLength={400} className={field+" mt-2"} value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/></label>
        <div className="md:col-span-2 border border-[#dedad2] bg-white p-4">
          <p className="text-[10px] uppercase tracking-[.14em] text-[#77736d]">Cover image</p>
          <input type="url" className={field+" mt-2"} placeholder="Paste a direct image URL (not an artwork webpage URL)" value={form.cover_image} onChange={e=>setForm({...form,cover_image:e.target.value})}/>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer border border-[#d9d4ca] px-4 py-2 text-xs">Upload cover<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file,false);e.currentTarget.value="";}}/></label>
            <select aria-label="Choose artwork as cover image" className={field+" w-auto flex-1"} defaultValue="" onChange={e=>{if(e.target.value)insertArtworkImage(e.target.value,false);e.target.value="";}}>
              <option value="">Use an existing artwork image...</option>
              {artworks.filter(a=>a.artwork_images?.length).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          {form.cover_image&&<img src={form.cover_image} alt="Cover preview" className="mt-4 max-h-48 max-w-full object-contain"/>}
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] uppercase tracking-[.14em] text-[#77736d]">Article content</label>
          <p className="mt-1 text-xs text-[#89847c]">Write normally. Separate paragraphs with a blank line. Images can be inserted between paragraphs.</p>
          <textarea required rows={14} className={field+" mt-2 leading-7"} placeholder="Write your article here. Separate paragraphs with a blank line." value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer border border-[#d9d4ca] bg-white px-4 py-2 text-xs">{uploading?"Uploading...":"Upload inline image"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file,true);e.currentTarget.value="";}}/></label>
            <select aria-label="Insert artwork image into article" className={field+" w-auto flex-1"} defaultValue="" onChange={e=>{if(e.target.value)insertArtworkImage(e.target.value,true);e.target.value="";}}>
              <option value="">Insert an existing artwork image...</option>
              {artworks.filter(a=>a.artwork_images?.length).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
        </div>
        <label className="text-[10px] uppercase tracking-[.14em] text-[#77736d]">Publishing status<select className={field+" mt-2"} value={form.status} onChange={e=>setForm({...form,status:e.target.value as PostStatus})}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      </div>
      <button disabled={busy} className="mt-5 bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white disabled:opacity-50">{busy?"Saving...":editing?"Save changes":"Save article"}</button>
    </form>
    <div className="mt-12 flex items-center justify-between gap-4 border-b border-[#dedad2] pb-4"><p className="eyebrow">{shown.length} posts</p><select aria-label="Filter journal posts" className={field+" w-auto"} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All posts</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
    <div className="divide-y divide-[#e2ded6]">{shown.map(post=><article key={post.id} className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.14em] text-[#9c8062]">{post.status} · {post.slug}</p><h3 className="display mt-1 text-2xl">{post.title}</h3><p className="mt-1 line-clamp-2 text-xs text-[#77736d]">{post.excerpt}</p></div><div className="flex shrink-0 gap-4 text-xs"><button onClick={()=>start(post)} className="underline underline-offset-4">Edit</button><button onClick={()=>remove(post)} className="text-[#9a5548] underline underline-offset-4">Delete</button>{post.status==="published"&&<a href={`/journal/${post.slug}`} target="_blank" className="underline underline-offset-4">View ↗</a>}</div></article>)}</div>
    {!shown.length&&<p className="py-12 text-center text-sm text-[#89847c]">No posts in this category yet.</p>}
  </section>;
}
