import type { Customer, CustomerCallLog } from "./customerTypes";

export const CUSTOMER_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "new", label: "Nuevo" },
  { value: "pending", label: "Pendiente" },
  { value: "contacted", label: "Contactado" },
  { value: "not_answered", label: "No contestó" },
  { value: "interested", label: "Interesado" },
  { value: "not_interested", label: "No interesado" },
  { value: "appointment_scheduled", label: "Cita agendada" },
  { value: "converted", label: "Convertido" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "discarded", label: "Descartado" },
  { value: "duplicate", label: "Duplicado" },
];

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "referral", label: "Referidos" },
  { value: "customer", label: "Clientes" },
  { value: "client", label: "Clientes" },
  { value: "prospect", label: "Prospectos" },
  { value: "active_customer", label: "Clientes activos" },
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

export function formatDateTime(value: any) {
  const date = toDate(value);

  if (!date) return "Sin registro";

  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(value?: number) {
  const amount = Number(value || 0);

  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export function getCustomerName(customer: Customer) {
  return customer.fullName?.trim() || "Sin nombre";
}

export function getCustomerPhone(customer: Customer) {
  return (
    customer.phone?.trim() ||
    customer.phoneNormalized?.trim() ||
    customer.secondaryPhone?.trim() ||
    customer.secondaryPhoneNormalized?.trim() ||
    "Sin teléfono"
  );
}

export function getCustomerStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    new: "Nuevo",
    pending: "Pendiente",
    contacted: "Contactado",
    not_answered: "No contestó",
    interested: "Interesado",
    not_interested: "No interesado",
    appointment_scheduled: "Cita agendada",
    converted: "Convertido",
    active: "Activo",
    inactive: "Inactivo",
    discarded: "Descartado",
    duplicate: "Duplicado",

    nuevo: "Nuevo",
    pendiente: "Pendiente",
    contactado: "Contactado",
    no_contesta: "No contestó",
    interesado: "Interesado",
    no_interesado: "No interesado",
    cita_agendada: "Cita agendada",
    convertido: "Convertido",
    activo: "Activo",
    inactivo: "Inactivo",
    descartado: "Descartado",
    duplicado: "Duplicado",
  };

  return labels[status || ""] || status || "Sin estado";
}

export function getCustomerTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    referral: "Referido",
    customer: "Cliente",
    client: "Cliente",
    prospect: "Prospecto",
    active_customer: "Cliente activo",

    referido: "Referido",
    cliente: "Cliente",
    prospecto: "Prospecto",
  };

  return labels[type || ""] || type || "Sin tipo";
}

export function getStatusBadgeClass(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (["active", "activo", "converted", "convertido"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (["interested", "interesado", "appointment_scheduled", "cita_agendada"].includes(normalized)) {
    return "border-lime-200 bg-lime-50 text-lime-800";
  }

  if (["contacted", "contactado"].includes(normalized)) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (["not_answered", "no_contesta", "pending", "pendiente", "new", "nuevo"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (["not_interested", "no_interesado", "discarded", "descartado", "inactive", "inactivo"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (["duplicate", "duplicado"].includes(normalized)) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getCallResultLabel(log: CustomerCallLog) {
  return (
    getCustomerStatusLabel(log.newStatus) ||
    log.result ||
    "Gestión registrada"
  );
}

export function sortCustomersByLastActivity(a: Customer, b: Customer) {
  const dateA =
    toDate(a.lastCallAt)?.getTime() ||
    toDate(a.updatedAt)?.getTime() ||
    toDate(a.createdAt)?.getTime() ||
    0;

  const dateB =
    toDate(b.lastCallAt)?.getTime() ||
    toDate(b.updatedAt)?.getTime() ||
    toDate(b.createdAt)?.getTime() ||
    0;

  return dateB - dateA;
}

export function sortCallLogsDesc(a: CustomerCallLog, b: CustomerCallLog) {
  const dateA =
    toDate(a.callAt)?.getTime() || toDate(a.createdAt)?.getTime() || 0;

  const dateB =
    toDate(b.callAt)?.getTime() || toDate(b.createdAt)?.getTime() || 0;

  return dateB - dateA;
}

export function customerMatchesSearch(customer: Customer, search: string) {
  const term = search.trim().toLowerCase();

  if (!term) return true;

  const haystack = [
    customer.fullName,
    customer.phone,
    customer.phoneNormalized,
    customer.secondaryPhone,
    customer.secondaryPhoneNormalized,
    customer.email,
    customer.city,
    customer.address,
    customer.assignedSellerName,
    customer.assignedMerchandiserName,
    customer.customerStatus,
    customer.customerType,
    customer.lastCallResult,
    customer.lastObservation,
    customer.origin,
    customer.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}