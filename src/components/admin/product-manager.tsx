"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { prepareImageForUpload } from "@/lib/image-resize";

type Artwork = { id: string; title: string; year: number | null };
type ProductVariant = { id?: string; label: string; size: string; finish: string; price: string; currency: string; stock_quantity: string; is_available: boolean };
type ProductImage = { id: string; storage_path: string; is_primary: boolean; sort_order: number; alt_text?: string | null };
type Product = {
  id: string; title: string; slug: string; product_type: string; description: string | null;
  price: number | null; currency: string; artwork_id: string | null; edition_size: number | null;
  edition_sold: number; sku: string | null; stock_quantity: number | null; track_inventory: boolean;
  options: string[]; product_variants?: ProductVariant[]; medium: string | null; materials: string | null; dimensions: string | null; framing: string | null; shipping_information: string | null; status: string; is_published: boolean; product_images: ProductImage[];
};
const field = "mt-2 w-full border border-[#d9d4ca] bg-white px-3 py-3 text-sm outline-none focus:border-[#9c8062]";
const label = "block text-[10px] uppercase tracking-[.14em] text-[#77736d]";
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
const types = [
  { value: "original", label: "Original painting" },
  { value: "limited_print", label: "Limited-edition print" },
  { value: "open_print", label: "Open-edition print" },
  { value: "wearable", label: "Wearable (t-shirt, clothing)" },
  { value: "merchandise", label: "Object / merchandise" },
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
  const [medium, setMedium] = useState("");
  const [materials, setMaterials] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [framing, setFraming] = useState("");
  const [shippingInformation, setShippingInformation] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [artworkId, setArtworkId] = useState("");
  const [editionSize, setEditionSize] = useState("");
  const [editionSold, setEditionSold] = useState("0");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [options, setOptions] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [status, setStatus] = useState("draft");
  const [published, setPublished] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function reset() {
    setEditing(null); setTitle(""); setSlug(""); setType("original"); setDescription(""); setMedium(""); setMaterials(""); setDimensions(""); setFraming(""); setShippingInformation("");
    setPrice(""); setCurrency("UGX"); setArtworkId(""); setEditionSize(""); setEditionSold("0");
    setSku(""); setStock(""); setTrackInventory(true); setOptions(""); setStatus("draft");
    setPublished(false); setImageFiles([]); setVariants([]); setOpen(false);
  }
  function createNew() { reset(); setNotice(""); setOpen(true); }
  function edit(item: Product) {
    setEditing(item); setTitle(item.title); setSlug(item.slug); setType(item.product_type);
    setDescription(item.description || ""); setMedium(item.medium || ""); setMaterials(item.materials || ""); setDimensions(item.dimensions || ""); setFraming(item.framing || ""); setShippingInformation(item.shipping_information || ""); setPrice(item.price == null ? "" : String(item.price));
    setCurrency(item.currency || "UGX"); setArtworkId(item.artwork_id || "");
    setEditionSize(item.edition_size == null ? "" : String(item.edition_size));
    setEditionSold(String(item.edition_sold ?? 0)); setSku(item.sku || "");
    setStock(item.stock_quantity == null ? "" : String(item.stock_quantity));
    setTrackInventory(item.track_inventory); setOptions((item.options || []).join(", "));
    setVariants((item.product_variants || []).map((v) => ({ id: v.id, label: v.label, size: v.size || "", finish: v.finish || "", price: String(v.price ?? ""), currency: v.currency || item.currency || "UGX", stock_quantity: v.stock_quantity == null ? "" : String(v.stock_quantity), is_available: v.is_available !== false })));
    setStatus(item.status); setPublished(item.is_published); setImageFiles([]); setNotice(""); setOpen(true);
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
        description: description.trim() || null, medium: medium.trim() || null, materials: materials.trim() || null, dimensions: dimensions.trim() || null, framing: framing.trim() || null, shipping_information: shippingInformation.trim() || null, price: price ? Number(price) : null, currency,
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
      if (type === "limited_print" || type === "open_print") {
        const cleanVariants = variants.filter((v) => v.label.trim() && v.price !== "" && Number.isFinite(Number(v.price)) && Number(v.price) >= 0);
        if (cleanVariants.length !== variants.filter((v) => v.label.trim() || v.size.trim() || v.finish.trim() || v.price !== "").length) throw new Error("Complete each print option with a label and valid price, or remove the empty row.");
        const { error: clearVariantsError } = await supabase.from("product_variants").delete().eq("product_id", id);
        if (clearVariantsError) throw clearVariantsError;
        if (cleanVariants.length) {
          const { error: variantsError } = await supabase.from("product_variants").insert(cleanVariants.map((v, index) => ({ product_id: id, label: v.label.trim(), size: v.size.trim() || null, finish: v.finish.trim() || null, price: Number(v.price), currency: v.currency || currency, stock_quantity: v.stock_quantity === "" ? null : Number(v.stock_quantity), is_available: v.is_available, sort_order: index })));
          if (variantsError) throw variantsError;
        }
      }
      let images = [...(editing?.product_images || [])];
      for (const [index, original] of imageFiles.entries()) {
        const image = await prepareImageForUpload(original);
        const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `products/${id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(path, image, { contentType: image.type || undefined });
        if (uploadError) throw uploadError;
        const isPrimary = images.length === 0 && index === 0;
        const { data: imageRow, error: imageError } = await supabase
          .from("product_images")
          .insert({
            product_id: id,
            storage_path: path,
            alt_text: title.trim(),
            is_primary: isPrimary,
            sort_order: images.length,
          })
          .select("id, storage_path, is_primary, sort_order, alt_text")
          .single();
        if (imageError) throw imageError;
        images = [...images, imageRow as ProductImage];
      }
      const updated: Product = { id, ...payload, product_images: images, product_variants: variants };
      setProducts((current) => [updated, ...current.filter((item) => item.id !== id)]);
      reset(); setNotice("Product saved successfully. Checkout remains disabled.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this product.");
    } finally { setBusy(false); }
  }

  async function setPrimaryImage(image: ProductImage) {
    if (!editing) return;
    setBusy(true); setNotice("");
    try {
      const { error: clearError } = await supabase.from("product_images").update({ is_primary: false }).eq("product_id", editing.id);
      if (clearError) throw clearError;
      const { error: setError } = await supabase.from("product_images").update({ is_primary: true }).eq("id", image.id);
      if (setError) throw setError;
      const nextImages = editing.product_images.map((entry) => ({ ...entry, is_primary: entry.id === image.id }));
      const next = { ...editing, product_images: nextImages };
      setEditing(next); setProducts((current) => current.map((item) => item.id === editing.id ? next : item));
      setNotice("Main product image updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update the main image."); }
    finally { setBusy(false); }
  }

  async function moveProductImage(image: ProductImage, direction: -1 | 1) {
    if (!editing) return;
    const sorted = [...editing.product_images].sort((a,b)=>a.sort_order-b.sort_order);
    const index = sorted.findIndex((entry)=>entry.id===image.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) return;
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    setBusy(true); setNotice("");
    try {
      for (let i=0;i<sorted.length;i++) {
        const { error } = await supabase.from("product_images").update({ sort_order:i }).eq("id",sorted[i].id);
        if (error) throw error;
      }
      const nextImages = sorted.map((entry,i)=>({...entry,sort_order:i}));
      const next = {...editing,product_images:nextImages};
      setEditing(next); setProducts((current)=>current.map((item)=>item.id===editing.id?next:item));
      setNotice("Image order updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not reorder images."); }
    finally { setBusy(false); }
  }

  async function deleteProductImage(image: ProductImage) {
    if (!editing || !window.confirm("Remove this product image?")) return;
    setBusy(true); setNotice("");
    try {
      const { error } = await supabase.from("product_images").delete().eq("id",image.id);
      if (error) throw error;
      await supabase.storage.from("product-images").remove([image.storage_path]);
      let nextImages = editing.product_images.filter((entry)=>entry.id!==image.id).sort((a,b)=>a.sort_order-b.sort_order);
      if (image.is_primary && nextImages.length) {
        const { error: primaryError } = await supabase.from("product_images").update({is_primary:true}).eq("id",nextImages[0].id);
        if (primaryError) throw primaryError;
        nextImages = nextImages.map((entry,index)=>({...entry,is_primary:index===0,sort_order:index}));
      } else {
        nextImages = nextImages.map((entry,index)=>({...entry,sort_order:index}));
      }
      for (let i=0;i<nextImages.length;i++) {
        const { error: orderError } = await supabase.from("product_images").update({sort_order:i,is_primary:nextImages[i].is_primary}).eq("id",nextImages[i].id);
        if (orderError) throw orderError;
      }
      const next = {...editing,product_images:nextImages};
      setEditing(next); setProducts((current)=>current.map((item)=>item.id===editing.id?next:item));
      setNotice("Product image removed.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not remove this image."); }
    finally { setBusy(false); }
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
      <button onClick={createNew} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] !text-[#f7f6f2] hover:bg-[#9c8062]">+ New product</button>
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
        <div className="md:col-span-2 mt-2 border-t border-[#dedad2] pt-5"><p className="eyebrow">Artwork & product details</p><p className="mt-2 text-xs text-[#89847c]">Add the practical details collectors need. Leave any field blank if it does not apply.</p></div>
        <label className={label}>Medium<input className={field} value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="e.g. Oil on canvas" /></label>
        <label className={label}>Materials<input className={field} value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="e.g. Cotton canvas, archival ink" /></label>
        <label className={label}>Dimensions<input className={field} value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 60 × 80 cm" /></label>
        <label className={label}>Framing<input className={field} value={framing} onChange={(e) => setFraming(e.target.value)} placeholder="e.g. Unframed / Framed in natural wood" /></label>
        <label className={label + " md:col-span-2"}>Shipping & delivery information<textarea className={field + " min-h-20"} value={shippingInformation} onChange={(e) => setShippingInformation(e.target.value)} placeholder="e.g. Carefully packaged. International delivery arranged and quoted separately." /></label>
        <div className="md:col-span-2">
          <label className={label}>Product images<input className={field} type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} /><span className="mt-2 block text-[10px] normal-case tracking-normal text-[#89847c]">Select multiple images. The first image is used as the main image unless you choose another below.</span></label>
          {editing?.product_images?.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...editing.product_images].sort((a,b)=>a.sort_order-b.sort_order).map((img,index,arr)=><div key={img.id} className="border border-[#dedad2] bg-white p-2">
            <div className="relative aspect-square bg-[#e8e5de]"><Image src={publicUrl(img.storage_path)} alt={img.alt_text || title} fill sizes="(min-width: 640px) 25vw, 50vw" className="object-contain" /></div>
            <p className="mt-2 text-[9px] uppercase tracking-wider text-[#77736d]">{img.is_primary ? "Main image" : `Image ${index+1}`}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-[9px] uppercase tracking-wide">
              {!img.is_primary && <button type="button" disabled={busy} onClick={()=>setPrimaryImage(img)} className="underline">Make main</button>}
              <button type="button" disabled={busy || index===0} onClick={()=>moveProductImage(img,-1)} className="underline">Move left</button>
              <button type="button" disabled={busy || index===arr.length-1} onClick={()=>moveProductImage(img,1)} className="underline">Move right</button>
              <button type="button" disabled={busy} onClick={()=>deleteProductImage(img)} className="text-[#9b5947] underline">Remove</button>
            </div>
          </div>)}</div> : null}
          {imageFiles.length > 0 && <p className="mt-3 text-xs text-[#625e57]">{imageFiles.length} new image(s) selected — they will upload when you save.</p>}
        </div>
        {(type === "limited_print" || type === "open_print") ? <div className="md:col-span-2 border-t border-[#dedad2] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Print formats & pricing</p><p className="mt-2 text-xs leading-6 text-[#89847c]">Each row is one available combination. Set its actual price before publishing. Leave the general product price blank if all pricing comes from these options.</p></div><button type="button" onClick={() => setVariants((current) => [...current, { label: "", size: "", finish: "", price: "", currency, stock_quantity: "", is_available: true }])} className="border border-[#242320] px-4 py-3 text-[10px] uppercase tracking-wider">+ Add option</button></div>
          {variants.length ? <div className="mt-5 space-y-4">{variants.map((variant, index) => <div key={variant.id || index} className="grid gap-3 border border-[#dedad2] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>Option label<input className={field} value={variant.label} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,label:e.target.value} : v))} placeholder="e.g. A3 · Unframed" /></label>
            <label className={label}>Size<input className={field} value={variant.size} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,size:e.target.value} : v))} placeholder="e.g. A3" /></label>
            <label className={label}>Finish / frame<input className={field} value={variant.finish} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,finish:e.target.value} : v))} placeholder="e.g. Unframed" /></label>
            <label className={label}>Price<input className={field} type="number" min="0" step="0.01" value={variant.price} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,price:e.target.value} : v))} placeholder="Set price" /></label>
            <label className={label}>Currency<select className={field} value={variant.currency} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,currency:e.target.value} : v))}><option value="UGX">UGX</option><option value="USD">USD</option></select></label>
            <label className={label}>Stock (optional)<input className={field} type="number" min="0" value={variant.stock_quantity} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,stock_quantity:e.target.value} : v))} placeholder="Not tracked" /></label>
            <label className="flex items-center gap-2 self-end pb-3 text-xs"><input type="checkbox" checked={variant.is_available} onChange={(e) => setVariants((rows) => rows.map((v,i) => i===index ? {...v,is_available:e.target.checked} : v))} className="accent-[#9c8062]" /> Available</label>
            <button type="button" onClick={() => setVariants((rows) => rows.filter((_,i) => i!==index))} className="self-end pb-3 text-left text-[10px] uppercase tracking-wider text-[#9b5947] underline">Remove option</button>
          </div>)}</div> : <p className="mt-4 border border-dashed border-[#cfcac0] px-4 py-5 text-xs text-[#89847c]">No priced options added yet. Add one or more formats to offer selectable print sizes and finishes.</p>}
        </div> : <label className={label}>Options<input className={field} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="e.g. Small, Medium, Large" /><span className="mt-1 block text-[9px] normal-case tracking-normal text-[#89847c]">Separate options with commas.</span></label>}
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-5 border-t border-[#dedad2] pt-6">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={trackInventory} onChange={(e) => setTrackInventory(e.target.checked)} className="accent-[#9c8062]" /> Track inventory</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-[#9c8062]" /> Publish on website</label>
        <label className={label + " flex items-center gap-2"}>Status<select className="ml-2 border border-[#d9d4ca] bg-white px-3 py-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option><option value="sold_out">Sold out</option></select></label>
        <button disabled={busy} className="bg-[#242320] px-6 py-3 text-[10px] uppercase tracking-[.16em] !text-[#f7f6f2] transition-colors hover:bg-[#9c8062] disabled:opacity-50">{busy ? "Saving..." : "Save product"}</button>
        <button type="button" onClick={reset} className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Cancel</button>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-[#89847c]">Publishing makes the product visible in the catalogue when the public shop is connected. This does not activate payment or checkout.</p>
    </form>}
    <div className="mt-10 flex items-center justify-between border-b border-[#dedad2] pb-4"><p className="eyebrow">{products.length} products</p><p className="text-[10px] uppercase tracking-[.12em] text-[#89847c]">Catalogue management</p></div>
    {products.length ? <div className="mt-3 divide-y divide-[#e2ded6]">{products.map((item, index) => {
      const cover = item.product_images?.find((img) => img.is_primary) || item.product_images?.[0];
      const typeLabel = types.find((t) => t.value === item.product_type)?.label || item.product_type;
      return <article key={item.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-[#e8e5de]">{cover ? <Image src={publicUrl(cover.storage_path)} alt={item.title} fill sizes="128px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-widest text-[#89847c]">No image</div>}</div>
        <div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[.15em] text-[#9c8062]">0{index + 1} / {item.is_published ? "Published" : "Draft"} · {typeLabel}</p><h2 className="serif mt-2 text-2xl">{item.title}</h2><p className="mt-1 text-xs text-[#89847c]">{item.price == null ? "Price not set" : new Intl.NumberFormat("en-UG", { style: "currency", currency: item.currency || "UGX", maximumFractionDigits: 0 }).format(Number(item.price))} · {item.status.replace("_", " ")}</p>{item.product_type === "limited_print" && <p className="mt-1 text-[10px] text-[#89847c]">Edition: {item.edition_sold} / {item.edition_size}</p>}</div>
        <div className="flex gap-4 text-[10px] uppercase tracking-[.12em]"><button onClick={() => edit(item)} className="underline underline-offset-4">Edit</button><button disabled={busy} onClick={() => remove(item)} className="text-[#9b5947] underline underline-offset-4">Delete</button></div>
      </article>;
    })}</div> : <div className="mt-8 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-14 text-center"><p className="display text-2xl">Your product catalogue starts here.</p><p className="mt-3 text-xs text-[#89847c]">Add an original painting, a print edition, or an object featuring your artwork.</p></div>}
    <p className="mt-8 border-t border-[#dedad2] pt-5 text-[10px] leading-5 text-[#89847c]">Checkout is not connected. Publishing products here does not accept orders or payments.</p>
  </section>;
}
