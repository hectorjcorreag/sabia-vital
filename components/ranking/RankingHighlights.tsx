"use client";

import type { RankingHighlight } from "./rankingTypes";
import { RankingAvatar } from "./RankingAvatar";

type Props = {
  highlights: RankingHighlight[];
};

export function RankingHighlights({ highlights }: Props) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-black text-black">
          Destacados del periodo
        </h2>

        <p className="text-sm text-black/50">
          Lectura rápida de los mejores resultados comerciales según el periodo,
          los filtros seleccionados y la metodología del IDC.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {highlights.map((item) => (
          <HighlightCard key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}

function HighlightCard({ item }: { item: RankingHighlight }) {
  const photoUrl = item.row?.photoUrl || "";
  const name = item.label || "Sin datos";

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-black/10 bg-[#F7F8FA] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#0B5ED7]/10 transition group-hover:bg-[#0B5ED7]/15" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-wide text-black/40">
            {item.title}
          </div>

          <RankingAvatar src={photoUrl} name={name} size="sm" rounded="2xl" />
        </div>

        <div className="text-2xl font-black tracking-tight text-black">
          {item.value}
        </div>

        <div className="mt-2 line-clamp-2 text-sm font-black leading-snug text-black/75">
          {name}
        </div>

        {item.helper ? (
          <div className="mt-1 text-xs font-semibold leading-relaxed text-black/45">
            {item.helper}
          </div>
        ) : null}

        {item.row ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniInfo label="IDC" value={`${formatSmall(item.row.scores.idc)}/100`} />
            <MiniInfo
              label="Citas inst."
              value={String(item.row.instantAppointmentsTotal || 0)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-black/35">
        {label}
      </div>

      <div className="mt-1 truncate text-xs font-black text-black">{value}</div>
    </div>
  );
}

function formatSmall(value: number) {
  const n = Math.round(Number(value || 0) * 10) / 10;

  if (Number.isInteger(n)) {
    return String(n);
  }

  return n.toFixed(1);
}