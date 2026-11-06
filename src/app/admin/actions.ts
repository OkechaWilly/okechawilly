"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/admin-auth";

export async function signOut() {
  const supabase = await createClient();
  // "local" ends only this browser's session, not the admin's other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect(LOGIN_PATH);
}
