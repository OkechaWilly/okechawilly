"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Artwork = { id: string; title: string; year: number | null };
type ProductImage = { id: string; storage_path: string; is_primary: boolean; sort_order: number };
type Product = {
  id: string; title: string; slug: string; product_type: string; description: string | null;
  price: number | null; currency: string; artwork_id: string | null; edition_size: number | null;
  edition_sold: number; sku: string | null; stock_quantity: number | null; track_inventory: boolean;
  options: string[]; status: string; is_published: boolean; product_images: ProductImage[];
};
const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
const types = [
  { value: "original", label: "Original painting" },
  { value: "limited_print", label: "Limited-edition print" },
  { value: "open_print", label: "Open-edition print" },
  { value: "merchandise", label: "Merchandise" },
  { value: "art_object", label: "Art object" },
];

export default function ProductManager({ initialProducts, artworks }: { initialProducts: Product[]; artworks: Artwork[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("original");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [artworkId, setArtworkId] = useState("");
  const [editionSize, setEditionSize] = useState("");
  const [editionSold, setEditionSold] = useState("0");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [options, setOptions] = useState("");
  const [status, setStatus] = useState("draft");
  const [published, setPublished] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function reset() {
    setEditing(null); setTitle(""); setSlug(""); setType("original"); setDescription("");
    setPrice(""); setCurrency("UGX"); setArtworkId(""); setEditionSize(""); setEditionSold("0");
    setSku(""); setStock(""); setTrackInventory(true); setOptions(""); setStatus("draft");
    setPublished(false); setImage(null); setOpen(false);
  }
  function createNew() { reset(); setNotice(""); setOpen(true); }
  function edit(item: Product) {
    setEditing(item); setTitle(item.title); setSlug(item.slug); setType(item.product_type);
    setDescription(item.description || ""); setPrice(item.price == null ? "" : String(item.price));
    setCurrency(item.currency || "UGX"); setArtworkId(item.artwork_id || "");
    setEditionSize(item.edition_size == null ? "" : String(item.edition_size));
    setEditionSold(String(item.edition_sold ?? 0)); setSku(item.sku || "");
    setStock(item.stock_quantity == null ? "" : String(item.stock_quantity));
    setTrackInventory(item.track_inventory); setOptions((item.options || []).join(", "));
    setStatus(item.status); setPublished(item.is_published); setImage(null); setNotice(""); setOpen(true);
  }
  const publicUrl = (path: string) => supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { setNotice("Please enter a product title."); return; }
    if (type === "limited_print" && (!editionSize || Number(editionSize) < 1)) { setNotice("Enter a valid edition size for a limited print."); return; }
    setBusy(true); setNotice("");
    try {
      const payload = {
        title: title.trim(), slug: slugify(slug || title), product_type: type,
        description: description.trim() || null, price: price ? Number(price) : null, currency,
        artwork_id: artworkId || null,
        edition_size: type === "limited_print" ? Number(editionSize) : null,
        edition_sold: type === "limited_print" ? Number(editionSold || 0) : 0,
        sku: sku.trim() || null,
        stock_quantity: trackInventory && stock !== "" ? Number(stock) : null,
        track_inventory: trackInventory,
        options: options.split(",").map((v) => v.trim()).filter(Boolean),
        status, is_published: published,
      };
      let id = editing?.id;
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (!id) throw new Error("Product could not be identified.");
      let images = editing?.product_images || [];
      if (image) {
        const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `products/${id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(path, image, { contentType: image.type || undefined });
        if (uploadError) throw uploadError;
        const { error: imageError } = await supabase.from("product_images").insert({ product_id: id, storage_path: path, alt_text: title.trim(), is_primary: images.length === 0, sort_order: images.length });
        if (imageError) throw imageError;
        images = [...images, { id: crypto.randomUUID(), storage_path: path, is_primary: images.length === 0, sort_order: images.length }];
      }
      const updated: Product = { id, ...payload, product_images: images };
      setProducts((current) => [updated, ...current.filter((item) => item.id !== id)]);
      reset(); setNotice("Product saved successfully. Checkout remains disabled.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this product.");
    } finally { setBusy(false); }
  }

  async function remove(item: Product) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusy(true); setNotice("");
    try {
      for (const img of item.product_images || []) await supabase.storage.from("product-images").remove([img.storage_path]);
      const { error } = await supabase.from("products").delete().eq("id", item.id);
      if (error) throw error;
      setProducts((current) => current.filter((entry) => entry.id !== item.id));
      setNotice("Product deleted.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this product."); }
    finally { setBusy(false); }
  }

  return <section>
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div><p className="eyebrow">Studio workspace</p><h1 className="display mt-3 text-5xl md:text-6xl">Shop products.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">Manage the works and objects available to collectors. Products can be prepared and published before online checkout is enabled.</p></div>
      <button onClick={createNew} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] text-white hover:bg-[#9c8062]">+ New product</button>
    </div>
    {notice && <p className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm text-[#625e57]">{notice}</p>}
    {open && <form onSubmit={save} className="mt-10 border border-[#dedad2] bg-[#f7f6f2] p-5 md:p-8">
      <div className="flex items-center justify-between gap-4"><h2 className="display text-3xl">{editing ? "Edit product" : "Add a product"}</h2><button type="button" onClick={reset} className="text-xs underline underline-offset-4">Close</button></div>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className={label}>Product title<input className={field} value={title} onChange={(e) => { setTitle(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} placeholder="Title of the work or product" required /></label>
        <label className={label}>URL slug<input className={field} value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
        <label className={label}>Product type<select className={field} value={type} onChange={(e) => setType(e.target.value)}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className={label}>Linked artwork<select className={field} value={artworkId} onChange={(e) => setArtworkId(e.target.value)}><option value="">No linked artwork</option>{artworks.map((a) => <option key={a.id} value={a.id}>{a.title}{a.year ? ` (${a.year})` : ""}</option>)}</select></label>
        <label className={label}>Price<input className={field} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></label>
        <label className={label}>Currency<select className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="UGX">UGX — Ugandan Shilling</option><option value="USD">USD — US Dollar</option></select></label>
        {type === "limited_print" && <><label className={label}>Edition size<input className={field} type="number" min="1" value={editionSize} onChange={(e) => setEditionSize(e.target.value)} required /></label><label className={label}>Already sold<input className={field} type="number" min="0" value={editionSold} onChange={(e) => setEditionSold(e.target.value)} /></label></>}
        <label className={label}>SKU / reference<input className={field} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional product code" /></label>
        <label className={label}>Stock quantity<input className={field} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Leave blank if not tracked" /></label>
        <label className={label + " md:col-span-2"}>Description<textarea className={field + " min-h-28"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the product for collectors." /></label>
        <label className={label}>Product image<input className={field} type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />{editing?.product_images?.length ? <span className="mt-2 block text-[10px] normal-case tracking-normal text-[#89847c]">{editing.product_images.length} image(s) uploaded. Add another image here.</span> : null}</label>
        <label className={label}>Options / variants<input className={field} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="e.g. Small, Medium, Large" /><span className="mt-1 block text-[9px] normal-case tracking-normal text-[#89847c]">Separate options with commas. Useful for sizes or finishes.</span></label>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-5 border-t border-[#dedad2] pt-6">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={trackInventory} onChange={(e) => setTrackInventory(e.target.checked)} className="accent-[#9c8062]" /> Track inventory</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-[#9c8062]" /> Publish on website</label>
        <label className={label + " flex items-center gap-2"}>Status<select className="ml-2 border border-[#d9d4ca] bg-white px-3 py-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option><option value="sold_out">Sold out</option></select></label>
        <button disabled={busy} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] text-white disabled:opacity-50">{busy ? "Saving..." : "Save product"}</button>
        <button type="button" onClick={reset} className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Cancel</button>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-[#89847c]">Publishing makes the product visible in the catalogue when the public shop is connected. This does not activate payment or checkout.</p>
    </form>}
    <div className="mt-10 flex items-center justify-between border-b border-[#dedad2] pb-4"><p className="eyebrow">{products.length} products</p><p className="text-[10px] uppercase tracking-[.12em] text-[#89847c]">Catalogue management</p></div>
    {products.length ? <div className="mt-3 divide-y divide-[#e2ded6]">{products.map((item, index) => {
      const cover = item.product_images?.find((img) => img.is_primary) || item.product_images?.[0];
      const typeLabel = types.find((t) => t.value === item.product_type)?.label || item.product_type;
      return <article key={item.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
        <div className="h-24 w-32 shrink-0 overflow-hidden bg-[#e8e5de]">{cover ? <img src={publicUrl(cover.storage_path)} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-widest text-[#89847c]">No image</div>}</div>
        <div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[.15em] text-[#9c8062]">0{index + 1} / {item.is_published ? "Published" : "Draft"} · {typeLabel}</p><h2 className="serif mt-2 text-2xl">{item.title}</h2><p className="mt-1 text-xs text-[#89847c]">{item.price == null ? "Price not set" : new Intl.NumberFormat("en-UG", { style: "currency", currency: item.currency || "UGX", maximumFractionDigits: 0 }).format(Number(item.price))} · {item.status.replace("_", " ")}</p>{item.product_type === "limited_print" && <p className="mt-1 text-[10px] text-[#89847c]">Edition: {item.edition_sold} / {item.edition_size}</p>}</div>
        <div className="flex gap-4 text-[10px] uppercase tracking-[.12em]"><button onClick={() => edit(item)} className="underline underline-offset-4">Edit</button><button disabled={busy} onClick={() => remove(item)} className="text-[#9b5947] underline underline-offset-4">Delete</button></div>
      </article>;
    })}</div> : <div className="mt-8 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-14 text-center"><p className="display text-2xl">Your product catalogue starts here.</p><p className="mt-3 text-xs text-[#89847c]">Add an original painting, a print edition, or an object featuring your artwork.</p></div>}
    <p className="mt-8 border-t border-[#dedad2] pt-5 text-[10px] leading-5 text-[#89847c]">Checkout is not connected. Publishing products here does not accept orders or payments.</p>
  </section>;
}
