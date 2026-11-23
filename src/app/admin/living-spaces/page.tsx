import { createClient } from "@/lib/supabase/server";
import LivingSpaceManager from "@/components/admin/living-space-manager";

export default async function AdminLivingSpacesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("living_space_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const photos = await Promise.all((data ?? []).map(async photo => {
    const { data: signed } = await supabase.storage
      .from("living-space-images")
      .createSignedUrl(photo.storage_path, 4 * 60 * 60);
    return { ...photo, image_url: signed?.signedUrl ?? "" };
  }));

  return <LivingSpaceManager initialPhotos={photos} loadError={error?.message ?? null} />;
}
