"use client";

import type { MetricFocus } from "./scoreEngine";
import {
  formatCOP,
  formatRate,
  metricFocusLabel,
  performanceLevel,
} from "./scoreEngine";
import type { RankingKpis, RankingRow } from "./rankingTypes";
import {
  initialsOf,
  metricValueFormatted,
  normalizeUrl,
  rankingScopeLabel,
} from "./rankingUtils";

type Props = {
  rows: RankingRow[];
  kpis: RankingKpis;
  metricFocus: MetricFocus;
  scope: "sellers" | "distributors";
  fromDateKey: string;
  toDateKey: string;
  brand?: string;
};

function formatIdc(value: number) {
  const n = Math.round(Number(value || 0) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatBonus(value?: number) {
  const n = Math.round(Number(value || 0) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function RankingExportCard({
  rows,
  kpis,
  metricFocus,
  scope,
  fromDateKey,
  toDateKey,
  brand = "SIANA VITAL",
}: Props) {
  const topRows = rows.slice(0, 10);
  const leader = rows[0];

  return (
    <div
      id="ranking-export-card"
      className="bg-white text-black"
      style={{
        width: 794,
        minHeight: 1123,
        backgroundColor: "#ffffff",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 28,
        overflow: "visible",
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#0B5ED7",
          padding: 32,
          color: "#ffffff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black tracking-wide text-white">
              {brand}
            </div>

            <h1
              className="mt-8 font-black text-white"
              style={{
                fontSize: 34,
                lineHeight: 1.12,
                maxWidth: 480,
              }}
            >
              Ranking y Desempeño Comercial
            </h1>

            <p className="mt-4 text-sm font-bold text-white">
              {rankingScopeLabel(scope)} · {metricFocusLabel(metricFocus)}
            </p>
          </div>

          <div
            className="shrink-0 text-center"
            style={{
              width: 150,
              backgroundColor: "#ffffff",
              color: "#111827",
              borderRadius: 24,
              padding: "22px 16px",
            }}
          >
            <div className="text-xs font-black uppercase text-black/60">
              Periodo
            </div>

            <div className="mt-3 text-lg font-black leading-tight">
              {fromDateKey}
            </div>

            <div className="mt-1 text-sm font-bold text-black/60">
              hasta {toDateKey}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 p-6">
        <ExportKpi label="Ventas" value={formatCOP(kpis.salesTotal)} />
        <ExportKpi label="Ventas realizadas" value={String(kpis.salesCountTotal)} />
        <ExportKpi label="Visitas" value={String(kpis.visitsTotal)} />
        <ExportKpi label="Efectivas" value={String(kpis.visitsEffective)} />
        <ExportKpi label="Referidos" value={String(kpis.referredTotal)} />
        <ExportKpi label="Resets" value={String(kpis.visitsReset)} />
        <ExportKpi
          label="Prom. visita"
          value={formatCOP(kpis.avgSalePerVisit)}
        />
        <ExportKpi
          label="Control resets"
          value={formatRate(kpis.resetControl)}
        />
      </div>

      {leader ? (
        <div
          className="mx-6"
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            backgroundColor: "#F7F8FA",
            borderRadius: 24,
            padding: 22,
          }}
        >
          <div className="mb-4 text-xs font-black uppercase tracking-wide text-black/50">
            Líder del periodo
          </div>

          <div className="flex items-center gap-4">
            <ExportAvatar
              src={leader.photoDataUrl || leader.photoUrl}
              name={leader.name}
              size={76}
            />

            <div className="min-w-0 flex-1">
              <div
                className="font-black text-black"
                style={{
                  fontSize: 22,
                  lineHeight: 1.18,
                  whiteSpace: "normal",
                  overflow: "visible",
                }}
              >
                {leader.name}
              </div>

              <div
                className="mt-2 text-sm font-semibold text-black/55"
                style={{
                  lineHeight: 1.25,
                  whiteSpace: "normal",
                  overflow: "visible",
                }}
              >
                {leader.subtitle || "Sin información adicional"}
              </div>
            </div>

            <div
              className="shrink-0 text-center"
              style={{
                width: 150,
                backgroundColor: "#ffffff",
                borderRadius: 24,
                padding: "20px 14px",
              }}
            >
              <div className="text-xs font-black uppercase tracking-wide text-black/50">
                Resultado
              </div>

              <div className="mt-2 text-3xl font-black leading-none text-black">
                {metricValueFormatted(leader, metricFocus)}
              </div>

              <div className="mt-1 text-xs font-bold text-black/50">
                IDC {formatIdc(leader.scores.idc)}/100
              </div>

              {Number(leader.instantAppointmentBonus || 0) > 0 ? (
                <div className="mt-1 text-[10px] font-bold text-black/40">
                  +{formatBonus(leader.instantAppointmentBonus)} pts por citas inst.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            <LeaderMiniMetric
              label="Aporte ventas"
              value={formatRate(leader.salesConversionRate)}
            />
            <LeaderMiniMetric
              label="Aporte económico"
              value={formatRate(leader.economicShare)}
            />
            <LeaderMiniMetric
              label="Aporte referidos"
              value={formatRate(leader.referralRate)}
            />
            <LeaderMiniMetric
              label="Control resets"
              value={formatRate(leader.resetControl)}
            />
            <LeaderMiniMetric
              label="Citas inst."
              value={`${leader.instantAppointmentsTotal || 0}`}
            />
          </div>
        </div>
      ) : null}

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-black">Top 10</h2>

          <div className="text-xs font-black text-black/50">
            Ordenado por {metricFocusLabel(metricFocus)}
          </div>
        </div>

        <div className="space-y-3">
          {topRows.map((row) => {
            const level = performanceLevel(row.scores.idc);

            return (
              <div
                key={`${row.type}-${row.id}`}
                className="grid items-center gap-3"
                style={{
                  gridTemplateColumns: "58px 1fr 125px 88px",
                  minHeight: 70,
                  border: "1px solid rgba(0,0,0,0.12)",
                  backgroundColor: "#ffffff",
                  borderRadius: 18,
                  padding: "12px 14px",
                  overflow: "visible",
                }}
              >
                <div className="text-center text-sm font-black text-black">
                  #{row.rank}
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  <ExportAvatar
                    src={row.photoDataUrl || row.photoUrl}
                    name={row.name}
                    size={38}
                  />

                  <div className="min-w-0">
                    <div
                      className="font-black text-black"
                      style={{
                        fontSize: 14,
                        lineHeight: 1.18,
                        whiteSpace: "normal",
                        overflow: "visible",
                      }}
                    >
                      {row.name}
                    </div>

                    <div
                      className="mt-1 text-xs font-semibold text-black/50"
                      style={{
                        lineHeight: 1.2,
                        whiteSpace: "normal",
                        overflow: "hidden",
                        maxHeight: 30,
                      }}
                    >
                      {row.subtitle || "Sin información adicional"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black leading-tight text-black">
                    {metricValueFormatted(row, metricFocus)}
                  </div>

                  <div className="mt-1 text-[10px] font-semibold leading-tight text-black/50">
                    {metricFocusLabel(metricFocus)}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={[
                      "inline-flex rounded-full border px-2 py-1 text-[10px] font-black",
                      level.badge,
                    ].join(" ")}
                  >
                    IDC {formatIdc(row.scores.idc)}
                  </span>

                  {Number(row.instantAppointmentBonus || 0) > 0 ? (
                    <div className="mt-1 text-[10px] font-bold text-black/35">
                      +{formatBonus(row.instantAppointmentBonus)} pts
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {!topRows.length ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 text-center text-sm font-bold text-black/50">
              No hay datos para mostrar.
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="px-6 py-4 text-xs font-semibold text-black/55"
        style={{
          borderTop: "1px solid rgba(0,0,0,0.12)",
          backgroundColor: "#F7F8FA",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          lineHeight: 1.35,
        }}
      >
        IDC: Índice de Desempeño Comercial. Integra efectividad de visitas,
        aporte a ventas realizadas, aporte económico, aporte a referidos y
        control de resets. Cada cita instantánea suma 0.5 puntos al IDC final,
        sin superar 100 puntos.
      </div>
    </div>
  );
}

function ExportKpi({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minHeight: 76,
        border: "1px solid rgba(0,0,0,0.12)",
        backgroundColor: "#F7F8FA",
        borderRadius: 16,
        padding: "14px 14px",
        overflow: "visible",
      }}
    >
      <div className="text-[10px] font-black uppercase tracking-wide text-black/45">
        {label}
      </div>

      <div
        className="mt-2 font-black text-black"
        style={{
          fontSize: 18,
          lineHeight: 1.12,
          whiteSpace: "normal",
          overflow: "visible",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function LeaderMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: "10px 8px",
        minHeight: 54,
      }}
    >
      <div className="text-[9px] font-black uppercase tracking-wide text-black/35">
        {label}
      </div>

      <div className="mt-1 truncate text-xs font-black text-black">{value}</div>
    </div>
  );
}

function ExportAvatar({
  src,
  name,
  size,
}: {
  src?: string;
  name: string;
  size: number;
}) {
  const cleanSrc = normalizeUrl(src);

  return (
    <div
      className="shrink-0 bg-white"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 70 ? 22 : 12,
        border: "1px solid rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      {cleanSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cleanSrc}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-xs font-black text-black/45"
          style={{
            lineHeight: 1,
          }}
        >
          {initialsOf(name)}
        </div>
      )}
    </div>
  );
}