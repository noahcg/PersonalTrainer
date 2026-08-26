import { AppShell } from "@/components/layout/app-shell";
import { getClientConversationData } from "@/lib/messages";
import { ClientMessagesPanel } from "@/components/product/client-messages-panel";
import { Card } from "@/components/ui/card";

export default async function ClientMessagesPage() {
  const result = await getClientConversationData();

  if (!result.participant) {
    return (
      <AppShell role="client" title="Messages" eyebrow="Trainer messages" subtitle="Reply directly to your trainer.">
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">Your coaching thread will appear here.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Once your account is connected to your trainer, this page will show messages only for you.
          </p>
        </Card>
      </AppShell>
    );
  }

  return <ClientMessagesPanel initialParticipant={result.participant} initialMessages={result.messages} initialTrainerProfile={result.trainerProfile} mode={result.mode} />;
}
