import { AppShell } from "@/components/layout/app-shell";
import { getTrainerCheckInData } from "@/lib/checkins";
import { getTrainerConversationData } from "@/lib/messages";
import { TrainerMessagesManager } from "@/components/product/trainer-messages-manager";

export default async function TrainerMessagesPage() {
  const [result, checkInResult] = await Promise.all([getTrainerConversationData(), getTrainerCheckInData()]);

  return (
    <AppShell role="trainer" title="Communications" subtitle="Review client conversations and reply from one focused workspace.">
      <TrainerMessagesManager
        initialParticipants={result.participants}
        initialMessages={result.messages}
        initialCheckIns={checkInResult.checkIns}
        mode={result.mode}
      />
    </AppShell>
  );
}
