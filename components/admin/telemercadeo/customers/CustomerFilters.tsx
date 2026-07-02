"use client";

import { Filter } from "lucide-react";

import type {
  CustomerDistributorOption,
  CustomerFiltersState,
  CustomerSellerOption,
} from "./customerTypes";
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
} from "./customerUtils";

export default function CustomerFilters({
  filters,
  sellers,
  distributors,
  cities,
  onChange,
  onClear,
}: {
  filters: CustomerFiltersState;
  sellers: CustomerSellerOption[];
  distributors: CustomerDistributorOption[];
  cities: string[];
  onChange: (filters: CustomerFiltersState) => void;
  onClear: () => void;
}) {
  function update<K extends keyof CustomerFiltersState>(
    key: K,
    value: CustomerFiltersState[K]
  ) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-emerald-700" />

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Filtros de consulta
            </h2>
            <p className="text-sm text-slate-500">
              Consulta clientes, referidos, estados de respuesta y responsables.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Buscar">
          <input
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Nombre, teléfono, ciudad..."
            className="input"
          />
        </Field>

        <Field label="Distribuidor">
          <select
            value={filters.distributorId}
            onChange={(event) => update("distributorId", event.target.value)}
            className="input"
          >
            <option value="all">Todos los distribuidores</option>
            {distributors.map((distributor) => (
              <option key={distributor.id} value={distributor.id}>
                {distributor.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vendedor">
          <select
            value={filters.sellerId}
            onChange={(event) => update("sellerId", event.target.value)}
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
            value={filters.status}
            onChange={(event) => update("status", event.target.value)}
            className="input"
          >
            {CUSTOMER_STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo">
          <select
            value={filters.type}
            onChange={(event) => update("type", event.target.value)}
            className="input"
          >
            {CUSTOMER_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tiene cita">
          <select
            value={filters.hasAppointment}
            onChange={(event) => update("hasAppointment", event.target.value)}
            className="input"
          >
            <option value="all">Todos</option>
            <option value="yes">Con cita</option>
            <option value="no">Sin cita</option>
          </select>
        </Field>

        <Field label="Tiene compra">
          <select
            value={filters.hasPurchase}
            onChange={(event) => update("hasPurchase", event.target.value)}
            className="input"
          >
            <option value="all">Todos</option>
            <option value="yes">Con compra</option>
            <option value="no">Sin compra</option>
          </select>
        </Field>

        <Field label="Ciudad">
          <select
            value={filters.city}
            onChange={(event) => update("city", event.target.value)}
            className="input"
          >
            <option value="all">Todas las ciudades</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
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