import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CardSkeletons,
  Meta,
  SourceLine,
  StatePanel,
  SummaryNotice,
  safeUrl,
} from "./components";
import { LEGAL_INTELLIGENCE_PATHS } from "./paths";
import type { RelatedRef } from "./types";

export interface DetailViewProps {
  status: "loading" | "error" | "ready";
  error: string | null;
  onRetry: () => void;
  meta: (string | null | undefined)[];
  title: string;
  facts: { label: string; value?: string | null }[];
  summary: string;
  details?: string;
  sourceName?: string;
  sourceUrl: string;
  related?: RelatedRef[];
}

export function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-10">
        <Link
          to={LEGAL_INTELLIGENCE_PATHS.home}
          className="text-sm font-semibold text-navy-900 hover:text-gold-dark"
        >
          ← Back to Legal Intelligence
        </Link>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function DetailLoadState({
  status,
  error,
  onRetry,
}: Pick<DetailViewProps, "status" | "error" | "onRetry">) {
  if (status === "loading") return <CardSkeletons count={1} />;
  return (
    <StatePanel
      title="We couldn't load this item"
      message={error ?? undefined}
      action={{ label: "Try again", onClick: onRetry }}
    />
  );
}

export function DetailBody(p: Omit<DetailViewProps, "status" | "error" | "onRetry">) {
  const sourceHref = safeUrl(p.sourceUrl);
  return (
    <article>
      <Meta parts={p.meta} />
      <h1 className="mt-3 font-display text-3xl font-semibold text-navy-900">
        {p.title}
      </h1>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-navy-100 p-5 sm:grid-cols-2">
        {p.facts
          .filter((f) => f.value)
          .map((f) => (
            <div key={f.label}>
              <dt className="font-mono text-xs uppercase tracking-wider text-slate-soft">
                {f.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-navy-900">{f.value}</dd>
            </div>
          ))}
      </dl>

      <h2 className="mt-10 font-display text-xl font-semibold text-navy-900">
        Summary
      </h2>
      <p className="mt-3 whitespace-pre-line text-slate-soft">{p.summary}</p>

      {p.details && (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold text-navy-900">
            Detailed information
          </h2>
          <p className="mt-3 whitespace-pre-line text-slate-soft">{p.details}</p>
        </>
      )}

      <div className="mt-8">
        <SummaryNotice />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-navy-100 pt-6">
        <SourceLine name={p.sourceName} url={p.sourceUrl} />
        {sourceHref && (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-light"
          >
            View original document →
          </a>
        )}
      </div>

      {p.related && p.related.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold text-navy-900">
            Related
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {p.related.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <Link
                  to={
                    r.kind === "case"
                      ? LEGAL_INTELLIGENCE_PATHS.court(r.id)
                      : LEGAL_INTELLIGENCE_PATHS.update(r.id)
                  }
                  className="text-sm font-medium text-navy-900 underline decoration-gold underline-offset-2 hover:text-gold-dark"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
