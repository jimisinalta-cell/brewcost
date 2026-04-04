import type { Metadata } from "next";
import "./globals.css";
import { SubscriptionProvider } from "@/lib/subscription";
import SessionGuard from "@/components/SessionGuard";
import AppShell from "@/components/AppShell";

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
        <SubscriptionProvider>
          <SessionGuard>
            <AppShell>{children}</AppShell>
          </SessionGuard>
        </SubscriptionProvider>
      </body>
    </html>
  );
}
