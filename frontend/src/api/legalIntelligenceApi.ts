import { apiClient } from "./apiClient";

import type {
  CourtCase,
  LegalCategory,
  LegalIntelligenceSource,
  LegalUpdate,
  LegalUpdateStatus,
  LegalUpdateType,
  ListQuery,
  Paginated,
} from "../features/legal-intelligence/types";

// ============================================================
// Backend response shape
// ============================================================

interface LegalDocumentApiResponse {
  id: string;
  title: string;
  documentType: string;
  actNumber?: string | null;
  publishedDate?: string | null;
  officialUrl?: string | null;

  // Only returned from GET /api/legal-documents/{id}
  fullText?: string;

  summary?: string | null;
  sourceName: string;
  externalId?: string | null;
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

// ============================================================
// Mapping helpers
// ============================================================

function mapDocumentType(
  documentType: string
): LegalUpdateType {
  const value = documentType.toLowerCase();

  if (value.includes("amendment")) {
    return "Amendment";
  }

  if (value.includes("bill")) {
    return "Bill";
  }

  if (value.includes("regulation")) {
    return "Regulation";
  }

  if (value.includes("act")) {
    return "Act";
  }

  // LegalUpdateType also supports Development
  return "Development";
}

function mapCategory(
  document: LegalDocumentApiResponse
): LegalCategory {
  const text = `
    ${document.title}
    ${document.documentType}
    ${document.summary ?? ""}
  `.toLowerCase();

  if (
    text.includes("constitution") ||
    text.includes("constitutional")
  ) {
    return "Constitutional";
  }

  if (
    text.includes("criminal") ||
    text.includes("penal") ||
    text.includes("bail")
  ) {
    return "Criminal";
  }

  if (
    text.includes("employment") ||
    text.includes("labour") ||
    text.includes("labor")
  ) {
    return "Employment";
  }

  if (
    text.includes("commercial") ||
    text.includes("company") ||
    text.includes("corporate") ||
    text.includes("business")
  ) {
    return "Commercial";
  }

  if (text.includes("tax")) {
    return "Tax";
  }

  if (
    text.includes("property") ||
    text.includes("land") ||
    text.includes("lease")
  ) {
    return "Property";
  }

  if (
    text.includes("family") ||
    text.includes("divorce") ||
    text.includes("custody")
  ) {
    return "Family";
  }

  if (
    text.includes("environment") ||
    text.includes("environmental")
  ) {
    return "Environmental";
  }

  if (
    text.includes("civil")
  ) {
    return "Civil";
  }

  return "Other";
}

function mapStatus(
  document: LegalDocumentApiResponse
): LegalUpdateStatus {
  const type = document.documentType.toLowerCase();

  if (type.includes("bill")) {
    return "Proposed";
  }

  // The documents currently stored in LegalDocuments
  // are published legal instruments.
  return "Enacted";
}

function mapLegalDocumentToUpdate(
  document: LegalDocumentApiResponse
): LegalUpdate {
  return {
    id: document.id,

    title: document.title,

    type: mapDocumentType(
      document.documentType
    ),

    category: mapCategory(document),

    summary:
      document.summary?.trim() ||
      "No summary is currently available.",

    // Full extracted Act/law text is shown in detail view.
    details:
      document.fullText?.trim() ||
      document.summary?.trim() ||
      undefined,

    publishedDate:
      document.publishedDate ||
      document.createdAt,

    sourceName:
      document.sourceName,

    sourceUrl:
      document.officialUrl || "",

    status: mapStatus(document),

    related: [],
  };
}

// ============================================================
// Filtering
// ============================================================

function filterUpdates(
  updates: LegalUpdate[],
  query: ListQuery
): LegalUpdate[] {
  let result = [...updates];

  if (query.search?.trim()) {
    const search =
      query.search.trim().toLowerCase();

    result = result.filter((item) =>
      [
        item.title,
        item.summary,
        item.details ?? "",
        item.category,
        item.type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  if (query.category) {
    result = result.filter(
      (item) =>
        item.category === query.category
    );
  }

  if (
    query.types &&
    query.types.length > 0
  ) {
    result = result.filter((item) =>
      query.types!.includes(item.type)
    );
  }

  return result;
}

// ============================================================
// Pagination
// ============================================================

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): Paginated<T> {
  const start =
    (page - 1) * pageSize;

  const end =
    start + pageSize;

  return {
    items: items.slice(start, end),
    total: items.length,
    page,
    pageSize,
  };
}

// ============================================================
// API
// ============================================================

export const legalIntelligenceApi:
  LegalIntelligenceSource = {

  // ----------------------------------------------------------
  // Legal updates / Acts / Laws
  // ----------------------------------------------------------

  listUpdates: async (
    query,
    signal
  ): Promise<Paginated<LegalUpdate>> => {
    const response =
      await apiClient.get<
        LegalDocumentApiResponse[]
      >(
        "/api/legal-documents",
        {
          signal,
        }
      );

    const updates =
      response.data
        .map(mapLegalDocumentToUpdate)
        .sort(
          (a, b) =>
            new Date(
              b.publishedDate
            ).getTime() -
            new Date(
              a.publishedDate
            ).getTime()
        );

    const filtered =
      filterUpdates(
        updates,
        query
      );

    const page =
      query.page ?? 1;

    const pageSize =
      query.pageSize ?? 6;

    return paginate(
      filtered,
      page,
      pageSize
    );
  },

  getUpdate: async (
    id,
    signal
  ): Promise<LegalUpdate> => {
    const response =
      await apiClient.get<
        LegalDocumentApiResponse
      >(
        `/api/legal-documents/${encodeURIComponent(
          id
        )}`,
        {
          signal,
        }
      );

    return mapLegalDocumentToUpdate(
      response.data
    );
  },

  // ----------------------------------------------------------
  // Court cases
  //
  // Backend endpoint will be implemented later.
  // For now return an empty result so the frontend doesn't fail.
  // ----------------------------------------------------------

  listCases: async (
    query
  ): Promise<Paginated<CourtCase>> => {
    return {
      items: [],
      total: 0,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 6,
    };
  },

  getCase: async (
    id
  ): Promise<CourtCase> => {
    throw new Error(
      `Court case '${id}' is not available because the court case API has not been implemented yet.`
    );
  },
};