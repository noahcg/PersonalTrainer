import Link from "next/link";
import { AlertCircle, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Client } from "@/lib/types";

export function ClientCard({ client }: { client: Client }) {
  const needsAttention = client.status === "needs_attention";

  return (
    <Link href={`/trainer/clients/${client.id}`}>
      <Card className="group h-full p-5 transition hover:-translate-y-1 hover:bg-white/90">
        <div className="flex items-start gap-4">
          <Avatar name={client.name} src={client.photo} className="size-14" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-lg font-semibold">{client.name}</h3>
              <Badge variant={needsAttention ? "alert" : "sage"}>
                {needsAttention ? "Review" : "Active"}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-500">{client.goals}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[1.5rem] bg-stone-50/80 p-3 text-center">
          <div>
            <p className="text-lg font-semibold">{client.metrics.workouts}</p>
            <p className="text-[11px] text-stone-500">Workouts</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{client.metrics.streak}</p>
            <p className="text-[11px] text-stone-500">Streak</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{client.metrics.bodyWeight}</p>
            <p className="text-[11px] text-stone-500">Weight</p>
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
    </Link>
  );
}
