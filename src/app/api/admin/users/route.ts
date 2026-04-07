import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "jim@wydahoroaster.com";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all users
  const {
    data: { users },
  } = await adminClient.auth.admin.listUsers();

  if (!users) {
    return NextResponse.json({ users: [] });
  }

  // Get all subscriptions
  const { data: subs } = await adminClient
    .from("subscriptions")
    .select("user_id, plan, status");

  const subMap = new Map(
    (subs || []).map((s) => [s.user_id, s])
  );

  // Get recipe counts per user
  const { data: recipeCounts } = await adminClient
    .from("recipes")
    .select("user_id");

  const recipeMap = new Map<string, number>();
  for (const r of recipeCounts || []) {
    recipeMap.set(r.user_id, (recipeMap.get(r.user_id) || 0) + 1);
  }

  // Get ingredient counts per user
  const { data: ingredientCounts } = await adminClient
    .from("ingredients")
    .select("user_id");

  const ingredientMap = new Map<string, number>();
  for (const i of ingredientCounts || []) {
    ingredientMap.set(i.user_id, (ingredientMap.get(i.user_id) || 0) + 1);
  }

  const result = users.map((u) => {
    const sub = subMap.get(u.id);
    return {
      email: u.email,
      plan: sub?.plan || "free",
      status: sub?.status || "unknown",
      recipes: recipeMap.get(u.id) || 0,
      ingredients: ingredientMap.get(u.id) || 0,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    };
  });

  // Sort by most recent signup first
  result.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ users: result });
}
