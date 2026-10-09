import { frontDeskFixture, selectIntakeClient } from './frontDeskFixture';
import { expect, test, type Page } from "@playwright/test";
const root = "/admin/lawyer-matching";
const api = /^https?:\/\/[^/]+\/api\//;
const date = "2030-01-07";
const events = ["received", "parse_requirement", "validate_category", "search_lawyers", "rank_candidates", "validate_recommendations", "backend_validation"]
  .map(step => ({ step, status: "COMPLETED", timestamp: "2026-10-04T10:00:00Z", summary: "Public event", outputSummary: '{"candidateCount":2,"eligibleCount":2}' }));
const result = { clientId: 42, workflowId: "guided", status: "AWAITING_APPROVAL", userRequirement: "Property title review", date: date as string | null,
  parsedRequirement: { categoryId: 4, categoryName: "Real Estate & Property Law", legalServiceId: 91 as number | null, legalServiceName: "Title review" as string | null, matterSummary: "Review of a property title" },
  recommendations: [{ lawyerId: "lawyer-1", fullName: "Amaya Peiris", qualification: "Attorney-at-Law", yearsExperience: 12, score: 12, practiceArea: "Real Estate & Property Law", reason: "Correct Practice Area. 12 years recorded experience. Unbooked slot recorded on 2030-01-07." },
    { lawyerId: "lawyer-2", fullName: "Arun Selvaratnam", qualification: "Attorney-at-Law", yearsExperience: 8, score: 8, practiceArea: "Real Estate & Property Law", reason: "Correct Practice Area. 8 years recorded experience." }], warnings: [] as string[], trace: events };
type FixtureOptions = { result?: typeof result; gate?: Promise<void>; fail?: number; approvalGate?: Promise<void> };
async function setup(page: Page, options: FixtureOptions = {}) {
  let approvals = 0; let submissions = 0; const searches: string[] = []; const slotDates: string[] = [];
  await page.addInitScript(() => { localStorage.setItem("legalease_staff_user", JSON.stringify({ userId: 1, name: "Admin", email: "admin@example.test", role: "Admin" })); localStorage.setItem("token", "test-token"); });
  await page.route(api, async route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    let body: unknown = []; const prepared = options.result || result;
    if (path.endsWith("/summary")) body = { activeLawyers: 2, totalLawyers: 2, practiceAreas: 1, legalServices: 1, coverage: [] };
    if (path === "/api/lawyer-recommendations" && route.request().method() === "POST") {
      submissions++; expect(route.request().postDataJSON().requirement).toBeTruthy();
      await options.gate;
      if (options.fail) { await route.fulfill({ status: options.fail, json: { message: "Safe failure" } }); return; }
      body = prepared;
    }
    if (path === "/api/lawyer-recommendations/guided") body = prepared;
    if (path.endsWith("/customers")) { searches.push(url.searchParams.get("search") || ""); body = [{ customerId: "customer-1", name: "Existing Customer", email: "customer@example.test" }]; }
    if (path.endsWith("/available-slots")) { slotDates.push(url.searchParams.get("date") || ""); body = [{ slotId: "real-slot", date, startTime: "10:30", endTime: "11:00", isBooked: false }, { slotId: "booked", date, startTime: "12:00", endTime: "13:00", isBooked: true }, { slotId: "wrong-date", date: "2030-01-08", startTime: "14:00", endTime: "15:00", isBooked: false }]; }
    if (path.endsWith("/approve")) { approvals++; await options.approvalGate; body = { ...prepared, status: "ACTION_COMPLETED", approvedLawyerId: route.request().postDataJSON().lawyerId, appointmentId: "appointment-1", trace: [...events, ...["human_approval", "create_booking"].map(step => ({ step, status: "COMPLETED", timestamp: "2026-10-04T10:01:00Z", summary: "Approved" }))] }; }
    if (path === "/api/appointments/appointment-1") body = { appointmentId: "appointment-1", lawyerName: "Amaya Peiris", customerName: "Existing Customer", date, startTime: "10:30", endTime: "11:00", statusHistory: [] };
    if (new URL(route.request().url()).pathname.endsWith('/available-slots') && Array.isArray(body)) body = { date: new URL(route.request().url()).searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: body.filter(slot => !slot.isBooked && slot.date === new URL(route.request().url()).searchParams.get('date')).map(slot => ({ slotId: slot.slotId, start: slot.startTime, end: slot.endTime })) };
    await route.fulfill({ json: body });
  });
  await frontDeskFixture(page, () => options.result || result);
  return { get approvals() { return approvals; }, get submissions() { return submissions; }, searches, slotDates };
}
function stage(page: Page, label: string) { return page.getByRole("region", { name: "Recommendation workflow progress" }).locator("li").filter({ has: page.getByText(label, { exact: true }) }); }

test("ready input and real request progress do not invent intermediate completions", async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const stats = await setup(page, { gate }); await page.goto(root);
  await expect(page.getByRole("button", { name: "Analyse Requirement", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recommendation workflow progress" })).toHaveCount(0);
  await selectIntakeClient(page); await page.getByLabel("Legal requirement").fill("Property title review"); await page.getByRole("button", { name: "Analyse Requirement", exact: true }).click();
  await expect(stage(page, "Requirement")).toHaveAttribute("data-state", "ACTIVE");
  await expect(stage(page, "Interpretation")).toHaveAttribute("data-state", "PENDING");
  await expect(page.getByText("0 of 9 stages complete")).toBeVisible();
  expect(await page.getByRole("region", { name: "Recommendation workflow progress" }).locator("svg").evaluateAll(nodes => nodes.flatMap(node => node.getAnimations({ subtree: true })).length)).toBe(0);
  release(); await expect(stage(page, "Validation")).toHaveAttribute("data-state", "COMPLETE");
  await expect(page.getByText("7 of 9 stages complete")).toBeVisible();
  await expect(page.getByText(/Analysis completed in \d+\.\ds/)).toBeVisible(); expect(stats.submissions).toBe(1);
});

test("interpretation, verified service, candidate hierarchy and ranking boundaries render", async ({ page }) => {
  await setup(page); await page.goto(root + "?workflow=guided");
  const interpretation = page.getByRole("region", { name: "AI interpretation" });
  await expect(interpretation.getByText("AI Generated · System Validated")).toBeVisible();
  await expect(interpretation.getByText("Practice Area verified", { exact: true })).toBeVisible();
  await expect(interpretation.getByText("Legal Service verified", { exact: true })).toBeVisible();
  await expect(interpretation.getByText("Title review", { exact: true })).toBeVisible();
  await expect(interpretation.getByText("Review of a property title")).toBeVisible();
  await expect(page.getByRole("article", { name: "Top recommended match" })).toContainText("Amaya Peiris");
  await expect(page.getByText("Other Eligible Matches")).toBeVisible(); await expect(page.getByLabel("12 Recommendation Points")).toBeVisible();
  await page.getByText("How recommendations are ranked").click();
  await expect(page.getByRole("heading", { name: "Eligibility", exact: true })).toBeVisible();
  await expect(page.getByText(/Points equal recorded years of experience/)).toBeVisible();
  expect(await page.locator("#lawyer-recommendations").innerText()).not.toMatch(/Match %|Success %|Win probability|Best Lawyer|AI confidence/i);
});

test("uncertain service remains null without claiming service verification", async ({ page }) => {
  await setup(page, { result: { ...result, parsedRequirement: { ...result.parsedRequirement, legalServiceId: null, legalServiceName: null } } });
  await page.goto(root + "?workflow=guided"); await expect(page.getByText("Not specifically identified", { exact: true })).toBeVisible();
  await expect(page.getByText("Legal Service verified", { exact: true })).toHaveCount(0);
});

for (const requirement of ["I need help with divorce and child custody.", "banana rocket purple chair"]) {
  test(`${requirement} restores a controlled unsupported result`, async ({ page }) => {
    await setup(page, { result: { ...result, status: "UNSUPPORTED", userRequirement: requirement, recommendations: [], parsedRequirement: { ...result.parsedRequirement, categoryId: 0, categoryName: "", legalServiceId: null, legalServiceName: null }, trace: events.slice(0, 3) } });
    await page.goto(root + "?workflow=guided"); await expect(page.getByRole("heading", { name: "No Supported Practice Area" })).toBeVisible();
    await expect(stage(page, "Catalog Validation")).toHaveAttribute("data-state", "FAILED");
    await expect(stage(page, "Candidate Retrieval")).toHaveAttribute("data-state", "PENDING");
    await expect(page.getByRole('region', { name: 'Recommendation workflow progress' }).getByText('UNSUPPORTED', { exact: true })).toBeVisible();
    await expect(page.getByText('2 of 9 stages complete', { exact: true })).toBeVisible();
    await expect(page.getByText('ANALYSING', { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Select Lawyer" })).toHaveCount(0);
    await page.getByRole("button", { name: "Edit Requirement" }).click(); await expect(page.getByLabel("Legal requirement")).toHaveValue(requirement);
  });
}

test('submitted bank scam unsupported result finishes progress and preserves confirmed interpretation', async ({ page }) => {
  const requirement = 'I need assistance with a bank transaction scam issue.';
  await setup(page, { result: { ...result, status: 'UNSUPPORTED', userRequirement: requirement, recommendations: [],
    parsedRequirement: { ...result.parsedRequirement, categoryId: 0, categoryName: '', legalServiceId: null, legalServiceName: null,
      matterSummary: 'Legal assistance regarding a bank transaction scam issue.' }, trace: events.slice(0, 3) } });
  await page.goto(root); await selectIntakeClient(page); await page.getByLabel('Legal requirement').fill(requirement);
  await page.getByRole('button', { name: 'Analyse Requirement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No Supported Practice Area' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recommendation workflow progress' }).getByText('UNSUPPORTED', { exact: true })).toBeVisible();
  await expect(page.getByText('2 of 9 stages complete', { exact: true })).toBeVisible();
  await expect(page.getByText('ANALYSING', { exact: true })).toHaveCount(0);
  await expect(stage(page, 'Availability')).toHaveAttribute('data-state', 'PENDING');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Recommendation workflow progress' }).getByText('UNSUPPORTED', { exact: true })).toBeVisible();
  await expect(page.getByText('2 of 9 stages complete', { exact: true })).toBeVisible();
  await page.screenshot({ path: '../docs/evidence/recurring-scheduling/unsupported-progress.png', fullPage: true });
});

test("selection enters review, refresh preserves selection, and change selection works", async ({ page }) => {
  const stats = await setup(page); await page.goto(root + "?workflow=guided");
  await page.getByRole("button", { name: "Select Lawyer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Administrator review" })).toContainText("Amaya Peiris");
  await expect(page.getByLabel("Search customer")).toHaveCount(0);
  await expect(stage(page, "Administrator Review")).toHaveAttribute("data-state", "ACTIVE");
  await expect(page.getByRole("heading", { name: "Administrator Review", exact: true })).toBeFocused();
  await page.reload(); await expect(page.getByRole("region", { name: "Administrator review" })).toContainText("Amaya Peiris");
  await expect(page.getByLabel("Legal requirement")).toHaveCount(0);
  await page.getByRole("button", { name: "Change Selection" }).click();
  await page.getByRole("button", { name: "Select Arun Selvaratnam" }).click();
  await expect(page.getByRole("region", { name: "Administrator review" })).toContainText("Arun Selvaratnam"); expect(stats.approvals).toBe(0);
});

test("appointment details use searched customers and real slots, with real approval progress", async ({ page }) => {
  let release!: () => void; const approvalGate = new Promise<void>(resolve => { release = resolve; });
  const stats = await setup(page, { approvalGate }); await page.goto(root + "?workflow=guided");
  await page.getByRole("button", { name: "Select Lawyer", exact: true }).click(); await page.getByRole("button", { name: "Continue to Appointment" }).click();
  await expect(page.getByRole("region", { name: "Client intake" })).toContainText("Existing Customer");

  await expect(page.getByLabel("Available slot").locator("option")).toHaveCount(2);
  await page.getByLabel("Available slot").selectOption("real-slot"); await page.getByRole("button", { name: "Approve & Create Appointment" }).click();
  await expect(page.getByText("CREATING APPOINTMENT", { exact: true })).toBeVisible();
  await expect(stage(page, "Administrator Review")).toHaveAttribute("data-state", "COMPLETE"); await expect(stage(page, "Appointment")).toHaveAttribute("data-state", "ACTIVE");
  release(); await expect(page.getByRole("heading", { name: "Appointment Created" })).toBeVisible();
  await expect(page.getByText("9 of 9 stages complete")).toBeVisible(); await expect(page.getByText("Existing Customer", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View Appointment" })).toHaveAttribute("href", "/admin/appointments?appointment=appointment-1");
  await page.getByText("View Workflow Details", { exact: true }).click(); await expect(page.getByText("Appointment approved by administrator", { exact: true })).toBeVisible();
  expect(stats.approvals).toBe(1); expect(stats.slotDates.every(value => value === date)).toBe(true);
});

test("workflow details expose public events and collapse without exposing model output", async ({ page }) => {
  await setup(page, { result: { ...result, trace: [...events, { step: "model_reasoning", status: "completed", timestamp: "2026-10-04T10:00:00Z", summary: "HIDDEN_REASONING", outputSummary: "PRIVATE" }] } });
  await page.goto(root + "?workflow=guided"); const details = page.locator("details").filter({ has: page.getByText("View Workflow Details", { exact: true }) });
  await expect(details.locator("dl")).toBeHidden(); await details.locator("summary").click(); await expect(details.locator("dl")).toBeVisible();
  expect(await details.innerText()).not.toMatch(/HIDDEN_REASONING|PRIVATE/); await details.locator("summary").click(); await expect(details.locator("dl")).toBeHidden();
});

for (const width of [1440, 1024, 768, 375, 320]) {
  test(`guided workflow fits ${width}px with keyboard access and reduced motion`, async ({ page }, info) => {
    await setup(page); await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(root + "?workflow=guided");
    await expect(page.getByRole("article", { name: "Top recommended match" })).toBeVisible();
    await page.getByRole("region", { name: "Recommendation workflow progress" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`progress-${width}.png`), fullPage: true });
    await page.getByRole("article", { name: "Top recommended match" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`matches-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const select = page.getByRole("button", { name: "Select Lawyer", exact: true }); await select.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Administrator Review", exact: true })).toBeFocused();
    await page.screenshot({ path: info.outputPath(`review-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Continue to Appointment" }).focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Client intake" })).toContainText("Existing Customer"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await page.getByRole("region", { name: "Recommendation workflow progress" }).locator("svg").evaluateAll(nodes => nodes.flatMap(node => node.getAnimations({ subtree: true })).length)).toBe(0);
    await page.screenshot({ path: info.outputPath(`appointment-${width}.png`), fullPage: true });
  });
}

test("slow restoration hides the ready form until the workflow resolves", async ({ page }) => {
  await setup(page); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/lawyer-recommendations/guided", async route => { await gate; await route.fulfill({ json: result }); });
  await page.goto(root + "?workflow=guided"); await expect(page.getByText("Restoring recommendation workflow...")).toBeVisible();
  await expect(page.getByLabel("Legal requirement")).toHaveCount(0); await expect(page.getByRole("button", { name: "Analyse Requirement", exact: true })).toHaveCount(0);
  release(); await expect(page.getByRole("article", { name: "Top recommended match" })).toBeVisible();
});

for (const code of [422, 503]) {
  test(`analysis ${code} gives an actionable retry without ranking or booking`, async ({ page }) => {
    const options = { fail: code }; await setup(page, options); await page.goto(root);
    await selectIntakeClient(page); await page.getByLabel("Legal requirement").fill("Property title review"); await page.getByRole("button", { name: "Analyse Requirement", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(code === 422 ? "Catalog Validation Failed" : "AI Interpretation Failed");
    await expect(page.getByRole("button", { name: "Approve & Create Appointment" })).toHaveCount(0);
    options.fail = 0; await page.getByRole("button", { name: "Retry Analysis" }).click();
    await expect(page.getByRole("article", { name: "Top recommended match" })).toBeVisible();
  });
}

test("View Appointment opens the actual appointment details on the Admin route", async ({ page }) => {
  await setup(page);
  await page.route("**/api/appointments/appointment-1", route => route.fulfill({ json: { appointmentId: "appointment-1", customerName: "Existing Customer", lawyerName: "Amaya Peiris", date, startTime: "10:30", endTime: "11:00", history: [] } }));
  await page.goto("/admin/appointments?appointment=appointment-1");
  await expect(page.getByRole("heading", { name: "Appointment Audit & Details" })).toBeVisible(); await expect(page.getByText("ID: appointment-1", { exact: true })).toBeVisible();
});

test("client lookup failure can retry before analysis", async ({ page }) => {
  await setup(page); let fail = true;
  await page.route("**/api/clients/search*", async route => { if (fail) await route.fulfill({ status: 503, json: { message: "Safe failure" } }); else await route.fallback(); });
  await page.goto(root); await expect(page.getByRole("alert")).toContainText("Client search could not be loaded");
  await expect(page.getByRole("button", { name: "Analyse Requirement", exact: true })).toBeDisabled(); fail = false;
  await page.getByRole("button", { name: "Retry Client Search" }).click(); await selectIntakeClient(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("booking failure retries the actual approval mutation without another analysis", async ({ page }) => {
  const stats = await setup(page); let fail = true;
  await page.route("**/api/lawyer-recommendations/guided/approve", async route => { if (fail) await route.fulfill({ status: 500, json: { message: "Appointment could not be created. Please retry." } }); else await route.fallback(); });
  await page.goto(root + "?workflow=guided"); await page.getByRole("button", { name: "Select Lawyer", exact: true }).click(); await page.getByRole("button", { name: "Continue to Appointment" }).click();
  await page.getByLabel("Available slot").selectOption("real-slot"); await page.getByRole("button", { name: "Approve & Create Appointment" }).click();
  await expect(page.getByRole("alert")).toContainText("Appointment Could Not Be Created"); fail = false;
  await page.getByRole("button", { name: "Retry Appointment", exact: true }).click(); await expect(page.getByRole("heading", { name: "Appointment Created" })).toBeVisible(); expect(stats.submissions).toBe(0);
});

test("appointment details failure retains success and retries its read request", async ({ page }) => {
  await setup(page, { result: { ...result, status: "ACTION_COMPLETED" } }); let fail = true;
  await page.route("**/api/lawyer-recommendations/guided", route => route.fulfill({ json: { ...result, status: "ACTION_COMPLETED", appointmentId: "appointment-1", approvedLawyerId: "lawyer-1" } }));
  await page.route("**/api/appointments/appointment-1", async route => { if (fail) await route.fulfill({ status: 503, json: {} }); else await route.fallback(); });
  await page.goto(root + "?workflow=guided"); await expect(page.getByRole("heading", { name: "Appointment Created" })).toBeVisible(); await expect(page.getByRole("alert")).toContainText("Appointment Details Unavailable");
  fail = false; await page.getByRole("button", { name: "Retry Appointment Details" }).click(); await expect(page.getByText("Existing Customer", { exact: true }).first()).toBeVisible(); await expect(page.getByRole("alert")).toHaveCount(0);
});
