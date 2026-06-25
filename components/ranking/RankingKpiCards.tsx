"use client";

import type { RankingKpis } from "./rankingTypes";
import { formatCOP, formatRate } from "./scoreEngine";

type Props = {
  kpis: RankingKpis;
};

export function RankingKpiCards({ kpis }: Props) {
  const cards = [
    {
      label: "Ventas totales",
      value: formatCOP(kpis.salesTotal),
      helper: `${kpis.salesCountTotal.toLocaleString("es-CO")} venta(s) registradas`,
      tone: "blue",
    },
    {
      label: "Visitas totales",
      value: kpis.visitsTotal.toLocaleString("es-CO"),
      helper: "Gestiones registradas en el periodo",
      tone: "neutral",
    },
    {
      label: "Visitas efectivas",
      value: kpis.visitsEffective.toLocaleString("es-CO"),
      helper: `${formatRate(kpis.effectiveRate)} de efectividad general`,
      tone: "green",
    },
    {
      label: "Resets",
      value: kpis.visitsReset.toLocaleString("es-CO"),
      helper: `${formatRate(kpis.resetRate)} sobre visitas totales`,
      tone: "amber",
    },
    {
      label: "Referidos",
      value: kpis.referredTotal.toLocaleString("es-CO"),
      helper: "Total de referidos registrados",
      tone: "purple",
    },
    {
      label: "Promedio venta/visita",
      value: formatCOP(kpis.avgSalePerVisit),
      helper: `Venta promedio: ${formatCOP(kpis.avgSale)}`,
      tone: "orange",
    },
    {
      label: "Ventas realizadas",
      value: kpis.salesCountTotal.toLocaleString("es-CO"),
      helper: "Base para calcular el aporte a ventas",
      tone: "green",
    },
    {
      label: "Control general de resets",
      value: formatRate(kpis.resetControl),
      helper: "1 - (resets / visitas totales)",
      tone: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCard
          key={card.label}
          label={card.label}
          value={card.value}
          helper={card.helper}
          tone={card.tone}
        />
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={[
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-15",
          toneClass(tone),
        ].join(" ")}
      />

      <div className="relative">
        <div className="text-xs font-black uppercase tracking-wide text-black/40">
          {label}
        </div>

        <div className="mt-2 text-2xl font-black tracking-tight text-black">
          {value}
        </div>

        <div className="mt-1 text-sm font-semibold text-black/50">
          {helper}
        </div>
      </div>
    </div>
  );
}

function toneClass(tone: string) {
  switch (tone) {
    case "blue":
      return "bg-[#0B5ED7]";
    case "green":
      return "bg-emerald-600";
    case "amber":
      return "bg-amber-500";
    case "purple":
      return "bg-violet-600";
    case "orange":
      return "bg-[#C86A2B]";
    default:
      return "bg-black";
  }
}