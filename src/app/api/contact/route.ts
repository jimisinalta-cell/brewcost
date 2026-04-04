import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendContactMessage } from "@/lib/email";

const CATEGORIES = ["Question", "Bug Report", "Feature Request", "Other"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { category, message } = body;

  if (!category || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message too long (max 5000 characters)" },
      { status: 400 }
    );
  }

  // Get user's plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  try {
    await sendContactMessage({
      userEmail: user.email || "unknown",
      plan: sub?.plan || "free",
      category,
      message: message.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send contact message:", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
