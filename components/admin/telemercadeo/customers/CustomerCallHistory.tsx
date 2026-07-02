"use client";

import {
  CalendarCheck,
  Clock3,
  FileText,
  PhoneCall,
  UserRound,
} from "lucide-react";

import type { CustomerCallLog } from "./customerTypes";
import CustomerStatusBadge from "./CustomerStatusBadge";
import {
  formatDateTime,
  getCallResultLabel,
} from "./customerUtils";

export default function CustomerCallHistory({
  logs,
  loading,
}: {
  logs: CustomerCallLog[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
        Cargando historial de llamadas...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <PhoneCall className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-400">
          Este registro todavía no tiene historial de llamadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <article
          key={log.id}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                <PhoneCall className="h-4 w-4 text-emerald-700" />
                {getCallResultLabel(log)}
              </p>

              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Clock3 className="h-3 w-3" />
                {formatDateTime(log.callAt || log.createdAt)}
              </p>
            </div>

            <CustomerStatusBadge status={log.newStatus || log.result} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SmallInfo
              icon={<UserRound className="h-4 w-4" />}
              label="Gestionó"
              value={
                log.createdByName ||
                log.sellerName ||
                log.merchandiserName ||
                "Sin responsable"
              }
            />

            <SmallInfo
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Próxima acción"
              value={formatDateTime(log.nextActionAt || log.nextCallAt)}
            />
          </div>

          {log.observation || log.notes ? (
            <div className="mt-3 rounded-2xl bg-white p-3">
              <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <FileText className="h-3 w-3 text-emerald-700" />
                Observación
              </p>

              <p className="whitespace-pre-line text-sm text-slate-600">
                {log.observation || log.notes}
              </p>
            </div>
          ) : null}

          {log.appointmentCreated || log.appointmentId ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800">
              Cita creada {log.appointmentId ? `· ${log.appointmentId}` : ""}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function SmallInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>

      <p className="text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}