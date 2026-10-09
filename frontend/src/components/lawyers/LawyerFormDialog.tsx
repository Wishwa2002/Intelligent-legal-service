import { defaultSchedule, scheduleError, schedulePayload } from "../../api/schedulingApi";
import { WorkingScheduleEditor } from "./WorkingScheduleEditor";
import { LawyerSchedulingPanel } from "./LawyerSchedulingPanel";
import { useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { lawyerSchema, type LawyerFormValues } from "../../schemas/lawyerSchema";
import type { Lawyer, LawyerSpecialization, CreateLawyerPayload } from "../../api/lawyersApi";

export function LawyerFormDialog({ lawyer, specializations, onClose, onSave }: {
  lawyer: Lawyer | null; specializations: LawyerSpecialization[];
  onClose: () => void; onSave: (payload: CreateLawyerPayload) => Promise<void>;
}) {
  const saving = useRef(false);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting: submitting } } = useForm<LawyerFormValues>({
    defaultValues: { name: lawyer?.name ?? "", email: lawyer?.email ?? "", phoneNumber: lawyer?.phoneNumber ?? "",
      qualification: lawyer?.qualification ?? "", experience: lawyer?.experience ?? 0,
      licenseNumber: lawyer?.licenseNumber ?? "", profileDescription: lawyer?.profileDescription ?? "",
      category: lawyer?.specializations[0]?.name ?? specializations[0]?.name ?? "", password: "" },
    resolver: values => {
      const parsed = lawyerSchema.safeParse(values);
      if (parsed.success) return { values: parsed.data, errors: {} };
      const fieldErrors: FieldErrors<LawyerFormValues> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LawyerFormValues;
        fieldErrors[field] = { type: "validation", message: issue.message };
      }
      return { values: {}, errors: fieldErrors };
    },
  });
  const save = async (values: LawyerFormValues) => {
    if (saving.current) return;
    const area = specializations.find(item => item.name === values.category);
    if (!area) { setFormError("Select an existing Practice Area."); return; }
    if (!lawyer && scheduleError(schedule)) { setFormError(scheduleError(schedule)); return; }
    saving.current = true; setFormError("");
    try { await onSave({ ...values, specializationId: area.specializationId, ...(!lawyer ? { workingSchedule: schedulePayload(schedule) } : {}) }); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : "Unable to save lawyer."); }
    finally { saving.current = false; }
  };
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="lawyer-form-title" className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 id="lawyer-form-title" className="text-base font-bold text-slate-900">{lawyer ? "Edit Legal Counsel" : "Add New Legal Counsel"}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lawyer ? "Update profile and login email; account permissions and password stay unchanged." : "Assign practitioner to one Practice Area and create their portal credentials"}
                </p>
              </div>
              <button
                aria-label="Close lawyer form" disabled={submitting}
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto">
            <form noValidate onSubmit={event => { void handleSubmit(save)(event); }} className="p-6 space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="lawyer-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name & Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Advocate Nimal Fernando"
                  id="lawyer-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "lawyer-name-error" : undefined}
                  {...register("name")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {errors.name && <p id="lawyer-name-error" role="alert" className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lawyer-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address (Login Username) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="lawyer@legalease.com"
                    id="lawyer-email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "lawyer-email-error" : undefined}
                  {...register("email")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                {errors.email && <p id="lawyer-email-error" role="alert" className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="lawyer-phoneNumber" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+94 77 123 4567"
                    id="lawyer-phoneNumber" aria-invalid={!!errors.phoneNumber} aria-describedby={errors.phoneNumber ? "lawyer-phoneNumber-error" : undefined}
                  {...register("phoneNumber")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                {errors.phoneNumber && <p id="lawyer-phoneNumber-error" role="alert" className="mt-1 text-xs text-red-700">{errors.phoneNumber.message}</p>}
                </div>
              </div>

              {/* LAWYER CATEGORY (STRICT SINGLE SELECTION) */}
              <div>
                <label htmlFor="lawyer-category" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Authorized Practice Area (One Area) *
                </label>
                <select
                  required
                  id="lawyer-category" aria-invalid={!!errors.category} aria-describedby={errors.category ? "lawyer-category-error" : undefined}
                  {...register("category")}
                  className="w-full px-3 py-2.5 border-2 border-amber-300 bg-amber-50/40 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="" disabled>Select Practice Area</option>
                  {specializations.map(s => s.name).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && <p id="lawyer-category-error" role="alert" className="mt-1 text-xs text-red-700">{errors.category.message}</p>}
                <p className="text-[11px] text-slate-500 mt-1">
                  Lawyer will be listed under this Practice Area for client searches and consultations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="lawyer-qualification" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LL.B (Hons), Attorney-at-Law"
                    id="lawyer-qualification" aria-invalid={!!errors.qualification} aria-describedby={errors.qualification ? "lawyer-qualification-error" : undefined}
                  {...register("qualification")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                {errors.qualification && <p id="lawyer-qualification-error" role="alert" className="mt-1 text-xs text-red-700">{errors.qualification.message}</p>}
                </div>
                <div>
                  <label htmlFor="lawyer-experience" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Years Exp.
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    id="lawyer-experience" aria-invalid={!!errors.experience} aria-describedby={errors.experience ? "lawyer-experience-error" : undefined}
                  {...register("experience", { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                {errors.experience && <p id="lawyer-experience-error" role="alert" className="mt-1 text-xs text-red-700">{errors.experience.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lawyer-licenseNumber" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bar / License Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SC/AT/2020/1234"
                    id="lawyer-licenseNumber" aria-invalid={!!errors.licenseNumber} aria-describedby={errors.licenseNumber ? "lawyer-licenseNumber-error" : undefined}
                  {...register("licenseNumber")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                {errors.licenseNumber && <p id="lawyer-licenseNumber-error" role="alert" className="mt-1 text-xs text-red-700">{errors.licenseNumber.message}</p>}
                </div>
                {!lawyer && <div>
                  <label htmlFor="lawyer-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Portal Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    id="lawyer-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "lawyer-password-error" : undefined}
                  {...register("password")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                {errors.password && <p id="lawyer-password-error" role="alert" className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
                </div>}
              </div>

              <div>
                <label htmlFor="lawyer-profileDescription" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Professional Profile Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of experience, trial history, corporate advisory background..."
                  id="lawyer-profileDescription" aria-invalid={!!errors.profileDescription} aria-describedby={errors.profileDescription ? "lawyer-profileDescription-error" : undefined}
                  {...register("profileDescription")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {errors.profileDescription && <p id="lawyer-profileDescription-error" role="alert" className="mt-1 text-xs text-red-700">{errors.profileDescription.message}</p>}
              </div>

              {!lawyer && <WorkingScheduleEditor value={schedule} onChange={setSchedule} disabled={submitting} />}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : lawyer ? "Save Changes" : "Confirm & Add Lawyer"}
                </button>
              </div>
            </form>
            {lawyer && <LawyerSchedulingPanel key={lawyer.lawyerId} lawyerId={lawyer.lawyerId} />}
            </div>
          </div>
        </div>
  );
}
