import { requireRole } from "@/lib/auth-server";

export default async function TrainerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("trainer");
  return children;
}
