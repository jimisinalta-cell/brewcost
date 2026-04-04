-- Migration 003: Auth, billing, and session tables
-- Run this in Supabase SQL Editor

-- ============================================
-- Subscriptions table
-- ============================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles writes (from Stripe webhooks)
-- No insert/update/delete policy for anon — webhooks use admin client

-- ============================================
-- Auto-create free subscription on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Active sessions table (anti-sharing)
-- ============================================
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_heartbeat ON public.user_sessions(last_heartbeat);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON public.user_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- Free-tier limit triggers
-- ============================================

-- Prevent free users from exceeding 2 recipes
CREATE OR REPLACE FUNCTION public.check_recipe_limit()
RETURNS trigger AS $$
DECLARE
  user_plan text;
  recipe_count int;
BEGIN
  SELECT plan INTO user_plan FROM public.subscriptions WHERE user_id = NEW.user_id;
  IF user_plan = 'free' THEN
    SELECT count(*) INTO recipe_count FROM public.recipes WHERE user_id = NEW.user_id;
    IF recipe_count >= 2 THEN
      RAISE EXCEPTION 'Free tier limited to 2 recipes. Please upgrade.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_recipe_limit
  BEFORE INSERT ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.check_recipe_limit();

-- Prevent free users from exceeding 5 ingredients
CREATE OR REPLACE FUNCTION public.check_ingredient_limit()
RETURNS trigger AS $$
DECLARE
  user_plan text;
  ingredient_count int;
BEGIN
  SELECT plan INTO user_plan FROM public.subscriptions WHERE user_id = NEW.user_id;
  IF user_plan = 'free' THEN
    SELECT count(*) INTO ingredient_count FROM public.ingredients WHERE user_id = NEW.user_id;
    IF ingredient_count >= 5 THEN
      RAISE EXCEPTION 'Free tier limited to 5 ingredients. Please upgrade.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_ingredient_limit
  BEFORE INSERT ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.check_ingredient_limit();

-- ============================================
-- Cleanup stale sessions (run via pg_cron or manually)
-- ============================================
-- To set up pg_cron (optional, enable in Supabase Dashboard > Database > Extensions):
-- SELECT cron.schedule('cleanup-dead-sessions', '*/5 * * * *', $$
--   DELETE FROM public.user_sessions WHERE last_heartbeat < now() - interval '2 minutes';
-- $$);
