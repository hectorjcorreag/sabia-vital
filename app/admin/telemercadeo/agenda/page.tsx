"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { ArrowLeft, CalendarDays, Loader2, RefreshCw } from "lucide-react";

import { db } from "@/lib/firebase";
import AdminAppointmentsCalendar from "@/components/admin/telemercadeo/AdminAppointmentsCalendar";
import AppointmentDetailsModal from "@/components/admin/telemercadeo/AppointmentDetailsModal";
import CalendarFilters from "@/components/admin/telemercadeo/CalendarFilters";
import CalendarToolbar from "@/components/admin/telemercadeo/CalendarToolbar";
import type {
  Appointment,
  AppointmentStatus,
  CalendarViewMode,
  SellerOption,
} from "@/components/admin/telemercadeo/agendaTypes";
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDate,
} from "@/components/admin/telemercadeo/agendaUtils";

export default function AdminTelemarketingAgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedSellerId, setSelectedSellerId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  async function loadAppointments() {
    setLoading(true);
    setError("");

    try {
      const appointmentsSnap = await getDocs(
        query(collection(db, "appointments"), orderBy("appointmentAt", "asc"))
      );

      const appointmentsData: Appointment[] = appointmentsSnap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        return {
          id: docSnap.id,

          customerId: raw.customerId || "",
          customerName: raw.customerName || raw.fullName || "Sin cliente",
          customerPhone: raw.customerPhone || raw.phone || "",

          sellerId: raw.sellerId || raw.assignedSellerId || "",
          sellerName: raw.sellerName || raw.assignedSellerName || "Sin vendedor",

          merchandiserId: raw.merchandiserId || raw.assignedMerchandiserId || "",
          merchandiserName: raw.merchandiserName || raw.assignedMerchandiserName || "Sin mercaderista",

          appointmentAt: raw.appointmentAt || null,
          appointmentDateKey: raw.appointmentDateKey || "",
          appointmentMonthKey: raw.appointmentMonthKey || "",

          status: raw.status || "agendada",

          city: raw.city || "",
          address: raw.address || "",
          notes: raw.notes || "",
          observations: raw.observations || raw.observation || "",

          createdAt: raw.createdAt || null,
        };
      });

      setAppointments(appointmentsData);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible cargar la agenda de citas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const sellers = useMemo<SellerOption[]>(() => {
    const map = new Map<string, string>();

    appointments.forEach((appointment) => {
      if (appointment.sellerId) {
        map.set(appointment.sellerId, appointment.sellerName || "Sin vendedor");
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments]);

  const sellerOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    sellers.forEach((seller, index) => map.set(seller.id, index));
    return map;
  }, [sellers]);

  const filteredAppointments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const appointmentDate = toDate(appointment.appointmentAt);
      if (!appointmentDate) return false;

      const range = getVisibleRange(currentDate, viewMode);
      if (appointmentDate < range.start || appointmentDate > range.end) return false;

      if (selectedSellerId !== "all" && appointment.sellerId !== selectedSellerId) {
        return false;
      }

      if (selectedStatus !== "all" && appointment.status !== selectedStatus) {
        return false;
      }

      if (search) {
        const haystack = [
          appointment.customerName,
          appointment.customerPhone,
          appointment.sellerName,
          appointment.merchandiserName,
          appointment.city,
          appointment.address,
          appointment.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [appointments, currentDate, viewMode, selectedSellerId, selectedStatus, searchTerm]);

  const visibleMetrics = useMemo(() => {
    return {
      total: filteredAppointments.length,
      confirmed: filteredAppointments.filter((item) => item.status === "confirmada").length,
      completed: filteredAppointments.filter(
        (item) => item.status === "realizada" || item.status === "venta_realizada"
      ).length,
      canceled: filteredAppointments.filter(
        (item) => item.status === "cancelada" || item.status === "no_asistio"
      ).length,
    };
  }, [filteredAppointments]);

  function handlePrevious() {
    if (viewMode === "day") setCurrentDate((date) => addDays(date, -1));
    if (viewMode === "week") setCurrentDate((date) => addDays(date, -7));
    if (viewMode === "month") setCurrentDate((date) => addMonths(date, -1));
  }

  function handleNext() {
    if (viewMode === "day") setCurrentDate((date) => addDays(date, 1));
    if (viewMode === "week") setCurrentDate((date) => addDays(date, 7));
    if (viewMode === "month") setCurrentDate((date) => addMonths(date, 1));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-6 text-white shadow-lg">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
                <CalendarDays className="h-4 w-4" />
                Agenda administrativa
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Calendario de citas
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
                Visualiza las citas comerciales de todos los vendedores, filtra por responsable y abre cada cita para consultar sus detalles.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/admin/telemercadeo"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al tablero
              </Link>

              <button
                type="button"
                onClick={loadAppointments}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Citas visibles" value={visibleMetrics.total} />
          <Metric label="Confirmadas" value={visibleMetrics.confirmed} />
          <Metric label="Realizadas / venta" value={visibleMetrics.completed} />
          <Metric label="Canceladas / no asistió" value={visibleMetrics.canceled} />
        </section>

        <CalendarFilters
          sellers={sellers}
          selectedSellerId={selectedSellerId}
          selectedStatus={selectedStatus}
          searchTerm={searchTerm}
          onSellerChange={setSelectedSellerId}
          onStatusChange={setSelectedStatus}
          onSearchChange={setSearchTerm}
        />

        <CalendarToolbar
          currentDate={currentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onToday={() => setCurrentDate(new Date())}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              Cargando agenda de citas...
            </p>
          </section>
        ) : (
          <AdminAppointmentsCalendar
            appointments={filteredAppointments}
            currentDate={currentDate}
            viewMode={viewMode}
            sellerOrderMap={sellerOrderMap}
            onSelectAppointment={setSelectedAppointment}
          />
        )}
      </section>

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function getVisibleRange(date: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  if (viewMode === "week") {
    return {
      start: startOfWeek(date),
      end: endOfWeek(date),
    };
  }

  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}