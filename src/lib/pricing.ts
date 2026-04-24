import type { PricingTier } from "@/lib/types";

export const pricingTierOptions: Array<{ value: PricingTier; label: string; detail: string }> = [
  {
    value: "intro_session",
    label: "Intro Session",
    detail: "One-time assessment and starting point.",
  },
  {
    value: "ongoing_coaching",
    label: "Ongoing Coaching",
    detail: "Monthly programming, support, and accountability.",
  },
  {
    value: "high_touch_coaching",
    label: "High-Touch Coaching",
    detail: "Higher support cadence with more hands-on updates.",
  },
];

export function normalizePricingTier(value: string | null | undefined): PricingTier {
  if (value === "intro_session" || value === "ongoing_coaching" || value === "high_touch_coaching") {
    return value;
  }

  return "ongoing_coaching";
}

export function pricingTierLabel(tier: PricingTier) {
  return pricingTierOptions.find((option) => option.value === tier)?.label ?? "Ongoing Coaching";
}

export function pricingTierDetail(tier: PricingTier) {
  return pricingTierOptions.find((option) => option.value === tier)?.detail ?? "";
}
