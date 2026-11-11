/** Standard offerings; copy remains subject to Nick's review. */
export const offeringCatalog = [
  { id: "twice-weekly", kind: "one_on_one", name: "Individual training - $840", priceCents: 84000, sessionCount: 8, active: true, detail: "Twice-weekly training: 8 one-hour sessions per month." },
  { id: "once-weekly", kind: "one_on_one", name: "Individual training - $550", priceCents: 55000, sessionCount: 4, active: true, detail: "Once-weekly training: 4 one-hour sessions per month." },
  { id: "partner-monthly", kind: "partner_training", name: "Partner training - monthly", priceCents: 128000, sessionCount: 4, active: true, detail: "4 shared one-hour sessions per month; $640 per person ($1,280 combined)." },
] as const;
