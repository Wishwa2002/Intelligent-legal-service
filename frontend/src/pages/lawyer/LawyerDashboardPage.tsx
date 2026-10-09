import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LawyerLayout } from "../../components/layout/LawyerLayout";

import {
  authApi,
  type StaffUser,
} from "../../api/authApi";

interface Appointment {
  appointmentId: number;
  customerName?: string;
  serviceName?: string;
  date?: string;
  startTime?: string;
  status: string;
}

export const LawyerDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentLawyer, setCurrentLawyer] =
    useState<StaffUser | null>(null);

  const [appointments] =
    useState<Appointment[]>([]);

  useEffect(() => {
    const lawyer = authApi.getCurrentLawyer();

    if (!lawyer || lawyer.role?.toLowerCase() !== "lawyer") {
      navigate("/staff/login", { replace: true });
      return;
    }

    setCurrentLawyer(lawyer);
  }, [navigate]);

  if (!currentLawyer) {
    return null;
  }

  const upcomingCount = appointments.filter(
    (appointment) =>
      appointment.status === "CONFIRMED" ||
      appointment.status === "RESCHEDULED"
  ).length;

  const pendingCount = appointments.filter(
    (appointment) =>
      appointment.status === "PENDING"
  ).length;

  const completedCount = appointments.filter(
    (appointment) =>
      appointment.status === "COMPLETED"
  ).length;

  return (
    <LawyerLayout>

      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome, {currentLawyer.name}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Manage your legal consultations and appointments.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Upcoming Appointments
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-2">
            {upcomingCount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Pending Appointments
          </p>

          <p className="text-3xl font-bold text-amber-600 mt-2">
            {pendingCount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Completed Consultations
          </p>

          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {completedCount}
          </p>
        </div>

      </div>

      {/* Appointment Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">
            My Appointments
          </h3>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No appointments available.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-5 py-3">
                    Customer
                  </th>

                  <th className="text-left px-5 py-3">
                    Service
                  </th>

                  <th className="text-left px-5 py-3">
                    Date
                  </th>

                  <th className="text-left px-5 py-3">
                    Time
                  </th>

                  <th className="text-left px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.appointmentId}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {appointment.customerName || "Customer"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {appointment.serviceName || "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {appointment.date
                        ? new Date(
                            appointment.date
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {appointment.startTime || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </div>

    </LawyerLayout>
  );
};