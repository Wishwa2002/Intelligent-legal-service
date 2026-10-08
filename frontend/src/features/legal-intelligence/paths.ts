export const LEGAL_INTELLIGENCE_PATHS = {
  home: "/legal-intelligence",
  update: (id: string) => `/legal-intelligence/updates/${encodeURIComponent(id)}`,
  court: (id: string) => `/legal-intelligence/cases/${encodeURIComponent(id)}`,
} as const;
