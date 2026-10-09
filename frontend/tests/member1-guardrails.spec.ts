import { frontDeskFixture } from './frontDeskFixture';
import { expect, test, type Page } from "@playwright/test";

const admin = { userId: 1, name: "Test Admin", email: "admin@example.test", role: "Admin" };
const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const prepared = { clientId: 42, workflowId: "saved-workflow", status: "AWAITING_APPROVAL", date,
  userRequirement: "My employer terminated me without proper notice.",
  parsedRequirement: { categoryName: "Labour & Employment Law" }, warnings: [], trace: [],
  recommendations: [{ lawyerId: "lawyer-1", fullName: "Verified Practitioner", practiceArea: "Labour & Employment Law", yearsExperience: 12, score: 12, reason: "12 years of recorded experience." }] };
const api = /^https?:\/\/[^/]+\/api\//;
const summary = { activeLawyers: 1, totalLawyers: 1, practiceAreas: 1, legalServices: 1, coverage: [] };
const root = "/admin/lawyer-matching";
async function signIn(page: Page) {
  await page.addInitScript(staff => {
    localStorage.setItem("legalease_staff_user", JSON.stringify(staff)); localStorage.setItem("token", "test-token");
  }, admin);
}

test("stale slot rejection refreshes recorded slots and allows another valid slot", async ({ page }) => {
  await signIn(page); let stale = false; let approvals = 0;
  await page.route(api, async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = []; let status = 200;
    if (path.endsWith("/summary")) body = { activeLawyers: 1, totalLawyers: 1, practiceAreas: 1, legalServices: 1, coverage: [] };
    if (path === "/api/lawyer-recommendations/saved-workflow") body = prepared;
    if (path.endsWith("/customers")) body = [{ customerId: "customer-1", name: "Existing Customer", email: "customer@example.test" }];
    if (path === "/api/lawyers/lawyer-1/available-slots") body = [{ slotId: stale ? "slot-2" : "slot-1", date, startTime: stale ? "11:00" : "09:00", endTime: stale ? "12:00" : "10:00", isBooked: false }];
    if (path.endsWith("/approve")) {
      approvals++; const request = route.request().postDataJSON();
      if (!stale) { stale = true; status = 409; body = { message: "The selected appointment slot is unavailable or does not match the requested date." }; }
      else { expect(request.slotId).toBe("slot-2"); body = { ...prepared, status: "ACTION_COMPLETED", appointmentId: "booking-1" }; }
    }
    if (path === "/api/appointments/booking-1") body = { appointmentId: "booking-1", lawyerName: "Verified Practitioner", customerName: "Existing Customer", date, startTime: "11:00", endTime: "12:00" };
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await frontDeskFixture(page, () => prepared); await page.goto(root + "?workflow=saved-workflow");
  await page.getByRole("button", { name: "Select Lawyer" }).click();
  await page.getByRole("button", { name: "Continue to Appointment" }).click();

  await page.getByRole("combobox", { name: "Available slot", exact: true }).selectOption("slot-1");
  await page.getByRole("button", { name: "Approve & Create Appointment" }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.getByRole("combobox", { name: "Available slot", exact: true }).locator('option[value="slot-1"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve & Create Appointment" })).toBeDisabled();
  await page.getByRole("combobox", { name: "Available slot", exact: true }).selectOption("slot-2");
  await page.getByRole("button", { name: "Approve & Create Appointment" }).click();
  await expect(page.getByRole("heading", { name: "Appointment Created" })).toBeVisible();
  expect(approvals).toBe(2);
});

test("no-date result makes no availability claim and selects a real future slot", async ({ page }) => {
  await signIn(page);
  await page.route(api, async route => {
    const url = new URL(route.request().url()); let body: unknown = [];
    if (url.pathname.endsWith("/summary")) body = { activeLawyers: 1, totalLawyers: 1, practiceAreas: 1, legalServices: 1, coverage: [] };
    if (url.pathname.endsWith("/saved-workflow")) body = { ...prepared, date: null };
    if (url.pathname.endsWith("/available-slots")) { expect(url.searchParams.get("date")).toBe(date); body = [{ slotId: "real-slot", date, startTime: "09:00", endTime: "10:00", isBooked: false }, { slotId: "booked-slot", date, startTime: "11:00", endTime: "12:00", isBooked: true }]; }
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await frontDeskFixture(page, () => ({ ...prepared, date: null })); await page.goto(root + "?workflow=saved-workflow");
  await expect(page.getByText("Availability Not Filtered.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select Lawyer" }).click();
  await page.getByRole("button", { name: "Continue to Appointment" }).click();
  await expect(page.getByRole("combobox", { name: "Available slot", exact: true })).toBeDisabled();
  await page.getByLabel("Appointment date", { exact: true }).fill(date);
  await expect(page.getByRole("combobox", { name: "Available slot", exact: true }).locator('option[value="real-slot"]')).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Available slot", exact: true }).locator('option[value="booked-slot"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Client intake" })).toContainText("Existing Customer");
});

test("preferred-date workflow locks the date and requires a new recommendation to change it", async ({ page }) => {
  await signIn(page); let creates = 0;
  await page.route(api, async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") creates++;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(path.endsWith("/summary") ? summary : path.endsWith("saved-workflow") ? prepared : path.endsWith("/available-slots") ? { date, workingDay: true, appointmentDurationMinutes: 30, availableSlots: [] } : []) });
  });
  await frontDeskFixture(page, () => prepared); await page.goto(root + "?workflow=saved-workflow");
  await page.getByRole("button", { name: "Select Lawyer" }).click();
  await page.getByRole("button", { name: "Continue to Appointment" }).click();
  await expect(page.getByLabel("Preferred date")).toHaveCount(0);
  await expect(page.getByLabel("Appointment date", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Rerun for Another Date" }).click();
  await expect(page).toHaveURL(root);
  await expect(page.getByLabel("Preferred date")).toBeEnabled(); expect(creates).toBe(0);
});

for (const status of ["UNSUPPORTED", "NO_MATCH"]) {
  test(`${status} shows an honest empty state without approval`, async ({ page }) => {
    await signIn(page);
    await page.route(api, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(new URL(route.request().url()).pathname.endsWith("/summary") ? summary : { ...prepared, status, recommendations: [], parsedRequirement: status === "UNSUPPORTED" ? { categoryName: null } : prepared.parsedRequirement }) }));
    await frontDeskFixture(page, () => prepared); await page.goto(root + "?workflow=saved-workflow");
    await expect(page.getByText(status === "UNSUPPORTED" ? "No Supported Practice Area" : "No lawyers are available on the requested date.", { exact: status === "UNSUPPORTED" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Lawyer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Approve & Create Appointment" })).toHaveCount(0);
  });
}

test("missing workflow shows a retry state and cannot create a replacement on refresh", async ({ page }) => {
  await signIn(page); let creates = 0;
  await page.route(api, async route => {
    if (route.request().method() === "POST") creates++;
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Not found" }) });
  });
  await frontDeskFixture(page, () => prepared); await page.goto(root + "?workflow=missing");
  await expect(page.getByRole("alert").filter({ hasText: "Recommendation workflow not found" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Workflow" })).toBeVisible();
  await page.reload(); await expect(page.getByRole("button", { name: "Retry Workflow" })).toBeVisible(); expect(creates).toBe(0);
});

test("lawyer form validates fields, submits one catalog ID, and displays backend errors", async ({ page }) => {
  await signIn(page); let saves = 0;
  await page.route(api, async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = []; let status = 200;
    if (path.endsWith("/summary")) body = summary;
    if (path === "/api/specializations") body = [{ specializationId: 17, name: "Labour & Employment Law", description: "Employment matters", lawyerCount: 0 }];
    if (path === "/api/lawyers/search") body = { items: [], totalItems: 0, totalLawyers: 0, totalPages: 0, page: 1, pageSize: 10 };
    if (path === "/api/lawyers" && route.request().method() === "POST") {
      saves++; const payload = route.request().postDataJSON();
      expect(payload.specializationId).toBe(17); expect(payload.category).toBe("Labour & Employment Law");
      expect(payload).not.toHaveProperty("lawyerId"); expect(payload).not.toHaveProperty("role");
      status = 409; body = { message: "This email already belongs to another account." };
    }
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await frontDeskFixture(page, () => prepared); await page.goto("/admin/lawyer-services/lawyers");
  await page.getByRole("button", { name: "Add New Lawyer" }).first().click();
  const form = page.getByRole("dialog", { name: "Add New Legal Counsel" });
  await form.getByRole("button", { name: "Confirm & Add Lawyer" }).click();
  await expect(form.getByText("Full name is required.")).toBeVisible(); expect(saves).toBe(0);
  await form.getByLabel("Full Name & Title").fill("Test Practitioner");
  await form.getByLabel("Email Address").fill("invalid-email");
  await form.getByLabel("Bar / License Number").fill("TEST-1");
  await form.getByLabel("Years Exp.").fill("71");
  await form.getByRole("button", { name: "Confirm & Add Lawyer" }).click();
  await expect(form.getByText("Enter a valid email address.")).toBeVisible();
  await expect(form.getByText("Experience must be between 0 and 70 years.")).toBeVisible(); expect(saves).toBe(0);
  await form.getByLabel("Email Address").fill("lawyer@example.test"); await form.getByLabel("Years Exp.").fill("12");
  await form.getByRole("button", { name: "Confirm & Add Lawyer" }).click();
  await expect(form.getByRole("alert")).toContainText("This email already belongs to another account."); expect(saves).toBe(1);
});

test("catalog request shows loading, error with retry, and meaningful empty states", async ({ page }) => {
  await signIn(page); let failing = true; let loaded = false;
  let release: (() => void) | undefined;
  const loading = new Promise<void>(resolve => { release = resolve; });
  await page.route(api, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/summary")) { await route.fulfill({ json: summary }); return; }
    if (path === "/api/specializations") {
      if (!loaded) { await loading; loaded = true; }
    await route.fulfill({ status: failing ? 500 : 200, json: failing ? { message: "Unavailable" } : [] });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await frontDeskFixture(page, () => prepared); await page.goto("/admin/lawyer-services/specializations");
  await expect(page.getByRole("status").filter({ hasText: "Loading Practice Areas" })).toBeVisible(); release!();
  await expect(page.getByRole("alert")).toContainText("Unable to load Practice Areas."); failing = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Practice Areas configured", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Legal Services", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Legal Services configured", exact: true })).toBeVisible();
});

test("all four Admin screens remain usable at desktop and mobile widths", async ({ page }, info) => {
  await signIn(page);
  const area = { specializationId: 17, name: "Labour & Employment Law", description: "Employment matters", lawyerCount: 1, activeLawyerCount: 1, legalServiceCount: 1 };
  const lawyer = { lawyerId: "lawyer-1", name: "Verified Practitioner", status: "Active", experience: 12, qualification: "Attorney-at-Law", licenseNumber: "TEST-1", specializations: [area], email: "lawyer@example.test" };
  await page.route(api, async route => {
    const path = new URL(route.request().url()).pathname; let body: unknown = [];
    if (path.endsWith("/summary")) body = { ...summary, practiceAreas: 2, coverage: [{ practiceAreaId: 17, practiceAreaName: area.name, activeLawyers: 1, legalServices: 1, futureAvailabilityCount: 2 }, { practiceAreaId: 18, practiceAreaName: "Tax Law", activeLawyers: 0, legalServices: 0, futureAvailabilityCount: 0 }] };
    if (path === "/api/specializations") body = [area];
    if (path === "/api/lawyers/search") body = { items: [lawyer], totalItems: 1, totalLawyers: 1, totalPages: 1, page: 1, pageSize: 10 };
    if (path === "/api/legal-services/admin") body = [{ legalServiceId: 1, serviceName: "Employment Contract Review", description: "Review recorded employment terms", category: area.name, eligibleLawyerCount: 1, legacyReferenceCount: 0 }];
    if (path.endsWith("/saved-workflow")) body = prepared;
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ json: body });
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of ["lawyers", "specializations", "legal-services", "workforce-hiring"]) {
      await frontDeskFixture(page, () => prepared); await page.goto(`/admin/lawyer-services/${section}${section === "recommendations" ? "?workflow=saved-workflow" : ""}`);
      await expect(page.getByRole("heading", { name: "Lawyer & Legal Service Management", exact: true })).toBeVisible();
      if (section === "lawyers") await expect(page.getByText("Verified Practitioner", { exact: true })).toBeVisible();
      if (section === "specializations") await expect(page.getByRole("heading", { name: area.name })).toBeVisible();
      if (section === "legal-services") await expect(page.getByText("Employment Contract Review", { exact: true })).toBeVisible();
      if (section === "workforce-hiring") await expect(page.getByRole("heading", { name: "Workforce & Hiring Intelligence" })).toBeVisible();
      const kpis = page.getByRole("region", { name: "Operational summary", exact: true });
      await expect(kpis).toHaveCount(1);
      await expect(kpis.getByRole("article")).toHaveCount(4);
      await expect(kpis.getByRole("article", { name: "Active Lawyers", exact: true })).toContainText("of 1 total lawyers");
      await expect(kpis.getByRole("article", { name: "Available Appointment Slots", exact: true })).toContainText("2");
      await expect(page.getByText("Total Records", { exact: false })).toHaveCount(0);
      await page.getByRole("button", { name: "Coverage Overview", exact: true }).click();
      await expect(page.getByRole("region", { name: "Coverage Overview", exact: true })).toBeVisible();
      const coverage = page.getByRole("region", { name: "Coverage Overview", exact: true });
      await expect(coverage.getByRole("heading", { name: "Coverage Health Matrix" })).toBeVisible();
      await expect(coverage.getByText("Operational", { exact: true })).toBeVisible();
      await expect(coverage.getByText("No Available Slots", { exact: true })).toBeVisible();
      await expect(coverage.getByText("No Active Lawyers", { exact: true })).toBeVisible();
      await expect(coverage.getByText("No Legal Services", { exact: true })).toBeVisible();
      expect(await coverage.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(await coverage.locator('ul[aria-label="Practice Area coverage"] > li').evaluateAll(rows => rows.every(row => row.scrollWidth <= row.clientWidth + 1))).toBe(true);
      expect(await page.locator("#lawyer-coverage-overview").evaluate(element => {
        const nav = document.querySelector('nav[aria-label="Lawyer and legal service sections"]');
        return !!nav && !!(element.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING);
      })).toBe(true);
      if (section === "lawyers") await page.screenshot({ path: info.outputPath(`coverage-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Coverage Overview", exact: true }).click();

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (width === 390) {
        expect(await page.locator("main").evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(350);
        await expect(page.getByRole("button", { name: "Toggle sidebar" })).toHaveAttribute("aria-expanded", "false");
      }
      await page.screenshot({ path: info.outputPath(`${section}-${width}.png`), fullPage: true });
    }
  }
});


test("coverage handles loading, unavailable retry and empty results without hiding tab content", async ({ page }) => {
  await signIn(page);
  let attempt = 0;
  let retrying = false;
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(api, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/summary")) {
      attempt++;
      if (!retrying) { await pending; await route.fulfill({ status: 503, json: { message: "Unavailable" } }); }
      else await route.fulfill({ json: { activeLawyers: 0, totalLawyers: 0, practiceAreas: 0, legalServices: 0, coverage: [] } });
      return;
    }
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ json: [] });
  });
  await frontDeskFixture(page, () => prepared); await page.goto("/admin/lawyer-services/specializations");
  const toggle = page.getByRole("button", { name: "Coverage Overview", exact: true });
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const coverage = page.getByRole("region", { name: "Coverage Overview", exact: true });
  await expect(coverage.getByRole("status")).toContainText("Loading coverage information");
  await expect(coverage.getByText("Operational", { exact: true })).toHaveCount(0);
  release!();
  await expect(coverage.getByRole("alert")).toContainText("Unable to load coverage information.");
  await expect(page.getByRole("heading", { name: "No Practice Areas configured", exact: true })).toBeVisible();
  const initialRequests = attempt;
  retrying = true;
  await coverage.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(coverage.getByText("No Practice Area coverage available.", { exact: true })).toBeVisible();
  expect(attempt).toBe(initialRequests + 1);
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(coverage).toBeHidden();
});
