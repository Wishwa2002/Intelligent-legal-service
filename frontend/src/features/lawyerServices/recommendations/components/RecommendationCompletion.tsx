import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SummaryField } from "./InterpretationSummary";
import { formatDate, formatTime, primaryButton, secondaryButton, surface, type RecommendationWorkflowModel } from "./recommendationUI";
export function RecommendationCompletion({ workflow: w }: { workflow: RecommendationWorkflowModel }) {
  if (!w.result) return null;
  const missingDetails = w.error ? "Details unavailable" : "Loading appointment details...";
  const lawyer = w.result.recommendations.find(item => item.lawyerId === w.result?.approvedLawyerId);
  return <section aria-label="Appointment created" className={surface}>
    <CheckCircle2 size={32} className="text-emerald-700" aria-hidden="true" /><h3 data-recommendation-focus tabIndex={-1} className="mt-3 text-xl font-bold text-slate-900 focus:outline-none">Appointment Created</h3><p role="status" className="mt-2 text-sm text-slate-500">Human approval completed. The appointment has been saved.</p>
    <dl className="mt-6 grid gap-5 sm:grid-cols-2"><SummaryField label="Lawyer" value={w.appointment?.lawyerName || lawyer?.fullName || missingDetails} /><SummaryField label="Client" value={w.appointment?.customerName || missingDetails} /><SummaryField label="Date" value={w.appointment ? formatDate(w.appointment.date) : w.result.date ? formatDate(w.result.date) : missingDetails} /><SummaryField label="Time" value={w.appointment ? `${formatTime(w.appointment.startTime)}–${formatTime(w.appointment.endTime)}` : missingDetails} /><SummaryField label="Practice Area" value={w.result.parsedRequirement?.categoryName || "Unrecorded"} /><SummaryField label="Legal Service" value={w.result.parsedRequirement?.legalServiceName || "Not specifically identified"} /><SummaryField label="Booking Source" value={w.appointment?.appointmentSource === "AI_FRONT_DESK" ? "Front Desk · AI Assisted" : "Not recorded"} /><SummaryField label="Workflow" value={`#${w.result.workflowId}`} /><SummaryField label="Appointment ID" value={w.result.appointmentId || "Unrecorded"} /></dl>
    <div className="mt-6 flex flex-wrap gap-3"><Link to={`/admin/appointments?appointment=${encodeURIComponent(w.result.appointmentId || "")}`} className={`${primaryButton} inline-flex items-center`}>View Appointment</Link><button type="button" className={secondaryButton} onClick={() => w.clearWorkflow()}>Start New Client Intake</button></div>
  </section>;
}
