"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  BarChart3,
  CalendarCheck,
  Filter,
  Loader2,
  PhoneCall,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { UsersRound } from "lucide-react";

type CustomerStatus =
  | "nuevo"
  | "pendiente_contacto"
  | "llamar_despues"
  | "cita_agendada"
  | "no_interesado"
  | "cliente_activo"
  | "inactivo"
  | "duplicado_revision";

type CustomerType = "referido" | "cliente_activo";

type Customer = {
  id: string;
  fullName: string;
  phone?: string;
  city?: string;

  customerType: CustomerType;
  customerStatus: CustomerStatus;

  assignedSellerId?: string;
  assignedSellerName?: string;

  assignedMerchandiserId?: string;
  assignedMerchandiserName?: string;

  hasAppointment?: boolean;
  hasPurchase?: boolean;

  callAttempts?: number;
  lastCallResult?: string;

  createdAt?: any;
  createdDateKey?: string;
  createdMonthKey?: string;
};

type AppointmentStatus =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "no_asistio"
  | "reprogramada"
  | "venta_realizada";

type Appointment = {
  id: string;

  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  sellerId?: string;
  sellerName?: string;

  merchandiserId?: string;
  merchandiserName?: string;

  appointmentAt?: any;
  appointmentDateKey?: string;
  appointmentMonthKey?: string;

  status: AppointmentStatus;

  city?: string;
  address?: string;

  createdAt?: any;
};

type FilterState = {
  year: string;
  month: string;
  quarter: string;
  sellerId: string;
  merchandiserId: string;
};

const MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const QUARTERS = [
  { value: "1", label: "Trimestre 1", months: ["01", "02", "03"] },
  { value: "2", label: "Trimestre 2", months: ["04", "05", "06"] },
  { value: "3", label: "Trimestre 3", months: ["07", "08", "09"] },
  { value: "4", label: "Trimestre 4", months: ["10", "11", "12"] },
];

function toDate(value: any) {
  if (!value) return null;

  try {
    if (value.toDate) return value.toDate() as Date;
    return new Date(value);
  } catch {
    return null;
  }
}

function getYearFromAny(item: {
  createdAt?: any;
  createdDateKey?: string;
  appointmentAt?: any;
  appointmentDateKey?: string;
}) {
  const key = item.createdDateKey || item.appointmentDateKey;

  if (key && key.length >= 4) {
    return key.slice(0, 4);
  }

  const date = toDate(item.createdAt || item.appointmentAt);

  if (!date) return "";

  return String(date.getFullYear());
}

function getMonthFromAny(item: {
  createdAt?: any;
  createdDateKey?: string;
  createdMonthKey?: string;
  appointmentAt?: any;
  appointmentDateKey?: string;
  appointmentMonthKey?: string;
}) {
  const monthKey = item.createdMonthKey || item.appointmentMonthKey;

  if (monthKey && monthKey.length >= 7) {
    return monthKey.slice(5, 7);
  }

  const dateKey = item.createdDateKey || item.appointmentDateKey;

  if (dateKey && dateKey.length >= 7) {
    return dateKey.slice(5, 7);
  }

  const date = toDate(item.createdAt || item.appointmentAt);

  if (!date) return "";

  return String(date.getMonth() + 1).padStart(2, "0");
}

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    nuevo: "Nuevo",
    pendiente_contacto: "Pendiente contacto",
    llamar_despues: "Llamar después",
    cita_agendada: "Cita agendada",
    no_interesado: "No interesado",
    cliente_activo: "Cliente activo",
    inactivo: "Inactivo",
    duplicado_revision: "Duplicado revisión",

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

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function currentYear() {
  return String(new Date().getFullYear());
}

export default function AdminTelemarketingPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<FilterState>({
    year: currentYear(),
    month: "all",
    quarter: "all",
    sellerId: "all",
    merchandiserId: "all",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customersSnap, appointmentsSnap] = await Promise.all([
        getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc"))),
        getDocs(
          query(collection(db, "appointments"), orderBy("appointmentAt", "desc"))
        ),
      ]);

      const customersData: Customer[] = customersSnap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        return {
          id: docSnap.id,
          fullName: raw.fullName || "Sin nombre",
          phone: raw.phone || "",
          city: raw.city || "",

          customerType: raw.customerType || "referido",
          customerStatus: raw.customerStatus || "nuevo",

          assignedSellerId: raw.assignedSellerId || "",
          assignedSellerName: raw.assignedSellerName || "Sin vendedor",

          assignedMerchandiserId: raw.assignedMerchandiserId || "",
          assignedMerchandiserName:
            raw.assignedMerchandiserName || "Sin mercaderista",

          hasAppointment: Boolean(raw.hasAppointment),
          hasPurchase: Boolean(raw.hasPurchase),

          callAttempts: Number(raw.callAttempts || 0),
          lastCallResult: raw.lastCallResult || "",

          createdAt: raw.createdAt || null,
          createdDateKey: raw.createdDateKey || "",
          createdMonthKey: raw.createdMonthKey || "",
        };
      });

      const appointmentsData: Appointment[] = appointmentsSnap.docs.map(
        (docSnap) => {
          const raw = docSnap.data() as any;

          return {
            id: docSnap.id,

            customerId: raw.customerId || "",
            customerName: raw.customerName || "Sin cliente",
            customerPhone: raw.customerPhone || "",

            sellerId: raw.sellerId || "",
            sellerName: raw.sellerName || "Sin vendedor",

            merchandiserId: raw.merchandiserId || "",
            merchandiserName: raw.merchandiserName || "Sin mercaderista",

            appointmentAt: raw.appointmentAt || null,
            appointmentDateKey: raw.appointmentDateKey || "",
            appointmentMonthKey: raw.appointmentMonthKey || "",

            status: raw.status || "agendada",

            city: raw.city || "",
            address: raw.address || "",

            createdAt: raw.createdAt || null,
          };
        }
      );

      setCustomers(customersData);
      setAppointments(appointmentsData);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
        "No fue posible cargar las estadísticas de telemercadeo."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const years = useMemo(() => {
    const values = new Set<string>();

    customers.forEach((item) => {
      const year = getYearFromAny(item);
      if (year) values.add(year);
    });

    appointments.forEach((item) => {
      const year = getYearFromAny(item);
      if (year) values.add(year);
    });

    if (values.size === 0) {
      values.add(currentYear());
    }

    return Array.from(values).sort((a, b) => Number(b) - Number(a));
  }, [customers, appointments]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();

    customers.forEach((item) => {
      if (item.assignedSellerId) {
        map.set(item.assignedSellerId, item.assignedSellerName || "Sin vendedor");
      }
    });

    appointments.forEach((item) => {
      if (item.sellerId) {
        map.set(item.sellerId, item.sellerName || "Sin vendedor");
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, appointments]);

  const merchandisers = useMemo(() => {
    const map = new Map<string, string>();

    customers.forEach((item) => {
      if (item.assignedMerchandiserId) {
        map.set(
          item.assignedMerchandiserId,
          item.assignedMerchandiserName || "Sin mercaderista"
        );
      }
    });

    appointments.forEach((item) => {
      if (item.merchandiserId) {
        map.set(
          item.merchandiserId,
          item.merchandiserName || "Sin mercaderista"
        );
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, appointments]);

  function passesPeriodFilter(item: {
    createdAt?: any;
    createdDateKey?: string;
    createdMonthKey?: string;
    appointmentAt?: any;
    appointmentDateKey?: string;
    appointmentMonthKey?: string;
  }) {
    const year = getYearFromAny(item);
    const month = getMonthFromAny(item);

    if (filters.year !== "all" && year !== filters.year) {
      return false;
    }

    if (filters.month !== "all" && month !== filters.month) {
      return false;
    }

    if (filters.quarter !== "all") {
      const quarter = QUARTERS.find((item) => item.value === filters.quarter);

      if (quarter && !quarter.months.includes(month)) {
        return false;
      }
    }

    return true;
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((item) => {
      if (!passesPeriodFilter(item)) return false;

      if (
        filters.sellerId !== "all" &&
        item.assignedSellerId !== filters.sellerId
      ) {
        return false;
      }

      if (
        filters.merchandiserId !== "all" &&
        item.assignedMerchandiserId !== filters.merchandiserId
      ) {
        return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, filters]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      if (!passesPeriodFilter(item)) return false;

      if (filters.sellerId !== "all" && item.sellerId !== filters.sellerId) {
        return false;
      }

      if (
        filters.merchandiserId !== "all" &&
        item.merchandiserId !== filters.merchandiserId
      ) {
        return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, filters]);

  const metrics = useMemo(() => {
    const referrals = filteredCustomers.filter(
      (item) => item.customerType === "referido"
    );

    const activeCustomers = filteredCustomers.filter(
      (item) =>
        item.customerType === "cliente_activo" ||
        item.customerStatus === "cliente_activo" ||
        item.hasPurchase
    );

    const contacted = filteredCustomers.filter(
      (item) =>
        Number(item.callAttempts || 0) > 0 ||
        Boolean(item.lastCallResult) ||
        [
          "pendiente_contacto",
          "llamar_despues",
          "cita_agendada",
          "no_interesado",
          "cliente_activo",
          "inactivo",
        ].includes(item.customerStatus)
    );

    const notInterested = filteredCustomers.filter(
      (item) => item.customerStatus === "no_interesado"
    );

    const callLater = filteredCustomers.filter(
      (item) => item.customerStatus === "llamar_despues"
    );

    const wrongNumber = filteredCustomers.filter(
      (item) => item.customerStatus === "inactivo"
    );

    const totalCalls = filteredCustomers.reduce(
      (total, item) => total + Number(item.callAttempts || 0),
      0
    );

    const generatedAppointments = filteredAppointments.length;

    const confirmedAppointments = filteredAppointments.filter(
      (item) => item.status === "confirmada"
    ).length;

    const completedAppointments = filteredAppointments.filter(
      (item) =>
        item.status === "realizada" || item.status === "venta_realizada"
    ).length;

    const salesFromAppointments = filteredAppointments.filter(
      (item) => item.status === "venta_realizada"
    ).length;

    return {
      referrals: referrals.length,
      activeCustomers: activeCustomers.length,
      contacted: contacted.length,
      notInterested: notInterested.length,
      callLater: callLater.length,
      wrongNumber: wrongNumber.length,
      totalCalls,
      generatedAppointments,
      confirmedAppointments,
      completedAppointments,
      salesFromAppointments,

      contactRate: percent(contacted.length, filteredCustomers.length),
      appointmentRate: percent(generatedAppointments, contacted.length),
      salesRate: percent(salesFromAppointments, generatedAppointments),
    };
  }, [filteredCustomers, filteredAppointments]);

  const customerStatusData = useMemo(() => {
    const map = new Map<string, number>();

    filteredCustomers.forEach((item) => {
      map.set(item.customerStatus, (map.get(item.customerStatus) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([label, value]) => ({
        label: getStatusLabel(label),
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCustomers]);

  const appointmentStatusData = useMemo(() => {
    const map = new Map<string, number>();

    filteredAppointments.forEach((item) => {
      map.set(item.status, (map.get(item.status) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([label, value]) => ({
        label: getStatusLabel(label),
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAppointments]);

  const sellersRanking = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        referrals: number;
        appointments: number;
        sales: number;
      }
    >();

    filteredCustomers.forEach((item) => {
      const id = item.assignedSellerId || "sin_vendedor";
      const current = map.get(id) || {
        id,
        name: item.assignedSellerName || "Sin vendedor",
        referrals: 0,
        appointments: 0,
        sales: 0,
      };

      current.referrals += 1;

      if (
        item.customerType === "cliente_activo" ||
        item.customerStatus === "cliente_activo" ||
        item.hasPurchase
      ) {
        current.sales += 1;
      }

      map.set(id, current);
    });

    filteredAppointments.forEach((item) => {
      const id = item.sellerId || "sin_vendedor";
      const current = map.get(id) || {
        id,
        name: item.sellerName || "Sin vendedor",
        referrals: 0,
        appointments: 0,
        sales: 0,
      };

      current.appointments += 1;

      if (item.status === "venta_realizada") {
        current.sales += 1;
      }

      map.set(id, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.appointments - a.appointments || b.referrals - a.referrals)
      .slice(0, 8);
  }, [filteredCustomers, filteredAppointments]);

  const merchandiserRanking = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        referrals: number;
        appointments: number;
        contacted: number;
      }
    >();

    filteredCustomers.forEach((item) => {
      const id = item.assignedMerchandiserId || "sin_mercaderista";
      const current = map.get(id) || {
        id,
        name: item.assignedMerchandiserName || "Sin mercaderista",
        referrals: 0,
        appointments: 0,
        contacted: 0,
      };

      current.referrals += 1;

      if (Number(item.callAttempts || 0) > 0 || item.lastCallResult) {
        current.contacted += 1;
      }

      map.set(id, current);
    });

    filteredAppointments.forEach((item) => {
      const id = item.merchandiserId || "sin_mercaderista";
      const current = map.get(id) || {
        id,
        name: item.merchandiserName || "Sin mercaderista",
        referrals: 0,
        appointments: 0,
        contacted: 0,
      };

      current.appointments += 1;

      map.set(id, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.appointments - a.appointments || b.referrals - a.referrals)
      .slice(0, 8);
  }, [filteredCustomers, filteredAppointments]);

  function updateFilter<K extends keyof FilterState>(
    field: K,
    value: FilterState[K]
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "month" && value !== "all" ? { quarter: "all" } : {}),
      ...(field === "quarter" && value !== "all" ? { month: "all" } : {}),
    }));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-6 text-white shadow-lg">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
            <PhoneCall className="h-4 w-4" />
            Seguimiento comercial
          </p>

          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Telemercadeo
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
            Controla la gestión de referidos, llamadas, citas y conversión
            comercial generada por mercaderistas y vendedores.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}
        <Link
          href="/admin/telemercadeo/clientes"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          <UsersRound className="h-4 w-4" />
          Clientes y referidos
        </Link>
        <Link
          href="/admin/telemercadeo/agenda"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          <CalendarDays className="h-4 w-4" />
          Ver agenda de citas
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-700" />
                <h2 className="text-xl font-black text-slate-950">
                  Filtros
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Filtra por periodo, mercaderista o vendedor.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Año">
              <select
                value={filters.year}
                onChange={(event) => updateFilter("year", event.target.value)}
                className="input"
              >
                <option value="all">Todos</option>

                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mes">
              <select
                value={filters.month}
                onChange={(event) => updateFilter("month", event.target.value)}
                className="input"
              >
                <option value="all">Todos</option>

                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Trimestre">
              <select
                value={filters.quarter}
                onChange={(event) =>
                  updateFilter("quarter", event.target.value)
                }
                className="input"
              >
                <option value="all">Todos</option>

                {QUARTERS.map((quarter) => (
                  <option key={quarter.value} value={quarter.value}>
                    {quarter.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mercaderista">
              <select
                value={filters.merchandiserId}
                onChange={(event) =>
                  updateFilter("merchandiserId", event.target.value)
                }
                className="input"
              >
                <option value="all">Todas</option>

                {merchandisers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vendedor">
              <select
                value={filters.sellerId}
                onChange={(event) =>
                  updateFilter("sellerId", event.target.value)
                }
                className="input"
              >
                <option value="all">Todos</option>

                {sellers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              Cargando tablero de telemercadeo...
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Referidos"
                value={metrics.referrals}
                description="Ingresados al sistema"
                icon={<Users className="h-5 w-5" />}
              />

              <MetricCard
                title="Contactados"
                value={metrics.contacted}
                description={`Tasa de contacto ${formatPercent(
                  metrics.contactRate
                )}`}
                icon={<PhoneCall className="h-5 w-5" />}
              />

              <MetricCard
                title="Citas generadas"
                value={metrics.generatedAppointments}
                description={`Tasa cita/contacto ${formatPercent(
                  metrics.appointmentRate
                )}`}
                icon={<CalendarCheck className="h-5 w-5" />}
              />

              <MetricCard
                title="Ventas desde cita"
                value={metrics.salesFromAppointments}
                description={`Conversión ${formatPercent(metrics.salesRate)}`}
                icon={<TrendingUp className="h-5 w-5" />}
                highlight
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SmallMetric
                label="Llamadas registradas"
                value={metrics.totalCalls}
              />

              <SmallMetric
                label="Llamar después"
                value={metrics.callLater}
              />

              <SmallMetric
                label="No interesados"
                value={metrics.notInterested}
              />

              <SmallMetric
                label="Números inactivos"
                value={metrics.wrongNumber}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <ChartCard
                title="Estado de referidos"
                description="Distribución actual de clientes/referidos."
                data={customerStatusData}
              />

              <ChartCard
                title="Estado de citas"
                description="Seguimiento del avance de citas comerciales."
                data={appointmentStatusData}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <RankingCard
                title="Ranking de vendedores"
                description="Referidos, citas y ventas asociadas."
                rows={sellersRanking.map((item) => ({
                  id: item.id,
                  name: item.name,
                  primary: item.appointments,
                  primaryLabel: "citas",
                  secondary: `${item.referrals} referidos · ${item.sales} ventas`,
                }))}
              />

              <RankingCard
                title="Ranking de mercaderistas"
                description="Referidos gestionados y citas generadas."
                rows={merchandiserRanking.map((item) => ({
                  id: item.id,
                  name: item.name,
                  primary: item.appointments,
                  primaryLabel: "citas",
                  secondary: `${item.referrals} referidos · ${item.contacted} contactados`,
                }))}
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-700" />
                <h2 className="text-xl font-black text-slate-950">
                  Embudo comercial
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <FunnelStep
                  label="Referidos"
                  value={metrics.referrals}
                  percentValue={100}
                />

                <FunnelStep
                  label="Contactados"
                  value={metrics.contacted}
                  percentValue={metrics.contactRate}
                />

                <FunnelStep
                  label="Citas"
                  value={metrics.generatedAppointments}
                  percentValue={metrics.appointmentRate}
                />

                <FunnelStep
                  label="Ventas"
                  value={metrics.salesFromAppointments}
                  percentValue={metrics.salesRate}
                />
              </div>
            </section>
          </>
        )}
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.65rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: rgb(16 185 129);
          background: white;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>

      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${highlight
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-white"
        }`}
    >
      <div
        className={`mb-4 inline-flex rounded-2xl p-3 ${highlight ? "bg-white text-emerald-700" : "bg-emerald-50 text-emerald-700"
          }`}
      >
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function ChartCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 space-y-4">
        {data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
            No hay datos para mostrar.
          </p>
        ) : (
          data.map((item) => {
            const width = Math.max(8, Math.round((item.value / max) * 100));

            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-700">
                    {item.label}
                  </p>

                  <p className="text-sm font-black text-slate-500">
                    {item.value} · {formatPercent(percent(item.value, total))}
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

function RankingCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: {
    id: string;
    name: string;
    primary: number;
    primaryLabel: string;
    secondary: string;
  }[];
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
            No hay datos para mostrar.
          </p>
        ) : (
          rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-700 text-sm font-black text-white">
                  {index + 1}
                </div>

                <div>
                  <p className="font-black text-slate-950">{row.name}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {row.secondary}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-black text-emerald-700">
                  {row.primary}
                </p>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {row.primaryLabel}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function FunnelStep({
  label,
  value,
  percentValue,
}: {
  label: string;
  value: number;
  percentValue: number;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${Math.max(5, percentValue)}%` }}
        />
      </div>

      <p className="mt-2 text-sm font-bold text-emerald-700">
        {formatPercent(percentValue)}
      </p>
    </article>
  );
}