import { createClient } from "@/lib/supabase/server";
import ArtistProfileManager from "@/components/admin/artist-profile-manager";

const defaults = {
  display_name: "Okecha Willy", location: "Uganda", introduction: "", artist_statement: "", biography: "",
  themes: [], portrait_path: "3732b0e8-e117-46b0-86ae-7158784b9d09/ff7cffa7-c05a-42cd-ade6-1402b1260a09.png", gallery: [], is_published: true,
};

export default async function AdminArtistProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_profile").select("*").eq("id", 1).maybeSingle();
  return <ArtistProfileManager initialProfile={{ ...defaults, ...(data ?? {}) }} />;
}
