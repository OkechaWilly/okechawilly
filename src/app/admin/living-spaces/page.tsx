import { createClient } from "@/lib/supabase/server";
import LivingSpaceManager from "@/components/admin/living-space-manager";

const publicBucket = "living-space-images";
const draftBucket = "living-space-drafts";

export default async function AdminLivingSpacesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("living_space_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const photos = await Promise.all((data ?? []).map(async photo => {
    const bucket = photo.storage_bucket ?? publicBucket;
    // Published images are public assets: use their stable public URL rather
    // than signing them. Drafts remain private and receive short-lived URLs.
    const image_url = bucket === draftBucket
      ? (await supabase.storage.from(draftBucket).createSignedUrl(photo.storage_path, 4 * 60 * 60)).data?.signedUrl ?? ""
      : supabase.storage.from(publicBucket).getPublicUrl(photo.storage_path).data.publicUrl;
    return { ...photo, image_url };
  }));

  return <LivingSpaceManager initialPhotos={photos} loadError={error?.message ?? null} />;
}
