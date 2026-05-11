import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { Client, ClientIntake } from "@/lib/types";

type ClientIntakeRow = {
  id: string;
  client_id: string;
  completed_at: string | null;
  emergency_contact: ClientIntake["emergencyContact"] | null;
  goals: ClientIntake["goals"] | null;
  training: ClientIntake["training"] | null;
  readiness: ClientIntake["readiness"] | null;
  lifestyle: ClientIntake["lifestyle"] | null;
  metrics: ClientIntake["metrics"] | null;
};

type ClientIntakeStatusRow = {
  id: string;
  intake_completed_at: string | null;
};

const defaultIntake: Omit<ClientIntake, "id" | "clientId" | "completedAt"> = {
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  goals: {
    primary: "",
    success: "",
    timeline: "",
    barriers: "",
  },
  training: {
    experience: "",
    currentActivity: "",
    equipmentAccess: "",
    preferredLocation: "",
    likes: "",
    dislikes: "",
    fitnessLevel: "Foundation",
  },
  readiness: {
    injuries: "",
    currentPain: "",
    surgeries: "",
    conditions: "",
    medications: "",
    parqFlags: [],
    medicalClearance: "",
  },
  lifestyle: {
    sleep: "",
    stress: "",
    nutrition: "",
    hydration: "",
    schedule: "",
    coachingStyle: "",
    communication: "",
  },
  metrics: {
    height: "",
    weight: "",
    measurements: "",
    progressPhotos: "",
  },
};

export function emptyClientIntake(clientId = ""): ClientIntake {
  return {
    id: "",
    clientId,
    completedAt: null,
    ...defaultIntake,
  };
}

function normalizeFitnessLevel(value: string | null | undefined): Client["level"] {
  return value === "Advanced" || value === "Intermediate" ? value : "Foundation";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringSection<T extends Record<string, string>>(defaults: T, value: unknown) {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, stringValue(source[key])]),
  ) as T;
}

function mapIntake(row: ClientIntakeRow): ClientIntake {
  const readiness = typeof row.readiness === "object" && row.readiness !== null ? row.readiness : null;
  const training = typeof row.training === "object" && row.training !== null ? row.training : null;

  return {
    id: row.id,
    clientId: row.client_id,
    completedAt: row.completed_at,
    emergencyContact: stringSection(defaultIntake.emergencyContact, row.emergency_contact),
    goals: stringSection(defaultIntake.goals, row.goals),
    training: {
      ...stringSection(
        {
          experience: defaultIntake.training.experience,
          currentActivity: defaultIntake.training.currentActivity,
          equipmentAccess: defaultIntake.training.equipmentAccess,
          preferredLocation: defaultIntake.training.preferredLocation,
          likes: defaultIntake.training.likes,
          dislikes: defaultIntake.training.dislikes,
        },
        row.training,
      ),
      fitnessLevel: normalizeFitnessLevel(training?.fitnessLevel),
    },
    readiness: {
      ...stringSection(
        {
          injuries: defaultIntake.readiness.injuries,
          currentPain: defaultIntake.readiness.currentPain,
          surgeries: defaultIntake.readiness.surgeries,
          conditions: defaultIntake.readiness.conditions,
          medications: defaultIntake.readiness.medications,
          medicalClearance: defaultIntake.readiness.medicalClearance,
        },
        row.readiness,
      ),
      parqFlags: Array.isArray(readiness?.parqFlags) ? readiness.parqFlags.filter((item): item is string => typeof item === "string") : [],
    },
    lifestyle: stringSection(defaultIntake.lifestyle, row.lifestyle),
    metrics: stringSection(defaultIntake.metrics, row.metrics),
  };
}

function isMissingIntakeSchema(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || error?.code === "42703" || message.includes("client_intakes") || message.includes("intake_completed_at");
}

export async function getClientIntakeStatus() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, clientId: null as string | null, completed: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { mode: "supabase" as const, clientId: null as string | null, completed: false };
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, intake_completed_at")
    .eq("profile_id", user.id)
    .maybeSingle<ClientIntakeStatusRow>();

  if (error) {
    if (isMissingIntakeSchema(error)) {
      return { mode: "supabase" as const, clientId: null as string | null, completed: true };
    }
    throw error;
  }

  if (!data?.id) {
    return { mode: "supabase" as const, clientId: null as string | null, completed: false };
  }

  return {
    mode: "supabase" as const,
    clientId: data.id,
    completed: Boolean(data.intake_completed_at),
  };
}

export async function getClientSelfIntake() {
  const status = await getClientIntakeStatus();
  if (status.mode === "demo") {
    return { mode: "demo" as const, intake: emptyClientIntake() };
  }

  if (!status.clientId) {
    return { mode: "supabase" as const, intake: null as ClientIntake | null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_intakes")
    .select("id, client_id, completed_at, emergency_contact, goals, training, readiness, lifestyle, metrics")
    .eq("client_id", status.clientId)
    .maybeSingle<ClientIntakeRow>();

  if (error) {
    if (isMissingIntakeSchema(error)) {
      return { mode: "supabase" as const, intake: emptyClientIntake(status.clientId) };
    }
    throw error;
  }

  return {
    mode: "supabase" as const,
    intake: data ? mapIntake(data) : emptyClientIntake(status.clientId),
  };
}

export async function getTrainerClientIntake(clientId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_intakes")
    .select("id, client_id, completed_at, emergency_contact, goals, training, readiness, lifestyle, metrics")
    .eq("client_id", clientId)
    .maybeSingle<ClientIntakeRow>();

  if (error) {
    if (isMissingIntakeSchema(error)) {
      return null;
    }
    throw error;
  }

  return data ? mapIntake(data) : null;
}
