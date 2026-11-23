import { createClient } from "@/lib/supabase/server";
import OrdersManager from "@/components/admin/orders-manager";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: reconciliationCases, error: reconciliationError }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
    supabase.from("payment_reconciliation_cases").select("*").order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  if (reconciliationError && !["42P01", "PGRST205"].includes(reconciliationError.code)) throw new Error(reconciliationError.message);
  return <OrdersManager initialOrders={(data || []) as never} initialReconciliationCases={(reconciliationCases || []) as never} />;
}
