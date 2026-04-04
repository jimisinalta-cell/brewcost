import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import { notifyNewSignup } from "@/lib/email";

const MAX_SESSIONS = 1;
const HEARTBEAT_THRESHOLD_MS = 60_000; // 60 seconds

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAgent = request.headers.get("user-agent") || "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  // Clean up stale sessions first
  const cutoff = new Date(Date.now() - HEARTBEAT_THRESHOLD_MS).toISOString();
  await adminClient
    .from("user_sessions")
    .delete()
    .eq("user_id", user.id)
    .lt("last_heartbeat", cutoff);

  // Check active session count
  const { data: activeSessions } = await adminClient
    .from("user_sessions")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // If at or over limit, remove oldest sessions
  if (activeSessions && activeSessions.length >= MAX_SESSIONS) {
    const toRemove = activeSessions.slice(
      0,
      activeSessions.length - MAX_SESSIONS + 1
    );
    await adminClient
      .from("user_sessions")
      .delete()
      .in(
        "id",
        toRemove.map((s) => s.id)
      );
  }

  // Create new session
  const sessionToken = randomUUID();
  await adminClient.from("user_sessions").insert({
    user_id: user.id,
    session_token: sessionToken,
    user_agent: userAgent,
    ip_address: ip,
  });

  // Notify on first login (subscription created within last 5 minutes)
  const { data: sub } = await adminClient
    .from("subscriptions")
    .select("created_at")
    .eq("user_id", user.id)
    .single();

  if (sub) {
    const subAge = Date.now() - new Date(sub.created_at).getTime();
    if (subAge < 5 * 60 * 1000) {
      notifyNewSignup(user.email || "unknown");
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("bc_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
