-- Migration: Add purchase unit conversion system
-- Replaces simple unit/cost_per_unit with purchase tracking + auto-calculated recipe unit cost

-- Drop old constraint
alter table ingredients drop constraint if exists ingredients_unit_check;

-- Rename old columns
alter table ingredients rename column unit to purchase_unit;
alter table ingredients rename column cost_per_unit to purchase_price;

-- Add new columns
alter table ingredients add column if not exists purchase_size decimal(10, 4) not null default 1;
alter table ingredients add column if not exists recipe_unit text not null default 'oz';
alter table ingredients add column if not exists cost_per_recipe_unit decimal(10, 6) not null default 0;

-- Add constraints for valid units
alter table ingredients add constraint ingredients_purchase_unit_check
  check (purchase_unit in ('gallon', 'half_gallon', 'quart', 'liter', 'ml', 'oz', 'lb', 'kg', 'g', 'each'));

alter table ingredients add constraint ingredients_recipe_unit_check
  check (recipe_unit in ('oz', 'ml', 'g', 'each'));
