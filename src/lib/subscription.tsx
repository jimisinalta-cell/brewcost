"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Plan = "free" | "paid";

interface SubscriptionState {
  plan: Plan;
  loading: boolean;
  limits: {
    maxRecipes: number;
    maxIngredients: number;
    gridView: boolean;
    reportView: boolean;
    csvExport: boolean;
  };
  refresh: () => void;
}

const FREE_LIMITS = {
  maxRecipes: 2,
  maxIngredients: 5,
  gridView: false,
  reportView: false,
  csvExport: false,
};

const PAID_LIMITS = {
  maxRecipes: Infinity,
  maxIngredients: Infinity,
  gridView: true,
  reportView: true,
  csvExport: true,
};

const SubscriptionContext = createContext<SubscriptionState>({
  plan: "free",
  loading: true,
  limits: FREE_LIMITS,
  refresh: () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchSubscription() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    setPlan((data?.plan as Plan) || "free");
    setLoading(false);
  }

  useEffect(() => {
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limits = plan === "paid" ? PAID_LIMITS : FREE_LIMITS;

  return (
    <SubscriptionContext.Provider
      value={{ plan, loading, limits, refresh: fetchSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
