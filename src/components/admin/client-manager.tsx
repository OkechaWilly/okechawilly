"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { prepareImageForUpload } from "@/lib/image-resize";
import { errorMessage } from "@/lib/errors";

type Client = { id:string; name:string; slug:string; description:string|null; logo_path:string|null; website_url:string|null; sort_order:number; is_featured:boolean; is_published:boolean };
const field="mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const label="block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
const slugify=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"client";

export default function ClientManager({initialClients}:{initialClients:Client[]}) {
 const supabase=useMemo(()=>createClient(),[]);
 const [items,setItems]=useState(initialClients),[editing,setEditing]=useState<Client|null>(null);
 const [name,setName]=useState(""),[slug,setSlug]=useState(""),[description,setDescription]=useState(""),[url,setUrl]=useState(""),[order,setOrder]=useState("0"),[featured,setFeatured]=useState(false),[published,setPublished]=useState(false),[logo,setLogo]=useState<File|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 function reset(){setEditing(null);setName("");setSlug("");setDescription("");setUrl("");setOrder("0");setFeatured(false);setPublished(false);setLogo(null);}
 function edit(c:Client){setEditing(c);setName(c.name);setSlug(c.slug);setDescription(c.description||"");setUrl(c.website_url||"");setOrder(String(c.sort_order));setFeatured(c.is_featured);setPublished(c.is_published);setLogo(null);setNotice("");}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice("");try{
  const payload={name:name.trim(),slug:slugify(slug||name),description:description.trim()||null,website_url:url.trim()||null,sort_order:Number(order)||0,is_featured:featured,is_published:published};
  let id=editing?.id,logoPath=editing?.logo_path||null;
  if(editing){const {error}=await supabase.from("clients").update(payload).eq("id",editing.id);if(error)throw error;}
  else {const {data,error}=await supabase.from("clients").insert(payload).select("id").single();if(error)throw error;id=data.id;}
  if(logo&&id){const file=await prepareImageForUpload(logo);const ext=file.name.split(".").pop()?.toLowerCase()||"png";const path="clients/"+id+"/"+crypto.randomUUID()+"."+ext;const {error}=await supabase.storage.from("artwork-images").upload(path,file,{contentType:file.type||undefined});if(error)throw error;logoPath=path;const {error:updateError}=await supabase.from("clients").update({logo_path:path}).eq("id",id);if(updateError)throw updateError;}
  if(!id)throw new Error("Client record could not be identified.");
  const item:Client={id,...payload,logo_path:logoPath};setItems(old=>[item,...old.filter(x=>x.id!==id)].sort((a,b)=>a.sort_order-b.sort_order));reset();setNotice("Client saved. It will appear publicly when published.");
 }catch(err){setNotice(errorMessage(err,"Could not save this client."));}finally{setBusy(false);}}
 async function remove(c:Client){if(!window.confirm("Delete "+c.name+"? Project records will remain, without a linked client."))return;setBusy(true);try{const {error}=await supabase.from("clients").delete().eq("id",c.id);if(error)throw error;setItems(old=>old.filter(x=>x.id!==c.id));setNotice("Client deleted.");}catch(err){setNotice(errorMessage(err,"Could not delete client."));}finally{setBusy(false);}}
 const image=(path:string)=>supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
 return <section><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Studio workspace</p><h1 className="display mt-3 text-5xl md:text-6xl">Clients.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[#77736d]">Manage the organisations, people and collaborators whose work has formed part of your creative practice. Logos are optional and can be added whenever ready.</p></div><button type="button" onClick={()=>{reset();setNotice("");}} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.15em] text-white">+ Add client</button></div>
 {notice&&<p role="status" className="mt-6 border border-[#dedad2] bg-white p-4 text-sm">{notice}</p>}
 <form onSubmit={save} className="mt-8 border border-[#dedad2] bg-[#f7f6f2] p-5 md:p-7"><div className="flex items-center justify-between"><h2 className="display text-3xl">{editing?"Edit client":"New client or collaborator"}</h2>{editing&&<button type="button" onClick={reset} className="text-xs underline">Cancel</button>}</div>
 <div className="mt-6 grid gap-5 md:grid-cols-2">
 <label className={label}>Name<input required maxLength={160} className={field} value={name} onChange={e=>{setName(e.target.value);if(!editing)setSlug(slugify(e.target.value));}} placeholder="Organisation or collaborator"/></label>
 <label className={label}>URL slug<input required className={field} value={slug} onChange={e=>setSlug(e.target.value)} placeholder="client-name"/></label>
 <label className={label+" md:col-span-2"}>Short description<textarea rows={2} className={field} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional context about the collaboration."/></label>
 <label className={label}>Website (optional)<input type="url" className={field} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://"/></label>
 <label className={label}>Logo (optional)<input type="file" accept="image/png,image/jpeg,image/webp" className={field} onChange={e=>setLogo(e.target.files?.[0]||null)}/><span className="mt-1 block text-[10px] normal-case tracking-normal text-[#89847c]">You can add approved logos later.</span></label>
 <label className={label}>Display order<input type="number" className={field} value={order} onChange={e=>setOrder(e.target.value)}/></label>
 </div><div className="mt-6 flex flex-wrap gap-6 border-t border-[#dedad2] pt-5 text-xs"><label className="flex gap-2"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Feature on website</label><label className="flex gap-2"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish</label></div><button disabled={busy} className="mt-6 bg-[#242320] px-7 py-3 text-[10px] uppercase tracking-[.15em] text-white disabled:opacity-50">{busy?"Saving...":"Save client"}</button></form>
 <div className="mt-10 border-b border-[#dedad2] pb-4"><p className="eyebrow">{items.length} clients and collaborators</p></div>
 <div className="mt-3 divide-y divide-[#e2ded6]">{items.map(c=><article key={c.id} className="flex flex-wrap items-center gap-4 py-5"><div className="relative flex h-16 w-24 items-center justify-center overflow-hidden bg-[#f1efe9]">{c.logo_path?<Image src={image(c.logo_path)} alt={c.name+" logo"} fill sizes="96px" className="object-contain p-2"/>:<span className="serif text-2xl text-[#aaa49a]">{c.name.slice(0,1)}</span>}</div><div className="min-w-0 flex-1"><h3 className="serif text-2xl">{c.name}</h3><p className="mt-1 text-[10px] uppercase tracking-widest text-[#89847c]">{c.is_published?"Published":"Draft"} · {c.is_featured?"Featured":"Not featured"}</p></div><div className="flex gap-4 text-[10px] uppercase tracking-widest"><button type="button" onClick={()=>edit(c)} className="underline">Edit</button><button type="button" disabled={busy} onClick={()=>remove(c)} className="text-[#9b5947] underline">Delete</button></div></article>)}</div>
 </section>;
}
