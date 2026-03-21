// Backward-compatible shim — existing imports of `supabase` continue working.
// New code should import `createClient` from "@/lib/supabase/client" directly.
import { createClient } from "./supabase/client";

export { createClient };
export const supabase = createClient();
