import { Scale, ArrowRight } from "lucide-react";
import type { RecommendationResult } from "../../../../api/recommendationsApi";
import { primaryButton, secondaryButton, surface } from "./recommendationUI";
type Candidate = RecommendationResult["recommendations"][number];
export function RecommendationMatches({ result, onSelect }: { result: RecommendationResult; onSelect: (id: string) => void }) {
  const [top, ...others] = result.recommendations;
  if (!top) return null;
  return <section aria-label="Recommended matches" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 data-recommendation-focus tabIndex={-1} className="text-lg font-bold focus:outline-none">Recommended Matches</h3><span className="text-xs text-slate-500">{result.recommendations.length} eligible {result.recommendations.length === 1 ? "match" : "matches"}</span></div>
    <div aria-label="Eligibility rules" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600"><span className="font-bold uppercase tracking-wide">Eligibility</span><span>✓ Active lawyer</span><span>✓ Correct Practice Area</span><span>{result.date ? "✓ Requested-date availability" : "Availability Not Filtered"}</span></div>
    <TopRecommendationCard candidate={top} onSelect={onSelect} />
    {others.length > 0 && <div className={`${surface} !p-0`}><h4 className="border-b border-slate-200 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Other Eligible Matches</h4><ol className="divide-y divide-slate-100">{others.map((candidate, index) => <RecommendationCandidateRow key={candidate.lawyerId} candidate={candidate} rank={index + 2} onSelect={onSelect} />)}</ol></div>}
    <RecommendationRankingInfo hasDate={!!result.date} />
  </section>;
}
export function TopRecommendationCard({ candidate, onSelect }: { candidate: Candidate; onSelect: (id: string) => void }) {
  return <article aria-label="Top recommended match" className={`${surface} border-l-4 !border-l-amber-500`}>
    <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Top Recommended Match</p>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Scale size={22} aria-hidden="true" /></span><div className="min-w-0"><h4 className="break-words text-xl font-bold">{candidate.fullName || "Practitioner profile unavailable"}</h4><p className="mt-1 text-sm text-slate-500">{candidate.qualification}</p><p className="mt-2 text-sm font-medium">{candidate.practiceArea}</p><p className="mt-1 text-xs text-slate-500">{candidate.yearsExperience ?? "Unrecorded"} years recorded experience</p></div></div><Points candidate={candidate} large /></div>
    <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-bold text-slate-700">Why this match</p><p className="mt-2 text-sm leading-relaxed text-slate-600">{candidate.reason}</p></div>
    <button type="button" onClick={() => onSelect(candidate.lawyerId)} className={`${primaryButton} mt-5 inline-flex items-center gap-2`}>Select Lawyer<ArrowRight size={15} aria-hidden="true" /></button>
  </article>;
}
export function RecommendationCandidateRow({ candidate, rank, onSelect }: { candidate: Candidate; rank: number; onSelect: (id: string) => void }) {
  return <li className="p-4 sm:px-5"><div className="flex flex-wrap items-center gap-4"><span className="text-sm font-bold text-slate-400">#{rank}</span><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-bold">{candidate.fullName || "Practitioner profile unavailable"}</h4><p className="mt-1 text-xs text-slate-500">{candidate.practiceArea} · {candidate.yearsExperience ?? "Unrecorded"} years experience</p></div><Points candidate={candidate} /><button type="button" aria-label={`Select ${candidate.fullName || `match ${rank}`}`} onClick={() => onSelect(candidate.lawyerId)} className={secondaryButton}>Select Lawyer</button></div><details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer py-1 font-semibold focus-visible:outline-2 focus-visible:outline-amber-600">View match details</summary><p className="mt-2">{candidate.qualification}</p><p className="mt-1 leading-relaxed">{candidate.reason}</p></details></li>;
}
function Points({ candidate, large = false }: { candidate: Candidate; large?: boolean }) {
  return <div aria-label={`${candidate.score} Recommendation Points`} className={large ? "rounded-lg bg-slate-50 px-5 py-3 text-center" : "text-right"}><strong className={large ? "block text-3xl font-bold tabular-nums" : "block text-base font-bold tabular-nums"}>{candidate.score}</strong><span className="block text-xs text-slate-500">Recommendation Points</span></div>;
}
export function RecommendationRankingInfo({ hasDate }: { hasDate: boolean }) {
  return <div className="rounded-lg border border-slate-200 p-4 text-xs text-slate-600"><p>Recommendation Points compare eligible candidates using verified system data. They do not measure lawyer quality or legal outcome probability.</p><details className="mt-3"><summary className="cursor-pointer py-1 font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-amber-600">How recommendations are ranked</summary><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><h4 className="font-bold uppercase tracking-wide">Eligibility</h4><ul className="mt-2 space-y-1"><li>✓ Active lawyer</li><li>✓ Correct Practice Area</li><li>{hasDate ? "✓ Requested-date availability" : "Availability Not Filtered"}</li></ul></div><div><h4 className="font-bold uppercase tracking-wide">Ranking</h4><p className="mt-2 leading-relaxed">Points equal recorded years of experience (0–70), sorted highest first. Ties use a stable lawyer ID order. Availability is an eligibility gate when a date is supplied.</p></div></div><p className="mt-3 border-t border-slate-200 pt-3">AI interprets the requirement. The system retrieves and ranks lawyers.</p></details></div>;
}
