"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/types/database";
import RecipeForm from "@/components/RecipeForm";

export default function EditRecipePage() {
  const params = useParams();
  const id = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipe() {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        console.error("Failed to fetch recipe:", error);
      } else {
        setRecipe(data);
      }
      setLoading(false);
    }
    fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brew-500">Loading recipe...</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="py-20 text-center">
        <p className="text-brew-500 text-lg">Recipe not found</p>
        <a href="/" className="mt-2 inline-block text-sm text-brew-600 hover:underline">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Recipe</h1>
      <RecipeForm existingRecipe={recipe} />
    </div>
  );
}
