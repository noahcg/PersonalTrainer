"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PageData = { image: string; text: string };

export function AgreementPdfReview({ offerId, packageTitle, version }: { offerId: string; packageTitle: string; version: string }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [error, setError] = useState("");
  const [reachedEnd, setReachedEnd] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const pdfUrl = `/api/client/agreements/${offerId}/pdf`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const response = await fetch(pdfUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("The agreement is unavailable. Please contact Nick.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        const document = await pdfjs.getDocument({ data: bytes }).promise;
        if (document.numPages > 30) throw new Error("This agreement is too long to display. Please contact Nick.");
        const result: PageData[] = [];
        for (let i = 1; i <= document.numPages; i++) {
          const page = await document.getPage(i);
          const text = (await page.getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ").trim();
          if (!text) throw new Error("This PDF does not have accessible text on every page. Please ask Nick for an accessible copy.");
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(1.4, 2200 / Math.max(base.width, base.height)) });
          const canvas = window.document.createElement("canvas");
          canvas.width = viewport.width; canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Unable to display the agreement on this device.");
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          result.push({ image: canvas.toDataURL("image/png"), text });
        }
        await document.destroy();
        if (!cancelled) setPages(result);
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to display the agreement."); }
    }
    void load();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  function checkScroll() {
    const el = container.current;
    if (el && pages.length && el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setReachedEnd(true);
  }

  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reachedEnd || !agreed || !electronicConsent || !name.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/client/agreements/${offerId}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agreed: true, electronicConsent: true, name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your agreement.");
      setComplete(true); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save your agreement."); }
    finally { setBusy(false); }
  }

  if (complete) return <div role="status" className="rounded-2xl border border-sage-200 bg-white p-6"><h2 className="font-serif text-3xl font-semibold">Agreement accepted</h2><p className="mt-3 text-sm text-stone-600">Your acknowledgment was recorded. You can view or download your agreement below.</p><a className="mt-4 inline-block underline" href={pdfUrl} target="_blank" rel="noreferrer">View or download agreement PDF</a><p className="mt-4"><a className="underline" href="/client/home">Continue to your account</a></p></div>;
  return <div className="max-w-3xl space-y-5">
    <div><h2 className="font-serif text-3xl font-semibold">Review your training agreement</h2><p className="mt-2 text-sm text-stone-600">{packageTitle} · Version {version}</p><p id="agreement-instructions" className="mt-2 text-sm leading-6 text-stone-600">Read the agreement below. Scroll to the end to continue. You can tab into the document and use your keyboard to scroll.</p><a href={pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">Open or download the PDF</a></div>
    <div ref={container} role="region" aria-label="Training agreement" aria-describedby="agreement-instructions" tabIndex={0} onScroll={checkScroll} className="h-96 overflow-y-auto rounded-2xl border border-stone-300 bg-white p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-600">
      {!pages.length && !error ? <p role="status">Loading agreement…</p> : null}
      {/* PDF pages are rendered locally; the extracted text is available to assistive technology. */}
      {pages.map((page, index) => (
        <section key={index} className="mb-5">
          <h3 className="sr-only">Page {index + 1}</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="" aria-hidden="true" className="h-auto w-full" />
          <p className="sr-only">{page.text}</p>
        </section>
      ))}
    </div>
    <button type="button" className="text-sm underline" onClick={() => container.current?.scrollTo({ top: container.current.scrollHeight, behavior: "auto" })}>Move to the end of the agreement</button>
    <p role="status" className="text-sm text-stone-600">{reachedEnd ? "You have reached the end of the agreement." : "Scroll to the end of the agreement to continue."}</p>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <form onSubmit={accept} className="space-y-4">
      <label htmlFor="agreement-name" className="block text-sm font-semibold">Full name<input id="agreement-name" autoComplete="name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base font-normal" /></label>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={electronicConsent} onChange={(e) => setElectronicConsent(e.target.checked)} className="mt-1 size-4" /><span>I agree to receive this agreement electronically and can access and retain a copy.</span></label>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4" /><span>I have read and agree to the terms.</span></label>
      <Button type="submit" variant="warm" disabled={!reachedEnd || !agreed || !electronicConsent || name.trim().length < 2 || busy || !pages.length}>{busy ? "Saving…" : "Agree and continue"}</Button>
    </form>
  </div>;
}
