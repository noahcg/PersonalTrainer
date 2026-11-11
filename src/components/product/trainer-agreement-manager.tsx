"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Package = { id: string; title: string; total_sessions: number | null; price_cents: number | null; currency: string; status: string };
type Offer = { id: string; version_label: string; status: string; package_snapshot: Package; pdf_sha256: string; approved_at: string; client_agreement_acceptances: Array<{ full_name: string; accepted_at: string }> | { full_name: string; accepted_at: string } | null };

export function TrainerAgreementManager({ clientId }: { clientId: string }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [packageId, setPackageId] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const url = `/api/trainer/clients/${clientId}/agreements`;
  const load = useCallback(async () => {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load agreements.");
    setPackages(data.packages); setOffers(data.offers);
  }, [url]);
  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((e) => setMessage(e.message)); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function offer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file || !approved) return;
    const formElement = event.currentTarget;
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.set("pdf", file); body.set("packageId", packageId); body.set("version", version); body.set("approved", "yes");
      const response = await fetch(url, { method: "POST", body }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to offer agreement.");
      setApproved(false); setFile(null); setVersion(""); setPackageId(""); formElement.reset(); await load(); setMessage("Agreement offered to this client.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to offer agreement."); }
    finally { setBusy(false); }
  }
  async function withdraw(offerId: string) {
    setBusy(true); setMessage("");
    try { const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await load(); setMessage("Agreement withdrawn."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to withdraw agreement."); }
    finally { setBusy(false); }
  }
  const inputClass = "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";
  const selected = packages.find((item) => item.id === packageId);
  return <Card className="p-5 sm:p-6"><h2 className="font-serif text-2xl font-semibold">Training agreements</h2><p className="mt-2 text-sm leading-6 text-stone-600">Offer a legally reviewed PDF for this client and package. The PDF must include the client, package, price, and term. Offering it records your approval; it does not record payment.</p>
    {message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}
    {offers.length ? <ul className="mt-4 space-y-3">{offers.map((item) => { const acceptance = Array.isArray(item.client_agreement_acceptances) ? item.client_agreement_acceptances[0] : item.client_agreement_acceptances; return <li key={item.id} className="rounded-xl border border-stone-200 p-3 text-sm"><p className="font-semibold">{item.package_snapshot.title} · {item.version_label} · {item.status}</p>{acceptance ? <p>Accepted by {acceptance.full_name} on {new Date(acceptance.accepted_at).toLocaleString()}</p> : null}<a className="underline" href={`${url}/${item.id}/pdf`} target="_blank" rel="noreferrer">View agreement PDF</a>{item.status === "offered" ? <button type="button" disabled={busy} onClick={() => void withdraw(item.id)} className="ml-4 underline">Withdraw offer</button> : null}</li>; })}</ul> : null}
    <form onSubmit={offer} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Package<select className={inputClass} required value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Choose package</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.status})</option>)}</select></label><label className="text-sm font-semibold">Agreement version<input className={inputClass} required maxLength={120} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 2026-11-11" /></label>
      {selected ? <p className="text-sm text-stone-600 sm:col-span-2">Package: {selected.total_sessions ?? "Unspecified"} sessions · {selected.price_cents == null ? "Price not set" : new Intl.NumberFormat("en-US", { style: "currency", currency: selected.currency }).format(selected.price_cents / 100)}. Confirm the PDF matches this package and this client.</p> : null}
      <label className="text-sm font-semibold sm:col-span-2">Approved agreement PDF<input className={inputClass} type="file" accept="application/pdf,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><span className="mt-1 block text-xs font-normal text-stone-600">Up to 5 MB and 30 pages; selectable text is required on each page.</span></label>
      <label className="flex items-start gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="mt-1 size-4" /><span>I have reviewed and approve this exact PDF for this client and package, including its legal review.</span></label>
      <div className="sm:col-span-2"><Button type="submit" disabled={busy || !approved || !file || !packageId || !version.trim()}>{busy ? "Saving…" : "Approve and offer agreement"}</Button></div>
    </form>
  </Card>;
}
