"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Ingredient, Recipe, RecipeIngredient, COMMON_SIZES } from "@/types/database";
import { formatCost, formatPercent, calculateMargin } from "@/lib/utils";
import { useMarginThresholds, getMarginColor } from "@/lib/useMarginThresholds";

interface GridRecipe {
  id: string;
  name: string;
  size: string | null;
  menu_price: number | null;
  quantities: Record<string, number>;
}

interface RecipeGroup {
  groupName: string;
  recipes: GridRecipe[];
  ingredientIds: string[]; // only ingredients used by this group
}

function AddIngredientSelect({
  available,
  onAdd,
}: {
  available: Ingredient[];
  onAdd: (ingId: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <select
      value={value}
      onChange={(e) => {
        const ingId = e.target.value;
        if (ingId) {
          onAdd(ingId);
          setValue("");
        }
      }}
      className="rounded border border-brew-200 bg-white px-2 py-1 text-xs text-brew-600 focus:outline-none"
    >
      <option value="">+ Add ingredient column</option>
      {available.map((ing) => (
        <option key={ing.id} value={ing.id}>
          {ing.name}
        </option>
      ))}
    </select>
  );
}

export default function RecipeGrid() {
  const { thresholds } = useMarginThresholds();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<GridRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // group name being added to
  const [newSize, setNewSize] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSize, setNewGroupSize] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
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
      return { id: r.id, name: r.name, size: r.size, menu_price: r.menu_price, quantities };
    });

    setRecipes(gridRecipes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getGroups(): RecipeGroup[] {
    const groupMap = new Map<string, GridRecipe[]>();
    for (const r of recipes) {
      const list = groupMap.get(r.name) || [];
      list.push(r);
      groupMap.set(r.name, list);
    }

    return Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, groupRecipes]) => {
        // Collect all ingredient IDs referenced by any recipe in this group (including qty 0)
        const ingSet = new Set<string>();
        for (const r of groupRecipes) {
          for (const ingId of Object.keys(r.quantities)) {
            ingSet.add(ingId);
          }
        }
        const ingredientIds = ingredients
          .filter((i) => ingSet.has(i.id))
          .map((i) => i.id);

        // Sort by size
        const sorted = groupRecipes.sort((a, b) => parseSize(a.size) - parseSize(b.size));

        return { groupName, recipes: sorted, ingredientIds };
      });
  }

  function parseSize(size: string | null): number {
    if (!size) return 0;
    const match = size.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function getIngredient(id: string): Ingredient | undefined {
    return ingredients.find((i) => i.id === id);
  }

  function getCost(recipe: GridRecipe): number {
    return Object.entries(recipe.quantities).reduce((sum, [ingId, qty]) => {
      const ing = getIngredient(ingId);
      if (!ing || qty <= 0) return sum;
      return sum + qty * Number(ing.cost_per_recipe_unit);
    }, 0);
  }

  function handleQuantityChange(recipeId: string, ingredientId: string, value: string) {
    const qty = parseFloat(value) || 0;
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, quantities: { ...r.quantities, [ingredientId]: qty } } : r
      )
    );
    const key = `${recipeId}-${ingredientId}`;
    if (saveTimeouts.current[key]) clearTimeout(saveTimeouts.current[key]);
    saveTimeouts.current[key] = setTimeout(() => saveQuantity(recipeId, ingredientId, qty), 500);
  }

  async function saveQuantity(recipeId: string, ingredientId: string, qty: number) {
    const { data: existing } = await supabase
      .from("recipe_ingredients")
      .select("id")
      .eq("recipe_id", recipeId)
      .eq("ingredient_id", ingredientId)
      .maybeSingle();

    if (qty === 0 && existing) {
      await supabase.from("recipe_ingredients").delete().eq("id", existing.id);
    } else if (qty > 0 && existing) {
      await supabase.from("recipe_ingredients").update({ quantity_used: qty }).eq("id", existing.id);
    } else if (qty > 0 && !existing) {
      await supabase
        .from("recipe_ingredients")
        .insert({ recipe_id: recipeId, ingredient_id: ingredientId, quantity_used: qty });
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
      await supabase.from("recipes").update({ menu_price: price }).eq("id", recipeId);
    }, 500);
  }

  async function handleAddSizeVariant(groupName: string) {
    if (!newSize.trim()) return;
    setSaving("new-size");

    // Find an existing recipe in this group to copy ingredients from
    const template = recipes.find((r) => r.name === groupName);

    const { data, error } = await supabase
      .from("recipes")
      .insert({ name: groupName, size: newSize.trim(), menu_price: null })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to add size variant:", error);
      setSaving(null);
      return;
    }

    // Copy ingredients from template with zero quantities
    const newQuantities: Record<string, number> = {};
    if (template) {
      const riInserts = Object.keys(template.quantities)
        .filter((ingId) => template.quantities[ingId] > 0)
        .map((ingId) => {
          newQuantities[ingId] = 0;
          return { recipe_id: data.id, ingredient_id: ingId, quantity_used: 0 };
        });
      if (riInserts.length > 0) {
        await supabase.from("recipe_ingredients").insert(riInserts);
      }
    }

    setRecipes((prev) => [
      ...prev,
      { id: data.id, name: groupName, size: newSize.trim(), menu_price: null, quantities: newQuantities },
    ]);
    setNewSize("");
    setAddingTo(null);
    setSaving(null);
  }

  async function handleAddNewGroup() {
    if (!newGroupName.trim()) return;
    setSaving("new-group");

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        name: newGroupName.trim(),
        size: newGroupSize.trim() || null,
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
        name: newGroupName.trim(),
        size: newGroupSize.trim() || null,
        menu_price: null,
        quantities: {},
      },
    ]);
    setNewGroupName("");
    setNewGroupSize("");
    setShowNewGroup(false);
    setSaving(null);
  }

  async function handleDeleteRow(recipeId: string) {
    if (!confirm("Delete this recipe?")) return;
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
    await supabase.from("recipes").delete().eq("id", recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }

  // Remove an ingredient column from a group
  async function handleRemoveIngredientFromGroup(groupName: string, ingredientId: string) {
    const groupRecipes = recipes.filter((r) => r.name === groupName);

    // Delete all recipe_ingredient rows for this ingredient in this group
    for (const r of groupRecipes) {
      await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", r.id)
        .eq("ingredient_id", ingredientId);
    }

    // Update local state — remove this ingredient key from quantities
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.name !== groupName) return r;
        const { [ingredientId]: _, ...rest } = r.quantities;
        return { ...r, quantities: rest };
      })
    );
  }

  // Add a new ingredient column to a group
  async function handleAddIngredientToGroup(groupName: string, ingredientId: string) {
    // Add zero-quantity rows for all recipes in this group
    const groupRecipes = recipes.filter((r) => r.name === groupName);
    const inserts = groupRecipes.map((r) => ({
      recipe_id: r.id,
      ingredient_id: ingredientId,
      quantity_used: 0,
    }));

    if (inserts.length > 0) {
      await supabase.from("recipe_ingredients").insert(inserts);
    }

    // Update local state
    setRecipes((prev) =>
      prev.map((r) =>
        r.name === groupName ? { ...r, quantities: { ...r.quantities, [ingredientId]: 0 } } : r
      )
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading grid...</div>
      </div>
    );
  }

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

  const groups = getGroups();

  // Ingredients not yet used by a group
  function getAvailableIngredients(usedIds: string[]): Ingredient[] {
    return ingredients.filter((i) => !usedIds.includes(i.id));
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupIngs = group.ingredientIds
          .map((id) => getIngredient(id))
          .filter(Boolean) as Ingredient[];
        const available = getAvailableIngredients(group.ingredientIds);

        return (
          <div key={group.groupName} className="rounded-lg border border-brew-200 bg-white overflow-hidden">
            {/* Group header */}
            <div className="bg-brew-100/60 px-4 py-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-brew-700 uppercase tracking-wide">
                {group.groupName}
              </h3>
              <div className="flex items-center gap-2">
                {available.length > 0 && (
                  <AddIngredientSelect
                    available={available}
                    onAdd={(ingId) => handleAddIngredientToGroup(group.groupName, ingId)}
                  />
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-brew-50/50">
                    <th className="px-3 py-2 text-left font-medium text-brew-500 text-xs min-w-[80px]">
                      Size
                    </th>
                    {groupIngs.map((ing) => (
                      <th
                        key={ing.id}
                        className="px-2 py-2 text-center font-medium text-brew-500 text-xs min-w-[70px]"
                      >
                        <div className="leading-tight">{ing.name}</div>
                        <div className="text-[10px] text-brew-400 font-normal">({ing.recipe_unit})</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove "${ing.name}" from all ${group.groupName} recipes?`)) {
                              handleRemoveIngredientFromGroup(group.groupName, ing.id);
                            }
                          }}
                          className="mt-0.5 text-[10px] text-red-300 hover:text-red-500"
                          title={`Remove ${ing.name} column`}
                        >
                          remove
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-brew-500 text-xs min-w-[70px]">
                      COGS
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-brew-500 text-xs min-w-[70px]">
                      Price
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-brew-500 text-xs min-w-[60px]">
                      Margin
                    </th>
                    <th className="px-2 py-2 w-[30px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.recipes.map((recipe) => {
                    const cost = getCost(recipe);
                    const price = Number(recipe.menu_price) || 0;
                    const margin = price > 0 ? calculateMargin(price, cost) : null;
                    const marginColor = getMarginColor(margin, thresholds);

                    return (
                      <tr key={recipe.id} className="border-t border-brew-100 hover:bg-brew-50/30">
                        <td className="px-3 py-1.5 font-medium text-brew-700 text-sm">
                          {recipe.size || "—"}
                        </td>
                        {groupIngs.map((ing) => (
                          <td key={ing.id} className="px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={recipe.quantities[ing.id] || ""}
                              onChange={(e) =>
                                handleQuantityChange(recipe.id, ing.id, e.target.value)
                              }
                              placeholder="0"
                              className="w-full min-w-[50px] rounded border border-brew-100 px-1.5 py-1 text-center text-sm focus:border-brew-400 focus:outline-none hover:border-brew-200"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-right font-medium whitespace-nowrap text-sm">
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
                            className="w-full min-w-[55px] rounded border border-brew-100 px-1.5 py-1 text-right text-sm focus:border-brew-400 focus:outline-none hover:border-brew-200"
                          />
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-semibold whitespace-nowrap text-sm ${marginColor}`}
                        >
                          {margin !== null ? formatPercent(margin) : "—"}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            onClick={() => handleDeleteRow(recipe.id)}
                            className="text-xs text-red-300 hover:text-red-500"
                            title="Delete this size"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add size variant row */}
                  <tr className="border-t border-brew-200 bg-brew-50/30">
                    <td colSpan={groupIngs.length + 5} className="px-3 py-1.5">
                      {addingTo === group.groupName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newSize}
                            onChange={(e) => setNewSize(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddSizeVariant(group.groupName);
                              if (e.key === "Escape") {
                                setAddingTo(null);
                                setNewSize("");
                              }
                            }}
                            placeholder="e.g. 20 oz"
                            list={`sizes-${group.groupName}`}
                            className="w-28 rounded border border-brew-200 px-2 py-1 text-xs focus:border-brew-400 focus:outline-none"
                            autoFocus
                          />
                          <datalist id={`sizes-${group.groupName}`}>
                            {COMMON_SIZES.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                          <button
                            onClick={() => handleAddSizeVariant(group.groupName)}
                            disabled={!newSize.trim() || saving === "new-size"}
                            className="rounded bg-brew-800 px-2 py-1 text-xs font-medium text-white hover:bg-brew-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingTo(null);
                              setNewSize("");
                            }}
                            className="text-xs text-brew-400 hover:text-brew-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTo(group.groupName)}
                          className="text-xs text-brew-500 hover:text-brew-700 font-medium"
                        >
                          + Add size
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Add new recipe group */}
      <div className="rounded-lg border border-dashed border-brew-300 bg-white p-4">
        {showNewGroup ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGroupName.trim()) handleAddNewGroup();
                if (e.key === "Escape") {
                  setShowNewGroup(false);
                  setNewGroupName("");
                  setNewGroupSize("");
                }
              }}
              placeholder="Recipe name (e.g. Mocha)"
              className="w-48 rounded border border-brew-200 px-3 py-2 text-sm focus:border-brew-400 focus:outline-none"
              autoFocus
            />
            <input
              type="text"
              value={newGroupSize}
              onChange={(e) => setNewGroupSize(e.target.value)}
              placeholder="First size (e.g. 12 oz)"
              list="new-group-sizes"
              className="w-36 rounded border border-brew-200 px-3 py-2 text-sm focus:border-brew-400 focus:outline-none"
            />
            <datalist id="new-group-sizes">
              {COMMON_SIZES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <button
              onClick={handleAddNewGroup}
              disabled={!newGroupName.trim() || saving === "new-group"}
              className="rounded bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 disabled:opacity-50"
            >
              {saving === "new-group" ? "Adding..." : "Add Recipe"}
            </button>
            <button
              onClick={() => {
                setShowNewGroup(false);
                setNewGroupName("");
                setNewGroupSize("");
              }}
              className="text-sm text-brew-400 hover:text-brew-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewGroup(true)}
            className="w-full text-center text-sm text-brew-500 hover:text-brew-700 font-medium py-2"
          >
            + Add New Recipe
          </button>
        )}
      </div>
    </div>
  );
}
