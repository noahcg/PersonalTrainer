"use client";

import type { Client, CoachingEntry } from "@/lib/types";

export const demoClientsStorageKey = "aurelian-demo-clients";

export type StoredTrainerClientProfile = {
  client: Client;
  coachingNotes: CoachingEntry[];
};

export function demoClientProfileStorageKey(clientId: string) {
  return `aurelian-client-profile-${clientId}`;
}

export function readStoredDemoClientProfile(clientId: string) {
  const stored = window.localStorage.getItem(demoClientProfileStorageKey(clientId));
  if (!stored) return null;

  try {
    return JSON.parse(stored) as StoredTrainerClientProfile;
  } catch {
    window.localStorage.removeItem(demoClientProfileStorageKey(clientId));
    return null;
  }
}

export function writeStoredDemoClientProfile(clientId: string, state: StoredTrainerClientProfile) {
  window.localStorage.setItem(demoClientProfileStorageKey(clientId), JSON.stringify(state));
}

export function readStoredDemoClients(fallback: Client[]) {
  const stored = window.localStorage.getItem(demoClientsStorageKey);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as Client[];
  } catch {
    window.localStorage.removeItem(demoClientsStorageKey);
    return fallback;
  }
}

export function writeStoredDemoClients(nextClients: Client[]) {
  window.localStorage.setItem(demoClientsStorageKey, JSON.stringify(nextClients));
}

export function syncDemoClientRecord(nextClient: Client, fallbackClients: Client[]) {
  const currentClients = readStoredDemoClients(fallbackClients);
  const existingIndex = currentClients.findIndex((client) => client.id === nextClient.id);

  const nextClients =
    existingIndex >= 0
      ? currentClients.map((client) => (client.id === nextClient.id ? nextClient : client))
      : [nextClient, ...currentClients];

  writeStoredDemoClients(nextClients);
}
