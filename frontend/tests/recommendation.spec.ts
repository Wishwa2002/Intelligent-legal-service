import { frontDeskFixture, selectIntakeClient } from './frontDeskFixture';
import { expect, test } from "@playwright/test";

const admin = { userId: 1, name: "Test Admin", email: "admin@example.test", role: "Admin" };
const backendApi = /^https?:\/\/[^/]+\/api\//;
const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const trace = ["received", "parse_requirement", "validate_category", "search_lawyers", "rank_candidates", "backend_validation"]
  .map(step => ({ step, status: "completed", timestamp: new Date().toISOString(), summary: `${step} completed` }));
const prepared = {
  clientId: 42, workflowId: "workflow-1", status: "AWAITING_APPROVAL", userRequirement: "I have a dispute about ownership of my land.",
  date, appointmentId: null, parsedRequirement: { requirement: "land ownership dispute", categoryName: "Real Estate & Property Law" },
  recommendations: [{ lawyerId: "lawyer-1", score: 8, reason: "Matching Practice Area and recorded experience", fullName: "Nimal Perera", qualification: "Attorney-at-Law", yearsExperience: 8, practiceArea: "Real Estate & Property Law" }],
  warnings: [], trace,
};

test("recommendation is visible, waits for human approval, and restores by workflow URL", async ({ page }) => {
  let creates = 0;
  let approvals = 0;
  let completed = false;
  await page.addInitScript(staff => {
    localStorage.setItem("legalease_staff_user", JSON.stringify(staff));
    localStorage.setItem("token", "test-admin-token");
  }, admin);
  await page.route(backendApi, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    let body: unknown = [];
    if (path === "/api/lawyer-services/summary") body = {
      activeLawyers: 1, totalLawyers: 1, practiceAreas: 1, legalServices: 1, coverage: [],
    };
    if (path === "/api/lawyer-recommendations" && method === "POST") {
      creates++;
      body = prepared;
    }
    if (path === "/api/lawyer-recommendations/workflow-1" && method === "GET") {
      body = completed ? { ...prepared, status: "ACTION_COMPLETED", appointmentId: "appointment-1", trace: [...trace, { step: "create_booking", status: "completed", timestamp: new Date().toISOString(), summary: "Appointment created" }] } : prepared;
    }
    if (path === "/api/lawyer-recommendations/customers") body = [{ customerId: "customer-1", name: "Test Customer", email: "customer@example.test" }];
    if (path === "/api/lawyers/lawyer-1/available-slots") body = [{ slotId: "slot-1", date, startTime: "09:00", endTime: "10:00", isBooked: false }];
    if (path === "/api/lawyer-recommendations/workflow-1/approve" && method === "POST") {
      approvals++;
      completed = true;
      body = { ...prepared, status: "ACTION_COMPLETED", appointmentId: "appointment-1", trace: [...trace, { step: "create_booking", status: "completed", timestamp: new Date().toISOString(), summary: "Appointment created" }] };
    }
    if (path === "/api/appointments/appointment-1") body = {
      appointmentId: "appointment-1", lawyerName: "Nimal Perera", customerName: "Test Customer", date, startTime: "09:00", endTime: "10:00",
    };
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  await frontDeskFixture(page, () => completed ? { ...prepared, status: "ACTION_COMPLETED", appointmentId: "appointment-1" } : prepared); await page.goto("/admin/lawyer-matching");
  await selectIntakeClient(page); await page.getByLabel("Legal requirement").fill(prepared.userRequirement);
  await page.getByLabel("Preferred date").fill(date);
  await page.getByRole("button", { name: "Analyse Requirement" }).click();
  await expect(page).toHaveURL(/\?workflow=workflow-1$/);
  await expect(page.getByText("Real Estate & Property Law").first()).toBeVisible();
  await expect(page.getByLabel("8 Recommendation Points")).toBeVisible();
  await expect(page.getByText("Recommendation prepared. Awaiting human approval.")).toBeVisible();
  expect(creates).toBe(1);
  expect(approvals).toBe(0);

  await page.getByText("View Workflow Details", { exact: true }).click();
  await expect(page.getByText("Interpretation", { exact: true })).toBeVisible();
  await expect(page.getByText("Administrator Review", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("8 Recommendation Points")).toBeVisible();
  expect(creates).toBe(1);

  await page.getByRole("button", { name: "Select Lawyer" }).click();
  await page.getByRole("button", { name: "Continue to Appointment" }).click();

  await page.getByRole("combobox", { name: "Available slot" }).selectOption("slot-1");
  await page.getByRole("button", { name: "Approve & Create Appointment" }).click();
  await expect(page.getByRole("heading", { name: "Appointment Created" })).toBeVisible();
  expect(approvals).toBe(1);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Appointment Created" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve & Create Appointment" })).toHaveCount(0);
  expect(approvals).toBe(1);
});


test("true AI unavailability shows a safe error without recommendations or approval", async ({ page }) => {
  let appointments = 0;
  await page.addInitScript(staff => {
    localStorage.setItem("legalease_staff_user", JSON.stringify(staff)); localStorage.setItem("token", "test-admin-token");
  }, admin);
  await page.route(backendApi, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/appointments")) appointments++;
    if (path === "/api/lawyer-recommendations") {
    await route.fulfill({ status: 503, json: { title: "Requirement understanding is temporarily unavailable." } }); return;
    }
    await route.fulfill({ json: path.endsWith("/summary") ? { activeLawyers: 1, totalLawyers: 1, practiceAreas: 1, legalServices: 1, coverage: [] } : [] });
  });
  await frontDeskFixture(page, () => prepared); await page.goto("/admin/lawyer-matching");
  await selectIntakeClient(page); await page.getByLabel("Legal requirement").fill("issue with land document");
  await page.getByRole("button", { name: "Analyse Requirement" }).click();
  await expect(page.getByRole("alert")).toContainText("No lawyer recommendation was generated.");
  await expect(page.getByRole("button", { name: "Select Lawyer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve & Create Appointment" })).toHaveCount(0);
  await expect(page).not.toHaveURL(/workflow=/);
  expect(appointments).toBe(0);
});
