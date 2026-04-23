import { requireRole } from "@/lib/auth-server";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("client");
  return children;
}
