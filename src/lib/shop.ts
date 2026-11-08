// One place for the shop's rules, so the shop, the prints page and the artwork
// page always agree on categories, availability and prices.

export type ProductVariantLite = {
  price: number | string;
  currency: string | null;
  is_available: boolean;
  stock_quantity: number | string | null;
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
    (variant) =>
      variant.is_available &&
      (variant.stock_quantity == null || variant.stock_quantity === "" || Number(variant.stock_quantity) > 0),
  );
}

/**
 * Why a published listing cannot currently be bought, or null when it can.
 * "Sold" / "Sold out" mean the work is gone; "Currently unavailable" means the
 * formats are only switched off, so the visitor is not told something false.
 */
export function availability(product: SellableProduct): { label: string; reason: string } | null {
  const soldWord = product.product_type === "original" ? "Sold" : "Sold out";
  if (product.status === "sold_out") return { label: soldWord, reason: "its status is set to Sold out" };
  if (product.product_type === "limited_print" && product.edition_size != null && (product.edition_sold ?? 0) >= product.edition_size) {
    return { label: "Sold out", reason: "every copy of the edition is sold" };
  }
  if (product.track_inventory && product.stock_quantity === 0) return { label: soldWord, reason: "its stock is 0" };
  if ((product.product_variants ?? []).length > 0 && availableVariants(product).length === 0) {
    return { label: "Currently unavailable", reason: "every format is switched off or out of stock" };
  }
  return null;
}

/** True when a published listing should remain visible but cannot currently be purchased. */
export function isSoldOut(product: SellableProduct) {
  return availability(product) !== null;
}

/** What a visitor can see of a product, in plain words, for the admin product list. */
export function shopVisibility(product: SellableProduct & { is_published: boolean }): { label: string; tone: "visible" | "sold" | "hidden" } {
  if (!product.is_published) return { label: "Not in the shop: switch Published on", tone: "hidden" };
  if (product.status === "draft") return { label: "Not in the shop: status is Draft", tone: "hidden" };
  if (product.status === "archived") return { label: "Not in the shop: status is Archived", tone: "hidden" };
  const state = availability(product);
  if (state) return { label: `In the shop, shown as “${state.label}” because ${state.reason}`, tone: "sold" };
  return { label: "In the shop and available to buy", tone: "visible" };
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
