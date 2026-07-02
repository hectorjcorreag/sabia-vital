"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import type { CalendarViewMode } from "./agendaTypes";
import { formatRangeLabel } from "./agendaUtils";

const VIEW_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export default function CalendarToolbar({
  currentDate,
  viewMode,
  onViewModeChange,
  onToday,
  onPrevious,
  onNext,
}: {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (value: CalendarViewMode) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-black capitalize text-slate-950">
              {formatRangeLabel(currentDate, viewMode)}
            </h2>

            <p className="text-sm text-slate-500">
              Agenda administrativa de citas comerciales.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewModeChange(option.value)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  viewMode === option.value
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-950"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onToday}
              className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={onNext}
              className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}