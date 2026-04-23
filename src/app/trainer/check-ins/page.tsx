import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkIns } from "@/lib/demo-data";

export default function CheckInsPage() {
  return (
    <AppShell role="trainer" title="Check-ins" subtitle="Review readiness, recovery, mood, and freeform client context before adjusting training.">
      <div className="grid gap-5 lg:grid-cols-3">
        {checkIns.map((checkIn) => (
          <Card key={checkIn.id} className="p-1">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{checkIn.client}</CardTitle>
                  <p className="mt-1 text-sm text-stone-500">{checkIn.date}</p>
                </div>
                <Badge variant={checkIn.reviewed ? "sage" : "bronze"}>{checkIn.reviewed ? "Reviewed" : "Open"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Energy", checkIn.energy],
                  ["Soreness", checkIn.soreness],
                  ["Sleep", checkIn.sleep],
                  ["Stress", checkIn.stress],
                  ["Motivation", checkIn.motivation],
                  ["Mood", checkIn.mood],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-stone-600">{checkIn.notes}</p>
              <Button className="mt-5 w-full" variant="warm">Review and reply</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
