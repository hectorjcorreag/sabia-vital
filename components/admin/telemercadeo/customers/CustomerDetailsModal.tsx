"use client";

import {
  CalendarCheck,
  MapPin,
  Phone,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";

import type { Customer, CustomerCallLog } from "./customerTypes";
import CustomerCallHistory from "./CustomerCallHistory";
import CustomerStatusBadge from "./CustomerStatusBadge";
import {
  formatDateTime,
  formatMoney,
  getCustomerName,
  getCustomerPhone,
  getCustomerTypeLabel,
} from "./customerUtils";

export default function CustomerDetailsModal({
  customer,
  logs,
  loadingLogs,
  onClose,
}: {
  customer: Customer | null;
  logs: CustomerCallLog[];
  loadingLogs: boolean;
  onClose: () => void;
}) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <article className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-5 text-white">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide">
              Detalle comercial
            </p>

            <h2 className="text-2xl font-black">
              {getCustomerName(customer)}
            </h2>

            <p className="mt-1 text-sm text-emerald-50">
              {getCustomerTypeLabel(customer.customerType)} ·{" "}
              {customer.city || "Sin ciudad"}
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

        <div className="max-h-[76vh] overflow-y-auto p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            <CustomerStatusBadge status={customer.customerStatus} />

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {getCustomerTypeLabel(customer.customerType)}
            </span>

            {customer.hasAppointment ? (
              <span className="rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-black text-lime-800">
                Con cita
              </span>
            ) : null}

            {customer.hasPurchase ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                Con compra
              </span>
            ) : null}
          </div>

          <section className="grid gap-3 md:grid-cols-4">
            <InfoCard
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={getCustomerPhone(customer)}
            />

            <InfoCard
              icon={<MapPin className="h-4 w-4" />}
              label="Ciudad"
              value={customer.city || "Sin ciudad"}
            />

            <InfoCard
              icon={<UserRound className="h-4 w-4" />}
              label="Vendedor"
              value={customer.assignedSellerName || "Sin vendedor"}
            />

            <InfoCard
              icon={<UserRound className="h-4 w-4" />}
              label="Distribuidor"
              value={customer.distributorName || "Sin distribuidor"}
            />

            <InfoCard
              icon={<Phone className="h-4 w-4" />}
              label="Intentos llamada"
              value={String(customer.callAttempts || 0)}
            />

            <InfoCard
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Última llamada"
              value={formatDateTime(customer.lastCallAt)}
            />

            <InfoCard
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Próxima acción"
              value={formatDateTime(customer.nextActionAt || customer.nextCallAt)}
            />

            <InfoCard
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Compras"
              value={`${customer.totalPurchases || 0} · ${formatMoney(
                customer.totalPurchasedAmount
              )}`}
            />
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 font-black text-slate-950">
                Información disponible
              </h3>

              <div className="space-y-2 text-sm">
                <Row label="Correo" value={customer.email || "Sin correo"} />
                <Row label="Dirección" value={customer.address || "Sin dirección"} />
                <Row label="Origen" value={customer.origin || "Sin origen"} />
                <Row label="Fuente" value={customer.source || "Sin fuente"} />
                <Row
                  label="Creado por"
                  value={customer.createdByName || "Sin responsable"}
                />
                <Row label="Creado el" value={formatDateTime(customer.createdAt)} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 font-black text-slate-950">
                Última gestión
              </h3>

              <div className="space-y-2 text-sm">
                <Row
                  label="Resultado"
                  value={customer.lastCallResult || "Sin resultado"}
                />
                <Row
                  label="Observación"
                  value={customer.lastObservation || "Sin observación"}
                />
                <Row
                  label="Próxima cita"
                  value={formatDateTime(customer.nextAppointmentAt)}
                />
                <Row
                  label="ID cita"
                  value={customer.nextAppointmentId || "Sin cita relacionada"}
                />
              </div>
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-3">
              <h3 className="text-lg font-black text-slate-950">
                Historial de llamadas
              </h3>
              <p className="text-sm text-slate-500">
                Información tomada desde la subcolección{" "}
                <strong>customers/{customer.id}/call_logs</strong>.
              </p>
            </div>

            <CustomerCallHistory logs={logs} loading={loadingLogs} />
          </section>
        </div>
      </article>
    </div>
  );
}

function InfoCard({
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
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <span className="text-emerald-700">{icon}</span>
        {label}
      </p>

      <p className="font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-200 pb-2 last:border-0">
      <p className="w-32 shrink-0 text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="font-semibold text-slate-700">{value}</p>
    </div>
  );
}