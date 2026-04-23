import { AppShell } from "@/components/layout/app-shell";
import { ClientBulletinBoard } from "@/components/product/client-bulletin-board";
import { getClientBulletins } from "@/lib/bulletins";

export default async function ClientBulletinPage() {
  const { bulletins, mode } = await getClientBulletins();

  return (
    <AppShell role="client" title="Bulletin board" subtitle="Studio-wide notes, reminders, and coaching announcements from your trainer.">
      <ClientBulletinBoard initialBulletins={bulletins} mode={mode} />
    </AppShell>
  );
}
