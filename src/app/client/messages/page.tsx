import { getClientCheckInData } from "@/lib/checkins";
import { getClientConversationData } from "@/lib/messages";
import { ClientMessagesPanel } from "@/components/product/client-messages-panel";

export default async function ClientMessagesPage() {
  const [result, checkInResult] = await Promise.all([getClientConversationData(), getClientCheckInData()]);

  if (!result.participant) {
    return null;
  }

  return <ClientMessagesPanel initialParticipant={result.participant} initialMessages={result.messages} initialCheckIns={checkInResult.checkIns} mode={result.mode} />;
}
