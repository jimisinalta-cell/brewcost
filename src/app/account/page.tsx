"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/subscription";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { plan, loading: subLoading } = useSubscription();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, [supabase]);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setPasswordMsg(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg("Password updated.");
      setNewPassword("");
    }
    setSaving(false);
  }

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url, error } = await res.json();
    if (error) {
      alert(error);
    } else if (url) {
      window.location.href = url;
    }
  }

  async function handleUpgrade() {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url, error } = await res.json();
    if (error) {
      alert(error);
    } else if (url) {
      window.location.href = url;
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Account</h1>

      {/* Email */}
      <div className="rounded-lg border border-brew-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-brew-700 mb-2">Email</h2>
        <p className="text-sm text-brew-600">{user.email}</p>
      </div>

      {/* Plan */}
      <div className="rounded-lg border border-brew-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-brew-700 mb-2">Plan</h2>
        {subLoading ? (
          <p className="text-sm text-brew-400">Loading...</p>
        ) : plan === "paid" ? (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm text-margin-good font-medium">
              &#9989; Pro
            </span>
            <button
              onClick={handleManageBilling}
              className="text-xs font-medium text-brew-500 hover:text-brew-800 transition-colors"
            >
              Manage billing
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-brew-500">Free</span>
            <button
              onClick={handleUpgrade}
              className="rounded-md bg-brew-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brew-800 transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="rounded-lg border border-brew-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-brew-700 mb-3">
          Change Password
        </h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
            minLength={6}
            required
            className="block w-full rounded-md border border-brew-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brew-500 focus:outline-none focus:ring-1 focus:ring-brew-500"
          />
          {passwordMsg && (
            <p
              className={`text-xs ${passwordMsg.includes("updated") ? "text-margin-good" : "text-margin-bad"}`}
            >
              {passwordMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brew-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brew-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
