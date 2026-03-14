"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Ingredient, Recipe, RecipeIngredient } from "@/types/database";
import {
  formatCurrency,
  formatPercent,
  calculateMargin,
  calculateFoodCost,
} from "@/lib/utils";

interface RecipeIngredientRow {
  id?: string;
  ingredient_id: string;
  quantity_used: number;
  ingredient?: Ingredient;
}

export default function RecipeForm({
  existingRecipe,
}: {
  existingRecipe?: Recipe;
}) {
  const router = useRouter();
  const [name, setName] = useState(existingRecipe?.name || "");
  const [menuPrice, setMenuPrice] = useState(
    existingRecipe?.menu_price?.toString() || ""
  );
  const [rows, setRows] = useState<RecipeIngredientRow[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchIngredients = useCallback(async () => {
    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .order("name");
    setIngredients(data || []);
  }, []);

  const fetchRecipeIngredients = useCallback(async () => {
    if (!existingRecipe) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("*, ingredient:ingredients(*)")
      .eq("recipe_id", existingRecipe.id);

    if (data) {
      setRows(
        data.map((ri: RecipeIngredient & { ingredient: Ingredient }) => ({
          id: ri.id,
          ingredient_id: ri.ingredient_id,
          quantity_used: ri.quantity_used,
          ingredient: ri.ingredient,
        }))
      );
    }
    setLoading(false);
  }, [existingRecipe]);

  useEffect(() => {
    fetchIngredients();
    fetchRecipeIngredients();
  }, [fetchIngredients, fetchRecipeIngredients]);

  function addRow() {
    if (ingredients.length === 0) return;
    setRows((prev) => [
      ...prev,
      { ingredient_id: ingredients[0].id, quantity_used: 0 },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(
    index: number,
    field: "ingredient_id" | "quantity_used",
    value: string
  ) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === "ingredient_id") {
          return {
            ...row,
            ingredient_id: value,
            ingredient: ingredients.find((ing) => ing.id === value),
          };
        }
        return { ...row, quantity_used: parseFloat(value) || 0 };
      })
    );
  }

  const totalCost = rows.reduce((sum, row) => {
    const ing = row.ingredient || ingredients.find((i) => i.id === row.ingredient_id);
    if (!ing) return sum;
    return sum + Number(ing.cost_per_unit) * row.quantity_used;
  }, 0);

  const price = parseFloat(menuPrice) || 0;
  const margin = price > 0 ? calculateMargin(price, totalCost) : null;
  const foodCost = price > 0 ? calculateFoodCost(price, totalCost) : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      let recipeId = existingRecipe?.id;

      if (existingRecipe) {
        await supabase
          .from("recipes")
          .update({
            name: name.trim(),
            menu_price: price || null,
          })
          .eq("id", existingRecipe.id);

        // Delete old recipe_ingredients and re-insert
        await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", existingRecipe.id);
      } else {
        const { data, error } = await supabase
          .from("recipes")
          .insert({
            name: name.trim(),
            menu_price: price || null,
          })
          .select("id")
          .single();

        if (error || !data) {
          console.error("Failed to create recipe:", error);
          setSaving(false);
          return;
        }
        recipeId = data.id;
      }

      // Insert recipe ingredients
      if (rows.length > 0) {
        const { error } = await supabase.from("recipe_ingredients").insert(
          rows.map((row) => ({
            recipe_id: recipeId!,
            ingredient_id: row.ingredient_id,
            quantity_used: row.quantity_used,
          }))
        );
        if (error) {
          console.error("Failed to save recipe ingredients:", error);
        }
      }

      router.push("/");
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - recipe details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-brew-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-brew-600">
                  Recipe Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Iced Latte"
                  className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brew-600">
                  Menu Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={menuPrice}
                  onChange={(e) => setMenuPrice(e.target.value)}
                  placeholder="5.50"
                  className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Ingredients list */}
          <div className="rounded-lg border border-brew-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brew-700">
                Ingredients
              </h2>
              <button
                type="button"
                onClick={addRow}
                disabled={ingredients.length === 0}
                className="rounded-md bg-brew-100 px-3 py-1 text-xs font-medium text-brew-700 hover:bg-brew-200 disabled:opacity-50 transition-colors"
              >
                + Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 ? (
              <p className="py-4 text-center text-sm text-brew-400">
                No ingredients in your library yet.{" "}
                <a
                  href="/ingredients"
                  className="text-brew-600 hover:underline"
                >
                  Add some first.
                </a>
              </p>
            ) : rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-brew-400">
                No ingredients added. Click &quot;+ Add Ingredient&quot; to
                start building your recipe.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-brew-500 px-1">
                  <div className="col-span-5">Ingredient</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2 text-right">Unit Cost</div>
                  <div className="col-span-2 text-right">Line Cost</div>
                  <div className="col-span-1"></div>
                </div>

                {rows.map((row, index) => {
                  const ing =
                    row.ingredient ||
                    ingredients.find((i) => i.id === row.ingredient_id);
                  const lineCost = ing
                    ? Number(ing.cost_per_unit) * row.quantity_used
                    : 0;

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-md border border-brew-100 p-2 sm:border-0 sm:p-0"
                    >
                      <div className="sm:col-span-5">
                        <select
                          value={row.ingredient_id}
                          onChange={(e) =>
                            updateRow(index, "ingredient_id", e.target.value)
                          }
                          className="w-full rounded-md border border-brew-200 px-2 py-1.5 text-sm focus:border-brew-500 focus:outline-none"
                        >
                          {ingredients.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity_used || ""}
                          onChange={(e) =>
                            updateRow(index, "quantity_used", e.target.value)
                          }
                          placeholder="0"
                          className="w-full rounded-md border border-brew-200 px-2 py-1.5 text-sm focus:border-brew-500 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2 text-right text-sm text-brew-400">
                        {ing
                          ? `$${Number(ing.cost_per_unit).toFixed(4)}/${ing.unit}`
                          : "—"}
                      </div>
                      <div className="sm:col-span-2 text-right text-sm font-medium">
                        {formatCurrency(lineCost)}
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column - cost summary */}
        <div className="space-y-4">
          <div className="rounded-lg border border-brew-200 bg-white p-4 sticky top-4">
            <h2 className="mb-4 text-sm font-semibold text-brew-700">
              Cost Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-brew-500">Total COGS</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              {price > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-brew-500">Menu Price</span>
                    <span>{formatCurrency(price)}</span>
                  </div>
                  <hr className="border-brew-100" />
                  <div className="flex justify-between text-sm">
                    <span className="text-brew-500">Gross Margin</span>
                    <span
                      className={`font-semibold ${
                        margin !== null && margin >= 65
                          ? "text-margin-good"
                          : margin !== null && margin >= 50
                          ? "text-margin-warn"
                          : "text-margin-bad"
                      }`}
                    >
                      {margin !== null ? formatPercent(margin) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brew-500">Food Cost %</span>
                    <span className="text-brew-700">
                      {foodCost !== null ? formatPercent(foodCost) : "—"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-brew-800 px-4 py-3 text-sm font-medium text-white hover:bg-brew-700 disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Saving..."
              : existingRecipe
              ? "Update Recipe"
              : "Save Recipe"}
          </button>

          {existingRecipe && (
            <a
              href="/"
              className="block text-center text-sm text-brew-500 hover:text-brew-700 hover:underline"
            >
              Cancel
            </a>
          )}
        </div>
      </div>
    </form>
  );
}
