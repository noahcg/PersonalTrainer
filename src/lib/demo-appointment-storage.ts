"use client";

import type { TrainerAppointment } from "@/lib/types";

export const demoAppointmentsStorageKey = "nick-glushien-demo-trainer-appointments";

export function readStoredDemoAppointments(fallback: TrainerAppointment[] = []) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(demoAppointmentsStorageKey);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as TrainerAppointment[];
  } catch {
    window.localStorage.removeItem(demoAppointmentsStorageKey);
    return fallback;
  }
}

export function writeStoredDemoAppointments(appointments: TrainerAppointment[]) {
  window.localStorage.setItem(demoAppointmentsStorageKey, JSON.stringify(appointments));
}
