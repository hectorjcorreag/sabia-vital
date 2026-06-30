export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  pendiente_contacto: "Pendiente de contacto",
  llamar_despues: "Llamar después",
  cita_agendada: "Cita agendada",
  no_interesado: "No interesado",
  cliente_activo: "Cliente activo",
  inactivo: "Inactivo",
  duplicado_revision: "Duplicado en revisión",
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  referido: "Referido",
  cliente_activo: "Cliente activo",
};

export function todayBogotaKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${y}-${m}-${d}`;
}

export function monthKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function normalizePhone(phone: string) {
  const onlyDigits = phone.replace(/\D/g, "");

  if (onlyDigits.startsWith("57") && onlyDigits.length === 12) {
    return onlyDigits.slice(2);
  }

  return onlyDigits;
}

export function getSellerFullName(raw: any) {
  const firstName = raw.firstName || raw.personal?.firstName || "";
  const lastName = raw.lastName || raw.personal?.lastName || "";

  return (
    raw.sellerName ||
    raw.personal?.fullName ||
    raw.fullName ||
    raw.name ||
    `${firstName} ${lastName}`.trim() ||
    "Sin nombre"
  );
}

export function getUserDisplayName(raw: any, fallback: string) {
  const firstName = raw.firstName || raw.personal?.firstName || "";
  const lastName = raw.lastName || raw.personal?.lastName || "";

  return (
    raw.displayName ||
    raw.name ||
    raw.fullName ||
    raw.personal?.fullName ||
    `${firstName} ${lastName}`.trim() ||
    fallback
  );
}