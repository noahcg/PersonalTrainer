import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart } from "@/components/product/progress-chart";
import { StatCard } from "@/components/product/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientProgressPage() {
  return (
    <AppShell role="client" title="Your progress" subtitle="Consistency, body weight trends, personal records, milestones, and photo metadata in one calm view.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Body weight" value="142" detail="Down 6 lb since January" />
        <StatCard label="Adherence" value="91%" detail="Best month yet" tone="sage" />
        <StatCard label="PRs" value="4" detail="This training cycle" tone="dark" />
      </div>
      <Card className="mt-5">
        <CardHeader><CardTitle>Consistency trend</CardTitle></CardHeader>
        <CardContent><ProgressChart /></CardContent>
      </Card>
    </AppShell>
  );
}
