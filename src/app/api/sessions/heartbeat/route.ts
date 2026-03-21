import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("bc_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  // Update heartbeat
  const { data } = await adminClient
    .from("user_sessions")
    .update({ last_heartbeat: new Date().toISOString() })
    .eq("session_token", sessionToken)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (!data) {
    // Session was evicted (another device logged in)
    return NextResponse.json({ evicted: true }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
