"use client";

import type { Message } from "@/lib/types";

const sharedMessagesStorageKey = "aurelian-shared-messages";
const legacyClientMessagesStorageKey = "aurelian-client-messages";

export function readDemoMessages(fallback: Message[]) {
  const primary = window.localStorage.getItem(sharedMessagesStorageKey);

  if (primary) {
    try {
      return JSON.parse(primary) as Message[];
    } catch {
      window.localStorage.removeItem(sharedMessagesStorageKey);
    }
  }

  const legacy = window.localStorage.getItem(legacyClientMessagesStorageKey);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as Message[];
      writeDemoMessages(parsed);
      return parsed;
    } catch {
      window.localStorage.removeItem(legacyClientMessagesStorageKey);
    }
  }

  return fallback;
}

export function writeDemoMessages(nextMessages: Message[]) {
  window.localStorage.setItem(sharedMessagesStorageKey, JSON.stringify(nextMessages));
}
