import type { Metadata } from "next";
import "./globals.css";
import MobileNav from "@/components/MobileNav";
import UserMenu from "@/components/UserMenu";
import { SubscriptionProvider } from "@/lib/subscription";
import SessionGuard from "@/components/SessionGuard";

export const metadata: Metadata = {
  title: "BrewCost — Coffee Shop Cost Calculator",
  description:
    "Calculate your true cost of goods and optimize margins for every menu item.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-brew-50 text-brew-900 min-h-screen antialiased">
        <nav className="border-b border-brew-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-xl font-bold text-brew-800">
              BrewCost
            </a>
            {/* Desktop nav */}
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
              <UserMenu />
            </div>
            {/* Mobile hamburger */}
            <MobileNav />
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <SubscriptionProvider>
            <SessionGuard>{children}</SessionGuard>
          </SubscriptionProvider>
        </main>
      </body>
    </html>
  );
}
