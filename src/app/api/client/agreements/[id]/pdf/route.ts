import { agreementClient } from "@/lib/agreement/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await agreementClient();
  if (!auth) return new Response("Unavailable", { status: 404 });
  const { id } = await context.params;
  const { data, error } = await auth.admin.from("client_agreement_offers").select("pdf_base64, status").eq("id", id).eq("client_id", auth.client.id).maybeSingle<{ pdf_base64: string; status: string }>();
  if (error || !data || data.status === "withdrawn") return new Response("Unavailable", { status: 404 });
  return new Response(Buffer.from(data.pdf_base64, "base64"), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=training-agreement.pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
