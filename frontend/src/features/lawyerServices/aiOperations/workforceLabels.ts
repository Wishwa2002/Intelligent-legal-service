import type { WorkforceArea } from "./services/workforceApi";
export const statusLabels: Record<WorkforceArea["status"], string> = {
  HEALTHY: "Healthy", WATCH: "Watch", CAPACITY_CONCERN: "Capacity Concern", NO_ACTIVE_LAWYERS: "No Active Lawyers",
};
export const reasonText: Record<string, string> = {
  BELOW_MINIMUM_LAWYERS: "Below configured minimum lawyer count.",
  BELOW_TARGET_LAWYERS: "Below the preferred staffing target; this is a planning signal only.",
  NO_ACTIVE_LAWYERS: "No active lawyers are recorded in this Practice Area.",
  HIGH_DEMAND_LOW_AVAILABILITY: "Recorded demand meets or exceeds upcoming slot capacity under the configured thresholds.",
  LOW_FUTURE_CAPACITY: "Upcoming available slots are below the configured capacity floor or no usable slots are recorded.",
  DEMAND_APPROACHING_CAPACITY: "Recorded demand is approaching upcoming capacity under the configured thresholds.",
  CAPACITY_WITHIN_CONFIGURED_RULES: "No concern is detected under the configured capacity rules.",
  RECRUITMENT_ALREADY_ACTIVE: "Recruitment already in progress for this Practice Area.",
};
