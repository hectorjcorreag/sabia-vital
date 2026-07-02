"use client";

import {
  X,
  CalendarCheck,
  MapPin,
  Phone,
  UserRound,
  Store,
  Clock3,
  FileText,
} from "lucide-react";

import type { Appointment } from "./agendaTypes";
import {
  formatDate,
  formatTime,
  getStatusClass,
  getStatusLabel,
  toDate,
} from "./agendaUtils";

export default function AppointmentDetailsModal({
  appointment,
  onClose,
}: {
  appointment: Appointment | null;
  onClose: () => void;
}) {
  if (!appointment) return null;

  const appointmentDate = toDate(appointment.appointmentAt);
  const notes =
    appointment.notes ||
    appointment.observations ||
    "Sin observaciones registradas.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <article className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-5 text-white">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide">
              Detalle de cita
            </p>

            <h2 className="text-2xl font-black">
              {appointment.customerName || "Sin cliente"}
            </h2>

            <p className="mt-1 text-sm text-emerald-50">
              {formatDate(appointmentDate)} · {formatTime(appointmentDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-white/15 p-2 text-white hover:bg-white/25"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                appointment.status
              )}`}
            >
              {getStatusLabel(appointment.status)}
            </span>

            {appointment.city ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                {appointment.city}
              </span>
            ) : null}
          </div>

          <section className="grid gap-3 md:grid-cols-2">
            <InfoItem
              icon={<UserRound className="h-4 w-4" />}
              label="Cliente"
              value={appointment.customerName || "Sin cliente"}
            />

            <InfoItem
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={appointment.customerPhone || "Sin teléfono"}
            />

            <InfoItem
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Fecha"
              value={formatDate(appointmentDate)}
            />

            <InfoItem
              icon={<Clock3 className="h-4 w-4" />}
              label="Hora"
              value={formatTime(appointmentDate)}
            />

            <InfoItem
              icon={<Store className="h-4 w-4" />}
              label="Vendedor"
              value={appointment.sellerName || "Sin vendedor"}
            />

            <InfoItem
              icon={<UserRound className="h-4 w-4" />}
              label="Mercaderista"
              value={appointment.merchandiserName || "Sin mercaderista"}
            />

            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="Ciudad"
              value={appointment.city || "Sin ciudad"}
            />

            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="Dirección"
              value={appointment.address || "Sin dirección"}
            />
          </section>

          <section className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <FileText className="h-4 w-4 text-emerald-700" />
              <h3 className="font-black">Observaciones</h3>
            </div>

            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
              {notes}
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>

      <p className="font-bold text-slate-950">{value}</p>
    </div>
  );
}