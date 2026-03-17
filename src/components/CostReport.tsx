"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Ingredient, Recipe, RecipeIngredient } from "@/types/database";
import {
  formatCurrency,
  formatCost,
  formatPercent,
  calculateMargin,
} from "@/lib/utils";

interface RecipeRow extends Recipe {
  total_cost: number;
  margin: number | null;
}

interface RecipeGroup {
  name: string;
  rows: RecipeRow[];
}

function marginColor(margin: number | null): string {
  if (margin === null) return "text-brew-400";
  if (margin >= 80) return "text-emerald-600";
  if (margin >= 70) return "text-amber-500";
  return "text-red-500";
}

function marginDot(margin: number | null): string {
  if (margin === null) return "bg-brew-300";
  if (margin >= 80) return "bg-emerald-500";
  if (margin >= 70) return "bg-amber-400";
  return "bg-red-500";
}

export default function CostReport() {
  const [groups, setGroups] = useState<RecipeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: recipesData } = await supabase
      .from("recipes")
      .select("*")
      .order("name");

    if (!recipesData) {
      setLoading(false);
      return;
    }

    const { data: riData } = await supabase
      .from("recipe_ingredients")
      .select("*, ingredient:ingredients(*)");

    const riByRecipe = new Map<string, (RecipeIngredient & { ingredient: Ingredient })[]>();
    if (riData) {
      for (const ri of riData as (RecipeIngredient & { ingredient: Ingredient })[]) {
        const list = riByRecipe.get(ri.recipe_id) || [];
        list.push(ri);
        riByRecipe.set(ri.recipe_id, list);
      }
    }

    const rows: RecipeRow[] = recipesData.map((recipe: Recipe) => {
      const ris = riByRecipe.get(recipe.id) || [];
      const total_cost = ris.reduce((sum, ri) => {
        if (!ri.ingredient) return sum;
        return sum + Number(ri.ingredient.cost_per_recipe_unit) * Number(ri.quantity_used);
      }, 0);
      const price = Number(recipe.menu_price) || 0;
      const margin = price > 0 ? calculateMargin(price, total_cost) : null;
      return { ...recipe, total_cost, margin };
    });

    // Group by name, sort sizes within each group
    const groupMap = new Map<string, RecipeRow[]>();
    for (const row of rows) {
      const list = groupMap.get(row.name) || [];
      list.push(row);
      groupMap.set(row.name, list);
    }

    const sorted: RecipeGroup[] = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, groupRows]) => ({
        name,
        rows: groupRows.sort((a, b) => {
          const sizeA = parseInt(a.size?.match(/(\d+)/)?.[1] || "0", 10);
          const sizeB = parseInt(b.size?.match(/(\d+)/)?.[1] || "0", 10);
          return sizeA - sizeB;
        }),
      }));

    setGroups(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function exportCSV() {
    const header = "Drink,Size,Price,COGS,Margin";
    const lines = [header];
    for (const group of groups) {
      for (const row of group.rows) {
        lines.push(
          [
            `"${row.name}"`,
            `"${row.size || ""}"`,
            row.menu_price ? Number(row.menu_price).toFixed(2) : "",
            row.total_cost.toFixed(4),
            row.margin !== null ? row.margin.toFixed(1) + "%" : "",
          ].join(",")
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brewcost-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading report...</div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-brew-500 text-lg">No recipes yet</p>
        <p className="text-brew-400 text-sm mt-1">
          Add recipes to see your cost report.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brew-800">Cost Report</h2>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border border-brew-200 bg-white px-3 py-1.5 text-xs font-medium text-brew-600 hover:bg-brew-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.name} className="rounded-lg border border-brew-200 bg-white overflow-hidden">
            <div className="bg-brew-50 px-4 py-2.5 border-b border-brew-200">
              <h3 className="font-semibold text-brew-800">{group.name}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brew-100 text-brew-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Size</th>
                  <th className="text-right px-4 py-2 font-medium">Price</th>
                  <th className="text-right px-4 py-2 font-medium">COGS</th>
                  <th className="text-right px-4 py-2 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.id} className="border-b border-brew-50 last:border-b-0 hover:bg-brew-25">
                    <td className="px-4 py-2.5 text-brew-700">
                      {row.size || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-brew-700">
                      {row.menu_price ? formatCurrency(Number(row.menu_price)) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-brew-700">
                      {formatCost(row.total_cost)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${marginDot(row.margin)}`} />
                        <span className={`font-semibold ${marginColor(row.margin)}`}>
                          {row.margin !== null ? formatPercent(row.margin) : "—"}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
