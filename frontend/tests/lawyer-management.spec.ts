import { expect, test } from "@playwright/test";

const admin = { userId: 1, name: "Test Admin", email: "admin@example.test", role: "Admin" };
const backendApi = /^https?:\/\/[^/]+\/api\//;
const areas = [
  { specializationId: 1, name: "Corporate & Commercial Law", description: "Commercial matters", lawyerCount: 1, legalServiceCount: 1 },
  { specializationId: 2, name: "Tax Law", description: "Tax matters", lawyerCount: 0, legalServiceCount: 0 },
];
const lawyer = {
  lawyerId: "lawyer-1", name: "Nimal Perera", email: "nimal@example.test", phoneNumber: "0700000000",
  qualification: "Attorney-at-Law", experience: 8, licenseNumber: "ILS/LAW/0001",
  profileDescription: "Commercial law practitioner", status: "Active", specializations: [areas[0]],
};
const service = {
  legalServiceId: 7, serviceName: "Contract Review", description: "Review commercial agreements",
  category: areas[0].name, eligibleLawyerCount: 1, legacyReferenceCount: 0,
};

test("Member 1 routes require Admin sign-in", async ({ page }) => {
  await page.goto("/admin/lawyer-services/lawyers");
  await expect(page).toHaveURL(/\/login$/);
});

test("Admin keeps one module with Lawyers, Practice Areas and Legal Services", async ({ page }) => {
  await page.addInitScript(staff => {
    localStorage.setItem("legalease_staff_user", JSON.stringify(staff));
    localStorage.setItem("token", "test-admin-token");
  }, admin);

  await page.route(backendApi, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown = [];
    if (path === "/api/lawyer-services/summary") body = {
      activeLawyers: 1, totalLawyers: 1, practiceAreas: 2, legalServices: 1, coverage: [],
    };
    if (path === "/api/specializations") body = areas;
    if (path === "/api/lawyers/search") {
      const matches = !url.searchParams.get("specialization") || url.searchParams.get("specialization") === "1";
      const items = matches ? [lawyer] : [];
      body = { items, page: 1, pageSize: 10, totalItems: items.length, totalPages: items.length ? 1 : 0, totalLawyers: 1 };
    }
    if (path === "/api/legal-services/admin") body = [service];
    if (path === "/api/legal-services/7") body = { ...service, eligibleLawyers: [{ lawyerId: lawyer.lawyerId, name: lawyer.name }] };
    if (path === "/api/specializations/1") body = {
      ...areas[0], lawyers: [{ lawyerId: lawyer.lawyerId, name: lawyer.name }],
      legalServices: [{ legalServiceId: service.legalServiceId, serviceName: service.serviceName }],
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto("/admin/lawyer-services/lawyers");
  await expect(page.getByRole("heading", { name: "Lawyers", exact: true })).toBeVisible();
  await expect(page.getByText("Nimal Perera")).toBeVisible();
  await expect(page.getByRole("article", { name: "Active Lawyers", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tax Law (0)" }).click();
  await expect(page.getByText("No lawyers found")).toBeVisible();

  await page.getByRole("link", { name: "Practice Areas" }).click();
  await expect(page).toHaveURL(/\/admin\/lawyer-services\/specializations$/);
  await expect(page.getByRole("heading", { name: "Practice Areas", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Legal Services", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/lawyer-services\/legal-services$/);
  await expect(page.getByRole("heading", { name: "Legal Services", exact: true })).toBeVisible();
  await expect(page.getByText("Contract Review")).toBeVisible();
  await expect(page.getByText("1 Lawyer")).toBeVisible();
  await page.getByRole("button", { name: "View", exact: true }).click();
  const details = page.getByRole("dialog", { name: "Contract Review" });
  await expect(details.getByText("Eligible Lawyers", { exact: false })).toBeVisible();
  await expect(details.getByText("Nimal Perera")).toBeVisible();
  await expect(details.getByText("Manage Assigned Lawyers")).toHaveCount(0);
});

test("old admin lawyer URL redirects into the current module", async ({ page }) => {
  await page.addInitScript(staff => localStorage.setItem("legalease_staff_user", JSON.stringify(staff)), admin);
  await page.goto("/admin/lawyer-management/recommendation-test");
  await expect(page).toHaveURL(/\/admin\/lawyer-matching$/);
  await expect(page.getByRole("heading", { name: "AI Lawyer Matching" })).toBeVisible();
});
