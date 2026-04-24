import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart } from "@/components/product/progress-chart";
import { StatCard } from "@/components/product/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrainerClients } from "@/lib/clients";
import { getTrainerCheckInData } from "@/lib/checkins";

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatAverage(value: number) {
  return value ? value.toFixed(1) : "0.0";
}

function normalizeWeight(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function TrainerProgressPage() {
  const [{ clients }, { checkIns }] = await Promise.all([getTrainerClients(), getTrainerCheckInData()]);

  const activeClients = clients.filter((client) => client.status !== "archived");
  const averageAdherence = activeClients.length
    ? activeClients.reduce((sum, client) => sum + client.adherence, 0) / activeClients.length
    : 0;
  const needsAttention = activeClients.filter((client) => client.status === "needs_attention" || client.adherence < 75);
  const pendingCheckIns = checkIns.filter((checkIn) => !checkIn.reviewed);
  const averageRecovery = checkIns.length
    ? checkIns.reduce((sum, checkIn) => sum + (checkIn.energy + checkIn.sleep + checkIn.motivation - checkIn.stress) / 4, 0) / checkIns.length
    : 0;

  const rosterTrend = activeClients
    .map((client) => ({
      label: client.name.split(" ")[0],
      adherence: client.adherence,
      weight: normalizeWeight(client.metrics.bodyWeight),
      sleep: 0,
    }))
    .sort((left, right) => left.adherence - right.adherence);

  const lowestAdherence = [...activeClients].sort((left, right) => left.adherence - right.adherence).slice(0, 4);
  const strongestMomentum = [...activeClients].sort((left, right) => right.adherence - left.adherence).slice(0, 4);
  const recentCheckIns = checkIns.slice(0, 5);

  return (
    <AppShell role="trainer" title="Progress intelligence" subtitle="Track body weight, measurements, PRs, photos metadata, adherence, milestone notes, and recovery signals.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Average adherence" value={formatPercent(averageAdherence)} detail={`${activeClients.length} active clients`} tone="sage" />
        <StatCard label="Needs attention" value={String(needsAttention.length)} detail="Low adherence or flagged status" />
        <StatCard label="Check-ins to review" value={String(pendingCheckIns.length)} detail="Awaiting trainer response" tone="dark" />
        <StatCard label="Recovery average" value={formatAverage(averageRecovery)} detail="Energy, sleep, motivation, stress" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Roster adherence view</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart data={rosterTrend.length ? rosterTrend : undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clients needing action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowestAdherence.length ? (
              lowestAdherence.map((client) => (
                <Link
                  key={client.id}
                  href={`/trainer/clients/${client.id}`}
                  className="flex items-center gap-4 rounded-[1.35rem] bg-stone-50/88 px-4 py-3 transition hover:bg-white"
                >
                  <Avatar name={client.name} src={client.photo} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-charcoal-950">{client.name}</p>
                    <p className="truncate text-sm text-stone-500">{client.metrics.lastCheckIn}</p>
                  </div>
                  <Badge variant={client.adherence < 75 || client.status === "needs_attention" ? "alert" : "bronze"}>
                    {client.adherence}% adherence
                  </Badge>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-4 text-sm text-stone-600">No clients are currently flagged.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Strongest momentum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {strongestMomentum.length ? (
              strongestMomentum.map((client) => (
                <div key={client.id} className="flex items-center justify-between gap-4 rounded-[1.35rem] bg-stone-50/88 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal-950">{client.name}</p>
                    <p className="truncate text-sm text-stone-500">{client.goals}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sage-700">
                    <TrendingUp className="size-4" />
                    <span className="text-sm font-medium">{client.adherence}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-4 text-sm text-stone-600">No client progress data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCheckIns.length ? (
              recentCheckIns.map((checkIn) => {
                const strainScore = checkIn.stress + checkIn.soreness;
                const goodMomentum = checkIn.energy + checkIn.motivation;
                const flagged = strainScore >= 12 || goodMomentum <= 10;

                return (
                  <div key={checkIn.id} className="rounded-[1.35rem] bg-stone-50/88 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-charcoal-950">{checkIn.client}</p>
                        <p className="text-sm text-stone-500">{checkIn.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={checkIn.reviewed ? "sage" : "bronze"}>
                          {checkIn.reviewed ? "Reviewed" : "Needs review"}
                        </Badge>
                        <Badge variant={flagged ? "alert" : "default"}>
                          {flagged ? "Watch closely" : "Stable"}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{checkIn.notes}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                      <span>Energy {checkIn.energy}</span>
                      <span>Sleep {checkIn.sleep}</span>
                      <span>Stress {checkIn.stress}</span>
                      <span>Motivation {checkIn.motivation}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-4 text-sm text-stone-600">No check-ins have been submitted yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Progress priorities</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lowestAdherence.slice(0, 3).map((client) => (
            <Link
              key={client.id}
              href={`/trainer/clients/${client.id}`}
              className="rounded-[1.35rem] bg-stone-50/88 p-4 transition hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-charcoal-950">{client.name}</p>
                <div className="flex items-center gap-1 text-rose-600">
                  <TrendingDown className="size-4" />
                  <span className="text-sm font-medium">{client.adherence}%</span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">{client.goals}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-bronze-700">
                Open profile
                <ArrowRight className="size-4" />
              </p>
            </Link>
          ))}
          {!lowestAdherence.length ? (
            <div className="rounded-[1.35rem] bg-stone-50/88 p-4 text-sm text-stone-600">Once client data is active, this area will surface the people who need plan changes or a check-in response.</div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
