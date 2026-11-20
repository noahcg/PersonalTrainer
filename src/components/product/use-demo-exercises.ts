"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/types";

export const demoExerciseStorageKey = "nick-glushien-demo-exercises";
export function useDemoExercises(initialExercises: Exercise[], mode: "demo" | "supabase") {
  const [exercises, setExercises] = useState(initialExercises);
  useEffect(() => {
    if (mode !== "demo") return;
    function read() {
      const stored = window.localStorage.getItem(demoExerciseStorageKey);
      if (!stored) return;
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => item && typeof item.id === "string" && typeof item.name === "string" && ["equipment", "muscleGroups", "tags", "cues", "mistakes", "substitutions"].every((key) => Array.isArray(item[key])))) setExercises(parsed);
      } catch { /* Retain unreadable legacy storage for recovery. */ }
    }
    const timeout = window.setTimeout(read, 0);
    window.addEventListener("storage", read);
    return () => { window.clearTimeout(timeout); window.removeEventListener("storage", read); };
  }, [mode]);
  return [exercises, setExercises] as const;
}
