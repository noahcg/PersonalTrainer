import { plans as demoPlans } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { Client, Plan, Workout } from "@/lib/types";

type TrainingPlanRow = {
  id: string;
  title: string;
  description: string | null;
  duration_weeks: number | null;
  goal: string | null;
  weekly_structure: string | null;
  notes: string | null;
  is_template: boolean;
};

type WorkoutRow = {
  id: string;
  name: string;
  phase_label: string | null;
  warmup: string | null;
  cooldown: string | null;
  coach_notes: string | null;
};

type ClientPlanRow = {
  training_plans: TrainingPlanRow | null;
};

async function getServerTrainerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, trainerId: null, userId: null };
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  return { supabase, trainerId: trainer?.id ?? null, userId: user.id };
}

function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    name: row.name,
    dayLabel: row.phase_label ?? "Assigned workout",
    duration: "45 min",
    warmup: row.warmup ?? "",
    cooldown: row.cooldown ?? "",
    coachNotes: row.coach_notes ?? "",
    blocks: [],
  };
}

async function buildPlan(
  row: TrainingPlanRow,
  workouts: Workout[],
  assignedClients: string[],
): Promise<Plan> {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    duration: row.duration_weeks ? `${row.duration_weeks} weeks` : "Custom duration",
    goal: row.goal ?? "",
    weeklyStructure: row.weekly_structure ?? "",
    notes: row.notes ?? "",
    template: row.is_template,
    assignedClients,
    workouts,
  };
}

export async function getTrainerPlans() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, plans: demoPlans };
  }

  const { supabase, trainerId } = await getServerTrainerContext();
  if (!trainerId) {
    return { mode: "supabase" as const, plans: [] as Plan[] };
  }
  const db = hasSupabaseAdminEnv() ? createAdminClient() : supabase;

  const { data: planRows } = await db
    .from("training_plans")
    .select("id, title, description, duration_weeks, goal, weekly_structure, notes, is_template")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });

  const plans = await Promise.all(
    (planRows ?? []).map(async (row: TrainingPlanRow) => {
      const [{ data: workouts }, { data: assignments }] = await Promise.all([
        db
          .from("workouts")
          .select("id, name, phase_label, warmup, cooldown, coach_notes")
          .eq("training_plan_id", row.id)
          .order("scheduled_day", { ascending: true }),
        db.from("plan_assignments").select("client_id").eq("training_plan_id", row.id).eq("status", "active"),
      ]);

      return buildPlan(
        row,
        (workouts ?? []).map((workout: WorkoutRow) => toWorkout(workout)),
        (assignments ?? []).map((assignment: { client_id: string }) => assignment.client_id),
      );
    }),
  );

  return { mode: "supabase" as const, plans };
}

export async function getClientAssignedPlan() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, plan: demoPlans[0] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { mode: "supabase" as const, plan: null as Plan | null };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!client?.id) {
    return { mode: "supabase" as const, plan: null as Plan | null };
  }
  const db = hasSupabaseAdminEnv() ? createAdminClient() : supabase;

  const { data: assignment } = await db
    .from("plan_assignments")
    .select("training_plans(id, title, description, duration_weeks, goal, weekly_structure, notes, is_template)")
    .eq("client_id", client.id)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle<ClientPlanRow>();

  const trainingPlan = assignment?.training_plans;
  if (!trainingPlan) {
    return { mode: "supabase" as const, plan: null as Plan | null };
  }

  const { data: workouts } = await db
    .from("workouts")
    .select("id, name, phase_label, warmup, cooldown, coach_notes")
    .eq("training_plan_id", trainingPlan.id)
    .order("scheduled_day", { ascending: true });

  const plan = await buildPlan(
    trainingPlan,
    (workouts ?? []).map((workout: WorkoutRow) => toWorkout(workout)),
    [client.id],
  );

  return { mode: "supabase" as const, plan };
}

export function getAssignableClients(clients: Client[]) {
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    status: client.status,
  }));
}
