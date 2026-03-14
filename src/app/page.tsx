"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Ingredient, Recipe, RecipeIngredient } from "@/types/database";
import {
  formatCurrency,
  formatPercent,
  calculateMargin,
} from "@/lib/utils";

interface RecipeRow extends Recipe {
  total_cost: number;
  margin: number | null;
}

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    // Fetch recipes with their ingredients
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

    // Fetch all recipe_ingredients with ingredient details
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

    setRecipes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete recipe:", error);
      return;
    }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-brew-500 mt-1">
            All your recipes at a glance.
          </p>
        </div>
        <a
          href="/recipes/new"
          className="rounded-lg bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 transition-colors"
        >
          + New Recipe
        </a>
      </div>

      {recipes.length === 0 ? (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const marginColor =
              recipe.margin === null
                ? "text-brew-400"
                : recipe.margin >= 65
                ? "text-margin-good"
                : recipe.margin >= 50
                ? "text-margin-warn"
                : "text-margin-bad";

            const borderColor =
              recipe.margin !== null && recipe.margin < 65
                ? recipe.margin < 50
                  ? "border-l-margin-bad"
                  : "border-l-margin-warn"
                : "border-l-transparent";

            return (
              <div
                key={recipe.id}
                className={`rounded-lg border border-brew-200 bg-white p-4 border-l-4 ${borderColor} hover:shadow-sm transition-shadow`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-brew-800">{recipe.name}</h3>
                  <div className="flex gap-2 text-xs">
                    <a
                      href={`/recipes/${recipe.id}`}
                      className="text-brew-500 hover:text-brew-800 hover:underline"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="text-red-400 hover:text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brew-500">COGS</span>
                    <span className="font-medium">
                      {formatCurrency(recipe.total_cost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brew-500">Menu Price</span>
                    <span>
                      {recipe.menu_price
                        ? formatCurrency(Number(recipe.menu_price))
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brew-500">Margin</span>
                    <span className={`font-semibold ${marginColor}`}>
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
