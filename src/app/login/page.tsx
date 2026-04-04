"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a confirmation link.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brew-800">BrewCost</h1>
          <p className="mt-1 text-sm text-brew-500">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brew-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-brew-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brew-500 focus:outline-none focus:ring-1 focus:ring-brew-500"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-margin-bad">{error}</p>
          )}
          {message && (
            <p className="text-sm text-margin-good">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brew-700 px-4 py-2 text-sm font-medium text-white hover:bg-brew-800 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brew-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-brew-50 px-2 text-brew-400">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-md border border-brew-200 bg-white px-4 py-2 text-sm font-medium text-brew-700 hover:bg-brew-50 transition-colors"
        >
          Continue with Google
        </button>

        {!isSignUp && (
          <p className="text-center">
            <a
              href="/reset-password"
              className="text-xs text-brew-400 hover:text-brew-700"
            >
              Forgot your password?
            </a>
          </p>
        )}

        <p className="text-center text-sm text-brew-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="font-medium text-brew-700 hover:text-brew-900"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
