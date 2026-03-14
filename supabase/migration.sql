-- BrewCost Database Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Ingredients table
create table if not exists ingredients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  name text not null,
  unit text not null check (unit in ('oz', 'g', 'ml', 'each', 'lb')),
  cost_per_unit decimal(10, 4) not null default 0,
  updated_at timestamptz not null default now()
);

-- Recipes table
create table if not exists recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  name text not null,
  menu_price decimal(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipe ingredients junction table
create table if not exists recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  quantity_used decimal(10, 4) not null default 0
);

-- Indexes
create index if not exists idx_ingredients_user_id on ingredients(user_id);
create index if not exists idx_recipes_user_id on recipes(user_id);
create index if not exists idx_recipe_ingredients_recipe_id on recipe_ingredients(recipe_id);
create index if not exists idx_recipe_ingredients_ingredient_id on recipe_ingredients(ingredient_id);

-- Auto-update updated_at on ingredients
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger ingredients_updated_at
  before update on ingredients
  for each row execute function update_updated_at();

create or replace trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

-- Row Level Security (prepared for future auth)
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

-- Permissive policies for MVP (no auth yet — allow all operations)
create policy "Allow all operations on ingredients" on ingredients for all using (true) with check (true);
create policy "Allow all operations on recipes" on recipes for all using (true) with check (true);
create policy "Allow all operations on recipe_ingredients" on recipe_ingredients for all using (true) with check (true);
