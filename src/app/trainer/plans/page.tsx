import { Copy, Send } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plans } from "@/lib/demo-data";

export default function PlansPage() {
  return (
    <AppShell role="trainer" title="Training plans" subtitle="Create reusable plan templates, duplicate proven cycles, and assign polished training journeys to clients.">
      <div className="mb-5 flex gap-3">
        <Button variant="warm">Create plan from scratch</Button>
        <Button variant="secondary">Save current as template</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="bronze">{plan.duration}</Badge>
                  <CardTitle className="mt-4 font-serif text-4xl">{plan.title}</CardTitle>
                </div>
                {plan.template && <Badge variant="sage">Template</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-stone-600">{plan.description}</p>
              <div className="mt-5 grid gap-3 rounded-[1.75rem] bg-stone-50 p-5">
                <p><span className="font-semibold">Goal:</span> {plan.goal}</p>
                <p><span className="font-semibold">Weekly structure:</span> {plan.weeklyStructure}</p>
                <p><span className="font-semibold">Notes:</span> {plan.notes}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary"><Copy className="size-4" /> Duplicate</Button>
                <Button variant="warm"><Send className="size-4" /> Assign to clients</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
