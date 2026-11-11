"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Package = { id: string; title: string; status: string };
type Notice = { id: string; training_package_id: string; scheduled_at: string; notice_received_at: string | null; notice_details: string; grace_granted: boolean; grace_reason: string | null; created_at: string };

export function ClientNoticeManager({ clientId, mode }: { clientId: string; mode: "demo" | "supabase" }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<Notice[]>([]);
  const [packageId, setPackageId] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [received, setReceived] = useState("");
  const [details, setDetails] = useState("");
  const [grace, setGrace] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const url = `/api/trainer/clients/${clientId}/notices`;
  const load = useCallback(async () => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load notices.");
      setPackages(data.packages); setRecords(data.records); setReady(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load notices."); }
  }, [url]);
  useEffect(() => {
    if (mode !== "supabase") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, mode]);
  const used = records.some((record) => record.training_package_id === packageId && record.grace_granted);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId, scheduledAt: new Date(scheduled).toISOString(), receivedAt: received ? new Date(received).toISOString() : null, details, grace, reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save notice.");
      setScheduled(""); setReceived(""); setDetails(""); setGrace(false); setReason("");
      await load(); setMessage("Notice saved. Session balances have not been changed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save notice."); }
    finally { setBusy(false); }
  }
  const field = "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-charcoal-950";
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold">Cancellation notices and grace</h2>
      <p className="mt-2 text-sm text-stone-600">Record notice and any discretionary grace for this client. One grace exception is available per client per package. When grace is granted, the individual client keeps the session; for a partner session, both partners keep it and only the absent partner uses grace. Records do not change session balances.</p>
      {mode === "demo" ? <p className="mt-3 text-sm">Available with a connected database.</p> : null}
      {message ? <p role="status" className="mt-3 text-sm text-charcoal-950">{message}</p> : null}
      {mode === "supabase" && ready && packages.length === 0 ? <p className="mt-3 text-sm">Assign a package before recording a notice.</p> : null}
      {mode === "supabase" && ready && packages.length > 0 ? <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Package<select required value={packageId} onChange={(e) => { setPackageId(e.target.value); setGrace(false); }} className={field}><option value="">Choose a package</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.status})</option>)}</select></label>
        <label className="text-sm font-medium">Scheduled session time<input required type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} className={field} /></label>
        <label className="text-sm font-medium">Notice received at (leave blank if none)<input type="datetime-local" value={received} onChange={(e) => setReceived(e.target.value)} className={field} /></label>
        <label className="text-sm font-medium">Notice details<input required value={details} onChange={(e) => setDetails(e.target.value)} placeholder="For example: text message or no notice" className={field} /></label>
        <div className="sm:col-span-2"><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={grace} disabled={!packageId || used} onChange={(e) => setGrace(e.target.checked)} className="mt-1" /> Grant this client their discretionary grace for this package</label>{used ? <p className="mt-1 text-sm">Grace already used for this package.</p> : null}</div>
        {grace ? <label className="text-sm font-medium sm:col-span-2">Reason for granting grace<input required value={reason} onChange={(e) => setReason(e.target.value)} className={field} /></label> : null}
        <p className="text-xs text-stone-600 sm:col-span-2">Times are entered in this device’s local time zone. Confirm the time zone before saving.</p>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save notice"}</Button></div>
      </form> : null}
      {records.length ? <div className="mt-5"><h3 className="font-semibold">Recorded notices</h3><ul className="mt-2 space-y-3">{records.map((record) => <li key={record.id} className="rounded-lg border border-stone-200 p-3 text-sm"><p className="font-medium">{packages.find((item) => item.id === record.training_package_id)?.title ?? "Package"} · Session {new Date(record.scheduled_at).toLocaleString()}</p><p>Notice: {record.notice_received_at ? new Date(record.notice_received_at).toLocaleString() : "None recorded"} · {record.notice_details}</p><p>{record.grace_granted ? `Grace granted: ${record.grace_reason}` : "No grace granted"}</p></li>)}</ul></div> : null}
    </Card>
  );
}
