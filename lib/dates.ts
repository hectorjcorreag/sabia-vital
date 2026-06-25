// lib/dates.ts
export function bogotaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find(p => p.type === "year")?.value ?? "0000";
  const m = parts.find(p => p.type === "month")?.value ?? "00";
  const d = parts.find(p => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

export function bogotaMonthKey(date = new Date()): string {
  const dayKey = bogotaDateKey(date); // YYYY-MM-DD
  return dayKey.slice(0, 7);          // YYYY-MM
}