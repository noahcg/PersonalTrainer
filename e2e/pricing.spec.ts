import { expect, test } from "@playwright/test";

test("shows confirmed packages and what each includes", async ({ page }) => {
  await page.goto("/pricing");
  const cards = page.locator("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("$840");
  await expect(cards.nth(0)).toContainText("8 one-hour sessions per month");
  await expect(cards.nth(1)).toContainText("$550");
  await expect(cards.nth(1)).toContainText("4 one-hour sessions per month");
  await expect(cards.nth(1)).toContainText("Monthly Personal Training & Coaching");
  await expect(cards.nth(1)).toContainText("2 custom written workouts");
  await expect(cards.nth(1)).toContainText("Online coaching throughout the month");
  await expect(cards.nth(2)).toContainText("$640");
  await expect(cards.nth(2)).toContainText("4 shared one-hour sessions per month");
  await expect(cards.nth(2)).toContainText("$1,280 combined");
  await expect(page.getByText("$1,100")).toHaveCount(0);
  await expect(page.getByText(/cash|check|zelle|payment/i)).toHaveCount(0);
});


test("aligns pricing card sections on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pricing");
  const cards = page.locator("article");
  await expect(cards).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  for (const selector of ["p.font-serif", "ul", ":scope > p:last-child"]) {
    await expect.poll(async () => {
      const tops = await Promise.all([0, 1, 2].map(async (index) => (await cards.nth(index).locator(selector).boundingBox())?.y));
      return tops.every((top) => top !== undefined && Math.abs(top - tops[0]!) < 2);
    }, { message: `Expected ${selector} to align across the cards` }).toBe(true);
  }
});
