import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const redirectMap: Record<string, string> = {
    admin: "/admin/dashboard",
    waiter: "/waiter/orders",
    kitchen: "/kitchen/queue",
    cashier: "/cashier/billing",
  };

  redirect(redirectMap[profile?.role ?? ""] ?? "/login");
}
