import type { AppointmentStatus } from "./agendaTypes";

export const APPOINTMENT_STATUS_OPTIONS: {
  value: AppointmentStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "Todos los estados" },
  { value: "agendada", label: "Agendada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_asistio", label: "No asistió" },
  { value: "reprogramada", label: "Reprogramada" },
  { value: "venta_realizada", label: "Venta realizada" },
];

export const WEEK_DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const WEEK_DAYS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function toDate(value: any): Date | null {
  if (!value) return null;

  try {
    if (value.toDate) return value.toDate() as Date;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date;
  } catch {
    return null;
  }
}

export function startOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

export function endOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
}

export function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

export function addMonths(date: Date, months: number) {
  const clone = new Date(date);
  clone.setMonth(clone.getMonth() + months);
  return clone;
}

export function startOfWeek(date: Date) {
  const clone = startOfDay(date);
  const day = clone.getDay();
  return addDays(clone, -day);
}

export function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDate(date: Date | null) {
  if (!date) return "Sin fecha";

  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(date: Date | null) {
  if (!date) return "Sin hora";

  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRangeLabel(date: Date, viewMode: "day" | "week" | "month") {
  if (viewMode === "day") {
    return `${formatDate(date)}`;
  }

  if (viewMode === "week") {
    const start = startOfWeek(date);
    const end = endOfWeek(date);

    return `${start.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    })} - ${end.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }

  return `${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

export function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    agendada: "Agendada",
    confirmada: "Confirmada",
    realizada: "Realizada",
    cancelada: "Cancelada",
    no_asistio: "No asistió",
    reprogramada: "Reprogramada",
    venta_realizada: "Venta realizada",
  };

  return labels[status || ""] || status || "Sin estado";
}

export function getStatusClass(status?: string) {
  const classes: Record<string, string> = {
    agendada: "border-sky-200 bg-sky-50 text-sky-800",
    confirmada: "border-emerald-200 bg-emerald-50 text-emerald-800",
    realizada: "border-lime-200 bg-lime-50 text-lime-800",
    cancelada: "border-red-200 bg-red-50 text-red-700",
    no_asistio: "border-orange-200 bg-orange-50 text-orange-800",
    reprogramada: "border-violet-200 bg-violet-50 text-violet-800",
    venta_realizada: "border-teal-200 bg-teal-50 text-teal-800",
  };

  return classes[status || ""] || "border-slate-200 bg-slate-50 text-slate-700";
}

export function sellerAccentClass(index: number) {
  const classes = [
    "border-l-emerald-600",
    "border-l-lime-600",
    "border-l-sky-600",
    "border-l-violet-600",
    "border-l-amber-600",
    "border-l-rose-600",
    "border-l-cyan-600",
    "border-l-fuchsia-600",
  ];

  return classes[index % classes.length];
}