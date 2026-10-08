import { test, expect } from "@playwright/test";

test("lawyer password setup gates dashboard and clears flag after server success", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("legalease_staff_user", JSON.stringify({ userId: 1, name: "Test Lawyer", email: "lawyer@example.test", role: "Lawyer", mustChangePassword: true }));
    localStorage.setItem("token", "test-only-token");
  });
  let calls = 0;
  await page.route("**/api/auth/change-password", async route => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ currentPassword: "InitialLawyer123!", newPassword: "PersonalLawyer456!", confirmPassword: "PersonalLawyer456!" });
    await route.fulfill({ json: { mustChangePassword: false, message: "Password changed successfully." } });
  });
  await page.goto("/lawyer/dashboard");
  await expect(page).toHaveURL(/\/lawyer\/change-password$/);
  await page.getByLabel("Current password", { exact: true }).fill("InitialLawyer123!");
  await page.getByLabel("New password", { exact: true }).fill("PersonalLawyer456!");
  await page.getByLabel("Confirm new password", { exact: true }).fill("PersonalLawyer456!");
  await page.getByRole("button", { name: "Change Password", exact: true }).click();
  await expect(page).toHaveURL(/\/lawyer\/dashboard$/);
  expect(calls).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("legalease_staff_user")!).mustChangePassword)).toBe(false);
});

test("customers cannot access lawyer password setup", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("legalease_staff_user", JSON.stringify({ userId: 42, name: "Client", role: "Customer" })));
  await page.goto("/lawyer/change-password");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Change Your Initial Password" })).toHaveCount(0);
});
