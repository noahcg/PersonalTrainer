import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-server";
import { getClientIntakeStatus } from "@/lib/client-intake";
import { getClientPortalAccess, isDataOnlyClientRoute } from "@/lib/client-portal-access";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await requireRole("client");
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (auth.mode === "supabase" && pathname !== "/client/intake") {
    const intake = await getClientIntakeStatus();
    if (!intake.completed) {
      redirect("/client/intake");
    }
  }

  if (auth.mode === "supabase") {
    const portalAccess = await getClientPortalAccess(auth.profile);
    if (portalAccess === "data_only" && !isDataOnlyClientRoute(pathname)) {
      redirect("/client/home");
    }
  }

  return children;
}
