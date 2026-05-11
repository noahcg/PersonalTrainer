"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, HeartPulse, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { Client, ClientIntake } from "@/lib/types";

type IntakeDraft = Omit<ClientIntake, "id" | "clientId" | "completedAt">;

const parqOptions = [
  "Heart condition or high blood pressure",
  "Chest pain at rest or during activity",
  "Dizziness, balance loss, or fainting",
  "Chronic medical condition",
  "Currently pregnant or recently gave birth",
  "Bone, joint, or soft tissue issue",
  "Told to exercise only with medical supervision",
];

const stepLabels = ["Goals", "Training", "Readiness", "Lifestyle", "Review"];

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeDraft(intake: ClientIntake): IntakeDraft {
  return {
    emergencyContact: {
      name: text(intake.emergencyContact?.name),
      phone: text(intake.emergencyContact?.phone),
      relationship: text(intake.emergencyContact?.relationship),
    },
    goals: {
      primary: text(intake.goals?.primary),
      success: text(intake.goals?.success),
      timeline: text(intake.goals?.timeline),
      barriers: text(intake.goals?.barriers),
    },
    training: {
      experience: text(intake.training?.experience),
      currentActivity: text(intake.training?.currentActivity),
      equipmentAccess: text(intake.training?.equipmentAccess),
      preferredLocation: text(intake.training?.preferredLocation),
      likes: text(intake.training?.likes),
      dislikes: text(intake.training?.dislikes),
      fitnessLevel:
        intake.training?.fitnessLevel === "Advanced" || intake.training?.fitnessLevel === "Intermediate"
          ? intake.training.fitnessLevel
          : "Foundation",
    },
    readiness: {
      injuries: text(intake.readiness?.injuries),
      currentPain: text(intake.readiness?.currentPain),
      surgeries: text(intake.readiness?.surgeries),
      conditions: text(intake.readiness?.conditions),
      medications: text(intake.readiness?.medications),
      parqFlags: Array.isArray(intake.readiness?.parqFlags)
        ? intake.readiness.parqFlags.filter((item): item is string => typeof item === "string")
        : [],
      medicalClearance: text(intake.readiness?.medicalClearance),
    },
    lifestyle: {
      sleep: text(intake.lifestyle?.sleep),
      stress: text(intake.lifestyle?.stress),
      nutrition: text(intake.lifestyle?.nutrition),
      hydration: text(intake.lifestyle?.hydration),
      schedule: text(intake.lifestyle?.schedule),
      coachingStyle: text(intake.lifestyle?.coachingStyle),
      communication: text(intake.lifestyle?.communication),
    },
    metrics: {
      height: text(intake.metrics?.height),
      weight: text(intake.metrics?.weight),
      measurements: text(intake.metrics?.measurements),
      progressPhotos: text(intake.metrics?.progressPhotos),
    },
  };
}

export function ClientIntakeForm({
  initialIntake,
  mode,
}: {
  initialIntake: ClientIntake;
  mode: "demo" | "supabase";
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [draft, setDraft] = useState<IntakeDraft>(() => normalizeDraft(initialIntake));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const requiredFields = useMemo(
    () => [
      draft.goals.primary.trim(),
      draft.training.currentActivity.trim(),
      draft.readiness.medicalClearance.trim(),
      draft.lifestyle.schedule.trim(),
      draft.emergencyContact.name.trim(),
      draft.emergencyContact.phone.trim(),
    ],
    [draft],
  );
  const progress = Math.round((furthestStep / (stepLabels.length - 1)) * 100);
  const canSubmit = useMemo(
    () => requiredFields.every(Boolean),
    [requiredFields],
  );

  function updateSection<Section extends keyof IntakeDraft, Field extends keyof IntakeDraft[Section]>(
    section: Section,
    field: Field,
    value: IntakeDraft[Section][Field],
  ) {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  function toggleParqFlag(flag: string) {
    setDraft((current) => {
      const flags = current.readiness.parqFlags.includes(flag)
        ? current.readiness.parqFlags.filter((item) => item !== flag)
        : [...current.readiness.parqFlags, flag];

      return {
        ...current,
        readiness: {
          ...current.readiness,
          parqFlags: flags,
        },
      };
    });
  }

  async function submit() {
    if (!canSubmit) {
      setMessage("Complete the required fields before submitting.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const response = await fetch("/api/client/intake", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draft),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to submit intake.");
        }
      } else {
        window.localStorage.setItem("client-intake-demo", JSON.stringify({ ...draft, completedAt: new Date().toISOString() }));
      }

      router.push("/client/home");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit intake.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <section className="space-y-5">
        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border bg-white/35">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="font-serif text-4xl">Client intake</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Share the training context your coach needs before programming starts.
                </p>
              </div>
              <div className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-charcoal-950">{progress}%</div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-bronze-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {step === 0 ? (
              <div className="grid gap-4">
                <Field label="Primary goal" required>
                  <Textarea value={draft.goals.primary} onChange={(event) => updateSection("goals", "primary", event.target.value)} />
                </Field>
                <Field label="What would success look like?">
                  <Textarea value={draft.goals.success} onChange={(event) => updateSection("goals", "success", event.target.value)} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Timeline">
                    <Input value={draft.goals.timeline} onChange={(event) => updateSection("goals", "timeline", event.target.value)} />
                  </Field>
                  <Field label="Barriers">
                    <Input value={draft.goals.barriers} onChange={(event) => updateSection("goals", "barriers", event.target.value)} />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Fitness level">
                    <select
                      value={draft.training.fitnessLevel}
                      onChange={(event) => updateSection("training", "fitnessLevel", event.target.value as Client["level"])}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                    >
                      <option value="Foundation">Foundation</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </Field>
                  <Field label="Current activity" required>
                    <Input value={draft.training.currentActivity} onChange={(event) => updateSection("training", "currentActivity", event.target.value)} />
                  </Field>
                </div>
                <Field label="Training experience">
                  <Textarea value={draft.training.experience} onChange={(event) => updateSection("training", "experience", event.target.value)} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Equipment access">
                    <Input value={draft.training.equipmentAccess} onChange={(event) => updateSection("training", "equipmentAccess", event.target.value)} />
                  </Field>
                  <Field label="Preferred location">
                    <Input value={draft.training.preferredLocation} onChange={(event) => updateSection("training", "preferredLocation", event.target.value)} />
                  </Field>
                  <Field label="Exercises you like">
                    <Input value={draft.training.likes} onChange={(event) => updateSection("training", "likes", event.target.value)} />
                  </Field>
                  <Field label="Exercises you dislike">
                    <Input value={draft.training.dislikes} onChange={(event) => updateSection("training", "dislikes", event.target.value)} />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4">
                <div className="rounded-[1.25rem] border border-bronze-200 bg-bronze-50/60 p-4 text-sm leading-6 text-stone-700">
                  This form gives your coach context for exercise planning. It is not medical diagnosis or clearance.
                </div>
                <Field label="Injuries or limitations">
                  <Textarea value={draft.readiness.injuries} onChange={(event) => updateSection("readiness", "injuries", event.target.value)} />
                </Field>
                <Field label="Current pain">
                  <Input value={draft.readiness.currentPain} onChange={(event) => updateSection("readiness", "currentPain", event.target.value)} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Surgeries">
                    <Input value={draft.readiness.surgeries} onChange={(event) => updateSection("readiness", "surgeries", event.target.value)} />
                  </Field>
                  <Field label="Conditions">
                    <Input value={draft.readiness.conditions} onChange={(event) => updateSection("readiness", "conditions", event.target.value)} />
                  </Field>
                </div>
                <Field label="Medications that may affect exercise">
                  <Input value={draft.readiness.medications} onChange={(event) => updateSection("readiness", "medications", event.target.value)} />
                </Field>
                <div>
                  <p className="text-sm font-medium text-charcoal-950">Readiness flags</p>
                  <div className="mt-3 grid gap-2">
                    {parqOptions.map((option) => (
                      <label key={option} className="flex items-start gap-3 rounded-[1rem] border border-stone-200 bg-white/70 p-3 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={draft.readiness.parqFlags.includes(option)}
                          onChange={() => toggleParqFlag(option)}
                          className="mt-1 size-4 accent-bronze-500"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Medical clearance status" required>
                  <Textarea value={draft.readiness.medicalClearance} onChange={(event) => updateSection("readiness", "medicalClearance", event.target.value)} />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Sleep">
                    <Input value={draft.lifestyle.sleep} onChange={(event) => updateSection("lifestyle", "sleep", event.target.value)} />
                  </Field>
                  <Field label="Stress">
                    <Input value={draft.lifestyle.stress} onChange={(event) => updateSection("lifestyle", "stress", event.target.value)} />
                  </Field>
                  <Field label="Nutrition habits">
                    <Input value={draft.lifestyle.nutrition} onChange={(event) => updateSection("lifestyle", "nutrition", event.target.value)} />
                  </Field>
                  <Field label="Hydration">
                    <Input value={draft.lifestyle.hydration} onChange={(event) => updateSection("lifestyle", "hydration", event.target.value)} />
                  </Field>
                </div>
                <Field label="Weekly availability" required>
                  <Textarea value={draft.lifestyle.schedule} onChange={(event) => updateSection("lifestyle", "schedule", event.target.value)} />
                </Field>
                <Field label="Coaching style">
                  <Input value={draft.lifestyle.coachingStyle} onChange={(event) => updateSection("lifestyle", "coachingStyle", event.target.value)} />
                </Field>
                <Field label="Communication preference">
                  <Input value={draft.lifestyle.communication} onChange={(event) => updateSection("lifestyle", "communication", event.target.value)} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Height">
                    <Input value={draft.metrics.height} onChange={(event) => updateSection("metrics", "height", event.target.value)} />
                  </Field>
                  <Field label="Body weight">
                    <Input value={draft.metrics.weight} onChange={(event) => updateSection("metrics", "weight", event.target.value)} />
                  </Field>
                  <Field label="Measurements">
                    <Input value={draft.metrics.measurements} onChange={(event) => updateSection("metrics", "measurements", event.target.value)} />
                  </Field>
                  <Field label="Progress photo preference">
                    <Input value={draft.metrics.progressPhotos} onChange={(event) => updateSection("metrics", "progressPhotos", event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Emergency contact" required>
                    <Input value={draft.emergencyContact.name} onChange={(event) => updateSection("emergencyContact", "name", event.target.value)} />
                  </Field>
                  <Field label="Emergency phone" required>
                    <Input value={draft.emergencyContact.phone} onChange={(event) => updateSection("emergencyContact", "phone", event.target.value)} />
                  </Field>
                  <Field label="Relationship">
                    <Input value={draft.emergencyContact.relationship} onChange={(event) => updateSection("emergencyContact", "relationship", event.target.value)} />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 4 ? <Review draft={draft} /> : null}

            {message ? <p className="mt-5 rounded-[1rem] bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="secondary" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || saving}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              {step < stepLabels.length - 1 ? (
                <Button
                  variant="warm"
                  onClick={() => {
                    const nextStep = Math.min(step + 1, stepLabels.length - 1);
                    setStep(nextStep);
                    setFurthestStep((current) => Math.max(current, nextStep));
                  }}
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button variant="warm" onClick={() => void submit()} disabled={saving || !canSubmit}>
                  <CheckCircle2 className="size-4" />
                  {saving ? "Submitting..." : "Submit intake"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-5">
        <Card className="p-5">
          <HeartPulse className="size-5 text-bronze-600" />
          <p className="mt-4 text-sm font-semibold text-charcoal-950">What your trainer sees</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Your goals, readiness notes, schedule, preferences, and emergency contact are added to your client profile.
          </p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="size-5 text-sage-700" />
          <p className="mt-4 text-sm font-semibold text-charcoal-950">Required before training</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            If readiness answers raise concerns, your trainer may ask for medical clearance before assigning workouts.
          </p>
        </Card>
        <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-4">
          <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Steps</p>
          <div className="mt-3 grid gap-2">
            {stepLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full px-4 py-2 text-left text-sm transition ${
                  step === index ? "bg-charcoal-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-charcoal-950">
        {label}
        {required ? <span className="text-bronze-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Review({ draft }: { draft: IntakeDraft }) {
  const rows = [
    ["Primary goal", draft.goals.primary],
    ["Current activity", draft.training.currentActivity],
    ["Fitness level", draft.training.fitnessLevel],
    ["Readiness flags", draft.readiness.parqFlags.join(", ") || "None selected"],
    ["Medical clearance", draft.readiness.medicalClearance],
    ["Availability", draft.lifestyle.schedule],
    ["Emergency contact", `${draft.emergencyContact.name} ${draft.emergencyContact.phone}`.trim()],
  ];

  return (
    <div className="grid divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-2 bg-white/65 p-4 sm:grid-cols-[12rem_1fr]">
          <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">{label}</p>
          <p className="text-sm leading-6 text-stone-700">{value || "Not provided"}</p>
        </div>
      ))}
    </div>
  );
}
