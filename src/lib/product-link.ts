// What should happen to a product's form when an artwork is linked to it.
//
// Rules:
//  - A published product's web address (slug) and title are never changed by linking.
//  - Text the person has typed is never replaced.
//  - A field is only filled when it is empty, or still holds what was copied in from
//    an earlier artwork choice (so switching artwork on a brand-new product works).
//  - A field is never blanked because the artwork has nothing for it.

export type LinkFields = { title: string; slug: string; description: string; medium: string; dimensions: string };

export type LinkableArtwork = {
  title: string;
  description?: string | null;
  medium?: string | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
  depth_cm?: number | string | null;
};

export const slugify = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";

export const EMPTY_LINK_FIELDS: LinkFields = { title: "", slug: "", description: "", medium: "", dimensions: "" };

export function dimensionsText(artwork: LinkableArtwork) {
  const present = [artwork.width_cm, artwork.height_cm, artwork.depth_cm]
    .filter((value) => value != null && String(value) !== "")
    .map(String);
  return present.length ? `${present.join(" × ")} cm` : "";
}

export function planArtworkLink({
  isExistingProduct,
  current,
  lastCopied,
  artwork,
}: {
  isExistingProduct: boolean;
  current: LinkFields;
  lastCopied: LinkFields;
  artwork: LinkableArtwork;
}): { updates: Partial<LinkFields>; copied: LinkFields; summary: string } {
  const updates: Partial<LinkFields> = {};
  const copied: LinkFields = { ...lastCopied };
  const untouched = (value: string, previous: string) => value.trim() === "" || value === previous;

  // Title and web address follow the artwork only on a brand-new product that has not been edited.
  if (!isExistingProduct && artwork.title && untouched(current.title, lastCopied.title)) {
    const slugFollowedTitle = current.slug.trim() === "" || current.slug === lastCopied.slug || current.slug === slugify(current.title);
    updates.title = artwork.title;
    copied.title = artwork.title;
    if (slugFollowedTitle) {
      updates.slug = slugify(artwork.title);
      copied.slug = updates.slug;
    }
  }

  const details: Array<[keyof LinkFields, string]> = [
    ["description", artwork.description?.trim() || ""],
    ["medium", artwork.medium?.trim() || ""],
    ["dimensions", dimensionsText(artwork)],
  ];
  for (const [field, value] of details) {
    if (value && untouched(current[field], lastCopied[field])) {
      updates[field] = value;
      copied[field] = value;
    }
  }

  const filled = Object.keys(updates).filter((field) => field !== "slug");
  const list = filled.length > 1 ? `${filled.slice(0, -1).join(", ")} and ${filled[filled.length - 1]}` : filled.join("");
  const summary = isExistingProduct
    ? filled.length
      ? `Artwork linked. Filled in the empty ${list} from the artwork; your title, web address and existing text were left as they are.`
      : "Artwork linked. Your title, web address and existing text were left as they are."
    : "Artwork linked. Details were copied across; you can still edit them.";
  return { updates, copied, summary };
}
