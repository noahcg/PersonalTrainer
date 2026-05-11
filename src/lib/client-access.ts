import type { ClientAccessStatus, ClientStatus } from "@/lib/types";

export function clientAccessLabel(status: ClientAccessStatus) {
  if (status === "account_active") return "Account active";
  if (status === "invite_pending") return "Invite pending";
  return "No login yet";
}

export function clientAccessDetail(status: ClientAccessStatus, inviteSentAt: string | null) {
  if (status === "account_active") return "Client can log in and access the app.";
  if (status === "invite_pending") return inviteSentAt ? `Invite sent ${inviteSentAt}.` : "Invite sent and awaiting setup.";
  return "Send an invite so the client can set a password and access the app.";
}

export function clientStatusLabel(status: ClientStatus) {
  if (status === "needs_attention") return "Needs attention";
  if (status === "archived") return "Inactive";
  return status[0].toUpperCase() + status.slice(1);
}

export function isDataOnlyClientStatus(status: ClientStatus) {
  return status === "archived";
}
