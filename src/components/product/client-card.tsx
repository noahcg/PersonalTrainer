import Link from "next/link";
import { AlertCircle, CalendarDays } from "lucide-react";
import { clientAccessLabel } from "@/lib/client-access";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { pricingTierLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function ClientCard({
  client,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  client: Client;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const needsAttention = client.status === "needs_attention";
  const primaryStatus = clientAccessLabel(client.accessStatus);
  const primaryVariant = client.accessStatus === "account_active" ? "sage" : "default";
  const cardBody = (
    <Card
      className={cn(
        "group h-full min-w-0 overflow-hidden p-5 transition hover:-translate-y-1 hover:bg-white/90",
        selected && "border-bronze-300 bg-bronze-50",
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar name={client.name} src={client.photo} className="size-12 sm:size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-lg font-semibold">{client.name}</h3>
            <Badge variant={primaryVariant}>{primaryStatus}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.18em] text-stone-400">
            <span>{pricingTierLabel(client.pricingTier)}</span>
            <span className="h-1 w-1 rounded-full bg-stone-300" />
            <span>{client.level}</span>
          </div>
          {needsAttention ? (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-rose-500">
              <AlertCircle className="size-3.5" />
              Needs review
            </div>
          ) : null}
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{client.goals}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-[1.25rem] bg-stone-50/80 p-3 text-center sm:rounded-[1.5rem]">
        <div>
          <p className="text-lg font-semibold">{client.metrics.workouts}</p>
          <p className="text-[11px] text-stone-500">Workouts</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{client.sessionPackage.used}</p>
          <p className="text-[11px] text-stone-500">Sessions</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{client.sessionPackage.remaining === null ? "∞" : client.sessionPackage.remaining}</p>
          <p className="text-[11px] text-stone-500">Left</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
          <span>Adherence</span>
          <span>{client.adherence}%</span>
        </div>
        <Progress value={client.adherence} />
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-stone-500">
        {needsAttention ? <AlertCircle className="size-4 text-rose-500" /> : <CalendarDays className="size-4 text-sage-500" />}
        Last check-in: {client.metrics.lastCheckIn}
      </div>
    </Card>
  );

  if (selectable) {
    return (
      <div className="min-w-0 space-y-3">
        <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-200 bg-white/60 px-4 py-2.5 text-sm text-stone-600">
          <span className="font-medium text-charcoal-950">Select client</span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-stone-500">{selected ? "Included" : "Not selected"}</span>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(client.id)}
              onClick={(event) => event.stopPropagation()}
              className="size-4 rounded border-stone-300 text-bronze-500 focus-visible:ring-bronze-300"
              aria-label={`Select ${client.name}`}
            />
          </span>
        </label>
        <Link href={`/trainer/clients/${client.id}`} className="block min-w-0">
          {cardBody}
        </Link>
      </div>
    );
  }

  return (
    <Link href={`/trainer/clients/${client.id}`} className="block min-w-0">
      {cardBody}
    </Link>
  );
}
