import React, { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  appointmentsApi,
  type AppointmentItem,
  type AppointmentDetails,
  type LawyerItem,
  type AvailabilitySlotItem,
} from "../../api/appointmentsApi";

const STATUS_CONFIG: Record<string, { label: string; className: string; bgDot: string }> = {
  Requested: {
    label: "Requested",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    bgDot: "bg-amber-500",
  },
  Confirmed: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-800 border-blue-200",
    bgDot: "bg-blue-500",
  },
  Rescheduled: {
    label: "Rescheduled",
    className: "bg-indigo-50 text-indigo-800 border-indigo-200",
    bgDot: "bg-indigo-500",
  },
  Completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    bgDot: "bg-emerald-500",
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    bgDot: "bg-slate-400",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-800 border-rose-200",
    bgDot: "bg-rose-500",
  },
};

const FILTER_TABS = [
  { value: "All", label: "All Appointments" },
  { value: "Requested", label: "Requested" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Completed", label: "Completed" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
];

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [lawyers, setLawyers] = useState<LawyerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState("All");
  const [selectedLawyerId, setSelectedLawyerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Action modals
  const [detailModalItem, setDetailModalItem] = useState<AppointmentDetails | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  // Reject dialog
  const [rejectingItem, setRejectingItem] = useState<AppointmentItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);

  // Reschedule dialog
  const [reschedulingItem, setReschedulingItem] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailabilitySlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [apptData, lawyerData] = await Promise.all([
        appointmentsApi.getAllAppointments(),
        appointmentsApi.getLawyers(),
      ]);
      setAppointments(apptData);
      setLawyers(lawyerData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load appointments data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered list
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      // Tab filter
      if (activeTab !== "All" && a.status.toLowerCase() !== activeTab.toLowerCase()) {
        return false;
      }
      // Lawyer filter
      if (selectedLawyerId && a.lawyerId !== selectedLawyerId) {
        return false;
      }
      // Date filter
      if (dateFilter && a.date !== dateFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = a.customerName?.toLowerCase().includes(query);
        const matchesLawyer = a.lawyerName?.toLowerCase().includes(query);
        const matchesCategory = a.legalServiceCategory?.toLowerCase().includes(query);
        const matchesDesc = a.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesLawyer && !matchesCategory && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [appointments, activeTab, selectedLawyerId, dateFilter, searchTerm]);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: appointments.length,
      requested: appointments.filter((a) => a.status === "Requested").length,
      confirmed: appointments.filter((a) => a.status === "Confirmed" || a.status === "Rescheduled").length,
      completed: appointments.filter((a) => a.status === "Completed").length,
      cancelledOrRejected: appointments.filter((a) => a.status === "Cancelled" || a.status === "Rejected").length,
    };
  }, [appointments]);

  // View Details & History
  const handleOpenDetails = async (id: string) => {
    try {
      setLoadingDetailsId(id);
      const details = await appointmentsApi.getAppointmentById(id);
      setDetailModalItem(details);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to load appointment details.");
    } finally {
      setLoadingDetailsId(null);
    }
  };

  // Confirm appointment
  const handleConfirm = async (item: AppointmentItem) => {
    if (!window.confirm(`Are you sure you want to confirm appointment for ${item.customerName}?`)) return;
    try {
      setActionProcessing(true);
      await appointmentsApi.confirmAppointment(item.appointmentId, "Confirmed by administration.");
      showToast(`Appointment for ${item.customerName} successfully Confirmed.`);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to confirm appointment.");
    } finally {
      setActionProcessing(false);
    }
  };

  // Complete appointment
  const handleComplete = async (item: AppointmentItem) => {
    if (!window.confirm(`Mark consultation for ${item.customerName} with ${item.lawyerName} as Completed?`)) return;
    try {
      setActionProcessing(true);
      await appointmentsApi.completeAppointment(item.appointmentId, "Consultation session concluded.");
      showToast(`Appointment marked as Completed.`);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to complete appointment.");
    } finally {
      setActionProcessing(false);
    }
  };

  // Open Reject Dialog
  const handleOpenReject = (item: AppointmentItem) => {
    setRejectingItem(item);
    setRejectReason("");
  };

  // Submit Reject
  const handleSubmitReject = async () => {
    if (!rejectingItem) return;
    try {
      setActionProcessing(true);
      await appointmentsApi.rejectAppointment(rejectingItem.appointmentId, rejectReason || "Declined by administration.");
      showToast(`Appointment has been declined/rejected.`);
      setRejectingItem(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to reject appointment.");
    } finally {
      setActionProcessing(false);
    }
  };

  // Open Reschedule Dialog
  const handleOpenReschedule = async (item: AppointmentItem) => {
    setReschedulingItem(item);
    // default to tomorrow or current appointment date
    const d = item.date || new Date(Date.now() + 86400000).toISOString().split("T")[0];
    setRescheduleDate(d);
    setSelectedSlotId("");
    setRescheduleReason("");
    await fetchSlotsForDate(item.lawyerId, d);
  };

  const fetchSlotsForDate = async (lawyerId: string, date: string) => {
    try {
      setSlotsLoading(true);
      const slots = await appointmentsApi.getLawyerSlots(lawyerId, date);
      setRescheduleSlots(slots);
    } catch {
      setRescheduleSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleRescheduleDateChange = async (newDate: string) => {
    setRescheduleDate(newDate);
    setSelectedSlotId("");
    if (reschedulingItem && newDate) {
      await fetchSlotsForDate(reschedulingItem.lawyerId, newDate);
    }
  };

  // Submit Reschedule
  const handleSubmitReschedule = async () => {
    if (!reschedulingItem || !selectedSlotId) return;
    try {
      setActionProcessing(true);
      await appointmentsApi.rescheduleAppointment(
        reschedulingItem.appointmentId,
        selectedSlotId,
        rescheduleReason || "Rescheduled to a new time window."
      );
      showToast("Appointment successfully rescheduled.");
      setReschedulingItem(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to reschedule appointment.");
    } finally {
      setActionProcessing(false);
    }
  };

  const formatSlotTime = (start: string, end: string) => {
    const parse = (t: string) => {
      const parts = t.split(":");
      let h = parseInt(parts[0], 10);
      const m = parts[1] || "00";
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    };
    return `${parse(start)} – ${parse(end)}`;
  };

  return (
    <AdminLayout
      title="Booking & Appointment Management"
      subtitle="Review client consultation bookings, assign schedules, and manage decisions across legal practices."
    >
      <div className="space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-sm font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* ── Metric Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bookings</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60 shadow-sm">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Awaiting Review</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{stats.requested}</div>
          </div>
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/60 shadow-sm">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Confirmed</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{stats.confirmed}</div>
          </div>
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.completed}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Declined / Closed</div>
            <div className="text-2xl font-bold text-slate-700 mt-1">{stats.cancelledOrRejected}</div>
          </div>
        </div>

        {/* ── Filters & Controls ── */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
            {FILTER_TABS.map((tab) => {
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {tab.label}
                  {tab.value === "Requested" && stats.requested > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-bold">
                      {stats.requested}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search and Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client, lawyer, category, or legal issue..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div>
              <select
                value={selectedLawyerId}
                onChange={(e) => setSelectedLawyerId(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Lawyers</option>
                {lawyers.map((l) => (
                  <option key={l.lawyerId} value={l.lawyerId}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg"
                  title="Clear Date"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Appointments Table ── */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Loading appointments and schedules...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">
              <p className="font-semibold">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
              </svg>
              <div className="text-sm font-semibold text-slate-600">No appointments found</div>
              <div className="text-xs text-slate-400">
                Try changing your status tab or search filter to see more bookings.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Category & Lawyer</th>
                    <th className="py-3 px-4">Date & Slot</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Issue Summary</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.map((a) => {
                    const statusCfg = STATUS_CONFIG[a.status] || {
                      label: a.status,
                      className: "bg-slate-100 text-slate-600 border-slate-200",
                      bgDot: "bg-slate-400",
                    };
                    const isRequested = a.status === "Requested" || a.status === "Rescheduled";
                    const isConfirmed = a.status === "Confirmed";

                    return (
                      <tr key={a.appointmentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {a.customerName || "Customer"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{a.lawyerName}</div>
                          {a.legalServiceCategory && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {a.legalServiceCategory}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{a.date}</div>
                          <div className="text-slate-500">{formatSlotTime(a.startTime, a.endTime)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              a.consultationType === "In-Person"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-cyan-50 text-cyan-800 border-cyan-200"
                            }`}
                          >
                            <span>{a.consultationType === "In-Person" ? "🏢" : "🌐"}</span>
                            {a.consultationType || "Online"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-xs text-slate-600 line-clamp-2" title={a.description}>
                            {a.description || <span className="italic text-slate-400">No description provided</span>}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.bgDot}`}></span>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                          {/* Confirm */}
                          {isRequested && (
                            <button
                              onClick={() => handleConfirm(a)}
                              disabled={actionProcessing}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs transition-colors"
                              title="Confirm Appointment"
                            >
                              Confirm
                            </button>
                          )}

                          {/* Complete */}
                          {isConfirmed && (
                            <button
                              onClick={() => handleComplete(a)}
                              disabled={actionProcessing}
                              className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition-colors"
                              title="Mark Consultation Complete"
                            >
                              Complete
                            </button>
                          )}

                          {/* Reschedule */}
                          {(isRequested || isConfirmed) && (
                            <button
                              onClick={() => handleOpenReschedule(a)}
                              disabled={actionProcessing}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md transition-colors"
                              title="Reschedule to new slot"
                            >
                              Reschedule
                            </button>
                          )}

                          {/* Reject / Decline */}
                          {isRequested && (
                            <button
                              onClick={() => handleOpenReject(a)}
                              disabled={actionProcessing}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-colors"
                              title="Decline Appointment"
                            >
                              Decline
                            </button>
                          )}

                          {/* Details & Audit Trail */}
                          <button
                            onClick={() => handleOpenDetails(a.appointmentId)}
                            disabled={loadingDetailsId === a.appointmentId}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                            title="View Audit History"
                          >
                            {loadingDetailsId === a.appointmentId ? "Loading..." : "Audit"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Reschedule Modal ── */}
        {reschedulingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Reschedule Appointment</h3>
                <button
                  onClick={() => setReschedulingItem(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Client:</span>
                  <div className="font-semibold text-slate-800">{reschedulingItem.customerName}</div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Lawyer:</span>
                  <div className="font-semibold text-slate-800">{reschedulingItem.lawyerName}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select New Date:
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => handleRescheduleDateChange(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Available Afternoon Slot (3:00 – 5:00 PM):
                  </label>
                  {slotsLoading ? (
                    <div className="text-xs text-slate-500 py-2">Loading slots for date...</div>
                  ) : rescheduleSlots.length === 0 ? (
                    <div className="text-xs text-rose-500 py-2">No available slots for this date.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {rescheduleSlots.map((s) => {
                        const isSelected = selectedSlotId === s.slotId;
                        return (
                          <button
                            key={s.slotId}
                            type="button"
                            disabled={s.isBooked}
                            onClick={() => setSelectedSlotId(s.slotId)}
                            className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                              s.isBooked
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                            }`}
                          >
                            {formatSlotTime(s.startTime, s.endTime)}
                            {s.isBooked && <span className="block text-[10px] text-slate-400">Booked</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Reschedule Reason (Optional):
                  </label>
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    rows={2}
                    placeholder="e.g., Requested by lawyer due to emergency hearing..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReschedulingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedSlotId || actionProcessing}
                  onClick={handleSubmitReschedule}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                >
                  {actionProcessing ? "Updating..." : "Confirm New Slot"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Decline / Reject Reason Modal ── */}
        {rejectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Decline Appointment</h3>
                <button
                  onClick={() => setRejectingItem(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                You are declining the consultation for <span className="font-semibold">{rejectingItem.customerName}</span> with <span className="font-semibold">{rejectingItem.lawyerName}</span>. The booked slot will be released back to the availability pool.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Reason for Rejection:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g., Conflict of interest, counsel unavailable, or missing preliminary documentation..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionProcessing}
                  onClick={handleSubmitReject}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {actionProcessing ? "Declining..." : "Decline Appointment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Appointment Audit Detail Modal ── */}
        {detailModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Appointment Audit & Details</h3>
                  <div className="text-xs text-slate-500">ID: {detailModalItem.appointmentId}</div>
                </div>
                <button
                  onClick={() => setDetailModalItem(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Consultation Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client:</span>
                  <span className="font-semibold text-slate-900">{detailModalItem.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lawyer:</span>
                  <span className="font-semibold text-slate-900">{detailModalItem.lawyerName}</span>
                </div>
                {detailModalItem.lawyerLicense && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bar License:</span>
                    <span className="font-mono text-slate-700">{detailModalItem.lawyerLicense}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Category:</span>
                  <span className="font-semibold text-blue-700">{detailModalItem.legalServiceCategory || "General Practice"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-semibold text-slate-900">{detailModalItem.consultationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Schedule:</span>
                  <span className="font-semibold text-slate-900">
                    {detailModalItem.date} ({formatSlotTime(detailModalItem.startTime, detailModalItem.endTime)})
                  </span>
                </div>
              </div>

              {/* Legal Issue Description */}
              <div>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Client Legal Issue:</span>
                <p className="mt-1 p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap">
                  {detailModalItem.description || "No legal issue description provided by customer."}
                </p>
              </div>

              {/* Audit Timeline */}
              <div>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Audit Status Trail:</span>
                <div className="mt-2 space-y-2">
                  {detailModalItem.history.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No history records logged.</div>
                  ) : (
                    detailModalItem.history.map((h) => (
                      <div
                        key={h.historyId}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-700">{h.previousStatus}</span>
                          <span className="mx-2 text-slate-400">→</span>
                          <span className="font-semibold text-blue-600">{h.newStatus}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.changedDate).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
