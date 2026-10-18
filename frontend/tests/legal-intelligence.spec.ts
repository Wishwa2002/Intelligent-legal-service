import { test, expect } from "@playwright/test";

test("legal intelligence page loads successfully", async ({ page }) => {
  // Act
  await page.goto("/legal-intelligence");

  // Assert
  await expect(
    page.getByRole("heading", {
      name: "Sri Lanka Legal Intelligence",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: "Ask Legal AI",
    }),
  ).toBeVisible();

  await expect(
    page.getByPlaceholder(
      "Example: What law applies to cybercrime in Sri Lanka?",
    ),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Ask AI",
      exact: true,
    }),
  ).toBeVisible();
});

test("short legal AI question is rejected before API request", async ({ page }) => {
  let calls = 0;

  await page.route("**/api/legal-intelligence/ask", async (route) => {
    calls++;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        query: "ab",
        intent: "unknown",
        answer: "",
        laws: [],
        cases: [],
        updates: [],
        citations: [],
        confidence: 0,
        requires_human_review: false,
        validation_errors: [],
      }),
    });
  });

  await page.goto("/legal-intelligence");

  await page
    .getByPlaceholder(
      "Example: What law applies to cybercrime in Sri Lanka?",
    )
    .fill("ab");

  await page
    .getByRole("button", {
      name: "Ask AI",
      exact: true,
    })
    .click();

  await expect(
    page.getByText("Please enter a legal question.", {
      exact: true,
    }),
  ).toBeVisible();

  expect(calls).toBe(0);
});


test("legal AI request displays successful research result", async ({ page }) => {
  let calls = 0;

  await page.route("**/api/legal-intelligence/ask", async (route) => {
    calls++;

    const body = route.request().postDataJSON();

    expect(body.query).toBe(
      "What law applies to cybercrime in Sri Lanka?",
    );

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        query: "What law applies to cybercrime in Sri Lanka?",
        intent: "law",
        answer:
          "Sri Lankan cybercrime matters may involve computer-related legislation.",
        laws: [
          {
            title: "Computer-related legislation",
            source_type: "act",
            document_id: "LAW-001",
            year: 2024,
            summary: "Relevant legislation summary.",
            relevance_score: 0.91,
          },
        ],
        cases: [],
        updates: [],
        citations: [
          {
            title: "Computer-related legislation",
            source_type: "act",
            reference: "LAW-001",
          },
        ],
        confidence: 0.91,
        requires_human_review: false,
        validation_errors: [],
      }),
    });
  });

  await page.goto("/legal-intelligence");

  await page
    .getByPlaceholder(
      "Example: What law applies to cybercrime in Sri Lanka?",
    )
    .fill(
      "What law applies to cybercrime in Sri Lanka?",
    );

  await page
    .getByRole("button", {
      name: "Ask AI",
      exact: true,
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "AI Legal Research Result",
    }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Sri Lankan cybercrime matters may involve computer-related legislation.",
    ),
  ).toBeVisible();

  await expect(
    page.getByText("Relevant Laws", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Computer-related legislation",
      {
        exact: true,
      },
    ),
  ).toBeVisible();

  await expect(
    page.getByText("Confidence 91%", {
      exact: true,
    }),
  ).toBeVisible();

  expect(calls).toBe(1);
});

test("legal AI request failure displays user friendly error", async ({ page }) => {
  await page.route("**/api/legal-intelligence/ask", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Internal server error",
      }),
    });
  });

  await page.goto("/legal-intelligence");

  await page
    .getByPlaceholder(
      "Example: What law applies to cybercrime in Sri Lanka?",
    )
    .fill("What law applies to cybercrime in Sri Lanka?");

  await page
    .getByRole("button", {
      name: "Ask AI",
      exact: true,
    })
    .click();

  await expect(
    page.getByText(
      "The Legal Intelligence Agent could not process your question. Please try again.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
});