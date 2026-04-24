import { AppShell } from "@/components/layout/app-shell";
import { getClientCheckInData } from "@/lib/checkins";
import { getClientConversationData } from "@/lib/messages";
import { ClientMessagesPanel } from "@/components/product/client-messages-panel";
import { Card } from "@/components/ui/card";

export default async function ClientMessagesPage() {
  const [result, checkInResult] = await Promise.all([getClientConversationData(), getClientCheckInData()]);

  if (!result.participant) {
    return (
      <AppShell role="client" title="Messages & check-ins" subtitle="Reply to coach notes and submit recovery context so your plan can adapt.">
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">Your coaching thread will appear here.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Once your account is connected to your trainer, this page will show messages and check-ins only for you.
          </p>
        </Card>
      </AppShell>
    );
  }

  return <ClientMessagesPanel initialParticipant={result.participant} initialMessages={result.messages} initialCheckIns={checkInResult.checkIns} mode={result.mode} />;
}
