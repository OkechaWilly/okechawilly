import { createClient } from "@/lib/supabase/server";
import OrdersManager from "@/components/admin/orders-manager";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return <OrdersManager initialOrders={(data || []) as never} />;
}
