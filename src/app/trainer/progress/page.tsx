import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart } from "@/components/product/progress-chart";
import { StatCard } from "@/components/product/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrainerProgressPage() {
  return (
    <AppShell role="trainer" title="Progress intelligence" subtitle="Track body weight, measurements, PRs, photos metadata, adherence, milestone notes, and recovery signals.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Avg adherence" value="87%" detail="Rolling 30 days" tone="sage" />
        <StatCard label="New PRs" value="11" detail="This month" />
        <StatCard label="Photo updates" value="6" detail="Awaiting review" tone="dark" />
      </div>
      <Card className="mt-5">
        <CardHeader><CardTitle>Adherence trend</CardTitle></CardHeader>
        <CardContent><ProgressChart /></CardContent>
      </Card>
    </AppShell>
  );
}
