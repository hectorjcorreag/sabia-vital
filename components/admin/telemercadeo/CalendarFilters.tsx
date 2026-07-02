"use client";

import { Filter } from "lucide-react";

import type { AppointmentStatus, SellerOption } from "./agendaTypes";
import { APPOINTMENT_STATUS_OPTIONS } from "./agendaUtils";

export default function CalendarFilters({
  sellers,
  selectedSellerId,
  selectedStatus,
  searchTerm,
  onSellerChange,
  onStatusChange,
  onSearchChange,
}: {
  sellers: SellerOption[];
  selectedSellerId: string;
  selectedStatus: AppointmentStatus | "all";
  searchTerm: string;
  onSellerChange: (value: string) => void;
  onStatusChange: (value: AppointmentStatus | "all") => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5 text-emerald-700" />

        <div>
          <h2 className="text-lg font-black text-slate-950">Filtros de agenda</h2>
          <p className="text-sm text-slate-500">
            Consulta todas las citas o revisa la agenda por vendedor, estado o cliente.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Vendedor">
          <select
            value={selectedSellerId}
            onChange={(event) => onSellerChange(event.target.value)}
            className="input"
          >
            <option value="all">Todos los vendedores</option>

            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Estado">
          <select
            value={selectedStatus}
            onChange={(event) =>
              onStatusChange(event.target.value as AppointmentStatus | "all")
            }
            className="input"
          >
            {APPOINTMENT_STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Buscar">
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cliente, teléfono, ciudad o dirección"
            className="input"
          />
        </Field>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.65rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: rgb(16 185 129);
          background: white;
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>

      {children}
    </div>
  );
}