"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingCart,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";

type AppointmentStatus =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "no_asistio"
  | "reprogramada"
  | "venta_realizada";

type CalendarViewMode = "day" | "week" | "month";

type SellerProfile = {
  uid: string;
  profileId: string;
  name: string;
  role?: string;
};

type Appointment = {
  id: string;

  customerId: string;
  customerName: string;
  customerPhone: string;
  customerSecondaryPhone?: string;

  sellerId: string;
  sellerName: string;
  sellerUid?: string;

  merchandiserId?: string;
  merchandiserName?: string;
  merchandiserUid?: string;

  appointmentAt: any;
  appointmentDateKey?: string;
  appointmentMonthKey?: string;
  appointmentTime?: string;

  status: AppointmentStatus;

  address?: string;
  city?: string;
  notes?: string;

  createdAt?: any;
  updatedAt?: any;
};

const STATUS_OPTIONS: {
  value: "all" | AppointmentStatus;
  label: string;
}[] = [
  { value: "all", label: "Todas" },
  { value: "agendada", label: "Agendadas" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "realizada", label: "Realizadas" },
  { value: "venta_realizada", label: "Venta realizada" },
  { value: "no_asistio", label: "No asistió" },
  { value: "cancelada", label: "Canceladas" },
  { value: "reprogramada", label: "Reprogramadas" },
];

const WEEK_DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getStatusLabel(status?: string) {
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

function getStatusStyles(status?: string) {
  const value = status || "agendada";

  if (value === "confirmada") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "realizada") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "venta_realizada") {
    return "border-lime-200 bg-lime-50 text-lime-700";
  }

  if (value === "cancelada") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value === "no_asistio") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (value === "reprogramada") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getAppointmentDotStyles(status?: string) {
  const value = status || "agendada";

  if (value === "confirmada") return "bg-blue-600";
  if (value === "realizada") return "bg-emerald-600";
  if (value === "venta_realizada") return "bg-lime-600";
  if (value === "cancelada") return "bg-red-600";
  if (value === "no_asistio") return "bg-orange-600";
  if (value === "reprogramada") return "bg-amber-600";

  return "bg-slate-600";
}

function formatDateTime(value: any) {
  if (!value) return "Sin fecha";

  try {
    const date = value.toDate ? value.toDate() : new Date(value);

    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Sin fecha";
  }
}

function formatDateOnly(value: any) {
  if (!value) return "Sin fecha";

  try {
    const date = value.toDate ? value.toDate() : new Date(value);

    return new Intl.DateTimeFormat("es-CO", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return "Sin fecha";
  }
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDayTitle(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function toDate(value: any) {
  if (!value) return null;

  try {
    if (value.toDate) return value.toDate() as Date;
    return new Date(value);
  } catch {
    return null;
  }
}

function toMillis(value: any) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function dateKeyBogota(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${y}-${m}-${d}`;
}

function todayKeyBogota() {
  return dateKeyBogota(new Date());
}

function sameDay(a: Date, b: Date) {
  return dateKeyBogota(a) === dateKeyBogota(b);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function startOfWeekMonday(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function getWeekDays(date: Date) {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthCalendarDays(date: Date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeekMonday(firstDayOfMonth);

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function isSameMonth(date: Date, reference: Date) {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function getUserDisplayName(raw: any, fallback: string) {
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

async function loadSellerProfile(user: User): Promise<SellerProfile> {
  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    return {
      uid: user.uid,
      profileId: user.uid,
      name: user.displayName || user.email || "Vendedor",
    };
  }

  const raw = userSnap.data() as any;

  return {
    uid: user.uid,
    profileId: raw.profile?.id || raw.sellerId || raw.id || user.uid,
    name: getUserDisplayName(raw, user.displayName || user.email || "Vendedor"),
    role: raw.role || raw.profile?.type || "",
  };
}

export default function SellerAgendaPage() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<"all" | AppointmentStatus>("all");
  const [searchText, setSearchText] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  async function loadAppointments(user: User) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const sellerProfile = await loadSellerProfile(user);
      setProfile(sellerProfile);

      let snap;

      try {
        const qByUid = query(
          collection(db, "appointments"),
          where("visibleToSellerUids", "array-contains", user.uid),
          orderBy("appointmentAt", "asc")
        );

        snap = await getDocs(qByUid);
      } catch {
        const qBySellerId = query(
          collection(db, "appointments"),
          where("sellerId", "==", sellerProfile.profileId),
          orderBy("appointmentAt", "asc")
        );

        snap = await getDocs(qBySellerId);
      }

      const data: Appointment[] = snap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        return {
          id: docSnap.id,

          customerId: raw.customerId || "",
          customerName: raw.customerName || "Sin cliente",
          customerPhone: raw.customerPhone || "",
          customerSecondaryPhone: raw.customerSecondaryPhone || "",

          sellerId: raw.sellerId || "",
          sellerName: raw.sellerName || "",
          sellerUid: raw.sellerUid || "",

          merchandiserId: raw.merchandiserId || "",
          merchandiserName: raw.merchandiserName || "",
          merchandiserUid: raw.merchandiserUid || "",

          appointmentAt: raw.appointmentAt || null,
          appointmentDateKey: raw.appointmentDateKey || "",
          appointmentMonthKey: raw.appointmentMonthKey || "",
          appointmentTime: raw.appointmentTime || "",

          status: raw.status || "agendada",

          address: raw.address || "",
          city: raw.city || "",
          notes: raw.notes || "",

          createdAt: raw.createdAt || null,
          updatedAt: raw.updatedAt || null,
        };
      });

      setAppointments(data);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "No fue posible cargar la agenda. Revisa permisos o conexión."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;

    if (!authUser) {
      setLoading(false);
      setError("No hay sesión activa. Vuelve a iniciar sesión.");
      return;
    }

    loadAppointments(authUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser]);

  const filteredAppointments = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        if (statusFilter !== "all" && appointment.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .filter((appointment) => {
        if (!term) return true;

        return [
          appointment.customerName,
          appointment.customerPhone,
          appointment.customerSecondaryPhone,
          appointment.address,
          appointment.city,
          appointment.notes,
          appointment.merchandiserName,
          appointment.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => toMillis(a.appointmentAt) - toMillis(b.appointmentAt));
  }, [appointments, statusFilter, searchText]);

  const appointmentsByDateKey = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    filteredAppointments.forEach((appointment) => {
      const date =
        toDate(appointment.appointmentAt) ||
        (appointment.appointmentDateKey
          ? new Date(`${appointment.appointmentDateKey}T00:00:00`)
          : null);

      if (!date) return;

      const key = dateKeyBogota(date);
      const current = map.get(key) || [];
      current.push(appointment);
      map.set(key, current);
    });

    map.forEach((items) => {
      items.sort((a, b) => toMillis(a.appointmentAt) - toMillis(b.appointmentAt));
    });

    return map;
  }, [filteredAppointments]);

  const currentRangeAppointments = useMemo(() => {
    if (viewMode === "day") {
      return appointmentsByDateKey.get(dateKeyBogota(currentDate)) || [];
    }

    if (viewMode === "week") {
      const days = getWeekDays(currentDate);
      return days.flatMap(
        (day) => appointmentsByDateKey.get(dateKeyBogota(day)) || []
      );
    }

    const days = getMonthCalendarDays(currentDate).filter((day) =>
      isSameMonth(day, currentDate)
    );

    return days.flatMap(
      (day) => appointmentsByDateKey.get(dateKeyBogota(day)) || []
    );
  }, [appointmentsByDateKey, currentDate, viewMode]);

  const totals = useMemo(() => {
    const todayKey = todayKeyBogota();
    const now = Date.now();

    return {
      total: appointments.length,
      today: appointments.filter((item) => item.appointmentDateKey === todayKey)
        .length,
      visible: currentRangeAppointments.length,
      pendingClose: appointments.filter(
        (item) =>
          toMillis(item.appointmentAt) < now &&
          ["agendada", "confirmada", "reprogramada"].includes(item.status)
      ).length,
    };
  }, [appointments, currentRangeAppointments]);

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrevious() {
    if (viewMode === "day") {
      setCurrentDate((current) => addDays(current, -1));
      return;
    }

    if (viewMode === "week") {
      setCurrentDate((current) => addDays(current, -7));
      return;
    }

    setCurrentDate((current) => addMonths(current, -1));
  }

  function goNext() {
    if (viewMode === "day") {
      setCurrentDate((current) => addDays(current, 1));
      return;
    }

    if (viewMode === "week") {
      setCurrentDate((current) => addDays(current, 7));
      return;
    }

    setCurrentDate((current) => addMonths(current, 1));
  }

  function getRangeTitle() {
    if (viewMode === "day") {
      return formatDayTitle(currentDate);
    }

    if (viewMode === "week") {
      const days = getWeekDays(currentDate);
      return `${formatShortDate(days[0])} - ${formatShortDate(days[6])}`;
    }

    return formatMonthTitle(currentDate);
  }

  async function updateAppointmentStatus(
    appointment: Appointment,
    status: AppointmentStatus
  ) {
    setUpdatingId(appointment.id);
    setError("");
    setMessage("");

    try {
      await updateDoc(doc(db, "appointments", appointment.id), {
        status,
        updatedAt: serverTimestamp(),
      });

      if (status === "venta_realizada" && appointment.customerId) {
        await updateDoc(doc(db, "customers", appointment.customerId), {
          customerType: "cliente_activo",
          customerStatus: "cliente_activo",
          hasPurchase: true,
          hasAppointment: true,
          updatedAt: serverTimestamp(),
        });
      }

      setMessage(`Cita actualizada: ${getStatusLabel(status)}.`);

      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment({
          ...selectedAppointment,
          status,
        });
      }

      if (authUser) {
        await loadAppointments(authUser);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible actualizar la cita.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-6 text-white shadow-lg">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
            <CalendarCheck className="h-4 w-4" />
            Agenda comercial
          </p>

          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Mi agenda
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
            Visualiza tus citas por día, semana o mes. Haz clic sobre una cita
            para ver toda la información y actualizar su estado.
          </p>

          {profile ? (
            <p className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
              Vendedor: {profile.name}
            </p>
          ) : null}
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        {loading || !authReady ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              Cargando agenda...
            </p>
          </section>
        ) : !authUser ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="mt-3 text-lg font-black text-red-700">
              Sesión no disponible
            </h2>
            <p className="mt-2 text-sm font-bold text-red-600">
              Vuelve a iniciar sesión para consultar tu agenda.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard
                title="Total citas"
                value={totals.total}
                description="Citas asignadas"
              />

              <SummaryCard
                title="Hoy"
                value={totals.today}
                description="Programadas para hoy"
              />

              <SummaryCard
                title="Vista actual"
                value={totals.visible}
                description="Citas visibles"
              />

              <SummaryCard
                title="Por cerrar"
                value={totals.pendingClose}
                description="Vencidas sin cierre"
                danger={totals.pendingClose > 0}
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Calendario de citas
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Navega por día, semana o mes y consulta el detalle de cada
                    cita.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3 xl:min-w-[760px]">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Vista
                    </label>

                    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                      {(["day", "week", "month"] as CalendarViewMode[]).map(
                        (mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setViewMode(mode)}
                            className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                              viewMode === mode
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-slate-500 hover:bg-white/70"
                            }`}
                          >
                            {mode === "day"
                              ? "Día"
                              : mode === "week"
                                ? "Semana"
                                : "Mes"}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Estado
                    </label>

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as "all" | AppointmentStatus
                        )
                      }
                      className="input"
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Buscar
                    </label>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        className="input pl-9"
                        placeholder="Cliente, teléfono, ciudad..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrevious}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={goToday}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100"
                  >
                    Hoy
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <h3 className="text-lg font-black capitalize text-slate-950">
                  {getRangeTitle()}
                </h3>

                <button
                  type="button"
                  onClick={() => authUser && loadAppointments(authUser)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              {viewMode === "day" ? (
                <DayCalendarView
                  date={currentDate}
                  appointments={
                    appointmentsByDateKey.get(dateKeyBogota(currentDate)) || []
                  }
                  onSelectAppointment={setSelectedAppointment}
                />
              ) : null}

              {viewMode === "week" ? (
                <WeekCalendarView
                  date={currentDate}
                  appointmentsByDateKey={appointmentsByDateKey}
                  onSelectAppointment={setSelectedAppointment}
                />
              ) : null}

              {viewMode === "month" ? (
                <MonthCalendarView
                  date={currentDate}
                  appointmentsByDateKey={appointmentsByDateKey}
                  onSelectAppointment={setSelectedAppointment}
                />
              ) : null}
            </section>
          </>
        )}
      </section>

      {selectedAppointment ? (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          updating={updatingId === selectedAppointment.id}
          onClose={() => setSelectedAppointment(null)}
          onUpdateStatus={updateAppointmentStatus}
        />
      ) : null}

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

function DayCalendarView({
  date,
  appointments,
  onSelectAppointment,
}: {
  date: Date;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Vista día
          </p>
          <h3 className="text-xl font-black capitalize text-slate-950">
            {formatDayTitle(date)}
          </h3>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          {appointments.length} cita(s)
        </span>
      </div>

      {appointments.length === 0 ? (
        <EmptyCalendarState text="No hay citas para este día." />
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <AppointmentCalendarCard
              key={appointment.id}
              appointment={appointment}
              onClick={() => onSelectAppointment(appointment)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekCalendarView({
  date,
  appointmentsByDateKey,
  onSelectAppointment,
}: {
  date: Date;
  appointmentsByDateKey: Map<string, Appointment[]>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const days = getWeekDays(date);

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((day, index) => {
          const key = dateKeyBogota(day);
          const items = appointmentsByDateKey.get(key) || [];
          const today = sameDay(day, new Date());

          return (
            <div
              key={key}
              className={`min-h-[260px] rounded-3xl border p-3 ${
                today
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-3">
                <p
                  className={`text-xs font-black uppercase tracking-wide ${
                    today ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {WEEK_DAYS_SHORT[index]}
                </p>

                <p
                  className={`text-lg font-black ${
                    today ? "text-emerald-950" : "text-slate-950"
                  }`}
                >
                  {day.getDate()}
                </p>

                <p className="text-xs font-semibold text-slate-400">
                  {items.length} cita(s)
                </p>
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-3 text-center text-xs font-semibold text-slate-400">
                    Sin citas
                  </div>
                ) : (
                  items.map((appointment) => (
                    <MiniAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() => onSelectAppointment(appointment)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthCalendarView({
  date,
  appointmentsByDateKey,
  onSelectAppointment,
}: {
  date: Date;
  appointmentsByDateKey: Map<string, Appointment[]>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const days = getMonthCalendarDays(date);

  return (
    <div>
      <div className="mb-3 grid grid-cols-7 gap-2">
        {WEEK_DAYS_SHORT.map((day) => (
          <div
            key={day}
            className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {days.map((day) => {
          const key = dateKeyBogota(day);
          const items = appointmentsByDateKey.get(key) || [];
          const today = sameDay(day, new Date());
          const currentMonth = isSameMonth(day, date);

          return (
            <div
              key={key}
              className={`min-h-[150px] rounded-3xl border p-3 ${
                today
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              } ${!currentMonth ? "opacity-45" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-black ${
                    today ? "text-emerald-950" : "text-slate-900"
                  }`}
                >
                  {day.getDate()}
                </p>

                {items.length > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                    {items.length}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                {items.slice(0, 3).map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onSelectAppointment(appointment)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <span
                      className={`mr-1 inline-block h-2 w-2 rounded-full ${getAppointmentDotStyles(
                        appointment.status
                      )}`}
                    />
                    {appointment.appointmentTime || "Hora"} ·{" "}
                    {appointment.customerName}
                  </button>
                ))}

                {items.length > 3 ? (
                  <p className="text-[11px] font-black text-emerald-700">
                    +{items.length - 3} más
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentCalendarCard({
  appointment,
  onClick,
}: {
  appointment: Appointment;
  onClick: () => void;
}) {
  const isPast = toMillis(appointment.appointmentAt) < Date.now();

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-700">
            {appointment.appointmentTime || formatDateTime(appointment.appointmentAt)}
          </p>

          <h3 className="mt-1 text-xl font-black text-slate-950">
            {appointment.customerName}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {appointment.city || "Sin ciudad"} ·{" "}
            {appointment.address || "Sin dirección"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={[
              "inline-flex rounded-full border px-3 py-1 text-xs font-black",
              getStatusStyles(appointment.status),
            ].join(" ")}
          >
            {getStatusLabel(appointment.status)}
          </span>

          {isPast &&
          ["agendada", "confirmada", "reprogramada"].includes(
            appointment.status
          ) ? (
            <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              Pendiente de cierre
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function MiniAppointmentCard({
  appointment,
  onClick,
}: {
  appointment: Appointment;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-sm hover:bg-slate-50"
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 h-2.5 w-2.5 rounded-full ${getAppointmentDotStyles(
            appointment.status
          )}`}
        />

        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-900">
            {appointment.appointmentTime || "Hora"} · {appointment.customerName}
          </p>

          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
            {getStatusLabel(appointment.status)}
          </p>
        </div>
      </div>
    </button>
  );
}

function AppointmentDetailModal({
  appointment,
  updating,
  onClose,
  onUpdateStatus,
}: {
  appointment: Appointment;
  updating: boolean;
  onClose: () => void;
  onUpdateStatus: (
    appointment: Appointment,
    status: AppointmentStatus
  ) => void;
}) {
  const isPast = toMillis(appointment.appointmentAt) < Date.now();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                Detalle de cita
              </p>

              <h2 className="mt-1 text-3xl font-black text-slate-950">
                {appointment.customerName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                {formatDateTime(appointment.appointmentAt)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={[
                    "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                    getStatusStyles(appointment.status),
                  ].join(" ")}
                >
                  {getStatusLabel(appointment.status)}
                </span>

                {isPast &&
                ["agendada", "confirmada", "reprogramada"].includes(
                  appointment.status
                ) ? (
                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                    Pendiente de cierre
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <MiniInfo
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono principal"
              value={appointment.customerPhone || "Sin teléfono"}
            />

            <MiniInfo
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono secundario"
              value={appointment.customerSecondaryPhone || "Sin teléfono secundario"}
            />

            <MiniInfo
              icon={<UserRound className="h-4 w-4" />}
              label="Mercaderista"
              value={appointment.merchandiserName || "Sin mercaderista"}
            />

            <MiniInfo
              icon={<Clock className="h-4 w-4" />}
              label="Hora"
              value={appointment.appointmentTime || formatDateTime(appointment.appointmentAt)}
            />

            <MiniInfo
              icon={<MapPin className="h-4 w-4" />}
              label="Ciudad"
              value={appointment.city || "Sin ciudad"}
            />

            <MiniInfo
              icon={<MapPin className="h-4 w-4" />}
              label="Dirección"
              value={appointment.address || "Sin dirección"}
            />
          </div>

          {appointment.notes ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Notas para la visita
              </p>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {appointment.notes}
              </p>
            </div>
          ) : null}

          <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-950">
              Actualizar estado de la cita
            </p>

            <p className="mt-1 text-xs font-semibold text-emerald-700">
              Marca el resultado real de la gestión comercial.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <ActionButton
                label="Confirmar"
                disabled={updating}
                onClick={() => onUpdateStatus(appointment, "confirmada")}
              />

              <ActionButton
                label="Realizada"
                disabled={updating}
                onClick={() => onUpdateStatus(appointment, "realizada")}
              />

              <ActionButton
                label="Venta realizada"
                disabled={updating}
                success
                icon={<ShoppingCart className="h-4 w-4" />}
                onClick={() => onUpdateStatus(appointment, "venta_realizada")}
              />

              <ActionButton
                label="No asistió"
                disabled={updating}
                warning
                onClick={() => onUpdateStatus(appointment, "no_asistio")}
              />

              <ActionButton
                label="Reprogramada"
                disabled={updating}
                warning
                onClick={() => onUpdateStatus(appointment, "reprogramada")}
              />

              <ActionButton
                label="Cancelar"
                disabled={updating}
                danger
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => onUpdateStatus(appointment, "cancelada")}
              />
            </div>

            {updating ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando cita...
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  danger,
}: {
  title: string;
  value: number;
  description: string;
  danger?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${
        danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-wide ${
          danger ? "text-red-600" : "text-slate-500"
        }`}
      >
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${
          danger ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-sm ${
          danger ? "text-red-600" : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </article>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 inline-flex rounded-xl bg-emerald-50 p-2 text-emerald-700">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  danger,
  warning,
  success,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
}) {
  let classes =
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100";

  if (danger) {
    classes = "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
  }

  if (warning) {
    classes =
      "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
  }

  if (success) {
    classes =
      "border border-emerald-200 bg-emerald-700 text-white hover:bg-emerald-800";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
        classes,
      ].join(" ")}
    >
      {icon || <CheckCircle2 className="h-4 w-4" />}
      {label}
    </button>
  );
}

function EmptyCalendarState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <CalendarClock className="mx-auto h-10 w-10 text-slate-400" />
      <h3 className="mt-3 text-lg font-black text-slate-900">
        Sin citas
      </h3>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}