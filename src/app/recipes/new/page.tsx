"use client";

import { useEffect, useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useSubscription } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/client";

export default function NewRecipePage() {
  const { limits, loading: subLoading } = useSubscription();
  const [recipeCount, setRecipeCount] = useState<number | null>(null);

  useEffect(() => {
    if (limits.maxRecipes === Infinity) {
      setRecipeCount(0);
      return;
    }
    const supabase = createClient();
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setRecipeCount(count ?? 0));
  }, [limits.maxRecipes]);

  if (subLoading || recipeCount === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading...</div>
      </div>
    );
  }

  if (recipeCount >= limits.maxRecipes) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">New Recipe</h1>
        <UpgradePrompt feature={`Unlimited recipes (${recipeCount}/${limits.maxRecipes} used)`} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">New Recipe</h1>
      <RecipeForm />
    </div>
  );
}
