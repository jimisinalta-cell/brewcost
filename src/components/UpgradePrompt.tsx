"use client";

import { useState } from "react";

interface UpgradePromptProps {
  feature: string;
  className?: string;
}

export default function UpgradePrompt({
  feature,
  className = "",
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url, error } = await res.json();
      if (error) {
        alert(error);
      } else if (url) {
        window.location.href = url;
      }
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div
      className={`rounded-lg border border-brew-200 bg-white p-6 text-center ${className}`}
    >
      <div className="text-2xl mb-2">&#9749;</div>
      <h3 className="text-sm font-semibold text-brew-800">
        Upgrade to Pro
      </h3>
      <p className="mt-1 text-xs text-brew-500">
        {feature} is available on the Pro plan.
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="mt-4 rounded-md bg-brew-700 px-4 py-2 text-sm font-medium text-white hover:bg-brew-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "..." : "Upgrade Now"}
      </button>
    </div>
  );
}
