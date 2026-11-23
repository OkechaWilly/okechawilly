import { createClient } from "@/lib/supabase/server";
import LivingSpaceManager from "@/components/admin/living-space-manager";

export default async function AdminLivingSpacesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("living_space_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return <LivingSpaceManager initialPhotos={data ?? []} loadError={error?.message ?? null} />;
}
