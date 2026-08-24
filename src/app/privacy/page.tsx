import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Card } from "@/components/ui/card";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${brand.businessName}`,
  description: `Privacy practices for ${brand.businessName}.`,
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "We collect information needed to provide coaching and operate the app, including names, email addresses, account details, profile photos, client goals, training preferences, injuries or limitations, availability, messages, workouts, progress notes, check-ins, resources, appointment details, and intake responses.",
      "If you enable notifications, the app stores technical subscription details needed to send browser push reminders.",
    ],
  },
  {
    title: "How Information Is Used",
    body: [
      "Information is used to manage coaching relationships, prepare and adjust training plans, schedule sessions, communicate with clients, track progress, send account and invitation emails, deliver reminders, improve reliability, and protect the app.",
      "Health and fitness-related information is used only for coaching and app operation. The app is not intended to be a medical record system.",
    ],
  },
  {
    title: "How Information Is Shared",
    body: [
      "Client information is visible to the trainer and, where appropriate, to the client who owns the account. It is not sold.",
      "Limited information may be processed by service providers that help run the app, such as hosting, database, authentication, analytics, email delivery, storage, and push notification providers.",
    ],
  },
  {
    title: "Cookies, Analytics, and Local Storage",
    body: [
      "The app may use cookies or similar browser storage for authentication, security, preferences, demo data, and basic product analytics.",
      "Analytics and performance tools may collect technical information such as page views, device/browser details, and error or speed measurements so the app can be improved.",
    ],
  },
  {
    title: "Photos and Uploaded Content",
    body: [
      "Profile photos and other uploaded content are stored so the trainer and client experience can display the correct account and coaching information.",
      "Only upload content you are comfortable sharing for coaching purposes. Do not upload another person's image or information without permission.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "Information is kept while it is useful for coaching, account administration, business records, security, or legal obligations.",
      "You may ask the trainer to update, export, or delete client information. Some records may need to be retained when required for legitimate business, legal, security, or dispute-resolution reasons.",
    ],
  },
  {
    title: "Security",
    body: [
      "The app uses account-based access controls and service providers designed for secure hosting, authentication, and data storage.",
      "No system can be guaranteed completely secure. Use a strong password, protect your account access, and notify the trainer if you believe your account has been compromised.",
    ],
  },
  {
    title: "Children's Privacy",
    body: [
      "The app is intended for clients who are old enough to participate in personal training with appropriate consent. It is not intended for unsupervised use by children.",
      "If a parent or guardian believes a child provided information without appropriate permission, they should contact the trainer so the account can be reviewed.",
    ],
  },
  {
    title: "Changes and Contact",
    body: [
      "This policy may be updated as the app, services, or business practices change. The updated date will show when the policy was last revised.",
      <>
        Questions or privacy requests should be directed to <BrandName /> through the same contact method you use for
        coaching or account support.
      </>,
    ],
  },
] satisfies Array<{ title: string; body: ReactNode[] }>;

function BrandName() {
  return <span className="whitespace-nowrap">{brand.businessName}</span>;
}

export default function PrivacyPage() {
  return (
    <PublicSiteShell>
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600">Privacy Policy</p>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl">
            How <BrandName /> handles client and account information.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Last updated August 24, 2026. This policy summarizes what the app collects, why it is used, and how privacy
            requests can be handled.
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
