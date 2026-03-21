-- Migration 004: Row-Level Security for multi-tenant user scoping
-- Run this AFTER migration_003 and AFTER you have signed up and noted your auth user UUID.
--
-- IMPORTANT: Before running this, replace YOUR_AUTH_USER_UUID below with your actual
-- Supabase auth user ID (found in Supabase Dashboard > Authentication > Users).

-- ============================================
-- Step 1: Assign existing data to your user
-- ============================================
-- UPDATE ingredients SET user_id = 'YOUR_AUTH_USER_UUID' WHERE user_id IS NULL;
-- UPDATE recipes SET user_id = 'YOUR_AUTH_USER_UUID' WHERE user_id IS NULL;

-- ============================================
-- Step 2: Set default to auth.uid() so inserts auto-populate
-- ============================================
ALTER TABLE public.ingredients ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.recipes ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ============================================
-- Step 3: Make user_id NOT NULL (run after Step 1 backfill)
-- ============================================
-- ALTER TABLE public.ingredients ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE public.recipes ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- Step 4: Replace permissive RLS policies with user-scoped ones
-- ============================================

-- Ingredients
DROP POLICY IF EXISTS "Allow all" ON public.ingredients;
DROP POLICY IF EXISTS "Enable read for all users" ON public.ingredients;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.ingredients;
DROP POLICY IF EXISTS "Enable update for all users" ON public.ingredients;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.ingredients;

CREATE POLICY "Users manage own ingredients"
  ON public.ingredients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recipes
DROP POLICY IF EXISTS "Allow all" ON public.recipes;
DROP POLICY IF EXISTS "Enable read for all users" ON public.recipes;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.recipes;
DROP POLICY IF EXISTS "Enable update for all users" ON public.recipes;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.recipes;

CREATE POLICY "Users manage own recipes"
  ON public.recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recipe ingredients (scoped through recipe ownership)
DROP POLICY IF EXISTS "Allow all" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Enable read for all users" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Enable update for all users" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.recipe_ingredients;

CREATE POLICY "Users manage own recipe ingredients"
  ON public.recipe_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );
