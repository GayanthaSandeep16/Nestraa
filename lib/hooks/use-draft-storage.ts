"use client";

import { useEffect, useState } from "react";

// Persists in-progress form entries to localStorage so a sales rep on a poor
// mobile connection doesn't lose a half-filled sale/return/payment form to
// an accidental reload or navigation — not a request queue or offline sync,
// just draft survival.
export function useDraftStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private browsing, quota) — draft just won't persist
    }
  }, [key, value]);

  function clear() {
    setValue(initial);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  return [value, setValue, clear] as const;
}
