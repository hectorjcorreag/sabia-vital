"use client";

type Props = {
  exporting?: boolean;
  disabled?: boolean;
  onExportExcel: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
};

export function RankingExportButtons({
  exporting = false,
  disabled = false,
  onExportExcel,
  onExportPNG,
  onExportPDF,
}: Props) {
  const isDisabled = exporting || disabled;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onExportExcel}
        disabled={isDisabled}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Exportar Excel
      </button>

      <button
        type="button"
        onClick={onExportPNG}
        disabled={isDisabled}
        className="rounded-xl bg-[#0B5ED7] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0A54C2] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? "Exportando..." : "Exportar PNG"}
      </button>

      <button
        type="button"
        onClick={onExportPDF}
        disabled={isDisabled}
        className="rounded-xl bg-black px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Exportar PDF
      </button>
    </div>
  );
}