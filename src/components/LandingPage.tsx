"use client";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brew-50">
      {/* Nav */}
      <nav className="border-b border-brew-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-xl font-bold text-brew-800">BrewCost</span>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-medium text-brew-600 hover:text-brew-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/login?mode=signup"
              className="rounded-lg bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 transition-colors"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-brew-900 leading-tight">
            Know the true cost of every item on your menu
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-brew-600 max-w-xl mx-auto">
            Track ingredient prices, build recipes, and see real-time margins.
            Stop guessing what things cost — start knowing.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/login?mode=signup"
              className="rounded-lg bg-brew-800 px-6 py-3 text-sm font-medium text-white hover:bg-brew-700 transition-colors"
            >
              Start Free — No Credit Card
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-xl sm:text-2xl font-bold text-brew-800 mb-10">
            Everything you need to manage menu costs
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Ingredient Library"
              description="Add ingredients with purchase prices and units. We auto-calculate the cost per recipe unit."
            />
            <FeatureCard
              title="Recipe Builder"
              description="Build recipes from your ingredients. See total cost, margin, and food cost percentage in real time."
            />
            <FeatureCard
              title="Margin Tracking"
              description="Color-coded margins make it easy to spot which items are profitable and which need attention."
            />
            <FeatureCard
              title="Unit Conversion"
              description="Buy in gallons, use in ounces. Buy in pounds, use in grams. We handle the math."
            />
            <FeatureCard
              title="Cost Reports"
              description="Grouped tables showing every drink, every size, with COGS and margin. Export to CSV."
            />
            <FeatureCard
              title="Grid View"
              description="Spreadsheet-style editing for fast bulk updates across your entire menu."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12 sm:py-16 bg-white border-y border-brew-200">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-xl sm:text-2xl font-bold text-brew-800 mb-10">
            Simple pricing
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            {/* Free Tier */}
            <div className="rounded-lg border border-brew-200 bg-brew-50 p-6">
              <h3 className="text-lg font-bold text-brew-800">Free</h3>
              <p className="mt-1 text-2xl font-bold text-brew-900">
                $0
                <span className="text-sm font-normal text-brew-500">
                  {" "}/ month
                </span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-brew-700">
                <li className="flex items-center gap-2">
                  <Check /> 2 recipes
                </li>
                <li className="flex items-center gap-2">
                  <Check /> 5 ingredients
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Real-time cost calculations
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Margin tracking
                </li>
              </ul>
              <a
                href="/login?mode=signup"
                className="mt-6 block w-full rounded-lg border border-brew-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-brew-700 hover:bg-brew-50 transition-colors"
              >
                Get Started
              </a>
            </div>

            {/* Pro Tier */}
            <div className="rounded-lg border-2 border-brew-800 bg-white p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-brew-800 px-3 py-0.5 text-xs font-medium text-white">
                  Best Value
                </span>
              </div>
              <h3 className="text-lg font-bold text-brew-800">Pro</h3>
              <p className="mt-1 text-2xl font-bold text-brew-900">
                $2.50
                <span className="text-sm font-normal text-brew-500">
                  {" "}/ month
                </span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-brew-700">
                <li className="flex items-center gap-2">
                  <Check /> Unlimited recipes
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Unlimited ingredients
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Grid view for bulk editing
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Cost reports with CSV export
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Configurable margin targets
                </li>
              </ul>
              <a
                href="/login?mode=signup"
                className="mt-6 block w-full rounded-lg bg-brew-800 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brew-700 transition-colors"
              >
                Start Free, Upgrade Anytime
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-brew-400">
          BrewCost &mdash; Built for coffee shops and bakeries
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-brew-200 bg-white p-5">
      <h3 className="font-semibold text-brew-800 text-sm">{title}</h3>
      <p className="mt-1.5 text-xs text-brew-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function Check() {
  return (
    <svg
      className="h-4 w-4 text-margin-good shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
