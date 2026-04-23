import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { clients } from "@/lib/demo-data";

export default function ClientProfilePage() {
  const client = clients[0];

  return (
    <AppShell role="client" title="Profile" subtitle="Keep your goals, limitations, schedule, and preferences current for better coaching.">
      <Card className="max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar name={client.name} src={client.photo} className="size-20" />
            <div>
              <CardTitle className="font-serif text-4xl">{client.name}</CardTitle>
              <p className="text-sm text-stone-500">{client.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input defaultValue={client.goals} />
          <Input defaultValue={client.availability} />
          <Textarea defaultValue={client.injuries} />
          <Textarea defaultValue={client.notes} />
          <Button variant="warm">Save profile</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
