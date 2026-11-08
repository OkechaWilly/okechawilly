// Ordering for pictures that belong to an artwork or product: the primary picture first,
// then by the order set in the admin.
export type OrderedImage = { is_primary?: boolean | null; sort_order?: number | null };

export function byPrimaryThenOrder(a: OrderedImage, b: OrderedImage) {
  return Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0);
}
