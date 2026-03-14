export interface Ingredient {
  id: string;
  user_id: string | null;
  name: string;
  purchase_unit: PurchaseUnit;
  purchase_size: number;
  purchase_price: number;
  recipe_unit: RecipeUnit;
  cost_per_recipe_unit: number;
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

// What you buy in (e.g. "1 gallon of milk for $4.99")
export type PurchaseUnit =
  | "gallon"
  | "half_gallon"
  | "quart"
  | "liter"
  | "ml"
  | "oz"
  | "lb"
  | "kg"
  | "g"
  | "each";

// What you measure per drink (e.g. "8 oz of milk")
export type RecipeUnit = "oz" | "ml" | "g" | "each";

export const PURCHASE_UNITS: { value: PurchaseUnit; label: string }[] = [
  { value: "gallon", label: "Gallon" },
  { value: "half_gallon", label: "Half Gallon" },
  { value: "quart", label: "Quart" },
  { value: "liter", label: "Liter" },
  { value: "ml", label: "mL" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "each", label: "Each" },
];

export const RECIPE_UNITS: { value: RecipeUnit; label: string }[] = [
  { value: "oz", label: "oz" },
  { value: "ml", label: "mL" },
  { value: "g", label: "g" },
  { value: "each", label: "Each" },
];

// Conversion factors to base units (oz for volume, g for weight)
// Volume: base = oz
// Weight: base = g
const TO_OZ: Record<string, number> = {
  gallon: 128,
  half_gallon: 64,
  quart: 32,
  liter: 33.814,
  ml: 0.033814,
  oz: 1,
};

const TO_G: Record<string, number> = {
  lb: 453.592,
  kg: 1000,
  g: 1,
};

const VOLUME_UNITS = new Set(["gallon", "half_gallon", "quart", "liter", "ml", "oz"]);
const WEIGHT_UNITS = new Set(["lb", "kg", "g"]);

export function getCompatibleRecipeUnits(purchaseUnit: PurchaseUnit): RecipeUnit[] {
  if (purchaseUnit === "each") return ["each"];
  if (VOLUME_UNITS.has(purchaseUnit)) return ["oz", "ml"];
  if (WEIGHT_UNITS.has(purchaseUnit)) return ["g"];
  return ["oz", "ml", "g", "each"];
}

export function convertToRecipeUnit(
  purchaseUnit: PurchaseUnit,
  purchaseSize: number,
  purchasePrice: number,
  recipeUnit: RecipeUnit
): number {
  if (purchaseUnit === "each" && recipeUnit === "each") {
    return purchaseSize > 0 ? purchasePrice / purchaseSize : 0;
  }

  // Volume conversions (everything through oz)
  if (VOLUME_UNITS.has(purchaseUnit) && (recipeUnit === "oz" || recipeUnit === "ml")) {
    const totalOz = purchaseSize * (TO_OZ[purchaseUnit] || 1);
    if (totalOz === 0) return 0;
    const pricePerOz = purchasePrice / totalOz;
    if (recipeUnit === "oz") return pricePerOz;
    // oz to ml: 1 oz = 29.5735 ml, so price per ml = price per oz / 29.5735
    return pricePerOz / 29.5735;
  }

  // Weight conversions (everything through g)
  if (WEIGHT_UNITS.has(purchaseUnit) && recipeUnit === "g") {
    const totalG = purchaseSize * (TO_G[purchaseUnit] || 1);
    if (totalG === 0) return 0;
    return purchasePrice / totalG;
  }

  return 0;
}
