"use client";

import { useEffect, useState } from "react";

interface UserRow {
  email: string;
  plan: string;
  status: string;
  recipes: number;
  ingredients: number;
  created_at: string;
  last_sign_in_at: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) {
            setError("Access denied");
          } else {
            setError("Failed to load");
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUsers(data.users);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-margin-bad">{error}</div>
      </div>
    );
  }

  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.plan === "paid").length;
  const totalRecipes = users.reduce((s, u) => s + u.recipes, 0);
  const totalIngredients = users.reduce((s, u) => s + u.ingredients, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-brew-900">
          Admin Dashboard
        </h1>
        <p className="text-sm text-brew-500 mt-1">User engagement overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Total Users" value={totalUsers} />
        <SummaryCard
          label="Pro Users"
          value={proUsers}
          accent
        />
        <SummaryCard label="Total Recipes" value={totalRecipes} />
        <SummaryCard label="Total Ingredients" value={totalIngredients} />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-brew-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brew-200 bg-brew-50">
              <th className="text-left px-4 py-3 font-medium text-brew-700">
                Email
              </th>
              <th className="text-center px-4 py-3 font-medium text-brew-700">
                Plan
              </th>
              <th className="text-center px-4 py-3 font-medium text-brew-700">
                Recipes
              </th>
              <th className="text-center px-4 py-3 font-medium text-brew-700">
                Ingredients
              </th>
              <th className="text-right px-4 py-3 font-medium text-brew-700">
                Signed Up
              </th>
              <th className="text-right px-4 py-3 font-medium text-brew-700">
                Last Login
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.email}
                className="border-b border-brew-100 hover:bg-brew-50/50"
              >
                <td className="px-4 py-3 text-brew-800 font-medium">
                  {u.email}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.plan === "paid" ? (
                    <span className="inline-block rounded-full bg-margin-good/10 text-margin-good px-2.5 py-0.5 text-xs font-semibold">
                      Pro
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-brew-100 text-brew-500 px-2.5 py-0.5 text-xs font-semibold">
                      Free
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-brew-700">
                  {u.recipes}
                </td>
                <td className="px-4 py-3 text-center text-brew-700">
                  {u.ingredients}
                </td>
                <td className="px-4 py-3 text-right text-brew-500 text-xs">
                  {timeAgo(u.created_at)}
                </td>
                <td className="px-4 py-3 text-right text-brew-500 text-xs">
                  {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-brew-200 bg-white p-4 text-center">
      <p className="text-2xl font-bold text-brew-900">
        {accent ? (
          <span className="text-margin-good">{value}</span>
        ) : (
          value
        )}
      </p>
      <p className="text-xs text-brew-500 mt-1">{label}</p>
    </div>
  );
}
