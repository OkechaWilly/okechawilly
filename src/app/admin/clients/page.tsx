import {createClient} from "@/lib/supabase/server";
import ClientManager from "@/components/admin/client-manager";
export default async function AdminClientsPage(){const supabase=await createClient();const {data,error}=await supabase.from("clients").select("*").order("sort_order").order("name");if(error)return <p className="border border-[#d9b7a9] bg-[#fbf2ee] p-5 text-sm text-[#8b4937]">Could not load clients: {error.message}</p>;return <ClientManager initialClients={data??[]}/>;}
