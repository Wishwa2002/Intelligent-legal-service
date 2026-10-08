import { legalIntelligenceApi } from "../../api/legalIntelligenceApi";
import { legalIntelligenceMock } from "./mock";

export const IS_MOCK =
  import.meta.env.VITE_LEGAL_INTELLIGENCE_USE_MOCK === "true";

/** Single switch point between the real backend and dev placeholders. */
export const legalIntelligenceSource = IS_MOCK
  ? legalIntelligenceMock
  : legalIntelligenceApi;
