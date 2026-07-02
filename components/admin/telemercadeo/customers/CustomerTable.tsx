"use client";

import {
  CalendarCheck,
  Eye,
  Phone,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import type { Customer } from "./customerTypes";
import CustomerStatusBadge from "./CustomerStatusBadge";
import {
  formatDateTime,
  getCustomerName,
  getCustomerPhone,
  getCustomerTypeLabel,
} from "./customerUtils";

export default function CustomerTable({
  customers,
  onSelect,
}: {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-950">
          Listado de clientes y referidos
        </h2>
        <p className="text-sm text-slate-500">
          Haz clic en “Ver historial” para consultar la trazabilidad de llamadas.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1150px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-black">Cliente / referido</th>
              <th className="px-4 py-3 font-black">Tipo</th>
              <th className="px-4 py-3 font-black">Estado</th>
              <th className="px-4 py-3 font-black">Vendedor</th>
              <th className="px-4 py-3 font-black">Distribuidor</th>
              <th className="px-4 py-3 font-black">Última llamada</th>
              <th className="px-4 py-3 font-black">Resultado</th>
              <th className="px-4 py-3 font-black">Indicadores</th>
              <th className="px-4 py-3 font-black text-right">Acción</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center font-bold text-slate-400"
                >
                  No hay registros con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                        <UserRound className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="font-black text-slate-950">
                          {getCustomerName(customer)}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <Phone className="h-3 w-3" />
                          {getCustomerPhone(customer)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {customer.city || "Sin ciudad"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {getCustomerTypeLabel(customer.customerType)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <CustomerStatusBadge status={customer.customerStatus} />
                  </td>

                  <td className="px-4 py-4 font-bold text-slate-700">
                    {customer.assignedSellerName || "Sin vendedor"}
                  </td>

                  <td className="px-4 py-4 font-bold text-slate-700">
                    {customer.distributorName || "Sin distribuidor"}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {formatDateTime(customer.lastCallAt)}
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-700">
                      {customer.lastCallResult || "Sin resultado"}
                    </p>

                    {customer.lastObservation ? (
                      <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                        {customer.lastObservation}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        icon={<Phone className="h-3 w-3" />}
                        text={`${customer.callAttempts || 0} llamadas`}
                      />

                      {customer.hasAppointment ? (
                        <Badge
                          icon={<CalendarCheck className="h-3 w-3" />}
                          text="Con cita"
                        />
                      ) : null}

                      {customer.hasPurchase ? (
                        <Badge
                          icon={<ShoppingCart className="h-3 w-3" />}
                          text="Compra"
                        />
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(customer)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800"
                    >
                      <Eye className="h-4 w-4" />
                      Ver historial
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Badge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
      {icon}
      {text}
    </span>
  );
}