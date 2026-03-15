"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Ingredient,
  PurchaseUnit,
  RecipeUnit,
  PURCHASE_UNITS,
  RECIPE_UNITS,
  getCompatibleRecipeUnits,
  convertToRecipeUnit,
} from "@/types/database";
import { formatCurrency } from "@/lib/utils";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // New ingredient form state
  const [newName, setNewName] = useState("");
  const [newPurchaseUnit, setNewPurchaseUnit] = useState<PurchaseUnit>("gallon");
  const [newPurchaseSize, setNewPurchaseSize] = useState("1");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [newRecipeUnit, setNewRecipeUnit] = useState<RecipeUnit>("oz");

  const fetchIngredients = useCallback(async () => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .order("name");
    if (error) {
      console.error("Failed to fetch ingredients:", error);
      return;
    }
    setIngredients(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // When purchase unit changes, update compatible recipe units
  useEffect(() => {
    const compatible = getCompatibleRecipeUnits(newPurchaseUnit);
    if (!compatible.includes(newRecipeUnit)) {
      setNewRecipeUnit(compatible[0]);
    }
  }, [newPurchaseUnit, newRecipeUnit]);

  function resetForm() {
    setNewName("");
    setNewPurchaseUnit("gallon");
    setNewPurchaseSize("1");
    setNewPurchasePrice("");
    setNewRecipeUnit("oz");
    setShowForm(false);
  }

  const newCostPerRecipeUnit =
    newPurchasePrice && newPurchaseSize
      ? convertToRecipeUnit(
          newPurchaseUnit,
          parseFloat(newPurchaseSize) || 0,
          parseFloat(newPurchasePrice) || 0,
          newRecipeUnit
        )
      : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPurchasePrice) return;
    setSaving(true);

    const costPerRecipeUnit = convertToRecipeUnit(
      newPurchaseUnit,
      parseFloat(newPurchaseSize) || 1,
      parseFloat(newPurchasePrice) || 0,
      newRecipeUnit
    );

    const { error } = await supabase.from("ingredients").insert({
      name: newName.trim(),
      purchase_unit: newPurchaseUnit,
      purchase_size: parseFloat(newPurchaseSize) || 1,
      purchase_price: parseFloat(newPurchasePrice) || 0,
      recipe_unit: newRecipeUnit,
      cost_per_recipe_unit: costPerRecipeUnit,
    });
    if (error) {
      console.error("Failed to add ingredient:", error);
      setSaving(false);
      return;
    }
    resetForm();
    setSaving(false);
    fetchIngredients();
  }

  async function handleUpdatePrice(id: string) {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) return;

    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return;

    const newCost = convertToRecipeUnit(
      ing.purchase_unit as PurchaseUnit,
      Number(ing.purchase_size),
      price,
      ing.recipe_unit as RecipeUnit
    );

    // Optimistic update
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              purchase_price: price,
              cost_per_recipe_unit: newCost,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );
    setEditingId(null);

    const { error } = await supabase
      .from("ingredients")
      .update({ purchase_price: price, cost_per_recipe_unit: newCost })
      .eq("id", id);
    if (error) {
      console.error("Failed to update price:", error);
      fetchIngredients();
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this ingredient? It will be removed from all recipes using it."
      )
    )
      return;
    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Failed to delete ingredient:", error);
      return;
    }
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  function getPurchaseLabel(unit: string): string {
    return PURCHASE_UNITS.find((u) => u.value === unit)?.label || unit;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading ingredients...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingredient Library</h1>
          <p className="text-sm text-brew-500 mt-1">
            Enter what you pay. We calculate the cost per recipe unit
            automatically.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Ingredient"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-lg border border-brew-200 bg-white p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-brew-600">
                Ingredient Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Whole Milk"
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brew-600">
                I buy per
              </label>
              <select
                value={newPurchaseUnit}
                onChange={(e) =>
                  setNewPurchaseUnit(e.target.value as PurchaseUnit)
                }
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
              >
                {PURCHASE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brew-600">
                {newPurchaseUnit === "case"
                  ? "Units per case"
                  : "Qty purchased"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newPurchaseSize}
                onChange={(e) => setNewPurchaseSize(e.target.value)}
                placeholder={newPurchaseUnit === "case" ? "e.g. 500" : "1"}
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brew-600">
                Price paid ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPurchasePrice}
                onChange={(e) => setNewPurchasePrice(e.target.value)}
                placeholder="4.99"
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brew-600">
                Recipe unit
              </label>
              <select
                value={newRecipeUnit}
                onChange={(e) =>
                  setNewRecipeUnit(e.target.value as RecipeUnit)
                }
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
              >
                {getCompatibleRecipeUnits(newPurchaseUnit).map((u) => {
                  const label =
                    RECIPE_UNITS.find((r) => r.value === u)?.label || u;
                  return (
                    <option key={u} value={u}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {newPurchasePrice && (
            <div className="mt-3 rounded-md bg-brew-50 px-3 py-2 text-sm text-brew-700">
              Cost per {newRecipeUnit}:{" "}
              <span className="font-semibold">
                ${newCostPerRecipeUnit.toFixed(4)}
              </span>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brew-800 px-6 py-2 text-sm font-medium text-white hover:bg-brew-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Adding..." : "Add Ingredient"}
            </button>
          </div>
        </form>
      )}

      {ingredients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brew-300 bg-white py-16 text-center">
          <p className="text-brew-500 text-lg">No ingredients yet</p>
          <p className="text-brew-400 text-sm mt-1">
            Add your first ingredient to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ingredients.map((ing) => (
            <div
              key={ing.id}
              className="rounded-lg border border-brew-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-brew-800">{ing.name}</h3>
                  <p className="text-sm text-brew-400 mt-0.5">
                    {ing.purchase_unit === "case"
                      ? `Case of ${Number(ing.purchase_size)}`
                      : `${Number(ing.purchase_size)} ${getPurchaseLabel(ing.purchase_unit)}`}{" "}
                    @{" "}
                    {editingId === ing.id ? (
                      <span className="inline-flex items-center gap-1">
                        $
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdatePrice(ing.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-20 rounded border border-brew-300 px-1.5 py-0.5 text-sm focus:border-brew-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdatePrice(ing.id)}
                          className="text-xs text-brew-800 font-medium hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-brew-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(ing.id);
                          setEditPrice(String(ing.purchase_price));
                        }}
                        className="cursor-pointer font-medium text-brew-700 hover:text-brew-900 hover:underline"
                        title="Click to update price"
                      >
                        {formatCurrency(Number(ing.purchase_price))}
                      </button>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-brew-800">
                    ${Number(ing.cost_per_recipe_unit).toFixed(4)}
                    <span className="text-sm font-normal text-brew-400">
                      /{ing.recipe_unit}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-2 justify-end">
                    <span className="text-xs text-brew-400">
                      Updated {new Date(ing.updated_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDelete(ing.id)}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
