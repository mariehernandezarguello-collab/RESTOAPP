import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const redirectMap: Record<string, string> = {
        admin: "/admin/dashboard",
        waiter: "/waiter/orders",
        kitchen: "/kitchen/queue",
        cashier: "/cashier/billing",
      };

      const destination =
        (profile?.role && redirectMap[profile.role]) ?? "/login";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
