import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type AssignPlanBody = {
  planId?: string;
  clientIds?: string[];
};

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { planId, clientIds = [] } = (await request.json()) as AssignPlanBody;
    const selectedClientIds = Array.from(new Set(clientIds.filter(Boolean)));

    if (!planId) {
      return NextResponse.json({ error: "Plan id is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) {
      return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: plan, error: planError } = await admin
      .from("training_plans")
      .select("id")
      .eq("id", planId)
      .eq("trainer_id", trainer.id)
      .maybeSingle<{ id: string }>();

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    if (selectedClientIds.length) {
      const { data: clients, error: clientsError } = await admin
        .from("clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .in("id", selectedClientIds);

      if (clientsError) {
        return NextResponse.json({ error: clientsError.message }, { status: 500 });
      }

      if ((clients ?? []).length !== selectedClientIds.length) {
        return NextResponse.json({ error: "One or more selected clients were not found." }, { status: 404 });
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    let deactivateQuery = admin
      .from("plan_assignments")
      .update({ status: "inactive", ends_on: today })
      .eq("training_plan_id", planId)
      .eq("status", "active");

    if (selectedClientIds.length) {
      deactivateQuery = deactivateQuery.not("client_id", "in", `(${selectedClientIds.join(",")})`);
    }

    const { error: inactivePlanError } = await deactivateQuery;
    if (inactivePlanError) {
      return NextResponse.json({ error: inactivePlanError.message }, { status: 500 });
    }

    if (selectedClientIds.length) {
      const { error: inactiveClientError } = await admin
        .from("plan_assignments")
        .update({ status: "inactive", ends_on: today })
        .in("client_id", selectedClientIds)
        .eq("status", "active");

      if (inactiveClientError) {
        return NextResponse.json({ error: inactiveClientError.message }, { status: 500 });
      }

      const { error: insertError } = await admin.from("plan_assignments").upsert(
        selectedClientIds.map((clientId) => ({
          training_plan_id: planId,
          client_id: clientId,
          starts_on: today,
          ends_on: null,
          status: "active",
        })),
        { onConflict: "training_plan_id,client_id,starts_on" },
      );

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, assignedClientIds: selectedClientIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to assign plan." },
      { status: 500 },
    );
  }
}
