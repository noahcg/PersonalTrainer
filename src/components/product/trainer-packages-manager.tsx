"use client";

import Link from "next/link";
import { Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { PackageType, TrainingPackage } from "@/lib/types";

type PackageTypeDraft = {
  id: string | null;
  kind: TrainingPackage["kind"];
  name: string;
  sessionCount: string;
  price: string;
  currency: string;
  billingTerms: string;
  policyNotes: string;
  defaultSchedule: string;
};

function emptyPackageTypeDraft(): PackageTypeDraft {
  return {
    id: null,
    kind: "one_on_one",
    name: "",
    sessionCount: "",
    price: "",
    currency: "USD",
    billingTerms: "",
    policyNotes: "",
    defaultSchedule: "",
  };
}

function draftFromPackageType(packageType: PackageType): PackageTypeDraft {
  return {
    id: packageType.id,
    kind: packageType.kind,
    name: packageType.name,
    sessionCount: packageType.sessionCount === null ? "" : String(packageType.sessionCount),
    price: packageType.priceCents === null ? "" : (packageType.priceCents / 100).toFixed(2),
    currency: packageType.currency,
    billingTerms: packageType.billingTerms,
    policyNotes: packageType.policyNotes,
    defaultSchedule: packageType.defaultSchedule,
  };
}

function packageKindLabel(kind: TrainingPackage["kind"]) {
  return kind === "partner_training" ? "Shared" : "Individual";
}

function formatPrice(value: number | null, currency: string) {
  if (value === null) return "No price";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value / 100);
}

export function TrainerPackagesManager({
  initialPackages,
  initialPackageTypes,
  mode,
}: {
  initialPackages: TrainingPackage[];
  initialPackageTypes: PackageType[];
  mode: "demo" | "supabase";
}) {
  const [packages] = useState(initialPackages);
  const [packageTypes, setPackageTypes] = useState(initialPackageTypes);
  const [draft, setDraft] = useState<PackageTypeDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function savePackageType() {
    if (!draft?.name.trim()) return;
    setBusy(true);
    setMessage(null);

    const nextType: PackageType = {
      id: draft.id ?? `package-type-${Date.now()}`,
      kind: draft.kind,
      name: draft.name.trim(),
      sessionCount: draft.sessionCount.trim() ? Number(draft.sessionCount) : null,
      priceCents: draft.price.trim() ? Math.round(Number(draft.price) * 100) : null,
      currency: draft.currency.trim() || "USD",
      billingTerms: draft.billingTerms.trim(),
      policyNotes: draft.policyNotes.trim(),
      internalNotes: "",
      defaultLocation: "",
      defaultSchedule: draft.defaultSchedule.trim(),
      active: true,
    };

    try {
      if (mode === "supabase") {
        const response = await fetch("/api/trainer/package-types", {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draft.id,
            kind: nextType.kind,
            name: nextType.name,
            sessionCount: nextType.sessionCount,
            priceCents: nextType.priceCents,
            currency: nextType.currency,
            billingTerms: nextType.billingTerms,
            policyNotes: nextType.policyNotes,
            internalNotes: nextType.internalNotes,
            defaultLocation: nextType.defaultLocation,
            defaultSchedule: nextType.defaultSchedule,
            active: true,
          }),
        });
        const payload = (await response.json()) as { error?: string; id?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to save package type.");
        nextType.id = payload.id ?? nextType.id;
      }

      setPackageTypes((current) => [nextType, ...current.filter((item) => item.id !== nextType.id)]);
      setDraft(null);
      setMessage("Package type saved.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save package type.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">Packages</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">Package types.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Create the package choices a trainer can assign to clients. Client-specific package records appear below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDraft(emptyPackageTypeDraft())}>
              <Plus className="size-4" />
              Add package type
            </Button>
            <Button asChild variant="warm">
              <Link href="/trainer/clients">
                <Plus className="size-4" />
                New signup
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {message ? <Card className="border-bronze-200 bg-bronze-50/70 p-4 text-sm text-stone-700">{message}</Card> : null}

      {draft ? (
        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border bg-white/35">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{draft.id ? "Edit package type" : "Add package type"}</CardTitle>
                <p className="text-sm leading-6 text-stone-500">These defaults are copied when the package is assigned to a client.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label="Close package type form">
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input value={draft.name} onChange={(event) => setDraft((current) => current && { ...current, name: event.target.value })} />
              </Field>
              <Field label="Type">
                <select
                  value={draft.kind}
                  onChange={(event) => setDraft((current) => current && { ...current, kind: event.target.value as TrainingPackage["kind"] })}
                  className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft"
                >
                  <option value="one_on_one">Individual</option>
                  <option value="partner_training">Shared</option>
                </select>
              </Field>
              <Field label="Sessions">
                <Input
                  type="number"
                  min="0"
                  value={draft.sessionCount}
                  onChange={(event) => setDraft((current) => current && { ...current, sessionCount: event.target.value })}
                  placeholder="Open"
                />
              </Field>
              <Field label="Price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price}
                  onChange={(event) => setDraft((current) => current && { ...current, price: event.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Default schedule">
                <Input value={draft.defaultSchedule} onChange={(event) => setDraft((current) => current && { ...current, defaultSchedule: event.target.value })} />
              </Field>
              <Field label="Currency">
                <Input value={draft.currency} onChange={(event) => setDraft((current) => current && { ...current, currency: event.target.value.toUpperCase() })} />
              </Field>
            </div>
            <Field label="Billing terms">
              <Textarea value={draft.billingTerms} onChange={(event) => setDraft((current) => current && { ...current, billingTerms: event.target.value })} />
            </Field>
            <Field label="Client-facing policy">
              <Textarea value={draft.policyNotes} onChange={(event) => setDraft((current) => current && { ...current, policyNotes: event.target.value })} />
            </Field>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="warm" onClick={() => void savePackageType()} disabled={busy || !draft.name.trim()}>
                <Save className="size-4" />
                {busy ? "Saving..." : "Save package type"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-border bg-white/35">
          <CardTitle>Package types</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {packageTypes.length ? (
            <div className="divide-y divide-border">
              {packageTypes.map((packageType) => (
                <button
                  key={packageType.id}
                  type="button"
                  onClick={() => setDraft(draftFromPackageType(packageType))}
                  className="grid w-full gap-3 p-4 text-left transition hover:bg-stone-50 sm:grid-cols-[1fr_9rem_8rem_7rem] sm:items-center sm:p-5"
                >
                  <div>
                    <p className="font-semibold text-charcoal-950">{packageType.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{packageType.billingTerms || packageType.policyNotes || "No terms added"}</p>
                  </div>
                  <Badge variant={packageType.kind === "partner_training" ? "bronze" : "dark"}>{packageKindLabel(packageType.kind)}</Badge>
                  <p className="text-sm text-stone-600">{packageType.sessionCount === null ? "Open" : `${packageType.sessionCount} sessions`}</p>
                  <p className="text-sm font-semibold text-charcoal-950">{formatPrice(packageType.priceCents, packageType.currency)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-stone-600">No package types yet.</div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-border bg-white/35">
          <CardTitle>Client package records</CardTitle>
          <p className="text-sm leading-6 text-stone-500">Packages already assigned to clients.</p>
        </CardHeader>
        <CardContent className="p-0">
          {packages.length ? (
            <div className="divide-y divide-border">
              {packages.map((trainingPackage) => (
                <div key={trainingPackage.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_9rem_8rem_7rem] sm:items-center sm:p-5">
                  <div>
                    <p className="font-semibold text-charcoal-950">{trainingPackage.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{trainingPackage.members.map((member) => member.name).join(" + ") || "No client attached"}</p>
                  </div>
                  <Badge variant={trainingPackage.status === "active" ? "sage" : trainingPackage.status === "cancelled" ? "alert" : "default"}>
                    {trainingPackage.status}
                  </Badge>
                  <p className="text-sm text-stone-600">
                    {trainingPackage.remainingSessions === null ? "Open" : `${trainingPackage.remainingSessions} left`}
                  </p>
                  <p className="text-sm font-semibold text-charcoal-950">{formatPrice(trainingPackage.priceCents, trainingPackage.currency)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-stone-600">No client packages yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
      {label}
      {children}
    </label>
  );
}
