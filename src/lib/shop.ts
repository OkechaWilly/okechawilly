// One place for the shop's rules, so the shop, the prints page and the artwork
// page always agree on categories, availability and prices.

export type ProductVariantLite = {
  price: number | string;
  currency: string | null;
  is_available: boolean;
  stock_quantity: number | null;
};

export type SellableProduct = {
  product_type: string;
  status?: string | null;
  price: number | string | null;
  currency: string | null;
  edition_size?: number | null;
  edition_sold?: number | null;
  stock_quantity?: number | null;
  track_inventory?: boolean | null;
  product_variants?: ProductVariantLite[] | null;
};

/** Shop filter. A category is only shown to visitors when it has products. */
export const SHOP_CATEGORIES = [
  { slug: "originals", title: "Original paintings", noun: "original paintings", types: ["original"] },
  { slug: "prints", title: "Fine art prints", noun: "fine art prints", types: ["limited_print", "open_print"] },
  { slug: "wearables", title: "Wearables", noun: "wearables", types: ["wearable"] },
  { slug: "objects", title: "Objects", noun: "objects", types: ["merchandise", "art_object"] },
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  original: "Original painting",
  limited_print: "Limited-edition print",
  open_print: "Open-edition print",
  wearable: "Wearable",
  merchandise: "Object",
  art_object: "Art object",
};

export const PRINT_TYPES: string[] = ["limited_print", "open_print"];

export function categoryOfType(type: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((category) => (category.types as readonly string[]).includes(type));
}

export function formatPrice(price: number | null, currency: string | null) {
  if (price == null) return "Price on request";
  const code = currency || "UGX";
  try {
    return new Intl.NumberFormat("en-UG", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(Number(price));
  } catch {
    return `${code} ${Number(price).toLocaleString("en-UG")}`;
  }
}

/** Formats a collector can currently choose (switched on and in stock). */
export function availableVariants(product: SellableProduct) {
  return (product.product_variants ?? []).filter(
    (variant) => variant.is_available && (variant.stock_quantity == null || variant.stock_quantity > 0),
  );
}

/** True when a published listing should remain visible but cannot currently be purchased. */
export function isSoldOut(product: SellableProduct) {
  if (product.status === "sold_out") return true;
  if (product.product_type === "limited_print" && product.edition_size != null && (product.edition_sold ?? 0) >= product.edition_size) return true;
  if (product.track_inventory && product.stock_quantity === 0) return true;
  if ((product.product_variants ?? []).length > 0 && availableVariants(product).length === 0) return true;
  return false;
}

/** Availability is separate from visibility: sold-out published products stay in the catalogue. */
export function isCurrentlyAvailable(product: SellableProduct) {
  return !isSoldOut(product);
}

/** Price text for a list card: a variant's price, "From …" when formats differ, or the base price. */
export function priceLabel(product: SellableProduct) {
  const variants = availableVariants(product);
  if (variants.length > 0) {
    const prices = variants.map((variant) => Number(variant.price));
    const lowest = Math.min(...prices);
    const currency = variants[0].currency || product.currency;
    return lowest === Math.max(...prices) ? formatPrice(lowest, currency) : `From ${formatPrice(lowest, currency)}`;
  }
  return formatPrice(product.price == null ? null : Number(product.price), product.currency);
}
