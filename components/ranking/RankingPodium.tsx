"use client";

import {
  formatCOP,
  formatRate,
  metricFocusLabel,
  performanceLevel,
  type MetricFocus,
} from "./scoreEngine";
import type { RankingRow } from "./rankingTypes";
import { metricValueFormatted } from "./rankingUtils";
import { RankingAvatar } from "./RankingAvatar";

type Props = {
  rows: RankingRow[];
  metricFocus: MetricFocus;
};

function formatIdc(value: number) {
  const n = Math.round(Number(value || 0) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatBonus(value?: number) {
  const n = Math.round(Number(value || 0) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function RankingPodium({ rows, metricFocus }: Props) {
  const top3 = rows.slice(0, 3);

  if (!top3.length) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-black">Podio ejecutivo</h2>
        <p className="mt-1 text-sm text-black/50">
          Aún no hay datos suficientes para construir el podio.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-black text-black">Podio ejecutivo</h2>

          <p className="mt-1 text-sm text-black/50">
            Top 3 según {metricFocusLabel(metricFocus).toLowerCase()}.
          </p>
        </div>

        <div className="rounded-2xl bg-[#0B5ED7]/10 px-4 py-2 text-sm font-black text-[#0B5ED7]">
          {metricFocusLabel(metricFocus)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {top3.map((row, index) => (
          <PodiumCard
            key={`${row.type}-${row.id}`}
            row={row}
            place={index + 1}
            metricFocus={metricFocus}
          />
        ))}
      </div>
    </div>
  );
}

function PodiumCard({
  row,
  place,
  metricFocus,
}: {
  row: RankingRow;
  place: number;
  metricFocus: MetricFocus;
}) {
  const level = performanceLevel(row.scores.idc);
  const placeConfig = getPlaceConfig(place);
  const hasInstantBonus = Number(row.instantAppointmentBonus || 0) > 0;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border bg-[#F7F8FA] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
        placeConfig.border,
        place === 1 ? "lg:-translate-y-2" : "",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-20",
          placeConfig.bg,
        ].join(" ")}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={[
                "flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black",
                placeConfig.badge,
              ].join(" ")}
            >
              {placeConfig.icon}
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-black/40">
                Puesto
              </div>

              <div className="text-lg font-black text-black">#{place}</div>
            </div>
          </div>

          <span
            className={[
              "inline-flex rounded-full border px-3 py-1 text-xs font-black",
              level.badge,
            ].join(" ")}
          >
            {level.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <RankingAvatar
            src={row.photoUrl}
            name={row.name}
            size={place === 1 ? "xl" : "lg"}
            rounded="3xl"
          />

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-black leading-tight text-black">
              {row.name}
            </h3>

            <p className="mt-1 line-clamp-1 text-xs font-semibold text-black/45">
              {row.subtitle || "Sin información adicional"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wide text-black/40">
            Resultado principal
          </div>

          <div className="mt-1 text-3xl font-black tracking-tight text-black">
            {metricValueFormatted(row, metricFocus)}
          </div>

          <div className="mt-1 text-sm font-semibold text-black/45">
            {metricFocusLabel(metricFocus)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniMetric label="IDC" value={`${formatIdc(row.scores.idc)}/100`} />
          <MiniMetric label="Ventas" value={formatCOP(row.salesTotal)} />
          <MiniMetric
            label="Aporte ventas"
            value={formatRate(row.salesConversionRate)}
          />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <MiniMetric
            label="Aporte eco."
            value={formatRate(row.economicShare)}
          />
          <MiniMetric
            label="Aporte ref."
            value={formatRate(row.referralRate)}
          />
          <MiniMetric
            label="Control reset"
            value={formatRate(row.resetControl)}
          />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <MiniMetric label="Visitas" value={String(row.visitsTotal)} />
          <MiniMetric label="Resets" value={String(row.visitsReset)} />
          <MiniMetric label="Referidos" value={String(row.referredTotal)} />
        </div>

        <div className="mt-3 rounded-2xl border border-black/10 bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-black/35">
                Citas instantáneas
              </div>

              <div className="mt-1 text-xs font-black text-black">
                {Number(row.instantAppointmentsTotal || 0).toLocaleString(
                  "es-CO"
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-wide text-black/35">
                Bono IDC
              </div>

              <div
                className={[
                  "mt-1 text-xs font-black",
                  hasInstantBonus ? "text-[#0B5ED7]" : "text-black/45",
                ].join(" ")}
              >
                +{formatBonus(row.instantAppointmentBonus)} pts
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-black/45">
          El IDC integra efectividad, aporte a ventas, aporte económico, aporte
          a referidos y control de resets.
        </p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-black/35">
        {label}
      </div>

      <div className="mt-1 truncate text-xs font-black text-black">{value}</div>
    </div>
  );
}

function getPlaceConfig(place: number) {
  if (place === 1) {
    return {
      icon: "1",
      border: "border-amber-200",
      bg: "bg-amber-400",
      badge: "bg-amber-100 text-amber-800",
    };
  }

  if (place === 2) {
    return {
      icon: "2",
      border: "border-slate-200",
      bg: "bg-slate-400",
      badge: "bg-slate-100 text-slate-800",
    };
  }

  return {
    icon: "3",
    border: "border-orange-200",
    bg: "bg-orange-400",
    badge: "bg-orange-100 text-orange-800",
  };
}