/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(process.cwd(), ".env.local");
const envText = fs.readFileSync(envPath, "utf8");

for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator === -1) continue;
  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim();
  process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(url, serviceRoleKey);

const starterContent = `Meal prep works best when it lowers friction instead of trying to create perfect meals. Build each prep around three anchors: a reliable protein, an easy carbohydrate, and produce you will actually eat. Pick two proteins for the week such as chicken thighs, lean ground turkey, Greek yogurt, eggs, tofu, or salmon. Pair them with one or two easy carbs like rice, potatoes, oats, wraps, or fruit. Add vegetables that reheat well or are easy to grab cold, such as roasted broccoli, green beans, peppers, carrots, salad kits, berries, and cucumbers.

A simple rhythm is enough. Prep two to four lunch or dinner meals, keep a fast breakfast option ready, and stock one or two high-protein snacks. Aim for meals that look balanced, repeatable, and easy to assemble when the day gets busy. A useful default plate is protein first, produce second, carbs adjusted to activity, and fats kept moderate but included.

For training days, make it easier to eat around the session. Have a meal one to three hours before training with protein and carbs, and eat again after training when practical. That can be as simple as yogurt and fruit before the gym, then a rice bowl with chicken and vegetables afterward. Recovery nutrition does not need to be complicated. Consistency beats precision.

Keep the prep realistic. Use one sheet-pan meal, one pot or rice cooker carb, washed fruit, and a few repeat staples. If a full prep feels heavy, prep components instead of full containers: cooked protein, cooked starch, chopped produce, and one sauce. That still gives structure without making the week feel rigid.

A strong meal-prep week should leave you with fewer decisions, steadier energy, and less reliance on random convenience food. The goal is not clean eating perfection. The goal is making good choices easier to repeat.`;

async function main() {
  const { data: trainers, error: trainerError } = await supabase.from("trainers").select("id");
  if (trainerError) {
    throw trainerError;
  }

  for (const trainer of trainers ?? []) {
    const { data: existing, error: existingError } = await supabase
      .from("resources")
      .select("id")
      .eq("trainer_id", trainer.id)
      .eq("title", "Meal Prep Made Simple")
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      throw existingError;
    }

    if (existing) {
      continue;
    }

    const { error: insertError } = await supabase.from("resources").insert({
      trainer_id: trainer.id,
      title: "Meal Prep Made Simple",
      description:
        "A practical weekly meal-prep guide that supports strength, recovery, and steady eating habits without turning food into a second job.",
      resource_type: "Nutrition",
      url: null,
      content: starterContent,
      tags: ["nutrition", "meal prep", "recovery"],
      audience: "all",
    });

    if (insertError) {
      throw insertError;
    }
  }

  console.log("Inserted starter resource where missing.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
