import { createClient } from "@/lib/supabase/server";
import JournalManager from "@/components/admin/journal-manager";

export default async function AdminJournalPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("journal_posts").select("*").order("created_at", { ascending: false });
  return <JournalManager initialPosts={data ?? []} />;
}
