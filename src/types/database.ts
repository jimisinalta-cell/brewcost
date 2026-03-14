export interface Ingredient {
  id: string;
  user_id: string | null;
  name: string;
  unit: string;
  cost_per_unit: number;
  updated_at: string;
}

export interface Recipe {
  id: string;
  user_id: string | null;
  name: string;
  menu_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity_used: number;
}

export interface RecipeIngredientWithDetails extends RecipeIngredient {
  ingredient: Ingredient;
}

export interface RecipeWithDetails extends Recipe {
  recipe_ingredients: RecipeIngredientWithDetails[];
  total_cost: number;
  margin_percent: number | null;
  food_cost_percent: number | null;
}

export type Unit = "oz" | "g" | "ml" | "each" | "lb";

export const UNITS: Unit[] = ["oz", "g", "ml", "each", "lb"];
