export const LEGAL_CATEGORIES = [
  "Constitutional",
  "Criminal",
  "Civil",
  "Employment",
  "Commercial",
  "Tax",
  "Property",
  "Family",
  "Environmental",
  "Other",
] as const;
export type LegalCategory = (typeof LEGAL_CATEGORIES)[number];

/** Items shown in the "New Laws" section. */
export const LAW_TYPES = ["Act", "Bill", "Amendment", "Regulation"] as const;
export type LawType = (typeof LAW_TYPES)[number];

/** "Development" items are shown in the "Legal Updates" section. */
export type LegalUpdateType = LawType | "Development";

export type LegalUpdateStatus =
  | "Proposed"
  | "Enacted"
  | "In force"
  | "Repealed"
  | "Reported";

export interface RelatedRef {
  id: string;
  kind: "update" | "case";
  title: string;
}

export interface LegalUpdate {
  id: string;
  title: string;
  type: LegalUpdateType;
  category: LegalCategory;
  summary: string;
  /** Longer source-based description for the detail view. */
  details?: string;
  publishedDate: string; // ISO 8601
  effectiveDate?: string; // ISO 8601
  sourceName: string;
  sourceUrl: string;
  status: LegalUpdateStatus;
  related?: RelatedRef[];
}

export interface CourtCase {
  id: string;
  caseNumber: string;
  title: string;
  court: string;
  decisionDate: string; // ISO 8601
  category: LegalCategory;
  summary: string;
  details?: string;
  decision?: string;
  sourceName?: string;
  sourceUrl: string;
  related?: RelatedRef[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListQuery {
  search?: string;
  category?: LegalCategory;
  types?: LegalUpdateType[];
  page?: number;
  pageSize?: number;
}

/**
 * Contract the backend Legal Intelligence Agent must satisfy.
 *   GET /api/legal-updates?search&category&type&page&pageSize -> Paginated<LegalUpdate>
 *   GET /api/legal-updates/{id}                               -> LegalUpdate
 *   GET /api/court-cases?search&category&page&pageSize        -> Paginated<CourtCase>
 *   GET /api/court-cases/{id}                                 -> CourtCase
 * `type` is a comma-separated list of LegalUpdateType values.
 */
export interface LegalIntelligenceSource {
  listUpdates(q: ListQuery, signal?: AbortSignal): Promise<Paginated<LegalUpdate>>;
  getUpdate(id: string, signal?: AbortSignal): Promise<LegalUpdate>;
  listCases(q: ListQuery, signal?: AbortSignal): Promise<Paginated<CourtCase>>;
  getCase(id: string, signal?: AbortSignal): Promise<CourtCase>;
}
