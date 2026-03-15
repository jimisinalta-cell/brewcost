"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Ingredient, Recipe, RecipeIngredient, COMMON_SIZES } from "@/types/database";
import { formatCost, formatCurrency, formatPercent, calculateMargin } from "@/lib/utils";

interface GridRecipe {
  id: string;
  name: string;
  size: string | null;
  menu_price: number | null;
  quantities: Record<string, number>; // ingredient_id -> quantity
  isNew?: boolean;
}

export default function RecipeGrid() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<GridRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newRowName, setNewRowName] = useState("");
  const [newRowSize, setNewRowSize] = useState("");
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchData = useCallback(async () => {
    const [{ data: ingData }, { data: recData }, { data: riData }] = await Promise.all([
      supabase.from("ingredients").select("*").order("name"),
      supabase.from("recipes").select("*").order("name"),
      supabase.from("recipe_ingredients").select("*"),
    ]);

    setIngredients(ingData || []);

    const riByRecipe = new Map<string, RecipeIngredient[]>();
    if (riData) {
      for (const ri of riData as RecipeIngredient[]) {
        const list = riByRecipe.get(ri.recipe_id) || [];
        list.push(ri);
        riByRecipe.set(ri.recipe_id, list);
      }
    }

    const gridRecipes: GridRecipe[] = (recData || []).map((r: Recipe) => {
      const ris = riByRecipe.get(r.id) || [];
      const quantities: Record<string, number> = {};
      for (const ri of ris) {
        quantities[ri.ingredient_id] = Number(ri.quantity_used);
      }
      return {
        id: r.id,
        name: r.name,
        size: r.size,
        menu_price: r.menu_price,
        quantities,
      };
    });

    setRecipes(gridRecipes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getCost(recipe: GridRecipe): number {
    return ingredients.reduce((sum, ing) => {
      const qty = recipe.quantities[ing.id] || 0;
      return sum + qty * Number(ing.cost_per_recipe_unit);
    }, 0);
  }

  // Debounced save for quantity changes
  function handleQuantityChange(recipeId: string, ingredientId: string, value: string) {
    const qty = parseFloat(value) || 0;

    // Optimistic update
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        return { ...r, quantities: { ...r.quantities, [ingredientId]: qty } };
      })
    );

    // Debounce the save
    const key = `${recipeId}-${ingredientId}`;
    if (saveTimeouts.current[key]) clearTimeout(saveTimeouts.current[key]);
    saveTimeouts.current[key] = setTimeout(() => saveQuantity(recipeId, ingredientId, qty), 500);
  }

  async function saveQuantity(recipeId: string, ingredientId: string, qty: number) {
    // Check if a recipe_ingredient row exists
    const { data: existing } = await supabase
      .from("recipe_ingredients")
      .select("id")
      .eq("recipe_id", recipeId)
      .eq("ingredient_id", ingredientId)
      .maybeSingle();

    if (qty === 0 && existing) {
      await supabase.from("recipe_ingredients").delete().eq("id", existing.id);
    } else if (qty > 0 && existing) {
      await supabase
        .from("recipe_ingredients")
        .update({ quantity_used: qty })
        .eq("id", existing.id);
    } else if (qty > 0 && !existing) {
      await supabase.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity_used: qty,
      });
    }
  }

  function handleMenuPriceChange(recipeId: string, value: string) {
    const price = parseFloat(value) || null;
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, menu_price: price } : r))
    );

    const key = `price-${recipeId}`;
    if (saveTimeouts.current[key]) clearTimeout(saveTimeouts.current[key]);
    saveTimeouts.current[key] = setTimeout(async () => {
      await supabase
        .from("recipes")
        .update({ menu_price: price })
        .eq("id", recipeId);
    }, 500);
  }

  async function handleAddRow() {
    if (!newRowName.trim()) return;
    setSaving("new");

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        name: newRowName.trim(),
        size: newRowSize.trim() || null,
        menu_price: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to add recipe:", error);
      setSaving(null);
      return;
    }

    setRecipes((prev) => [
      ...prev,
      {
        id: data.id,
        name: newRowName.trim(),
        size: newRowSize.trim() || null,
        menu_price: null,
        quantities: {},
        isNew: true,
      },
    ]);
    setNewRowName("");
    setNewRowSize("");
    setSaving(null);
  }

  async function handleDeleteRow(recipeId: string) {
    if (!confirm("Delete this recipe?")) return;
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
    await supabase.from("recipes").delete().eq("id", recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading grid...</div>
      </div>
    );
  }

  // Group recipes by name, sort by size within each group
  function getSortedGroupedRecipes(): { groupName: string; recipes: GridRecipe[] }[] {
    const groups = new Map<string, GridRecipe[]>();
    for (const r of recipes) {
      const list = groups.get(r.name) || [];
      list.push(r);
      groups.set(r.name, list);
    }

    // Sort groups alphabetically by name
    const sortedGroups = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, groupRecipes]) => ({
        groupName,
        recipes: groupRecipes.sort((a, b) => {
          const sizeA = parseSize(a.size);
          const sizeB = parseSize(b.size);
          return sizeA - sizeB;
        }),
      }));

    return sortedGroups;
  }

  function parseSize(size: string | null): number {
    if (!size) return 0;
    const match = size.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  const groupedRecipes = getSortedGroupedRecipes();

  if (ingredients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brew-300 bg-white py-16 text-center">
        <p className="text-brew-500 text-lg">No ingredients yet</p>
        <p className="text-brew-400 text-sm mt-1">
          <a href="/ingredients" className="text-brew-600 hover:underline">
            Add ingredients
          </a>{" "}
          first, then come back to build recipes in the grid.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-brew-50">
            <th className="sticky left-0 z-10 bg-brew-50 px-3 py-2 text-left font-medium text-brew-600 border-b border-brew-200 min-w-[140px]">
              Recipe
            </th>
            <th className="px-3 py-2 text-left font-medium text-brew-600 border-b border-brew-200 min-w-[70px]">
              Size
            </th>
            {ingredients.map((ing) => (
              <th
                key={ing.id}
                className="px-2 py-2 text-center font-medium text-brew-600 border-b border-brew-200 min-w-[70px]"
              >
                <div className="text-xs leading-tight">{ing.name}</div>
                <div className="text-[10px] text-brew-400 font-normal">({ing.recipe_unit})</div>
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium text-brew-600 border-b border-brew-200 min-w-[80px]">
              COGS
            </th>
            <th className="px-3 py-2 text-right font-medium text-brew-600 border-b border-brew-200 min-w-[80px]">
              Price
            </th>
            <th className="px-3 py-2 text-right font-medium text-brew-600 border-b border-brew-200 min-w-[70px]">
              Margin
            </th>
            <th className="px-2 py-2 border-b border-brew-200 w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {groupedRecipes.map((group) => (
            <React.Fragment key={group.groupName}>
              {/* Group header - only show if there are multiple groups or multiple sizes */}
              {(groupedRecipes.length > 1 || group.recipes.length > 1) && (
                <tr className="bg-brew-100/50">
                  <td
                    colSpan={ingredients.length + 6}
                    className="sticky left-0 z-10 bg-brew-100/50 px-3 py-1.5 text-xs font-semibold text-brew-600 tracking-wide uppercase"
                  >
                    {group.groupName}
                  </td>
                </tr>
              )}
              {group.recipes.map((recipe) => {
                const cost = getCost(recipe);
                const price = Number(recipe.menu_price) || 0;
                const margin = price > 0 ? calculateMargin(price, cost) : null;
                const marginColor =
                  margin === null
                    ? "text-brew-400"
                    : margin >= 65
                    ? "text-margin-good"
                    : margin >= 50
                    ? "text-margin-warn"
                    : "text-margin-bad";

                const showName = group.recipes.length === 1 && groupedRecipes.length <= 1;

                return (
                  <tr key={recipe.id} className="border-b border-brew-100 hover:bg-brew-50/30">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-brew-800">
                      {showName ? recipe.name : (
                        <span className="pl-2 text-brew-600">
                          {recipe.size || recipe.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-brew-400 text-xs">
                      {showName ? (recipe.size || "—") : (recipe.size ? "" : "—")}
                    </td>
                    {ingredients.map((ing) => (
                      <td key={ing.id} className="px-1 py-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={recipe.quantities[ing.id] || ""}
                          onChange={(e) => handleQuantityChange(recipe.id, ing.id, e.target.value)}
                          placeholder="0"
                          className="w-full min-w-[50px] rounded border border-brew-100 px-1.5 py-1 text-center text-sm focus:border-brew-400 focus:outline-none hover:border-brew-200"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-medium whitespace-nowrap">
                      {formatCost(cost)}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recipe.menu_price ?? ""}
                        onChange={(e) => handleMenuPriceChange(recipe.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full min-w-[60px] rounded border border-brew-100 px-1.5 py-1 text-right text-sm focus:border-brew-400 focus:outline-none hover:border-brew-200"
                      />
                    </td>
                    <td className={`px-3 py-1.5 text-right font-semibold whitespace-nowrap ${marginColor}`}>
                      {margin !== null ? formatPercent(margin) : "—"}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <button
                        onClick={() => handleDeleteRow(recipe.id)}
                        className="text-xs text-red-300 hover:text-red-500"
                        title="Delete recipe"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}

          {/* Add new row */}
          <tr className="border-t-2 border-brew-200 bg-brew-50/50">
            <td className="sticky left-0 z-10 bg-brew-50/50 px-3 py-2">
              <input
                type="text"
                value={newRowName}
                onChange={(e) => setNewRowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRowName.trim()) handleAddRow();
                }}
                placeholder="New recipe name..."
                className="w-full rounded border border-brew-200 px-2 py-1 text-sm focus:border-brew-400 focus:outline-none"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="text"
                value={newRowSize}
                onChange={(e) => setNewRowSize(e.target.value)}
                placeholder="Size"
                list="grid-sizes"
                className="w-full rounded border border-brew-200 px-2 py-1 text-sm focus:border-brew-400 focus:outline-none"
              />
              <datalist id="grid-sizes">
                {COMMON_SIZES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </td>
            <td colSpan={ingredients.length + 3} className="px-3 py-2">
              <button
                onClick={handleAddRow}
                disabled={!newRowName.trim() || saving === "new"}
                className="rounded bg-brew-800 px-3 py-1 text-xs font-medium text-white hover:bg-brew-700 disabled:opacity-50 transition-colors"
              >
                {saving === "new" ? "Adding..." : "+ Add Row"}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
