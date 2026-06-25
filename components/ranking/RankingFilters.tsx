"use client";

import type {
  DistributorCatalogItem,
  RankingFilters,
  RankingScope,
  SellerTypeFilter,
} from "./rankingTypes";

import { metricFocusLabel, type MetricFocus } from "./scoreEngine";

import {
  distributorName,
  rankingScopeDescription,
  rankingScopeLabel,
} from "./rankingUtils";

const METRIC_OPTIONS: MetricFocus[] = [
  "idc",
  "salesTotal",
  "visitsTotal",
  "visitsEffective",
  "visitsReset",
  "referredTotal",
  "avgSale",
  "avgSalePerVisit",
  "avgSalePerEffectiveVisit",
  "effectiveRate",
  "salesConversionRate",
  "resetControl",
  "referralRate",
  "productivity",
];

const SELLER_TYPE_OPTIONS: SellerTypeFilter[] = [
  "all",
  "Distribuidor",
  "Emprendedor",
];

type Props = {
  filters: RankingFilters;
  onChange: (next: RankingFilters) => void;
  distributorsById: Record<string, DistributorCatalogItem>;
  distributorOptions: string[];
  loading?: boolean;
  onReload?: () => void;
};

export function RankingFilters({
  filters,
  onChange,
  distributorsById,
  distributorOptions,
  loading = false,
  onReload,
}: Props) {
  function set<K extends keyof RankingFilters>(
    key: K,
    value: RankingFilters[K]
  ) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  function setScope(scope: RankingScope) {
    onChange({
      ...filters,
      scope,
      sellerType: scope === "sellers" ? filters.sellerType : "all",
      minSellers: scope === "distributors" ? filters.minSellers : 0,
    });
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-black text-black">
            Filtros de medición
          </h2>

          <p className="mt-1 max-w-3xl text-sm text-black/50">
            Define el periodo, el alcance del ranking y el componente principal
            que deseas evaluar. El IDC integra efectividad de visitas, aporte a
            ventas realizadas, aporte económico, aporte a referidos y control de
            resets; cada cita instantánea suma 0.5 puntos al índice final.
          </p>
        </div>

        {onReload ? (
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Cargando..." : "Actualizar datos"}
          </button>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["sellers", "distributors"] as RankingScope[]).map((scope) => {
          const active = filters.scope === scope;

          return (
            <button
              key={scope}
              type="button"
              onClick={() => setScope(scope)}
              className={[
                "rounded-2xl border p-4 text-left transition",
                active
                  ? "border-[#0B5ED7] bg-[#0B5ED7]/5 ring-4 ring-[#0B5ED7]/10"
                  : "border-black/10 bg-white hover:bg-black/[0.02]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-black text-black">
                  {rankingScopeLabel(scope)}
                </div>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black",
                    active
                      ? "bg-[#0B5ED7] text-white"
                      : "bg-black/5 text-black/50",
                  ].join(" ")}
                >
                  {active ? "Activo" : "Seleccionar"}
                </span>
              </div>

              <p className="mt-1 text-sm text-black/50">
                {rankingScopeDescription(scope)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Fecha inicial">
          <input
            type="date"
            className="input-ranking"
            value={filters.fromDateKey}
            onChange={(e) => set("fromDateKey", e.target.value)}
          />
        </Field>

        <Field label="Fecha final">
          <input
            type="date"
            className="input-ranking"
            value={filters.toDateKey}
            onChange={(e) => set("toDateKey", e.target.value)}
          />
        </Field>

        <Field label="Componente a medir">
          <select
            className="input-ranking"
            value={filters.metricFocus}
            onChange={(e) =>
              set("metricFocus", e.target.value as MetricFocus)
            }
          >
            {METRIC_OPTIONS.map((metric) => (
              <option key={metric} value={metric}>
                {metricFocusLabel(metric)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mínimo de visitas">
          <input
            type="number"
            min={0}
            className="input-ranking"
            value={filters.minVisits}
            onChange={(e) => set("minVisits", Number(e.target.value || 0))}
          />
        </Field>

        <Field label="Distribuidora">
          <select
            className="input-ranking"
            value={filters.distributorId}
            onChange={(e) => set("distributorId", e.target.value)}
          >
            <option value="all">Todas</option>

            {distributorOptions.map((id) => (
              <option key={id} value={id}>
                {distributorName(distributorsById[id], id)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de vendedor">
          <select
            className="input-ranking disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/35"
            value={filters.sellerType}
            onChange={(e) =>
              set("sellerType", e.target.value as SellerTypeFilter)
            }
            disabled={filters.scope !== "sellers"}
          >
            {SELLER_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "Todos" : type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mínimo de vendedores">
          <input
            type="number"
            min={0}
            className="input-ranking disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/35"
            value={filters.minSellers}
            onChange={(e) => set("minSellers", Number(e.target.value || 0))}
            disabled={filters.scope !== "distributors"}
          />
        </Field>

        <div className="flex items-end">
          <div className="w-full rounded-2xl bg-black/[0.03] px-4 py-3">
            <div className="text-xs font-black uppercase tracking-wide text-black/40">
              Medición actual
            </div>

            <div className="mt-1 text-sm font-black text-black">
              {metricFocusLabel(filters.metricFocus)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#0B5ED7]/10 bg-[#0B5ED7]/5 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-wide text-[#0B5ED7]">
          Metodología IDC
        </div>

        <p className="mt-1 text-sm font-semibold leading-relaxed text-black/55">
          Efectividad de visitas y control de resets se calculan sobre las
          visitas propias del participante. Ventas realizadas, valor económico y
          referidos se calculan como aporte frente al total del grupo evaluado.
        </p>
      </div>

      <style jsx global>{`
        .input-ranking {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: white;
          padding: 0.72rem 0.85rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            background-color 0.15s ease;
        }

        .input-ranking:focus {
          border-color: #0b5ed7;
          box-shadow: 0 0 0 3px rgba(11, 94, 215, 0.1);
        }
      `}</style>
    </div>
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
    <label className="block">
      <div className="mb-1.5 text-sm font-black text-black/70">{label}</div>
      {children}
    </label>
  );
}