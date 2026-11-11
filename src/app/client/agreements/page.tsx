import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AgreementPdfReview } from "@/components/product/agreement-pdf-review";
import { agreementClient } from "@/lib/agreement/server";

type Offer = { id: string; version_label: string; status: string; package_snapshot: { title: string }; client_agreement_acceptances: Array<{ accepted_at: string }> | { accepted_at: string } | null };
export default async function AgreementsPage() {
  const auth = await agreementClient();
  if (!auth) notFound();
  const { data, error } = await auth.admin.from("client_agreement_offers").select("id, version_label, status, package_snapshot, client_agreement_acceptances(accepted_at)").eq("client_id", auth.client.id).in("status", ["offered", "accepted"]).order("created_at", { ascending: false });
  if (error) throw error;
  const offers = (data ?? []) as Offer[];
  const pending = offers.find((offer) => offer.status === "offered");
  const accepted = offers.filter((offer) => offer.status === "accepted");
  return <AppShell role="client" title="Training agreements" eyebrow={pending ? "Onboarding" : "Your documents"} subtitle={pending ? "Please review the agreement for your selected package." : "Review your accepted training agreements."} navLocked={Boolean(pending)}>
    {pending ? <AgreementPdfReview key={pending.id} offerId={pending.id} packageTitle={pending.package_snapshot.title} version={pending.version_label} /> : <div className="max-w-3xl space-y-4">{accepted.length ? accepted.map((offer) => { const acceptance = Array.isArray(offer.client_agreement_acceptances) ? offer.client_agreement_acceptances[0] : offer.client_agreement_acceptances; return <div key={offer.id} className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">{offer.package_snapshot.title} · {offer.version_label}</h2><p className="mt-2 text-sm text-stone-600">Accepted {acceptance ? new Date(acceptance.accepted_at).toLocaleString() : "—"}</p><a className="mt-2 inline-block underline" href={`/api/client/agreements/${offer.id}/pdf`} target="_blank" rel="noreferrer">View or download agreement PDF</a></div>; }) : <p>No agreement has been offered yet.</p>}</div>}
  </AppShell>;
}
