"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import MobileNav from "./MobileNav";
import UserMenu from "./UserMenu";

export default function AppShell({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Public pages that render their own layout (landing, login, etc.)
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/reset-password";

  // Landing page for unauthenticated users renders its own full layout
  if (pathname === "/" && authed === false) {
    return <>{children}</>;
  }

  // Still checking auth
  if (authed === null && !isPublicPage) {
    return null;
  }

  // Public pages (login, reset) — no app nav
  if (isPublicPage) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    );
  }

  // Authenticated — show full app shell
  return (
    <>
      <nav className="border-b border-brew-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="/" className="text-xl font-bold text-brew-800">
            BrewCost
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <a
              href="/"
              className="text-brew-600 hover:text-brew-900 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/ingredients"
              className="text-brew-600 hover:text-brew-900 transition-colors"
            >
              Ingredients
            </a>
            <a
              href="/recipes/new"
              className="text-brew-600 hover:text-brew-900 transition-colors"
            >
              New Recipe
            </a>
            <a
              href="/contact"
              className="text-brew-600 hover:text-brew-900 transition-colors"
            >
              Contact
            </a>
            <UserMenu />
          </div>
          <MobileNav />
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}
