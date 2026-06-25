"use client";

import type { MetricFocus } from "./scoreEngine";
import {
  formatCOP,
  formatRate,
  metricFocusLabel,
  performanceLevel,
} from "./scoreEngine";
import type { RankingRow } from "./rankingTypes";
import { metricValueFormatted } from "./rankingUtils";
import { RankingAvatar } from "./RankingAvatar";

type Props = {
  rows: RankingRow[];
  metricFocus: MetricFocus;
  loading?: boolean;
};

export function RankingTable({ rows, metricFocus, loading = false }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-black/10 p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">
              Ranking principal
            </h2>

            <p className="mt-1 text-sm text-black/50">
              Ordenado por {metricFocusLabel(metricFocus).toLowerCase()}.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0B5ED7]/10 px-4 py-2 text-sm font-black text-[#0B5ED7]">
            {rows.length} participante(s)
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1380px] text-left text-sm">
          <thead className="bg-black/[0.03]">
            <tr>
              <Th>#</Th>
              <Th>Participante</Th>
              <Th>Medición</Th>
              <Th>IDC</Th>
              <Th>Ventas</Th>
              <Th>Visitas</Th>
              <Th>Efectivas</Th>
              <Th>Resets</Th>
              <Th>Referidos</Th>
              <Th>Prom. visita</Th>
              <Th>Aporte ventas</Th>
              <Th>Aporte económico</Th>
              <Th>Aporte ref.</Th>
              <Th>Control resets</Th>
              <Th>Citas inst.</Th>
              <Th>Nivel</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Cargando ranking...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <RankingTableRow
                  key={`${row.type}-${row.id}`}
                  row={row}
                  metricFocus={metricFocus}
                />
              ))
            ) : (
              <tr>
                <td colSpan={16} className="px-4 py-10 text-center">
                  <div className="mx-auto max-w-md">
                    <div className="text-base font-black text-black">
                      No hay datos para mostrar
                    </div>

                    <p className="mt-1 text-sm text-black/50">
                      Ajusta el rango de fechas, el mínimo de visitas o los
                      filtros aplicados.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-black/10 p-3 text-xs text-black/45">
        El IDC combina efectividad de visitas, aporte a ventas realizadas,
        aporte económico, aporte a referidos y control de resets. Cada cita
        instantánea suma 0.5 puntos al IDC final, sin superar 100 puntos.
      </div>
    </div>
  );
}

function RankingTableRow({
  row,
  metricFocus,
}: {
  row: RankingRow;
  metricFocus: MetricFocus;
}) {
  const level = performanceLevel(row.scores.idc);

  return (
    <tr className="border-t border-black/10 transition hover:bg-black/[0.025]">
      <td className="px-4 py-3 align-middle">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/[0.04] text-sm font-black text-black">
          {row.rank || "—"}
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <RankingAvatar
            src={row.photoUrl}
            name={row.name}
            size="md"
            rounded="2xl"
          />

          <div className="min-w-0">
            <div className="truncate font-black text-black">{row.name}</div>

            <div className="mt-0.5 line-clamp-1 text-xs font-semibold text-black/45">
              {row.subtitle || "Sin información adicional"}
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {metricValueFormatted(row, metricFocus)}
        </div>

        <div className="text-xs font-semibold text-black/40">
          {metricFocusLabel(metricFocus)}
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <IdcBar value={row.scores.idc} />
      </td>

      <td className="px-4 py-3 align-middle font-black text-black">
        {formatCOP(row.salesTotal)}
        <div className="text-xs font-semibold text-black/40">
          {row.salesCountTotal.toLocaleString("es-CO")} venta(s)
        </div>
      </td>

      <td className="px-4 py-3 align-middle font-black text-black">
        {row.visitsTotal.toLocaleString("es-CO")}
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {row.visitsEffective.toLocaleString("es-CO")}
        </div>

        <div className="text-xs font-semibold text-black/40">
          {formatRate(row.effectiveRate)}
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {row.visitsReset.toLocaleString("es-CO")}
        </div>

        <div className="text-xs font-semibold text-black/40">
          {formatRate(row.resetRate)}
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {row.referredTotal.toLocaleString("es-CO")}
        </div>

        <div className="text-xs font-semibold text-black/40">
          {formatRate(row.referralRate)}
        </div>
      </td>

      <td className="px-4 py-3 align-middle font-black text-black">
        {formatCOP(row.avgSalePerVisit)}
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {formatRate(row.salesConversionRate)}
        </div>

        <div className="text-xs font-semibold text-black/40">
          Ventas realizadas
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {formatRate(row.economicShare)}
        </div>

        <div className="text-xs font-semibold text-black/40">
          Valor vendido
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {formatRate(row.referralRate)}
        </div>

        <div className="text-xs font-semibold text-black/40">
          Total referidos
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {formatRate(row.resetControl)}
        </div>

        <div className="text-xs font-semibold text-black/40">
          1 - reset/visitas
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="font-black text-black">
          {Number(row.instantAppointmentsTotal || 0).toLocaleString("es-CO")}
        </div>

        <div className="text-xs font-semibold text-black/40">
          +{formatBonus(row.instantAppointmentBonus)} pts
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <span
          className={[
            "inline-flex rounded-full border px-3 py-1 text-xs font-black",
            level.badge,
          ].join(" ")}
        >
          {level.label}
        </span>
      </td>
    </tr>
  );
}

function IdcBar({ value }: { value: number }) {
  const score = Math.max(0, Math.min(100, Number(value || 0)));
  const width = score;

  return (
    <div className="min-w-[150px]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-black text-black">
          {formatScore(score)}/100
        </span>
        <span className="text-xs font-bold text-black/40">IDC</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.07]">
        <div
          className="h-full rounded-full bg-[#0B5ED7]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function formatScore(value: number) {
  const n = Math.round(Number(value || 0) * 10) / 10;

  if (Number.isInteger(n)) {
    return String(n);
  }

  return n.toFixed(1);
}

function formatBonus(value: number | undefined) {
  const n = Number(value || 0);

  if (Number.isInteger(n)) {
    return String(n);
  }

  return n.toFixed(1);
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-wide text-black/45">
      {children}
    </th>
  );
}