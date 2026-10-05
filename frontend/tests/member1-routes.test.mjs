import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesFromElements, MemoryRouter, Routes } from "react-router-dom";
import { createServer } from "vite";

const root = "/admin/lawyer-services";
const admin = { userId: 1, name: "Test Admin", email: "admin@example.test", role: "Admin" };
globalThis.localStorage = { getItem: key => key === "legalease_staff_user" ? JSON.stringify(admin) : null };

let server;
let routes;
let SpecializationManager;
let LegalServiceManager;
let EligiblePractitioners;
let filterLegalServices;
let LawyerRecommendations;
let RecommendationWorkflow;
let RecommendationWorkflowProgress;
let workflowStages;
let LawyerPagination;
let lawyerPagination;
let lawyersApi;
let apiClient;
let OperationalSummary;
let CoverageOverview;
let coverageWarnings;
let LawyerIdentity;

before(async () => {
  server = await createServer({ cacheDir: "node_modules/.vite-member1-ssr", server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
  ({ lawyerLegalServicesRoutes: routes } = await server.ssrLoadModule("/src/routes/LawyerLegalServicesRoutes.tsx"));
  ({ SpecializationManager } = await server.ssrLoadModule("/src/components/lawyers/SpecializationManager.tsx"));
  ({ LegalServiceManager, EligiblePractitioners } = await server.ssrLoadModule("/src/components/lawyers/LegalServiceManager.tsx"));
  ({ filterLegalServices } = await server.ssrLoadModule("/src/components/lawyers/legalServiceFilters.ts"));
  ({ LawyerRecommendations, RecommendationWorkflow } = await server.ssrLoadModule("/src/components/lawyers/LawyerRecommendations.tsx"));
  ({ RecommendationWorkflowProgress } = await server.ssrLoadModule("/src/features/lawyerServices/recommendations/components/RecommendationWorkflowProgress.tsx"));
  ({ workflowStages } = await server.ssrLoadModule("/src/components/lawyers/recommendationWorkflow.ts"));
  ({ LawyerPagination } = await server.ssrLoadModule("/src/components/lawyers/LawyerPagination.tsx"));
  lawyerPagination = await server.ssrLoadModule("/src/components/lawyers/lawyerPageUtils.ts");
  ({ lawyersApi } = await server.ssrLoadModule("/src/api/lawyersApi.ts"));
  ({ apiClient } = await server.ssrLoadModule("/src/api/apiClient.ts"));
  ({ OperationalSummary } = await server.ssrLoadModule("/src/pages/admin/LawyerLegalServicesLayout.tsx"));
  ({ CoverageOverview } = await server.ssrLoadModule("/src/components/lawyers/CoverageOverview.tsx"));
  ({ coverageWarnings } = await server.ssrLoadModule("/src/components/lawyers/coverageWarnings.ts"));
  ({ LawyerIdentity } = await server.ssrLoadModule("/src/components/lawyers/LawyerIdentity.tsx"));
});

after(async () => { await server?.close(); });

test("confirmed unsupported result overrides a stale request flag and counts confirmed stages", () => {
  const result = { workflowId: "unsupported", status: "UNSUPPORTED", date: "2026-10-07", recommendations: [], warnings: [],
    parsedRequirement: { categoryId: null, categoryName: null },
    trace: ["received", "parse_requirement"].map(step => ({ step, status: "COMPLETED" })) };
  const html = renderToStaticMarkup(React.createElement(RecommendationWorkflowProgress, { result, busy: true }));
  assert.match(html, />UNSUPPORTED<\/p>/); assert.match(html, /2 of 9 stages complete/);
  assert.doesNotMatch(html, /ANALYSING|Analysis request in progress/);
  assert.match(html, /data-state="FAILED"/);
});

test("each direct section URL renders the shared header and its active section", () => {
  const sections = [
    ["lawyers", "Lawyers", "All Practice Areas"],
    ["specializations", "Practice Areas", "Loading Practice Areas"],
    ["legal-services", "Legal Services", "Loading Legal Services"],
    ["workforce-hiring", "Workforce &amp; Hiring", "Run Workforce Analysis"],
  ];

  for (const [path, label, content] of sections) {
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [`${root}/${path}`] },
      React.createElement(Routes, null, routes)));
    assert.equal((html.match(/Lawyer &amp; Legal Service Management/g) ?? []).length, 1, path);
    assert.match(html, /Manage practitioners, legal categories, services and workforce coverage/, path);
    assert.match(html, new RegExp(`aria-current="page"[^>]*>${label}<\/a>`), path);
    assert.match(html, new RegExp(content), path);
    if (path === "lawyers") {
      assert.match(html, /Manage registered legal practitioners, profiles and availability/);
      assert.match(html, /Search lawyers by name, license number, qualifications/);
      assert.match(html, /Add New Lawyer/);
    }
  }
});

test("shared operational summary uses dynamic cards, verified coverage sums and honest request states", () => {
  const props = { loading: false, error: null, coverageOpen: false, onToggle: () => {}, onRetry: () => {} };
  const summary = { activeLawyers: 31, totalLawyers: 35, practiceAreas: 5, legalServices: 25,
    coverage: [{ futureAvailabilityCount: 7 }, { futureAvailabilityCount: 4 }] };
  const html = renderToStaticMarkup(React.createElement(OperationalSummary, { ...props, summary }));
  assert.match(html, /31<\/p>/);
  assert.match(html, /of 35 total lawyers/);
  assert.match(html, /5<\/p>/);
  assert.match(html, /25<\/p>/);
  assert.match(html, /11<\/p>/);
  assert.equal((html.match(/<article/g) ?? []).length, 4);
  assert.match(html, /Available Appointment Slots/);
  assert.match(html, /aria-expanded="false"/);
  const loading = renderToStaticMarkup(React.createElement(OperationalSummary, { ...props, summary: null, loading: true }));
  assert.match(loading, /Loading summary/);
  assert.equal((loading.match(/aria-busy="true"/g) ?? []).length, 4);
  assert.doesNotMatch(loading, /0<\/p>/);
  const unavailable = renderToStaticMarkup(React.createElement(OperationalSummary, { ...props, summary: null, error: "Summary unavailable. Please try again." }));
  assert.match(unavailable, /Summary unavailable/);
  assert.match(unavailable, /Retry/);
  assert.doesNotMatch(unavailable, /0<\/p>/);
});

test("coverage renders actual areas and factual warnings", () => {
  const rows = [
    { practiceAreaId: 10, practiceAreaName: "Corporate Law", activeLawyers: 3, legalServices: 4, futureAvailabilityCount: 7 },
    { practiceAreaId: 20, practiceAreaName: "Tax Law", activeLawyers: 0, legalServices: 0, futureAvailabilityCount: 0 },
  ];
  const html = renderToStaticMarkup(React.createElement(CoverageOverview, { rows }));
  assert.match(html, /aria-label="Practice Area coverage"/);
  assert.match(html, /Coverage Health Matrix/);
  assert.match(html, /2 Practice Areas/);
  assert.match(html, /Corporate Law/);
  assert.match(html, /Tax Law/);
  assert.match(html, /Operational/);
  assert.match(html, /No Active Lawyers/);
  assert.match(html, /No Legal Services/);
  assert.match(html, /No Available Slots/);
  assert.doesNotMatch(html, /Family Law/);
  assert.deepEqual(coverageWarnings(rows[0]), []);
  assert.deepEqual(coverageWarnings(rows[1]), ["No Active Lawyers", "No Legal Services", "No Available Slots"]);
  assert.deepEqual(coverageWarnings({ ...rows[0], legalServices: 0 }), ["No Legal Services"]);
  const partial = renderToStaticMarkup(React.createElement(CoverageOverview, { rows: [{ ...rows[0], legalServices: 0 }] }));
  assert.match(partial, /bg-amber-400/);
  assert.match(partial, /No Legal Services/);
  assert.doesNotMatch(partial, /bg-red-400|Operational/);
  const empty = renderToStaticMarkup(React.createElement(CoverageOverview, { rows: [] }));
  assert.match(empty, /No Practice Area coverage available/);
  assert.doesNotMatch(empty, /aria-label="Practice Area coverage"/);
  const loading = renderToStaticMarkup(React.createElement(CoverageOverview, { rows, loading: true }));
  assert.match(loading, /Loading coverage information/);
  assert.doesNotMatch(loading, /Corporate Law|Operational|No Active Lawyers/);
  const failed = renderToStaticMarkup(React.createElement(CoverageOverview, { rows, error: "Summary unavailable", onRetry: () => {} }));
  assert.match(failed, /Unable to load coverage information/);
  assert.match(failed, /Retry/);
  assert.doesNotMatch(failed, /Corporate Law|Operational/);
});

test("lawyer identity shows actual status without a synthetic badge", () => {
  const lawyer = { name: "Nimal Perera", qualification: "Attorney-at-Law",
    licenseNumber: "ILS/LAW/0001", status: "Active" };
  const html = renderToStaticMarkup(React.createElement(LawyerIdentity, { lawyer }));
  assert.match(html, /Nimal Perera/);
  assert.match(html, /Active/);
  assert.doesNotMatch(html, /Demo/);
  const existing = renderToStaticMarkup(React.createElement(LawyerIdentity,
    { lawyer: { ...lawyer, name: "Existing Lawyer", licenseNumber: "BAR-1", status: "Pending" } }));
  assert.doesNotMatch(existing, /Demo/);
  assert.match(existing, /Pending/);
  const inactive = renderToStaticMarkup(React.createElement(LawyerIdentity,
    { lawyer: { ...lawyer, status: "Inactive" } }));
  assert.match(inactive, /Inactive/);
});

test("shared summary uses one Admin aggregate endpoint", async () => {
  const originalGet = apiClient.get;
  const calls = [];
  apiClient.get = async url => { calls.push(url); return { data: { activeLawyers: 2, coverage: [] } }; };
  try {
    assert.equal((await lawyersApi.getLawyerServicesSummary()).activeLawyers, 2);
    assert.deepEqual(calls, ["/api/lawyer-services/summary"]);
  } finally {
    apiClient.get = originalGet;
  }
});

test("successful catalog mutations notify the shared summary to refresh", async () => {
  const originalWindow = globalThis.window;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const originalDelete = apiClient.delete;
  const events = [];
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  apiClient.post = async () => ({ data: {} });
  apiClient.put = async () => ({ data: {} });
  apiClient.delete = async () => ({ data: {} });
  try {
    await lawyersApi.createLawyer({});
    await lawyersApi.updateLawyer("one", {});
    await lawyersApi.deleteLawyer("one");
    await lawyersApi.saveSpecialization({ name: "Area", description: "" });
    await lawyersApi.deleteSpecialization(1);
    await lawyersApi.saveLegalService({ serviceName: "Service", description: "", category: "Area" });
    await lawyersApi.deleteLegalService(1);
    assert.deepEqual(events, Array(7).fill("lawyer-management-changed"));
  } finally {
    globalThis.window = originalWindow;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
    apiClient.delete = originalDelete;
  }
});

test("the module default and legacy lawyer URL point to lawyers", () => {
  const config = createRoutesFromElements(routes);
  const legacy = config.find(route => route.path === "/admin/lawyers");
  const module = config.find(route => route.path === root);
  assert.equal(legacy.element.props.children.props.to, `${root}/lawyers`);
  assert.equal(module.children.find(route => route.index).element.props.to, "lawyers");
  assert.deepEqual(module.children.filter(route => route.path).map(route => route.path),
    ["lawyers", "specializations", "legal-services", "workforce-hiring"]);
});

test("practice area manager shows real counts, sorted list actions and empty state", () => {
  const specialization = { specializationId: 1, name: "Corporate Law", description: "Business matters", lawyerCount: 5, legalServiceCount: 4 };
  const specializationHtml = renderToStaticMarkup(React.createElement(SpecializationManager,
    { items: [specialization, { specializationId: 2, name: "Administrative Law", description: "Public matters", lawyerCount: 0, legalServiceCount: 0 }], onChanged: async () => {} }));
  assert.match(specializationHtml, /Practice Areas/);
  assert.doesNotMatch(specializationHtml, /2 Practice Areas/);
  assert.match(specializationHtml, /Add Practice Area/);
  assert.ok(specializationHtml.indexOf("Administrative Law") < specializationHtml.indexOf("Corporate Law"));
  assert.match(specializationHtml, /Corporate Law/);
  assert.match(specializationHtml, /5 Lawyers/);
  assert.match(specializationHtml, /4 Legal Services/);
  assert.match(specializationHtml, /View<\/button>/);
  assert.match(specializationHtml, /Edit<\/button>/);
  assert.match(specializationHtml, /Delete<\/button>/);
  const empty = renderToStaticMarkup(React.createElement(SpecializationManager,
    { items: [], onChanged: async () => {} }));
  assert.match(empty, /No Practice Areas configured/);
});

test("legal service catalog shows real summary, area filters, counts and actions", () => {
  const specialization = { specializationId: 1, name: "Corporate Law", description: "Business matters" };

  const services = [
    { legalServiceId: 1, serviceName: "Contract Review", description: "Review agreements", category: "Corporate Law", eligibleLawyerCount: 5, legacyReferenceCount: 0 },
    { legalServiceId: 2, serviceName: "Company Filing", description: "File company records", category: "Corporate Law", eligibleLawyerCount: 5, legacyReferenceCount: 0 },
    { legalServiceId: 3, serviceName: "Title Search", description: "Land titles", category: "Property Law", eligibleLawyerCount: 2, legacyReferenceCount: 1 },
  ];
  const serviceHtml = renderToStaticMarkup(React.createElement(LegalServiceManager,
    { items: services, specializations: [specialization], onChanged: async () => {} }));
  assert.match(serviceHtml, /Legal Services/);
  assert.match(serviceHtml, /Manage legal services available under each Practice Area/);
  assert.doesNotMatch(serviceHtml, /3 Legal Services/);
  assert.doesNotMatch(serviceHtml, /1 Practice Area/);
  assert.doesNotMatch(serviceHtml, /Lawyer Assignments|Manage Assigned Lawyers/);
  assert.match(serviceHtml, /Eligible Lawyers/);
  assert.match(serviceHtml, /5 Lawyers/);
  assert.match(serviceHtml, /Add Legal Service/);
  assert.match(serviceHtml, /Contract Review/);
  assert.match(serviceHtml, /Company Filing/);
  assert.match(serviceHtml, /All Practice Areas \(3\)/);
  assert.match(serviceHtml, /Corporate Law \(2\)/);
  assert.match(serviceHtml, /Search legal services/);
  assert.match(serviceHtml, /View<\/button>/);
  assert.match(serviceHtml, /Edit<\/button>/);
  assert.match(serviceHtml, /Delete<\/button>/);
  assert.deepEqual(filterLegalServices(services, "Corporate Law", "review").map(item => item.serviceName), ["Contract Review"]);
  assert.deepEqual(filterLegalServices(services, "", "land").map(item => item.serviceName), ["Title Search"]);
  assert.deepEqual(filterLegalServices(services, "property law", "").map(item => item.serviceName), ["Title Search"]);
  const empty = renderToStaticMarkup(React.createElement(LegalServiceManager,
    { items: [], specializations: [specialization], onChanged: async () => {} }));
  assert.match(empty, /No Legal Services configured/);
});

test("service Admin list and details use eligibility routes while the public list stays unchanged", async () => {
  const originalGet = apiClient.get;
  const calls = [];
  apiClient.get = async url => { calls.push(url); return { data: url.endsWith("/1") ? { legalServiceId: 1 } : [] }; };
  try {
    await lawyersApi.getLegalServices();
    await lawyersApi.getAdminLegalServices();
    await lawyersApi.getLegalService(1);
    assert.deepEqual(calls, ["/api/legal-services", "/api/legal-services/admin", "/api/legal-services/1"]);
    assert.equal(lawyersApi.saveLegalServiceLawyers, undefined);
  } finally {
    apiClient.get = originalGet;
  }
});

test("service details show matching eligible practitioners without assignment controls", () => {
  const details = {
    legalServiceId: 1, serviceName: "Contract Review", description: "Review agreements",
    category: "Corporate Law", eligibleLawyerCount: 2, legacyReferenceCount: 1,
    eligibleLawyers: [{ lawyerId: "one", name: "Nimal Perera" }, { lawyerId: "two", name: "Saman Wijayananda" }],
  };
  const html = renderToStaticMarkup(React.createElement(EligiblePractitioners, { details }));
  assert.match(html, /Eligible Lawyers/);
  assert.match(html, /2 Lawyers/);
  assert.match(html, /Nimal Perera/);
  assert.match(html, /Saman Wijayananda/);
  assert.match(html, /registered under Corporate Law/);
  assert.doesNotMatch(html, /Assigned|checkbox|Manage/);
  const empty = renderToStaticMarkup(React.createElement(EligiblePractitioners,
    { details: { ...details, eligibleLawyerCount: 0, eligibleLawyers: [] } }));
  assert.match(empty, /No active lawyers belong to this Practice Area yet/);
});

test("practice area details use the Admin endpoint without changing the public list", async () => {
  const originalGet = apiClient.get;
  const calls = [];
  apiClient.get = async url => {
    calls.push(url);
    return { data: url.endsWith("/1") ? { specializationId: 1, lawyers: [], legalServices: [] } : [] };
  };
  try {
    await lawyersApi.getSpecializations();
    await lawyersApi.getSpecialization(1);
    assert.deepEqual(calls, ["/api/specializations", "/api/specializations/1"]);
  } finally {
    apiClient.get = originalGet;
  }
});

test("existing recommendation form renders without requesting recommendations", () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(LawyerRecommendations)));
  assert.match(html, /AI Lawyer Matching/);
  assert.match(html, /Analyse Requirement/);
  assert.doesNotMatch(html, /Customer UUID|Slot ID/);
});

test("workflow stages distinguish AI, system, human and stop after unsupported catalog", () => {
  const base = { workflowId: "test", recommendations: [], warnings: [], parsedRequirement: { categoryName: null },
    trace: [
      { step: "received", status: "completed", timestamp: "2026-10-02T00:00:00Z", summary: "Received" },
      { step: "parse_requirement", status: "COMPLETED", timestamp: "2026-10-02T00:00:01Z", summary: "Interpreted" },
      { step: "validate_category", status: "UNSUPPORTED", timestamp: "2026-10-02T00:00:02Z", summary: "Unsupported" },
    ] };
  const stages = workflowStages({ ...base, status: "UNSUPPORTED" });
  assert.equal(stages[1].actor, "AI");
  assert.equal(stages[2].state, "failed");
  assert.equal(stages[3].state, "pending");
  assert.equal(stages[7].actor, "HUMAN");
  const html = renderToStaticMarkup(React.createElement(RecommendationWorkflow, { result: { ...base, status: "UNSUPPORTED" } }));
  assert.match(html, /Catalog Validation/);
  assert.match(html, /data-state="FAILED"/);
  assert.doesNotMatch(html, /Gemini.*reasoning|chain.of.thought/i);
});

test("workflow stages use recorded events and only complete booking after its audit event", () => {
  const event = (step, outputSummary) => ({ step, outputSummary, status: "COMPLETED", timestamp: "2026-10-02T00:00:00Z", summary: step });
  const result = { workflowId: "test", status: "AWAITING_APPROVAL", date: "2030-01-07", warnings: [], recommendations: [],
    parsedRequirement: { categoryName: "Property Law" }, trace: [event("received"), event("parse_requirement"),
      event("validate_category"), event("search_lawyers", '{"candidateCount":4}'),
      event("rank_candidates", '{"eligibleCount":4}'), event("validate_recommendations", '{"validatedCount":4}'),
      event("backend_validation")] };
  const stages = workflowStages(result);
  assert.equal(stages[3].detail, "4 active practitioners after requested-date filtering");
  assert.equal(stages[4].state, "completed");
  assert.equal(stages[7].state, "waiting");
  assert.equal(stages[8].state, "pending");
  const completedWithoutBooking = workflowStages({ ...result, status: "ACTION_COMPLETED" });
  assert.equal(completedWithoutBooking[8].state, "pending");
  const completed = workflowStages({ ...result, status: "ACTION_COMPLETED", trace: [...result.trace, event("create_booking")] });
  assert.equal(completed[7].state, "completed");
  assert.equal(completed[8].state, "completed");
});

test("lawyer filters reset to page one and ranges follow server totals", () => {
  const { resetLawyerPage, lawyerPageRange, lastLawyerPage } = lawyerPagination;
  const current = { page: 3, pageSize: 10, specialization: "Property", search: "Perera", date: "2030-01-05" };
  assert.deepEqual(resetLawyerPage(current, { search: "Fernando" }), { ...current, page: 1, search: "Fernando" });
  assert.deepEqual(resetLawyerPage(current, { specialization: "Employment" }), { ...current, page: 1, specialization: "Employment" });
  assert.deepEqual(resetLawyerPage(current, { date: "2030-01-06" }), { ...current, page: 1, date: "2030-01-06" });
  assert.deepEqual(resetLawyerPage(current, { pageSize: 20 }), { ...current, page: 1, pageSize: 20 });
  assert.deepEqual(lawyerPageRange(2, 10, 30), { start: 11, end: 20 });
  assert.deepEqual(lawyerPageRange(3, 10, 25), { start: 21, end: 25 });
  assert.deepEqual(lawyerPageRange(1, 10, 0), { start: 0, end: 0 });
  assert.equal(lastLawyerPage(0), 1);
  assert.equal(lastLawyerPage(2), 2);
});

test("pagination footer shows the correct range and disables boundary controls", () => {
  const props = { pageSize: 10, totalItems: 25, totalPages: 3, loading: false,
    onPageChange: () => {}, onPageSizeChange: () => {} };
  const first = renderToStaticMarkup(React.createElement(LawyerPagination, { ...props, page: 1 }));
  assert.match(first, /Showing 1–10 of 25 registered lawyers/);
  assert.match(first, /aria-label="Previous page" disabled=""/);
  assert.doesNotMatch(first, /aria-label="Next page" disabled=""/);

  const middle = renderToStaticMarkup(React.createElement(LawyerPagination, { ...props, page: 2 }));
  assert.match(middle, /Showing 11–20 of 25 registered lawyers/);
  assert.doesNotMatch(middle, /aria-label="Previous page" disabled=""/);
  assert.doesNotMatch(middle, /aria-label="Next page" disabled=""/);

  const last = renderToStaticMarkup(React.createElement(LawyerPagination, { ...props, page: 3 }));
  assert.match(last, /Showing 21–25 of 25 registered lawyers/);
  assert.match(last, /aria-label="Next page" disabled=""/);
});

test("paged lawyer requests carry page, size and active filters", async () => {
  const originalGet = apiClient.get;
  let request;
  apiClient.get = async (url, config) => {
    request = { url, params: config.params };
    return { data: { items: [], page: 2, pageSize: 10, totalItems: 0, totalPages: 0, totalLawyers: 0 } };
  };
  try {
    await lawyersApi.getPagedLawyers({ page: 2, pageSize: 10, specialization: "4", search: " Perera ", date: "2030-01-05" });
    assert.deepEqual(request, { url: "/api/lawyers/search",
      params: { page: 2, pageSize: 10, specialization: "4", search: "Perera", date: "2030-01-05" } });
  } finally {
    apiClient.get = originalGet;
  }
});
