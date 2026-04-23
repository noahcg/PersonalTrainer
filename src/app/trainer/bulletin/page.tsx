import { AppShell } from "@/components/layout/app-shell";
import { TrainerBulletinBoard } from "@/components/product/trainer-bulletin-board";
import { getTrainerBulletins } from "@/lib/bulletins";

export default async function TrainerBulletinPage() {
  const { bulletins, mode } = await getTrainerBulletins();

  return (
    <AppShell role="trainer" title="Bulletin board" subtitle="Broadcast one message to every client from a calm, central studio noticeboard.">
      <TrainerBulletinBoard initialBulletins={bulletins} mode={mode} />
    </AppShell>
  );
}
