import type { Resource } from "@/lib/types";

export function encodeResourceAudience(audience: Resource["audience"], clientId?: string) {
  if (audience === "personal" && clientId) {
    return `client:${clientId}`;
  }

  return "all";
}
