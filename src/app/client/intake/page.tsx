import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ClientIntakeForm } from "@/components/product/client-intake-form";
import { Card } from "@/components/ui/card";
import { getClientIntakeStatus, getClientSelfIntake } from "@/lib/client-intake";

export default async function ClientIntakePage() {
  const status = await getClientIntakeStatus();

  if (status.mode === "supabase" && status.completed) {
    redirect("/client/home");
  }

  const { intake, mode } = await getClientSelfIntake();

  if (!intake) {
    return (
      <AppShell role="client" title="Client intake" subtitle="Your trainer needs a linked client profile before intake can be completed." navLocked>
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">Your profile is not linked yet.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Ask your trainer to confirm your invite setup before completing intake.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      role="client"
      title="Complete your intake."
      subtitle="Your answers help your trainer plan safe, useful, and personal training from day one."
      navLocked
    >
      <ClientIntakeForm initialIntake={intake} mode={mode} />
    </AppShell>
  );
}
