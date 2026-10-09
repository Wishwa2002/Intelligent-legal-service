import type { LawyerPageFilters } from "../../api/lawyersApi";

export function resetLawyerPage(filters: LawyerPageFilters, changes: Partial<LawyerPageFilters>): LawyerPageFilters {
  return { ...filters, ...changes, page: 1 };
}

export function lawyerPageRange(page: number, pageSize: number, totalItems: number) {
  return {
    start: totalItems === 0 ? 0 : (page - 1) * pageSize + 1,
    end: Math.min(page * pageSize, totalItems),
  };
}

export function lastLawyerPage(totalPages: number) {
  return Math.max(1, totalPages);
}
