"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!user) return null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-l border-brew-200 pl-4 ml-2">
      <a
        href="/account"
        className="text-xs font-medium text-brew-500 hover:text-brew-800 transition-colors"
      >
        Account
      </a>
      <button
        onClick={handleSignOut}
        className="text-xs font-medium text-brew-500 hover:text-brew-800 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
