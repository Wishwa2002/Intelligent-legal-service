import type { LawyerServicesSummary } from "../../api/lawyersApi";

type CoverageRow = LawyerServicesSummary["coverage"][number];

export function coverageWarnings(row: CoverageRow): string[] {
  const warnings: string[] = [];
  if (row.activeLawyers === 0) warnings.push("No Active Lawyers");
  if (row.legalServices === 0) warnings.push("No Legal Services");
  if (row.futureAvailabilityCount === 0) warnings.push("No Available Slots");
  return warnings;
}
