import { agreementTrainer } from "@/lib/agreement/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string; offerId: string }> }) {
  const { id, offerId } = await context.params;
  const auth = await agreementTrainer(id);
  if (!auth) return new Response("Unavailable", { status: 404 });
  const { data, error } = await auth.admin.from("client_agreement_offers").select("pdf_base64").eq("id", offerId).eq("client_id", id).eq("trainer_id", auth.trainer.id).maybeSingle<{ pdf_base64: string }>();
  if (error || !data) return new Response("Unavailable", { status: 404 });
  return new Response(Buffer.from(data.pdf_base64, "base64"), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=training-agreement.pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
