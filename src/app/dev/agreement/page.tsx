import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AgreementReviewPreview } from "@/components/product/agreement-review-preview";

export const dynamic = "force-dynamic";

export default function AgreementPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AppShell role="client" title="Agreement preview" eyebrow="Development only" subtitle="Preview the review and acknowledgment experience before client activation." navLocked>
      <AgreementReviewPreview />
    </AppShell>
  );
}
