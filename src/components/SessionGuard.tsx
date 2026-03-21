"use client";

import { useSessionHeartbeat } from "@/lib/useSessionHeartbeat";
import type { ReactNode } from "react";

export default function SessionGuard({ children }: { children: ReactNode }) {
  const { evicted, handleEvictionAck } = useSessionHeartbeat();

  if (evicted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brew-900/60">
        <div className="mx-4 max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
          <div className="text-2xl mb-3">&#128274;</div>
          <h2 className="text-lg font-semibold text-brew-800">
            Signed Out
          </h2>
          <p className="mt-2 text-sm text-brew-500">
            Your account was signed in on another device. Only one active
            session is allowed at a time.
          </p>
          <button
            onClick={handleEvictionAck}
            className="mt-4 rounded-md bg-brew-700 px-4 py-2 text-sm font-medium text-white hover:bg-brew-800 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
