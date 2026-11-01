import { createClient } from "@/lib/supabase/server";
import JournalManager from "@/components/admin/journal-manager";

export default async function AdminJournalPage() {
  const supabase = await createClient();
  const [{ data: posts }, { data: artworks }] = await Promise.all([
    supabase.from("journal_posts").select("*").order("created_at", { ascending: false }),
    supabase.from("artworks").select("id,title,artwork_images(storage_path,alt_text,is_primary,sort_order)").order("title"),
  ]);
  return <JournalManager initialPosts={posts ?? []} artworks={artworks ?? []} />;
}
