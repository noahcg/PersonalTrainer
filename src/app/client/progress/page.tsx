import { getClientSelfProfile } from "@/lib/clients";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart } from "@/components/product/progress-chart";
import { StatCard } from "@/components/product/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parseWeight(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function ClientProgressPage() {
  const { client } = await getClientSelfProfile();

  if (!client) {
    return (
      <AppShell role="client" title="Your progress" subtitle="Consistency, milestones, and body metrics will appear here as you start logging.">
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">No progress data yet.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            This page starts empty for a new client and fills in as workouts, check-ins, and progress entries are added.
          </p>
        </Card>
      </AppShell>
    );
  }

  const chartData =
    client.metrics.workouts > 0
      ? [
          {
            label: "Current",
            weight: parseWeight(client.metrics.bodyWeight),
            adherence: client.adherence,
            sleep: 0,
          },
        ]
      : [];

  return (
    <AppShell role="client" title="Your progress" subtitle="Consistency, body weight trends, personal records, milestones, and photo metadata in one calm view.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Body weight" value={client.metrics.bodyWeight} detail="Latest recorded metric" />
        <StatCard label="Adherence" value={`${client.adherence}%`} detail={`${client.metrics.workouts} workouts completed`} tone="sage" />
        <StatCard label="Check-ins" value={client.metrics.lastCheckIn} detail="Most recent submission" tone="dark" />
      </div>
      <Card className="mt-5">
        <CardHeader><CardTitle>Consistency trend</CardTitle></CardHeader>
        <CardContent>
          {chartData.length ? (
            <ProgressChart data={chartData} />
          ) : (
            <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-4 text-sm text-stone-600">
              Progress visuals will appear here once your training data starts coming in.
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
