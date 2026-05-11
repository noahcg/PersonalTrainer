import { AppShell } from "@/components/layout/app-shell";
import { clientPortalAccessFromStatus } from "@/lib/client-portal-access";
import { getClientSelfProfile } from "@/lib/clients";
import { ClientProfileEditor } from "@/components/product/client-profile-editor";
import { Card } from "@/components/ui/card";

export default async function ClientProfilePage() {
  const result = await getClientSelfProfile();
  const clientPortalAccess = clientPortalAccessFromStatus(result.client?.status);

  if (!result.client) {
    return (
      <AppShell role="client" title="Profile" subtitle="Your personal details, goals, and coaching preferences." clientPortalAccess={clientPortalAccess}>
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">Your profile is not set up yet.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            When your trainer finishes linking your account, your profile details will appear here with no data from other clients.
          </p>
        </Card>
      </AppShell>
    );
  }

  return <ClientProfileEditor initialClient={result.client} initialSessions={result.sessions} mode={result.mode} clientPortalAccess={clientPortalAccess} />;
}
