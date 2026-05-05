import { expect, test } from "@playwright/test";

const trainerRoutes = [
  { path: "/trainer/dashboard", heading: /Nick\./ },
  { path: "/trainer/clients", heading: "Client roster" },
  { path: "/trainer/plans", heading: "Training plans", workspace: "Plan workspace" },
  { path: "/trainer/workouts", heading: "Workout builder" },
  { path: "/trainer/exercises", heading: "Exercise library" },
  { path: "/trainer/bulletin", heading: "Bulletin board" },
  { path: "/trainer/resources", heading: "Coaching resources", workspace: "Resource workspace" },
  { path: "/trainer/messages", heading: "Communications" },
  { path: "/trainer/check-ins", heading: "Communications" },
  { path: "/trainer/progress", heading: "Progress intelligence" },
  { path: "/trainer/settings", heading: "Studio settings" },
];

for (const route of trainerRoutes) {
  test(`${route.path} renders the trainer surface`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page).toHaveTitle(/Nick Glushien Training/);
    await expect(page.getByRole("heading", { name: route.heading, exact: typeof route.heading === "string" })).toBeVisible();

    if (route.workspace) {
      await expect(page.getByText(route.workspace, { exact: true })).toBeVisible();
    }
  });
}
