"use client";

import type { CheckIn } from "@/lib/types";

const demoCheckinsStorageKey = "aurelian-trainer-checkins";

export function readDemoCheckIns(fallback: CheckIn[]) {
  const stored = window.localStorage.getItem(demoCheckinsStorageKey);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as CheckIn[];
  } catch {
    window.localStorage.removeItem(demoCheckinsStorageKey);
    return fallback;
  }
}

export function writeDemoCheckIns(nextCheckIns: CheckIn[]) {
  window.localStorage.setItem(demoCheckinsStorageKey, JSON.stringify(nextCheckIns));
}
