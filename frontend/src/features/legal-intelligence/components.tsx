import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePagedList } from "./hooks";
import { LEGAL_INTELLIGENCE_PATHS } from "./paths";
import {
  LAW_TYPES,
  LEGAL_CATEGORIES,
  type CourtCase,
  type LegalCategory,
  type LegalUpdate,
  type ListQuery,
  type Paginated,
} from "./types";

/* ---------- helpers ---------- */

export function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Only allow http(s) links coming from backend data. */
export function safeUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const isLaw = (u: LegalUpdate) => (LAW_TYPES as readonly string[]).includes(u.type);

/* ---------- shared UI ---------- */

export function SourceLine({ name, url }: { name?: string; url?: string }) {
  const href = safeUrl(url);
  const label = name || "Source";
  return (
    <p className="text-xs text-slate-soft">
      <span className="font-mono uppercase tracking-wider">Source: </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-navy-900 underline decoration-gold underline-offset-2 hover:text-gold-dark"
        >
          {label}
        </a>
      ) : (
        <span className="font-medium text-navy-900">{label}</span>
      )}
    </p>
  );
}

export function SummaryNotice() {
  return (
    <p className="rounded-xl border border-navy-100 bg-white px-4 py-3 text-xs leading-relaxed text-slate-soft">
      Summaries are AI-generated overviews of source material. They are not the
      original legal document and are not legal advice. Always refer to the
      official source.
    </p>
  );
}

export function Meta({ parts }: { parts: (string | null | undefined)[] }) {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
      {parts.filter(Boolean).join(" • ")}
    </p>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-6 transition-colors duration-200 hover:border-gold">
      {children}
    </article>
  );
}

/* ---------- cards ---------- */

export function UpdateCard({ item }: { item: LegalUpdate }) {
  return (
    <CardShell>
      <Meta parts={[item.type, item.category, formatDate(item.publishedDate)]} />
      <h3 className="mt-3 font-display text-lg font-semibold text-navy-900">
        {item.title}
      </h3>
      <p className="mt-3 line-clamp-4 text-sm text-slate-soft">{item.summary}</p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
        <SourceLine name={item.sourceName} url={item.sourceUrl} />
        <Link
          to={LEGAL_INTELLIGENCE_PATHS.update(item.id)}
          className="text-sm font-semibold text-navy-900 hover:text-gold-dark"
        >
          {isLaw(item) ? "View Details" : "Read More"} →
        </Link>
      </div>
    </CardShell>
  );
}

export function CaseCard({ item }: { item: CourtCase }) {
  return (
    <CardShell>
      <Meta parts={[item.court, item.caseNumber, item.category]} />
      <h3 className="mt-3 font-display text-lg font-semibold text-navy-900">
        {item.title}
      </h3>
      <p className="mt-3 line-clamp-4 text-sm text-slate-soft">{item.summary}</p>
      {item.decision && (
        <p className="mt-3 text-sm text-navy-900">
          <span className="font-semibold">Outcome: </span>
          {item.decision}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-soft">
        Decision Date: {formatDate(item.decisionDate)}
      </p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
        <SourceLine name={item.sourceName} url={item.sourceUrl} />
        <Link
          to={LEGAL_INTELLIGENCE_PATHS.court(item.id)}
          className="text-sm font-semibold text-navy-900 hover:text-gold-dark"
        >
          View Case →
        </Link>
      </div>
    </CardShell>
  );
}

/* ---------- states ---------- */

export function CardSkeletons({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-navy-100 bg-white p-6">
          <div className="h-3 w-1/2 rounded bg-navy-100" />
          <div className="mt-4 h-5 w-3/4 rounded bg-navy-100" />
          <div className="mt-4 h-3 w-full rounded bg-navy-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-navy-100" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function StatePanel({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-dashed border-navy-100 bg-white px-6 py-12 text-center"
    >
      <p className="font-display text-lg font-semibold text-navy-900">{title}</p>
      {message && <p className="mt-2 text-sm text-slate-soft">{message}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-900/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ---------- controls ---------- */

export type SectionFilter = "all" | "laws" | "cases" | "updates";

const TABS: { key: SectionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "laws", label: "New Laws" },
  { key: "cases", label: "Court Cases" },
  { key: "updates", label: "Legal Updates" },
];

export function FilterBar({
  filter,
  onFilter,
  category,
  onCategory,
}: {
  filter: SectionFilter;
  onFilter: (f: SectionFilter) => void;
  category: LegalCategory | "";
  onCategory: (c: LegalCategory | "") => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Content type">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={filter === t.key}
            onClick={() => onFilter(t.key)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === t.key
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-navy-100 bg-white text-navy-900 hover:border-gold"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-soft">
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => onCategory(e.target.value as LegalCategory | "")}
          className="rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-900"
        >
          <option value="">All categories</option>
          {LEGAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor="li-search" className="sr-only">
        Search laws, cases and legal developments
      </label>
      <input
        id="li-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search laws, cases and legal developments..."
        className="w-full rounded-xl border border-navy-100 bg-white px-5 py-3.5 text-base text-navy-900 placeholder:text-slate-soft focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </div>
  );
}

/* ---------- generic section ---------- */

export function LegalSection<T extends { id: string }>({
  icon,
  title,
  fetchPage,
  query,
  isFiltered,
  emptyMessage,
  renderItem,
}: {
  icon: string;
  title: string;
  fetchPage: (q: ListQuery, signal: AbortSignal) => Promise<Paginated<T>>;
  query: Omit<ListQuery, "page">;
  isFiltered: boolean;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
}) {
  const list = usePagedList<T>(fetchPage, query);

  return (
    <section className="mt-14" aria-labelledby={`li-${title}`}>
      <h2
        id={`li-${title}`}
        className="font-display text-2xl font-semibold text-navy-900"
      >
        <span aria-hidden="true">{icon} </span>
        {title}
      </h2>

      <div className="mt-6">
        {list.status === "loading" && <CardSkeletons />}

        {list.status === "error" && (
          <StatePanel
            title="We couldn't load this section"
            message={list.error ?? undefined}
            action={{ label: "Try again", onClick: list.retry }}
          />
        )}

        {list.status === "ready" && list.items.length === 0 && (
          <StatePanel
            title={isFiltered ? "No results match your search" : "Nothing published yet"}
            message={isFiltered ? "Try different keywords or clear the filters." : emptyMessage}
          />
        )}

        {list.status === "ready" && list.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {list.items.map((item) => (
                <div key={item.id}>{renderItem(item)}</div>
              ))}
            </div>
            {list.moreFailed && (
              <p className="mt-4 text-center text-sm text-slate-soft" role="alert">
                Couldn't load more. Please try again.
              </p>
            )}
            {list.hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={list.loadMore}
                  disabled={list.loadingMore}
                  className="rounded-full border border-navy-900 px-8 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white disabled:opacity-60"
                >
                  {list.loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
