import { AppShell } from "@/components/layout/app-shell";
import { getTrainerConversationData } from "@/lib/messages";
import { TrainerMessagesManager } from "@/components/product/trainer-messages-manager";

export default async function TrainerMessagesPage() {
  const result = await getTrainerConversationData();

  return (
    <AppShell role="trainer" title="Communications" subtitle="Review client conversations and reply from one focused workspace.">
      <TrainerMessagesManager
        initialParticipants={result.participants}
        initialMessages={result.messages}
        mode={result.mode}
      />
    </AppShell>
  );
}
