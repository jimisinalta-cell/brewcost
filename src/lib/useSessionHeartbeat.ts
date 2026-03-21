"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export function useSessionHeartbeat() {
  const [evicted, setEvicted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function register() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Register session
      const res = await fetch("/api/sessions/register", { method: "POST" });
      if (!res.ok) return;
      registeredRef.current = true;

      // Start heartbeat
      intervalRef.current = setInterval(async () => {
        try {
          const hbRes = await fetch("/api/sessions/heartbeat", {
            method: "POST",
          });
          if (hbRes.status === 401) {
            const body = await hbRes.json();
            if (body.evicted) {
              setEvicted(true);
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
          }
        } catch {
          // Network error — skip this heartbeat
        }
      }, HEARTBEAT_INTERVAL_MS);
    }

    register();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEvictionAck() {
    supabase.auth.signOut().then(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return { evicted, handleEvictionAck };
}
