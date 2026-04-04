import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { notifyNewSignup } from "@/lib/email";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if we already notified for this user by looking at subscription updated_at
  const { data: sub } = await adminClient
    .from("subscriptions")
    .select("created_at, updated_at")
    .eq("user_id", user.id)
    .single();

  if (!sub) {
    return NextResponse.json({ ok: false });
  }

  // If created_at === updated_at, we haven't touched the subscription yet = first login
  if (sub.created_at === sub.updated_at) {
    await notifyNewSignup(user.email || "unknown");

    // Mark as notified by bumping updated_at
    await adminClient
      .from("subscriptions")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, notified: true });
  }

  return NextResponse.json({ ok: true, notified: false });
}
