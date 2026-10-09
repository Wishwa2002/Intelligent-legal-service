import { test, expect } from "@playwright/test";

test("sign up validates before requests and displays backend duplicate errors", async ({
  page,
}) => {
  let calls = 0;

  await page.route("**/api/auth/signup", async (route) => {
    calls++;

    const body = route.request().postDataJSON();

    expect(body.fullName).toBe("Test Lawyer");
    expect(body.email).toBe("lawyer@example.com");
    expect(body.password).toBe("valid-password");
    expect(body.role).toBe("Lawyer");

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Email already exists",
      }),
    });
  });

  await page.goto("/signup");

  // Submit empty form
  await page
    .getByRole("button", {
      name: "Create Account",
      exact: true,
    })
    .click();

  // No API request should be made for an empty form
  expect(calls).toBe(0);

  // Form should remain visible
  await expect(
    page.getByLabel("Full Name", { exact: true }),
  ).toBeVisible();

  // Select Lawyer
  await page
    .getByText("Lawyer", { exact: true })
    .click();

  // Fill form
  await page
  .getByLabel("Full Name", { exact: true })
  .fill("Test Lawyer");

await page
  .getByLabel("Email Address", { exact: true })
  .fill("lawyer@example.com");

await page
  .getByLabel("Password", { exact: true })
  .fill("valid-password");

await page
  .getByLabel("Confirm Password", { exact: true })
  .fill("valid-password");

// Lawyer-specific fields
await page
  .getByLabel("Phone", { exact: true })
  .fill("0771234567");

await page
  .getByLabel("Qualification", { exact: true })
  .fill("LLB");

await page
  .getByLabel("Years of Experience", { exact: true })
  .fill("5");

await page
  .getByLabel("License Number", { exact: true })
  .fill("LAW-12345");

await page
  .getByLabel("Professional Description", { exact: true })
  .fill("Experienced lawyer handling legal consultations.");

await page
  .getByRole("button", {
    name: "Create Account",
    exact: true,
  })
  .click();

  await expect(page.getByRole("alert")).toContainText(
    /email already exists|account with this email already exists/i,
  );

  expect(calls).toBe(1);
});

test("login reports invalid credentials and network failures cleanly", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Invalid email or password.",
      }),
    }),
  );

  await page.goto("/login");

  await page
    .getByLabel("Email Address", { exact: true })
    .fill("user@example.com");

  await page
    .getByLabel("Password", { exact: true })
    .fill("wrong-password");

  await page
    .getByRole("button", {
      name: "Sign In",
      exact: true,
    })
    .click();

  await expect(page.getByRole("alert")).toContainText(
    "Invalid email or password.",
  );

  // Remove previous mock
  await page.unroute("**/api/auth/login");

  // Mock network failure
  await page.route("**/api/auth/login", (route) =>
    route.abort("failed"),
  );

  await page
    .getByRole("button", {
      name: "Sign In",
      exact: true,
    })
    .click();

  await expect(page.getByRole("alert")).toContainText(
    "Network Error",
  );
});
