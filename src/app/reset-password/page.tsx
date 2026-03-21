"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brew-800">Reset Password</h1>
          <p className="mt-1 text-sm text-brew-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-margin-good/30 bg-margin-good/5 p-4 text-center">
            <p className="text-sm text-margin-good font-medium">
              Check your email for a password reset link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-brew-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-brew-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brew-500 focus:outline-none focus:ring-1 focus:ring-brew-500"
                placeholder="you@example.com"
              />
            </div>

            {error && <p className="text-sm text-margin-bad">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brew-700 px-4 py-2 text-sm font-medium text-white hover:bg-brew-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-brew-500">
          <a
            href="/login"
            className="font-medium text-brew-700 hover:text-brew-900"
          >
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
