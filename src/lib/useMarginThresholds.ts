"use client";

import { useState, useEffect } from "react";

export interface MarginThresholds {
  green: number;
  yellow: number;
  red: number;
}

const STORAGE_KEY = "brewcost-margin-thresholds";
const DEFAULTS: MarginThresholds = { green: 80, yellow: 70, red: 60 };

export function useMarginThresholds() {
  const [thresholds, setThresholds] = useState<MarginThresholds>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setThresholds({
          green: parsed.green ?? DEFAULTS.green,
          yellow: parsed.yellow ?? DEFAULTS.yellow,
          red: parsed.red ?? DEFAULTS.red,
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  function update(newThresholds: MarginThresholds) {
    setThresholds(newThresholds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newThresholds));
  }

  return { thresholds, updateThresholds: update, loaded };
}

export function getMarginColor(margin: number | null, t: MarginThresholds): string {
  if (margin === null) return "text-brew-400";
  if (margin >= t.green) return "text-emerald-600";
  if (margin >= t.yellow) return "text-amber-500";
  return "text-red-500";
}

export function getMarginDot(margin: number | null, t: MarginThresholds): string {
  if (margin === null) return "bg-brew-300";
  if (margin >= t.green) return "bg-emerald-500";
  if (margin >= t.yellow) return "bg-amber-400";
  return "bg-red-500";
}

export function getMarginBorder(margin: number | null, t: MarginThresholds): string {
  if (margin === null) return "border-l-transparent";
  if (margin >= t.green) return "border-l-transparent";
  if (margin >= t.yellow) return "border-l-amber-400";
  return "border-l-red-400";
}
