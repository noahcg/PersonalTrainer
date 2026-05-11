import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { ClientIntake } from "@/lib/types";

type IntakePayload = Omit<ClientIntake, "id" | "clientId" | "completedAt">;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanObject<T extends Record<string, unknown>>(value: unknown, keys: Array<keyof T>) {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return keys.reduce((result, key) => {
    result[key] = clean(source[key as string]) as T[keyof T];
    return result;
  }, {} as T);
}

function cleanFitnessLevel(value: unknown) {
  return value === "Advanced" || value === "Intermediate" ? value : "Foundation";
}

function cleanParqFlags(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => clean(item)).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "trainer" | "client" }>();

    if (profile?.role !== "client") {
      return NextResponse.json({ error: "Only clients can submit intake forms." }, { status: 403 });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!client?.id) {
      return NextResponse.json({ error: "Client profile not found." }, { status: 404 });
    }

    const payload = (await request.json()) as Partial<IntakePayload>;
    const emergencyContact = cleanObject<ClientIntake["emergencyContact"]>(payload.emergencyContact, ["name", "phone", "relationship"]);
    const goals = cleanObject<ClientIntake["goals"]>(payload.goals, ["primary", "success", "timeline", "barriers"]);
    const training = {
      ...cleanObject<Omit<ClientIntake["training"], "fitnessLevel">>(payload.training, [
        "experience",
        "currentActivity",
        "equipmentAccess",
        "preferredLocation",
        "likes",
        "dislikes",
      ]),
      fitnessLevel: cleanFitnessLevel(payload.training?.fitnessLevel),
    };
    const readiness = {
      ...cleanObject<Omit<ClientIntake["readiness"], "parqFlags">>(payload.readiness, [
        "injuries",
        "currentPain",
        "surgeries",
        "conditions",
        "medications",
        "medicalClearance",
      ]),
      parqFlags: cleanParqFlags(payload.readiness?.parqFlags),
    };
    const lifestyle = cleanObject<ClientIntake["lifestyle"]>(payload.lifestyle, [
      "sleep",
      "stress",
      "nutrition",
      "hydration",
      "schedule",
      "coachingStyle",
      "communication",
    ]);
    const metrics = cleanObject<ClientIntake["metrics"]>(payload.metrics, ["height", "weight", "measurements", "progressPhotos"]);

    if (!goals.primary || !training.currentActivity || !readiness.medicalClearance || !lifestyle.schedule || !emergencyContact.name || !emergencyContact.phone) {
      return NextResponse.json(
        { error: "Please complete goals, current activity, readiness, schedule, and emergency contact fields." },
        { status: 400 },
      );
    }

    const completedAt = new Date().toISOString();
    const admin = createAdminClient();
    const { error: intakeError } = await admin.from("client_intakes").upsert(
      {
        client_id: client.id,
        emergency_contact: emergencyContact,
        goals,
        training,
        readiness,
        lifestyle,
        metrics,
        completed_at: completedAt,
        updated_at: completedAt,
      },
      { onConflict: "client_id" },
    );

    if (intakeError) {
      return NextResponse.json({ error: intakeError.message }, { status: 500 });
    }

    const readinessSummary = [
      readiness.injuries ? `Limitations: ${readiness.injuries}` : "",
      readiness.currentPain ? `Current pain: ${readiness.currentPain}` : "",
      readiness.parqFlags.length ? `Readiness flags: ${readiness.parqFlags.join(", ")}` : "",
      readiness.medicalClearance ? `Clearance: ${readiness.medicalClearance}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { error: clientError } = await admin
      .from("clients")
      .update({
        goals: goals.primary || null,
        fitness_level: training.fitnessLevel,
        injuries_limitations: readinessSummary || null,
        preferred_training_style: lifestyle.coachingStyle || null,
        availability: lifestyle.schedule || null,
        intake_completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", client.id);

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, completedAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit intake." },
      { status: 500 },
    );
  }
}
