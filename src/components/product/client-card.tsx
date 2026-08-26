import Link from "next/link";
import { AlertCircle, CalendarDays, Package, PencilLine } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { pricingTierLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function ClientCard({ client }: { client: Client }) {
  const assignedWorkoutDetail = client.metrics.assignedWorkouts.total
    ? `${client.metrics.assignedWorkouts.completed}/${client.metrics.assignedWorkouts.total} due workouts logged`
    : "No scheduled workouts due";
  const needsAttention = client.status === "needs_attention";
  const isInactive = client.status === "archived";
  const primaryStatus = isInactive ? "Inactive" : "Active";
  const primaryVariant = isInactive ? "default" : "sage";

  return (
    <Link
      href={`/trainer/clients/${client.id}`}
      className="group block min-w-0 rounded-[1.5rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bronze-100"
    >
      <Card
        className={cn(
          "relative h-full min-w-0 overflow-hidden p-5 transition group-hover:-translate-y-1 group-hover:bg-white/90 group-focus-visible:border-bronze-300",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-stone-200 bg-white/90 text-stone-500 shadow-inner-soft transition group-hover:border-bronze-200 group-hover:text-bronze-600"
        >
          <PencilLine className="size-4" />
        </span>
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar name={client.name} src={client.photo} className="size-12 sm:size-14" />
          <div className="min-w-0 flex-1 pr-12">
            <div className="flex flex-wrap items-center gap-2">
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
            {client.partnerPackage ? (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-bronze-600">
                <Package className="size-3.5" />
                Partner training with {client.partnerPackage.partnerName}
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
            <span>Plan adherence</span>
            <span>{client.adherence}%</span>
          </div>
          <Progress value={client.adherence} />
          <p className="mt-2 text-xs text-stone-500">{assignedWorkoutDetail}</p>
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs text-stone-500">
          {needsAttention ? <AlertCircle className="size-4 text-rose-500" /> : <CalendarDays className="size-4 text-sage-500" />}
          Last check-in: {client.metrics.lastCheckIn}
        </div>
      </Card>
    </Link>
  );
}
