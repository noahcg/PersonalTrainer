import type { BulletinPost } from "@/lib/types";

const reminderStorageKey = "aurelian-bulletin-reminder-settings";
const archivedBulletinsStorageKey = "aurelian-archived-bulletins";

type StoredReminderSettings = Pick<
  BulletinPost,
  "reminderEnabled" | "reminderMinutesBefore" | "reminderAudience" | "reminderTrainerEnabled"
>;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readStoredReminderSettings() {
  if (!canUseStorage()) return {};

  try {
    return JSON.parse(window.localStorage.getItem(reminderStorageKey) ?? "{}") as Record<string, StoredReminderSettings>;
  } catch {
    window.localStorage.removeItem(reminderStorageKey);
    return {};
  }
}

export function writeStoredReminderSettings(postId: string, settings: StoredReminderSettings) {
  if (!canUseStorage()) return;

  const current = readStoredReminderSettings();
  window.localStorage.setItem(reminderStorageKey, JSON.stringify({ ...current, [postId]: settings }));
}

export function applyStoredReminderSettings(posts: BulletinPost[]) {
  const settings = readStoredReminderSettings();

  return posts.map((post) => {
    const stored = settings[post.id];
    if (!stored) return post;

    return {
      ...post,
      ...stored,
    };
  });
}

export function readArchivedBulletinIds() {
  if (!canUseStorage()) return new Set<string>();

  try {
    return new Set(JSON.parse(window.localStorage.getItem(archivedBulletinsStorageKey) ?? "[]") as string[]);
  } catch {
    window.localStorage.removeItem(archivedBulletinsStorageKey);
    return new Set<string>();
  }
}

export function archiveStoredBulletinId(postId: string) {
  if (!canUseStorage()) return;

  const ids = readArchivedBulletinIds();
  ids.add(postId);
  window.localStorage.setItem(archivedBulletinsStorageKey, JSON.stringify([...ids]));
}

export function deleteStoredBulletinId(postId: string) {
  if (!canUseStorage()) return;

  const ids = readArchivedBulletinIds();
  ids.delete(postId);
  window.localStorage.setItem(archivedBulletinsStorageKey, JSON.stringify([...ids]));
}

export function filterArchivedBulletins(posts: BulletinPost[]) {
  const archivedIds = readArchivedBulletinIds();
  return posts.filter((post) => post.status !== "archived" && !archivedIds.has(post.id));
}
