import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Card } from "@/components/ui/card";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms of Service | ${brand.businessName}`,
  description: `Terms for using ${brand.businessName}.`,
};

const sections = [
  {
    title: "Use of the Service",
    body: [
      "The app is provided to help the trainer and invited clients manage coaching details such as workouts, plans, messages, appointments, progress notes, check-ins, resources, and account settings.",
      "You agree to use the app only for lawful, personal training-related purposes and to keep your login credentials private. You are responsible for activity under your account.",
    ],
  },
  {
    title: "Training and Health Information",
    body: [
      "Coaching information in the app is not medical advice, diagnosis, or treatment. Always consult a qualified health professional before starting or changing an exercise program, especially if you have an injury, medical condition, or concern.",
      "You are responsible for listening to your body, using proper judgment, and stopping any activity that causes pain, dizziness, shortness of breath, or other concerning symptoms.",
    ],
  },
  {
    title: "Client Content",
    body: [
      "You may submit information such as messages, check-ins, workout feedback, intake responses, photos, goals, injuries or limitations, availability, and other training details.",
      "You confirm that the information you provide is accurate to the best of your knowledge and that you have the right to share it. You should not submit information about another person unless you have permission.",
    ],
  },
  {
    title: "Scheduling, Packages, and Payments",
    body: [
      "Package details, session counts, pricing, attendance, cancellation handling, and refunds are managed by the trainer and may be documented separately from the app.",
      "Unless online payments are added later, the app does not collect or store payment card details. Any payment arrangements are handled directly with the trainer or through a separate payment provider.",
    ],
  },
  {
    title: "Availability and Changes",
    body: [
      "The app may be updated, interrupted, or unavailable from time to time for maintenance, hosting issues, account administration, or security reasons.",
      "Features may change as the training business and client workflow evolve. Continued use of the app after updates means you accept the updated terms.",
    ],
  },
  {
    title: "Account Access and Removal",
    body: [
      "Client access is invitation-based and may be paused, limited, or removed by the trainer when coaching ends, account security is at risk, or these terms are violated.",
      "You may ask the trainer to update, export, or delete information associated with your client account, subject to practical, legal, and business recordkeeping needs.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the fullest extent allowed by law, the app is provided as-is and without warranties of uninterrupted access, error-free operation, or fitness for a particular purpose.",
      <>
        <BrandName /> is not responsible for indirect, incidental, consequential, or special damages arising from use of
        the app or reliance on information provided through it.
      </>,
    ],
  },
  {
    title: "Contact",
    body: [
      <>
        Questions about these terms should be directed to <BrandName /> through the same contact method you use for
        coaching or account support.
      </>,
    ],
  },
] satisfies Array<{ title: string; body: ReactNode[] }>;

function BrandName() {
  return <span className="whitespace-nowrap">{brand.businessName}</span>;
}

export default function TermsPage() {
  return (
    <PublicSiteShell>
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600">Terms of Service</p>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl">
            Terms for using <BrandName />.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Last updated August 24, 2026. These terms explain the basic rules for using the app and client portal.
          </p>
        </div>
      </section>

      <section className="pb-12 lg:pb-16">
        <Card className="p-5 sm:p-7 lg:p-8">
          <div className="mt-4 grid gap-8">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-stone-200 pt-6 first:border-t-0 first:pt-0">
                <h2 className="text-xl font-semibold text-charcoal-950">{section.title}</h2>
                <div className="mt-3 grid gap-3">
                  {section.body.map((paragraph, index) => (
                    <p key={index} className="text-sm leading-7 text-stone-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>
      </section>
    </PublicSiteShell>
  );
}
