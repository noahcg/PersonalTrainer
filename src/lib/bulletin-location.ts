import type { BulletinPost } from "@/lib/types";

export type BulletinLocationDetails = NonNullable<BulletinPost["sessionLocationDetails"]>;

export const emptyBulletinLocationDetails: BulletinLocationDetails = {
  placeName: "",
  meetingPoint: "",
  address: "",
  notes: "",
  mapUrl: "",
};

export function normalizeBulletinLocationDetails(value: unknown): BulletinLocationDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const details = {
    placeName: typeof record.placeName === "string" ? record.placeName : "",
    meetingPoint: typeof record.meetingPoint === "string" ? record.meetingPoint : "",
    address: typeof record.address === "string" ? record.address : "",
    notes: typeof record.notes === "string" ? record.notes : "",
    mapUrl: typeof record.mapUrl === "string" ? record.mapUrl : "",
  };

  return Object.values(details).some((item) => item.trim()) ? details : null;
}

export function formatBulletinLocation(details: BulletinLocationDetails | null | undefined, fallback?: string | null) {
  if (!details) return fallback?.trim() ?? "";
  return [details.placeName, details.meetingPoint, details.address].map((item) => item.trim()).filter(Boolean).join(" · ");
}

export function isValidMapUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "maps:";
  } catch {
    return false;
  }
}
