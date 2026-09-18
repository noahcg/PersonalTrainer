import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ClientIntakeForm } from "@/components/product/client-intake-form";
import { emptyClientIntake } from "@/lib/client-intake";

export const dynamic = "force-dynamic";

export default function IntakePreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppShell
      role="client"
      title="Intake preview"
      eyebrow="Development only"
      subtitle="Use this route to review the client intake experience. Nothing submitted here is saved."
      navLocked
    >
      <ClientIntakeForm initialIntake={emptyClientIntake("development-preview")} mode="demo" preview />
    </AppShell>
  );
}
