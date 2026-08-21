"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Dumbbell, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { ClientIntake } from "@/lib/types";

type IntakeDraft = Omit<ClientIntake, "id" | "clientId" | "completedAt">;

const workoutStyles = [
  "Strength training",
  "Conditioning",
  "Mobility",
  "Athletic / sport",
  "Classes / group",
  "Outdoor cardio",
  "Not sure yet",
];

const lastWorkoutOptions = [
  "This week",
  "In the last month",
  "1-3 months ago",
  "3-6 months ago",
  "6+ months ago",
  "I have not worked out recently",
];

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
      lastWorkoutWhen: text(intake.training?.lastWorkoutWhen),
      lastWorkoutWhat: text(intake.training?.lastWorkoutWhat),
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
      age: text(intake.metrics?.age),
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
  const [draft, setDraft] = useState<IntakeDraft>(() => normalizeDraft(initialIntake));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const missingFields = useMemo(
    () =>
      [
        { label: "Age", value: draft.metrics.age.trim() },
        { label: "Last workout timing", value: draft.training.lastWorkoutWhen.trim() },
        { label: "Last workout details", value: draft.training.lastWorkoutWhat.trim() },
        { label: "Workout style", value: draft.training.likes.trim() },
        { label: "Goals", value: draft.goals.primary.trim() },
      ].filter((field) => !field.value),
    [draft],
  );
  const canSubmit = missingFields.length === 0;

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

  function toggleWorkoutStyle(style: string) {
    setDraft((current) => {
      const styles = current.training.likes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const nextStyles = styles.includes(style) ? styles.filter((item) => item !== style) : [...styles, style];

      return {
        ...current,
        training: {
          ...current.training,
          likes: nextStyles.join(", "),
        },
      };
    });
  }

  async function submit() {
    if (!canSubmit) {
      setMessage(`Please complete: ${missingFields.map((field) => field.label).join(", ")}.`);
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

  const selectedStyles = draft.training.likes
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-border bg-white/35">
          <CardTitle className="font-serif text-4xl">Client intake</CardTitle>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            A few quick answers help your trainer meet you where you are without making setup feel like homework.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
            <Field label="Age" required>
              <Input
                type="number"
                inputMode="numeric"
                min={13}
                max={120}
                value={draft.metrics.age}
                onChange={(event) => updateSection("metrics", "age", event.target.value)}
              />
            </Field>
            <Field label="When was your last workout?" required>
              <select
                value={draft.training.lastWorkoutWhen}
                onChange={(event) => updateSection("training", "lastWorkoutWhen", event.target.value)}
                className="h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm text-charcoal-950 shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
              >
                <option value="">Select one</option>
                {lastWorkoutOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="What was the workout?" required>
            <Textarea
              value={draft.training.lastWorkoutWhat}
              onChange={(event) => updateSection("training", "lastWorkoutWhat", event.target.value)}
              placeholder="Example: 30-minute walk, upper body machines, yoga class, basketball, or no recent structured workout."
            />
          </Field>

          <div>
            <p className="text-sm font-medium text-charcoal-950">
              What style of working out do you like? <span className="text-bronze-600">*</span>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {workoutStyles.map((style) => (
                <label key={style} className="flex items-center gap-3 rounded-[1rem] border border-stone-200 bg-white/70 p-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={selectedStyles.includes(style)}
                    onChange={() => toggleWorkoutStyle(style)}
                    className="size-4 accent-bronze-500"
                  />
                  <span>{style}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Goals, briefly" required>
            <Textarea
              value={draft.goals.primary}
              onChange={(event) => updateSection("goals", "primary", event.target.value)}
              placeholder="A sentence or two is enough."
            />
          </Field>

          {message ? <p className="rounded-[1rem] bg-stone-100 px-4 py-3 text-sm text-stone-700">{message}</p> : null}

          {missingFields.length ? (
            <p className="rounded-[1rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Required before submitting: {missingFields.map((field) => field.label).join(", ")}.
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button variant="warm" onClick={() => void submit()} disabled={saving || !canSubmit}>
              <CheckCircle2 className="size-4" />
              {saving ? "Submitting..." : "Submit intake"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <Card className="p-5">
          <Dumbbell className="size-5 text-bronze-600" />
          <p className="mt-4 text-sm font-semibold text-charcoal-950">Training context</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Your trainer will see your recent workout history, preferred workout style, and main goals.
          </p>
        </Card>
        <Card className="p-5">
          <CalendarDays className="size-5 text-sage-700" />
          <p className="mt-4 text-sm font-semibold text-charcoal-950">Quick setup</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            This replaces the longer intake. Health, schedule, and contact details can be handled directly with your trainer.
          </p>
        </Card>
        <Card className="p-5">
          <HeartPulse className="size-5 text-clay-600" />
          <p className="mt-4 text-sm font-semibold text-charcoal-950">First plan signal</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Short answers are enough for your trainer to choose a sensible starting point.
          </p>
        </Card>
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
