import { expect, test, type Locator } from "@playwright/test";

const storageKey = "nick-glushien-demo-exercises";
const base = { category: "Strength", pattern: "Pull", equipment: ["TRX straps"], muscleGroups: ["Back", "Biceps"], tags: ["custom-reference"], difficulty: "Beginner", instructions: "Original instructions, keep this punctuation.\nMove slowly.", cues: ["Pause, then lower", "Long neck"], mistakes: ["Shrugging, rotating"], substitutions: ["Band row"], regressions: ["More upright stance"], progressions: ["More horizontal stance"], demoUrl: "", prescriptionType: "strength", editable: true };
const fixtures = [
  { ...base, id: "pvc", name: "PVC pass-through", category: "Warm Up", pattern: "Mobility", equipment: ["PVC pipe"], muscleGroups: ["Shoulders, rotator cuff, chest, upper back"], prescriptionType: "stretch" },
  { ...base, id: "trx-row", name: "TRX Row", category: "TRX" },
  { ...base, id: "trx-press", name: "TRX Chest Press", pattern: "Push", equipment: ["suspension trainer"], muscleGroups: ["Chest", "Triceps"] },
  { ...base, id: "db-row", name: "Dumbbell Row", equipment: ["Dumbbells"] },
  { ...base, id: "kb-row", name: "Kettlebell Row", equipment: ["Kettlebell"] },
  { ...base, id: "push-up", name: "Push-up", category: "Bodyweight", pattern: "Push", equipment: [], tags: [] },
  { ...base, id: "mystery", name: "Legacy drill", category: "Unknown category", pattern: "Unusual focus", equipment: ["Special tool"], muscleGroups: ["Unknown area"] },
];

async function exerciseControl(scope: Locator, label: string) {
  const input = scope.getByRole("combobox", { name: label, exact: true });
  await scope.locator('[role="combobox"]').first().waitFor({ state: "attached" });
  await expect(async () => {
    if (!await input.isVisible()) {
      const expand = scope.getByRole("button", { name: "Show exercise filters", exact: true });
      if (await expand.isVisible()) await expand.click();
    }
    await expect(input).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10000 });
  return input;
}
async function choose(scope: Locator, label: string, text: string, option = text) {
  const input = await exerciseControl(scope, label);
  await input.fill(text);
  await scope.getByRole("option", { name: option, exact: true }).click();
  await input.press("Escape");
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, values }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(values)); }, { key: storageKey, values: fixtures });
});

test("PVC legacy mapping saves and reloads without changing ID, prescription or coaching", async ({ page }) => {
  await page.goto("/trainer/exercises");
  await page.getByRole("button", { name: "Edit PVC pass-through", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit exercise", exact: true });
  for (const [label, selected] of [["Exercise type", "Mobility"], ["Common use (optional)", "Warm-up"], ["Movement / focus (optional)", "Shoulder mobility"], ["Equipment", "PVC pipe"], ["Muscle groups / areas", "Rotator cuff"]]) {
    await expect(dialog.getByRole("button", { name: `Remove ${selected} from ${label}`, exact: true })).toBeVisible();
  }
  await expect(dialog.getByLabel("Prescription style", { exact: true })).toHaveValue("stretch");
  await expect(dialog.getByLabel("Instructions (required)", { exact: true })).toHaveValue(base.instructions);
  await expect(dialog.getByLabel("Coaching cues", { exact: true })).toHaveValue(base.cues.join("\n"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit PVC pass-through", exact: true }).click();
  await expect(dialog.getByLabel("Prescription style", { exact: true })).toHaveValue("stretch");
  await expect(dialog.getByLabel("Instructions (required)", { exact: true })).toHaveValue(base.instructions);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).find((item: { id: string }) => item.id === "pvc"), storageKey);
  expect(saved.cues).toEqual(base.cues); expect(saved.id).toBe("pvc"); expect(saved.classification.movementFocus).toBe("shoulder_mobility"); expect(saved.equipment).toEqual(["PVC pipe"]);
});

test("creates a canonical TRX exercise with controlled searchable fields", async ({ page }) => {
  await page.goto("/trainer/exercises");
  await page.getByRole("button", { name: "Create exercise", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create exercise", exact: true });
  await dialog.getByLabel("Exercise name (required)").fill("TRX Row new");
  await choose(dialog, "Movement / focus (optional)", "Pull");
  await choose(dialog, "Equipment", "TRX straps", "TRX / Suspension Trainer");
  await choose(dialog, "Muscle groups / areas", "Back");
  await choose(dialog, "Muscle groups / areas", "Biceps");
  await dialog.getByLabel("Instructions (required)").fill("Pull with control, then lower.");
  await dialog.getByRole("button", { name: "Create exercise", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit TRX Row new", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit exercise", exact: true });
  await expect(edit.getByRole("button", { name: "Remove TRX / Suspension Trainer from Equipment", exact: true })).toBeVisible();
  await expect(edit.getByLabel("Instructions (required)")).toHaveValue("Pull with control, then lower.");
});

test("combines facets and search with OR within equipment and AND across groups", async ({ page }) => {
  await page.goto("/trainer/exercises");
  const body = page.locator("body");
  await choose(body, "Equipment", "TRX", "TRX / Suspension Trainer");
  await expect(page.locator("article")).toHaveCount(2);
  await choose(body, "Exercise type", "Strength");
  await choose(body, "Movement / focus", "Pull");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("TRX Row");
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("custom-reference");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear Equipment: TRX / Suspension Trainer", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(3);
  await choose(body, "Equipment", "Dumbbell"); await choose(body, "Equipment", "Kettlebell");
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear all", exact: true }).first().click();
  await expect(page.locator("article")).toHaveCount(fixtures.length);
  await choose(body, "Exercise type", "Mobility"); await choose(body, "Muscle groups / areas", "Shoulders"); await choose(body, "Equipment", "PVC pipe");
  await expect(page.locator("article")).toHaveCount(1); await expect(page.locator("article")).toContainText("PVC pass-through");
});

test("No equipment excludes TRX and unknown equipment, and unmatched filters recover", async ({ page }) => {
  await page.goto("/trainer/exercises");
  await choose(page.locator("body"), "Equipment", "No equipment");
  await expect(page.locator("article")).toHaveCount(1); await expect(page.locator("article")).toContainText("Push-up");
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("TRX");
  await expect(page.getByText("No exercises match these filters.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear all", exact: true }).first().click();
  await expect(page.locator("article")).toHaveCount(fixtures.length);
});

test("type changes retain the old focus until explicitly resolved and keep prescription", async ({ page }) => {
  await page.goto("/trainer/exercises"); await page.getByRole("button", { name: "Edit TRX Row", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit exercise", exact: true });
  await choose(dialog, "Exercise type", "Mobility");
  await expect(dialog.getByText("The previous focus belongs to another type. Remove it or choose a compatible focus.", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Remove Pull from Movement / focus (optional)", exact: true }).click();
  await choose(dialog, "Movement / focus (optional)", "Shoulder mobility");
  await expect(dialog.getByLabel("Prescription style", { exact: true })).toHaveValue("strength");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(dialog).not.toBeVisible();
});

test("keyboard multiselect, Escape, unsaved changes, errors and focus restoration", async ({ page }) => {
  await page.goto("/trainer/exercises");
  const opener = page.getByRole("button", { name: "Edit TRX Row", exact: true }); await opener.click();
  const dialog = page.getByRole("dialog", { name: "Edit exercise", exact: true });
  const muscles = dialog.getByRole("combobox", { name: "Muscle groups / areas", exact: true });
  await muscles.fill("Rotator"); await muscles.press("ArrowDown"); await muscles.press("Enter");
  await expect(dialog.getByRole("button", { name: "Remove Rotator cuff from Muscle groups / areas", exact: true })).toBeVisible();
  await muscles.press("Escape"); await expect(dialog).toBeVisible(); await muscles.press("Backspace");
  await expect(dialog.getByRole("button", { name: "Remove Rotator cuff from Muscle groups / areas", exact: true })).toHaveCount(0);
  await dialog.getByLabel("Exercise name (required)").fill("");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog.getByLabel("Exercise name (required)")).toHaveAttribute("aria-invalid", "true");
  page.once("dialog", (prompt) => prompt.dismiss()); await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(dialog).toBeVisible();
  page.once("dialog", (prompt) => prompt.accept()); await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
});

test("unknown legacy values and tags remain reviewable after saving", async ({ page }) => {
  await page.goto("/trainer/exercises"); await page.getByRole("button", { name: "Edit Legacy drill", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit exercise", exact: true });
  await dialog.getByText("Original classification · review needed", { exact: true }).click();
  await expect(dialog.getByRole("list").getByText("Equipment: Special tool", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).find((item: { id: string }) => item.id === "mystery"), storageKey);
  expect(saved.equipment).toEqual(["Special tool"]); expect(saved.tags).toEqual(base.tags); expect(saved.category).toBe("Unknown category"); expect(saved.classification.review.length).toBeGreaterThan(0);
});

test("workout picker shares canonical facets and preserves selections across filters", async ({ page }) => {
  await page.goto("/trainer/workouts");
  await page.getByRole("button", { name: "New Workout", exact: true }).first().click();
  await page.getByRole("button", { name: "Add exercises", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(/Filter exercises ·/).click();
  await choose(dialog, "Equipment", "TRX", "TRX / Suspension Trainer");
  await choose(dialog, "Exercise type", "Strength"); await choose(dialog, "Movement / focus", "Pull");
  const row = dialog.getByRole("button", { name: /TRX Row.*Strength/ }); await row.click();
  await dialog.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Deselect TRX Row", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Add 1 exercises", exact: true }).click();
  await expect(page.getByText("TRX Row", { exact: true })).toBeVisible();
});

test("exercise create and update endpoints reject unauthenticated writes", async ({ request }) => {
  expect((await request.post("/api/trainer/exercises", { data: base })).status()).toBe(401);
  expect((await request.patch("/api/trainer/exercises/00000000-0000-0000-0000-000000000001", { data: base })).status()).toBe(401);
});

test("existing trainer reference links retain their instructions and prescription metadata", async ({ page }) => {
  await page.goto("/trainer/exercises/goblet-squat");
  await expect(page.getByRole("heading", { name: "Goblet Squat", exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hold the weight high against the chest, sit between the hips, and drive the floor away.", { exact: true })).toBeVisible();
  await expect(page.getByText("Squat", { exact: true })).toBeVisible();
  await expect(page.getByText("Dumbbell, Kettlebell", { exact: true })).toBeVisible();
});

test("existing assigned workouts still open the client exercise reference", async ({ page }) => {
  await page.goto("/client/workouts/lower-strength-a");
  await page.getByRole("button", { name: /Watch \/ review form|^Form$/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Form review", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Goblet Squat", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Hold the weight high against the chest, sit between the hips, and drive the floor away.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Beginner · Dumbbell, Kettlebell", { exact: true })).toBeVisible();
});

test("long filter option lists remain clickable beyond the filter panel", async ({ page }) => {
  await page.goto("/trainer/exercises");
  await (await exerciseControl(page.locator("body"), "Equipment")).click();
  const option = page.getByRole("option", { name: "Rowing machine", exact: true });
  await option.scrollIntoViewIfNeeded();
  await option.click();
  await expect(page.getByRole("button", { name: "Remove Rowing machine from Equipment", exact: true })).toBeVisible();
});
