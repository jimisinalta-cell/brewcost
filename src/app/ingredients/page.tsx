"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Ingredient, UNITS, Unit } from "@/types/database";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState<Unit>("oz");
  const [newCost, setNewCost] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newCost) return;
    setSaving(true);
    const { error } = await supabase.from("ingredients").insert({
      name: newName.trim(),
      unit: newUnit,
      cost_per_unit: parseFloat(newCost),
    });
    if (error) {
      console.error("Failed to add ingredient:", error);
      setSaving(false);
      return;
    }
    setNewName("");
    setNewUnit("oz");
    setNewCost("");
    setShowForm(false);
    setSaving(false);
    fetchIngredients();
  }

  async function handleUpdateCost(id: string) {
    const cost = parseFloat(editCost);
    if (isNaN(cost) || cost < 0) return;

    // Optimistic update
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, cost_per_unit: cost, updated_at: new Date().toISOString() }
          : i
      )
    );
    setEditingId(null);

    const { error } = await supabase
      .from("ingredients")
      .update({ cost_per_unit: cost })
      .eq("id", id);
    if (error) {
      console.error("Failed to update cost:", error);
      fetchIngredients(); // revert on error
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ingredient? It will be removed from all recipes using it.")) return;
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
            Update prices here and all recipes recalculate automatically.
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-brew-600">
                Name
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
                Unit
              </label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as Unit)}
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brew-600">
                Cost per unit ($)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-brew-200 px-3 py-2 text-sm focus:border-brew-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
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
        <div className="overflow-hidden rounded-lg border border-brew-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brew-100 bg-brew-50">
                <th className="px-4 py-3 text-left font-medium text-brew-600">
                  Ingredient
                </th>
                <th className="px-4 py-3 text-left font-medium text-brew-600">
                  Unit
                </th>
                <th className="px-4 py-3 text-right font-medium text-brew-600">
                  Cost / Unit
                </th>
                <th className="px-4 py-3 text-right font-medium text-brew-600">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-right font-medium text-brew-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr
                  key={ing.id}
                  className="border-b border-brew-100 last:border-b-0 hover:bg-brew-50/50"
                >
                  <td className="px-4 py-3 font-medium">{ing.name}</td>
                  <td className="px-4 py-3 text-brew-500">{ing.unit}</td>
                  <td className="px-4 py-3 text-right">
                    {editingId === ing.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-brew-400">$</span>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={editCost}
                          onChange={(e) => setEditCost(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateCost(ing.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-24 rounded border border-brew-300 px-2 py-1 text-right text-sm focus:border-brew-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCost(ing.id)}
                          className="text-xs text-brew-800 font-medium hover:underline"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(ing.id);
                          setEditCost(String(ing.cost_per_unit));
                        }}
                        className="cursor-pointer hover:text-brew-800 hover:underline"
                        title="Click to edit price"
                      >
                        ${Number(ing.cost_per_unit).toFixed(4)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-brew-400">
                    {new Date(ing.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(ing.id)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
