"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Ingredient, Recipe, RecipeIngredient } from "@/types/database";
import {
  formatCurrency,
  formatCost,
  formatPercent,
  calculateMargin,
} from "@/lib/utils";
import {
  useMarginThresholds,
  getMarginColor,
  getMarginBorder,
} from "@/lib/useMarginThresholds";
import RecipeGrid from "@/components/RecipeGrid";
import CostReport from "@/components/CostReport";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useSubscription } from "@/lib/subscription";

interface RecipeRow extends Recipe {
  total_cost: number;
  margin: number | null;
}

type ViewMode = "cards" | "grid" | "report";

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("cards");
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const { thresholds, updateThresholds } = useMarginThresholds();
  const { limits } = useSubscription();

  const fetchRecipes = useCallback(async () => {
    const { data: recipesData, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("name");

    if (recipesError || !recipesData) {
      console.error("Failed to fetch recipes:", recipesError);
      setLoading(false);
      return;
    }

    if (recipesData.length === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const { data: riData } = await supabase
      .from("recipe_ingredients")
      .select("*, ingredient:ingredients(*)");

    const riByRecipe = new Map<
      string,
      (RecipeIngredient & { ingredient: Ingredient })[]
    >();
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

    // Sort by name, then by size (numeric portion) within each name
    rows.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      const sizeA = a.size?.match(/(\d+)/)?.[1];
      const sizeB = b.size?.match(/(\d+)/)?.[1];
      return (parseInt(sizeA || "0", 10)) - (parseInt(sizeB || "0", 10));
    });

    setRecipes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  async function handleDuplicate(recipe: RecipeRow) {
    setDuplicating(recipe.id);
    try {
      const { data: newRecipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          name: recipe.name,
          size: null,
          menu_price: recipe.menu_price,
        })
        .select("id")
        .single();

      if (recipeError || !newRecipe) {
        console.error("Failed to duplicate recipe:", recipeError);
        setDuplicating(null);
        return;
      }

      const { data: existingIngredients } = await supabase
        .from("recipe_ingredients")
        .select("ingredient_id, quantity_used")
        .eq("recipe_id", recipe.id);

      if (existingIngredients && existingIngredients.length > 0) {
        await supabase.from("recipe_ingredients").insert(
          existingIngredients.map((ri) => ({
            recipe_id: newRecipe.id,
            ingredient_id: ri.ingredient_id,
            quantity_used: ri.quantity_used,
          }))
        );
      }

      router.push(`/recipes/${newRecipe.id}`);
    } catch (err) {
      console.error("Duplicate error:", err);
      setDuplicating(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete recipe:", error);
      return;
    }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      {/* Header - stacks on mobile */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-brew-500 mt-0.5">
            All your recipes at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-brew-200 bg-white overflow-hidden">
            <button
              onClick={() => setView("cards")}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "cards"
                  ? "bg-brew-800 text-white"
                  : "text-brew-500 hover:text-brew-800"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "grid"
                  ? "bg-brew-800 text-white"
                  : "text-brew-500 hover:text-brew-800"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setView("report")}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "report"
                  ? "bg-brew-800 text-white"
                  : "text-brew-500 hover:text-brew-800"
              }`}
            >
              Report
            </button>
          </div>
          {view === "cards" && (
            <a
              href="/recipes/new"
              className="rounded-lg bg-brew-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-brew-700 transition-colors whitespace-nowrap"
            >
              + New Recipe
            </a>
          )}
        </div>
      </div>

      {/* Margin threshold settings - wraps on mobile */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-brew-200 bg-white px-3 sm:px-4 py-2.5">
        <span className="text-xs font-medium text-brew-500">Margin Targets:</span>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-brew-500">≥</span>
            <input
              type="number"
              value={thresholds.green}
              onChange={(e) =>
                updateThresholds({ ...thresholds, green: Number(e.target.value) })
              }
              className="w-12 rounded border border-brew-200 px-1.5 py-0.5 text-xs text-center text-brew-800 focus:outline-none focus:border-brew-400"
            />
            <span className="text-brew-400">%</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-brew-500">≥</span>
            <input
              type="number"
              value={thresholds.yellow}
              onChange={(e) =>
                updateThresholds({ ...thresholds, yellow: Number(e.target.value) })
              }
              className="w-12 rounded border border-brew-200 px-1.5 py-0.5 text-xs text-center text-brew-800 focus:outline-none focus:border-brew-400"
            />
            <span className="text-brew-400">%</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="text-brew-500">&lt;</span>
            <input
              type="number"
              value={thresholds.red}
              onChange={(e) =>
                updateThresholds({ ...thresholds, red: Number(e.target.value) })
              }
              className="w-12 rounded border border-brew-200 px-1.5 py-0.5 text-xs text-center text-brew-800 focus:outline-none focus:border-brew-400"
            />
            <span className="text-brew-400">%</span>
          </label>
        </div>
      </div>

      {view === "report" ? (
        limits.reportView ? (
          <CostReport thresholds={thresholds} />
        ) : (
          <UpgradePrompt feature="Cost Report view" />
        )
      ) : view === "grid" ? (
        limits.gridView ? (
          <div className="rounded-lg border border-brew-200 bg-white overflow-hidden">
            <RecipeGrid />
          </div>
        ) : (
          <UpgradePrompt feature="Grid view" />
        )
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-brew-500">Loading dashboard...</div>
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brew-300 bg-white py-16 text-center">
          <p className="text-brew-500 text-lg">No recipes yet</p>
          <p className="text-brew-400 text-sm mt-1">
            Create your first recipe to see cost breakdowns here.
          </p>
          <a
            href="/recipes/new"
            className="mt-4 inline-block rounded-lg bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 transition-colors"
          >
            Create Recipe
          </a>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const mColor = getMarginColor(recipe.margin, thresholds);
            const bColor = getMarginBorder(recipe.margin, thresholds);

            return (
              <div
                key={recipe.id}
                className={`rounded-lg border border-brew-200 bg-white p-3 sm:p-4 border-l-4 ${bColor} hover:shadow-sm transition-shadow`}
              >
                <div className="mb-2 sm:mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-brew-800 text-sm sm:text-base truncate">{recipe.name}</h3>
                    {recipe.size && (
                      <span className="text-xs text-brew-400">{recipe.size}</span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs ml-2 shrink-0">
                    <a
                      href={`/recipes/${recipe.id}`}
                      className="text-brew-500 hover:text-brew-800 hover:underline"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleDuplicate(recipe)}
                      disabled={duplicating === recipe.id}
                      className="text-brew-500 hover:text-brew-800 hover:underline disabled:opacity-50"
                    >
                      {duplicating === recipe.id ? "..." : "Dup"}
                    </button>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="text-red-400 hover:text-red-600 hover:underline"
                    >
                      Del
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brew-500">COGS</span>
                    <span className="font-medium">
                      {formatCost(recipe.total_cost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brew-500">Price</span>
                    <span>
                      {recipe.menu_price
                        ? formatCurrency(Number(recipe.menu_price))
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brew-500">Margin</span>
                    <span className={`font-semibold ${mColor}`}>
                      {recipe.margin !== null
                        ? formatPercent(recipe.margin)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
