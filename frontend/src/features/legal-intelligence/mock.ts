// DEVELOPMENT ONLY. Obvious placeholders for UI work, not legal information.
// Used only when VITE_LEGAL_INTELLIGENCE_USE_MOCK=true. Delete once the backend exists.
import {
  LAW_TYPES,
  LEGAL_CATEGORIES,
  type CourtCase,
  type LegalIntelligenceSource,
  type LegalUpdate,
  type ListQuery,
  type Paginated,
} from "./types";

const PLACEHOLDER_DATE = "2000-01-01";
const PLACEHOLDER_URL = "https://example.com/";

const updates: LegalUpdate[] = Array.from({ length: 14 }, (_, i) => {
  const isLaw = i < 8;
  return {
    id: `placeholder-update-${i + 1}`,
    title: `[Placeholder] ${isLaw ? "Law" : "Development"} title ${i + 1}`,
    type: isLaw ? LAW_TYPES[i % LAW_TYPES.length] : "Development",
    category: LEGAL_CATEGORIES[i % LEGAL_CATEGORIES.length],
    summary: "Placeholder summary text used only to preview the layout.",
    details: "Placeholder detailed information for the detail view.",
    publishedDate: PLACEHOLDER_DATE,
    sourceName: "Placeholder source",
    sourceUrl: PLACEHOLDER_URL,
    status: isLaw ? "Proposed" : "Reported",
  };
});

const cases: CourtCase[] = Array.from({ length: 8 }, (_, i) => ({
  id: `placeholder-case-${i + 1}`,
  caseNumber: `[Placeholder case no. ${i + 1}]`,
  title: `[Placeholder] Case title ${i + 1}`,
  court: "Placeholder court",
  decisionDate: PLACEHOLDER_DATE,
  category: LEGAL_CATEGORIES[i % LEGAL_CATEGORIES.length],
  summary: "Placeholder summary text used only to preview the layout.",
  details: "Placeholder detailed information for the detail view.",
  decision: "Placeholder outcome",
  sourceName: "Placeholder source",
  sourceUrl: PLACEHOLDER_URL,
}));

function page<T>(items: T[], q: ListQuery): Paginated<T> {
  const pageSize = q.pageSize ?? 6;
  const p = q.page ?? 1;
  return {
    items: items.slice((p - 1) * pageSize, p * pageSize),
    total: items.length,
    page: p,
    pageSize,
  };
}

const matches = (text: string, search?: string) =>
  !search || text.toLowerCase().includes(search.toLowerCase());

const delay = () => new Promise<void>((r) => setTimeout(r, 300));

export const legalIntelligenceMock: LegalIntelligenceSource = {
  async listUpdates(q) {
    await delay();
    return page(
      updates.filter(
        (u) =>
          (!q.types || q.types.includes(u.type)) &&
          (!q.category || u.category === q.category) &&
          matches(`${u.title} ${u.summary}`, q.search),
      ),
      q,
    );
  },
  async getUpdate(id) {
    await delay();
    const found = updates.find((u) => u.id === id);
    if (!found) throw new Error("Not found");
    return found;
  },
  async listCases(q) {
    await delay();
    return page(
      cases.filter(
        (c) =>
          (!q.category || c.category === q.category) &&
          matches(`${c.title} ${c.caseNumber} ${c.summary}`, q.search),
      ),
      q,
    );
  },
  async getCase(id) {
    await delay();
    const found = cases.find((c) => c.id === id);
    if (!found) throw new Error("Not found");
    return found;
  },
};
