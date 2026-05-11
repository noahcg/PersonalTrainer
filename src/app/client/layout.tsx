import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-server";
import { getClientIntakeStatus } from "@/lib/client-intake";

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

  return children;
}
