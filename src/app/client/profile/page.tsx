import { getClientSelfProfile } from "@/lib/clients";
import { ClientProfileEditor } from "@/components/product/client-profile-editor";

export default async function ClientProfilePage() {
  const result = await getClientSelfProfile();

  if (!result.client) {
    return null;
  }

  return <ClientProfileEditor initialClient={result.client} mode={result.mode} />;
}
