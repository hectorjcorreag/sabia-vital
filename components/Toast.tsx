"use client";

import { useEffect } from "react";

type ToastProps = {
  open: boolean;
  title: string;
  message?: string;
  variant?: "success" | "error" | "info";
  durationMs?: number;
  onClose: () => void;
};

export function Toast({
  open,
  title,
  message,
  variant = "success",
  durationMs = 1600,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : variant === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-slate-200 bg-slate-50 text-slate-900";

  const dot =
    variant === "success"
      ? "bg-emerald-500"
      : variant === "error"
      ? "bg-red-500"
      : "bg-slate-500";

  return (
    <div className="fixed right-4 top-4 z-50">
      <div className={`w-[360px] max-w-[90vw] rounded-2xl border p-4 shadow-lg ${styles}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-3 w-3 rounded-full ${dot}`} />
          <div className="flex-1">
            <div className="text-sm font-black">{title}</div>
            {message ? <div className="mt-1 text-xs opacity-80">{message}</div> : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-black hover:bg-black/5"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}