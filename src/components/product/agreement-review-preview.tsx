"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const previewSections = [
  { title: "The training package", body: "This is sample text for a design preview. The finished agreement will identify the client's selected training package, session count, price, and term. No real contract is shown here." },
  { title: "Training and scheduling", body: "The approved agreement will explain how training is scheduled and what happens when a client needs to reschedule. The example shown here does not create any obligation." },
  { title: "Payment and renewal", body: "The approved agreement will describe the payment arrangement and whether a package renews. Acknowledging an agreement does not record or process a payment." },
  { title: "Cancellations and grace", body: "The finished agreement will explain the applicable cancellation and grace policies. This placeholder is only here to make the preview long enough to scroll." },
  { title: "Questions and contact", body: "Before agreeing, the client should have the opportunity to review the terms and ask their trainer any questions. This preview does not send information to the trainer." },
  { title: "Review before continuing", body: "This is the end of the sample document. The actual agreement must be approved and reviewed before it can be presented to clients." },
];

export function AgreementReviewPreview() {
  const documentRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [complete, setComplete] = useState(false);

  function checkScroll() {
    const document = documentRef.current;
    if (document && document.scrollTop + document.clientHeight >= document.scrollHeight - 4) setReachedEnd(true);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-2xl border border-bronze-200 bg-bronze-50 p-4 text-sm leading-6 text-charcoal-950">
        <strong>Preview only.</strong> This is sample text, not a contract. Nothing on this page is saved or signed.
      </div>
      <div>
        <h2 className="font-serif text-3xl font-semibold text-charcoal-950">Review your training agreement</h2>
        <p id="review-instructions" className="mt-2 text-sm leading-6 text-stone-600">Read the entire agreement below. Scroll to the end to continue. You can click or tab into the document and use your keyboard to scroll.</p>
      </div>
      <div
        ref={documentRef}
        role="region"
        aria-label="Sample agreement document"
        aria-describedby="review-instructions"
        tabIndex={0}
        onScroll={checkScroll}
        className="h-80 overflow-y-auto rounded-2xl border border-stone-300 bg-white p-6 text-charcoal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-600 sm:h-96 sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-bronze-600">Sample document · Not an agreement</p>
        <h3 className="mt-4 font-serif text-3xl font-semibold">Training agreement preview</h3>
        {previewSections.map((section) => (
          <section key={section.title} className="mt-8">
            <h4 className="font-semibold">{section.title}</h4>
            <p className="mt-2 text-sm leading-7 text-stone-700">{section.body}</p>
          </section>
        ))}
        <p className="mt-8 border-t border-stone-200 pt-4 text-sm font-medium">End of sample document</p>
      </div>
      <p role="status" className="text-sm text-stone-600">{reachedEnd ? "You have reached the end of the sample document." : "Scroll to the end of the document to enable the review button."}</p>
      <form onSubmit={(event) => { event.preventDefault(); if (reachedEnd && agreed && name.trim()) setComplete(true); }} className="space-y-4">
        <label htmlFor="agreement-preview-name" className="block text-sm font-semibold text-charcoal-950">Full name
          <input id="agreement-preview-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base font-normal text-charcoal-950" />
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-charcoal-950">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 size-4" />
          <span>I have read and agree to the terms.</span>
        </label>
        <Button type="submit" variant="warm" disabled={!reachedEnd || !agreed || !name.trim()}>Agree and continue (preview)</Button>
        {complete ? <p role="status" className="text-sm text-charcoal-950">Preview complete. Nothing was signed or saved.</p> : null}
      </form>
    </div>
  );
}
