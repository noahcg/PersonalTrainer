import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <AppShell role="trainer" title="Studio settings" subtitle="Manage profile, coaching voice, notification defaults, and account preferences.">
      <Card className="max-w-3xl">
        <CardHeader><CardTitle>Trainer profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input defaultValue="Avery Stone" />
          <Input defaultValue="avery@aurelian.coach" />
          <Textarea defaultValue="Calm, precise strength coaching for busy clients who want durable progress." />
          <Button variant="warm">Save settings</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
