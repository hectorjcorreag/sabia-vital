"use client";

import { useEffect, useMemo, useState } from "react";

export function PhotoUploader({
  label = "Foto",
  required = true,
  valueFile,
  valueUrl,
  onChangeFile,
  hint = "Recomendado: rostro visible, buena iluminación.",
}: {
  label?: string;
  required?: boolean;
  valueFile: File | null;
  valueUrl?: string | null; // foto actual (si está editando)
  onChangeFile: (f: File | null) => void;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(valueUrl ?? null);

  useEffect(() => {
    // cuando llega url desde afuera (editar), actualiza
    if (!valueFile && valueUrl) setPreview(valueUrl);
  }, [valueUrl, valueFile]);

  useEffect(() => {
    if (!valueFile) return;
    const url = URL.createObjectURL(valueFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [valueFile]);

  const badge = useMemo(() => (required ? "Obligatoria" : "Opcional"), [required]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">
            {label}{" "}
            <span className="ml-2 rounded-full bg-[#FFF6EF] px-2 py-0.5 text-[11px] font-black text-[#FF6A00]">
              {badge}
            </span>
          </p>
          <p className="mt-1 text-xs text-black/60">{hint}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
        {/* Preview */}
        <div className="flex items-center justify-center">
          <div className="relative h-36 w-36 overflow-hidden rounded-3xl border border-black/10 bg-black/5 shadow-sm">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-bold text-black/50">
                Sin foto
              </div>
            )}
            <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white">
              900px · webp
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#0B3D91] px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:opacity-95">
            Subir foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onChangeFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="button"
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-extrabold hover:bg-black/5"
            onClick={() => onChangeFile(null)}
          >
            Quitar selección
          </button>

          <p className="text-xs text-black/60">
            La imagen se comprime automáticamente antes de subir (más rápida y ahorra almacenamiento).
          </p>
        </div>
      </div>
    </div>
  );
}