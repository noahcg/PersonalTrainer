import { expect, test } from "@playwright/test";

test("agreement endpoints stay unavailable without an enabled authenticated workflow", async ({ request }) => {
  const id = "00000000-0000-4000-8000-000000000001";
  const pdf = await request.get(`/api/client/agreements/${id}/pdf`);
  expect(pdf.status()).toBe(404);
  const trainer = await request.get(`/api/trainer/clients/${id}/agreements`);
  expect(trainer.status()).toBe(404);
  const acceptance = await request.post(`/api/client/agreements/${id}/accept`, {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { name: "Test Client", agreed: true, electronicConsent: true },
  });
  expect(acceptance.status()).toBe(404);
  const crossOrigin = await request.post(`/api/client/agreements/${id}/accept`, {
    headers: { Origin: "https://other.example" },
    data: { name: "Test Client", agreed: true, electronicConsent: true },
  });
  expect(crossOrigin.status()).toBe(403);
});
