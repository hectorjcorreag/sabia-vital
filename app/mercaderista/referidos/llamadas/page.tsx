"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  PhoneCall,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { CallQueueCustomer, CallResult } from "@/lib/customers/callTypes";
import {
  loadCallableQueueCount,
  loadNextCallableCustomer,
  registerCustomerCall,
} from "@/lib/customers/callService";

const CALL_RESULTS: {
  value: CallResult;
  label: string;
  description: string;
}[] = [
  {
    value: "no_contesto",
    label: "No contestó",
    description: "Vuelve a la cola en unas horas.",
  },
  {
    value: "llamar_despues",
    label: "Llamar después",
    description: "Programa nueva fecha y hora.",
  },
  {
    value: "acepta_cita",
    label: "Acepta cita",
    description: "Crea una cita para el vendedor.",
  },
  {
    value: "no_interesado",
    label: "No interesado",
    description: "Sale de la cola de llamadas.",
  },
  {
    value: "numero_equivocado",
    label: "Número equivocado",
    description: "Se marca como inactivo.",
  },
  {
    value: "ya_compro",
    label: "Ya compró",
    description: "Pasa a cliente activo.",
  },
];

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    nuevo: "Nuevo",
    pendiente_contacto: "Pendiente de contacto",
    llamar_despues: "Llamar después",
    cita_agendada: "Cita agendada",
    no_interesado: "No interesado",
    cliente_activo: "Cliente activo",
    inactivo: "Inactivo",
    duplicado_revision: "Duplicado en revisión",
  };

  return labels[status || ""] || status || "Sin estado";
}

function formatTimestamp(value: any) {
  if (!value) return "Sin registro";

  try {
    const date = value.toDate ? value.toDate() : new Date(value);

    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Sin registro";
  }
}

function getNowLocalInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getTomorrowLocalInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function MerchandiserCallsPage() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customer, setCustomer] = useState<CallQueueCustomer | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  const [selectedResult, setSelectedResult] =
    useState<CallResult>("no_contesto");

  const [observation, setObservation] = useState("");
  const [nextCallAt, setNextCallAt] = useState(getTomorrowLocalInputValue());

  const [appointmentAt, setAppointmentAt] = useState(
    getTomorrowLocalInputValue()
  );
  const [appointmentAddress, setAppointmentAddress] = useState("");
  const [appointmentCity, setAppointmentCity] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedResultInfo = useMemo(() => {
    return CALL_RESULTS.find((item) => item.value === selectedResult);
  }, [selectedResult]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  async function loadNext(user: User) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [nextCustomer, count] = await Promise.all([
        loadNextCallableCustomer(user),
        loadCallableQueueCount(user),
      ]);

      setCustomer(nextCustomer);
      setQueueCount(count);
      setSelectedResult("no_contesto");
      setObservation("");
      setNextCallAt(getTomorrowLocalInputValue());

      setAppointmentAt(getTomorrowLocalInputValue());
      setAppointmentAddress("");
      setAppointmentCity("");
      setAppointmentNotes("");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "No fue posible cargar la siguiente llamada. Revisa permisos o conexión."
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

    loadNext(authUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser]);

  async function handleRegisterCall() {
    if (!authUser) {
      setError("No hay sesión activa.");
      return;
    }

    if (!customer) {
      setError("No hay cliente seleccionado.");
      return;
    }

    if (selectedResult === "llamar_despues" && !nextCallAt) {
      setError("Selecciona fecha y hora para llamar después.");
      return;
    }

    if (selectedResult === "acepta_cita") {
      if (!appointmentAt) {
        setError("Selecciona fecha y hora de la cita.");
        return;
      }

      if (!appointmentAddress.trim()) {
        setError("Ingresa la dirección o lugar de la cita.");
        return;
      }
    }

    if (!observation.trim()) {
      setError("Escribe una observación de la llamada.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await registerCustomerCall({
        user: authUser,
        input: {
          customer,
          result: selectedResult,
          observation,
          nextCallAt:
            selectedResult === "llamar_despues"
              ? new Date(nextCallAt)
              : null,
          appointment:
            selectedResult === "acepta_cita"
              ? {
                  appointmentAt: new Date(appointmentAt),
                  address: appointmentAddress,
                  city: appointmentCity || customer.city || "",
                  notes: appointmentNotes,
                }
              : null,
        },
      });

      if (selectedResult === "acepta_cita") {
        setMessage(
          `Llamada registrada correctamente. Cita creada para ${customer.assignedSellerName}.`
        );
      } else {
        setMessage("Llamada registrada correctamente.");
      }

      await loadNext(authUser);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible registrar la llamada.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-lime-500 p-6 text-white shadow-lg">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
            <PhoneCall className="h-4 w-4" />
            Telemercadeo
          </p>

          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Siguiente llamada
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
            El sistema selecciona el próximo referido según prioridad,
            oportunidad de contacto y estado de gestión.
          </p>
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
              Cargando siguiente llamada...
            </p>
          </section>
        ) : !authUser ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />

            <h2 className="mt-3 text-lg font-black text-red-700">
              Sesión no disponible
            </h2>

            <p className="mt-2 text-sm font-bold text-red-600">
              Vuelve a iniciar sesión para gestionar llamadas.
            </p>
          </section>
        ) : !customer ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />

            <h2 className="mt-3 text-xl font-black text-slate-900">
              No hay llamadas pendientes
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              No encontramos referidos pendientes para gestionar en este momento.
            </p>

            <button
              type="button"
              onClick={() => loadNext(authUser)}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Cliente sugerido
                  </p>

                  <h2 className="mt-1 text-3xl font-black text-slate-950">
                    {customer.fullName}
                  </h2>

                  <p className="mt-2 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {getStatusLabel(customer.customerStatus)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadNext(authUser)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Saltar / actualizar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard
                  icon={<Phone className="h-5 w-5" />}
                  label="Teléfono principal"
                  value={customer.phone || "Sin teléfono"}
                />

                <InfoCard
                  icon={<Phone className="h-5 w-5" />}
                  label="Teléfono secundario"
                  value={customer.secondaryPhone || "Sin teléfono secundario"}
                />

                <InfoCard
                  icon={<UserRound className="h-5 w-5" />}
                  label="Vendedor asignado"
                  value={customer.assignedSellerName || "Sin vendedor"}
                />

                <InfoCard
                  icon={<Clock className="h-5 w-5" />}
                  label="Intentos"
                  value={`${customer.callAttempts || 0}`}
                />

                <InfoCard
                  icon={<CalendarClock className="h-5 w-5" />}
                  label="Última llamada"
                  value={formatTimestamp(customer.lastCallAt)}
                />

                <InfoCard
                  icon={<CalendarClock className="h-5 w-5" />}
                  label="Próxima acción"
                  value={formatTimestamp(customer.nextActionAt)}
                />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-black text-slate-900">
                  Última observación
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {customer.lastObservation ||
                    "Este referido aún no tiene observaciones registradas."}
                </p>
              </div>

              {customer.city || customer.address ? (
                <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                  <h3 className="font-black text-emerald-950">
                    Datos de ubicación registrados
                  </h3>

                  <div className="mt-2 space-y-1 text-sm text-emerald-800">
                    <p>
                      <span className="font-black">Ciudad:</span>{" "}
                      {customer.city || "Sin ciudad"}
                    </p>

                    <p>
                      <span className="font-black">Dirección:</span>{" "}
                      {customer.address || "Sin dirección"}
                    </p>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Registro de llamada
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Resultado de gestión
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Pendientes disponibles: {queueCount}
                </p>
              </div>

              <div className="space-y-3">
                {CALL_RESULTS.map((item) => {
                  const selected = selectedResult === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setSelectedResult(item.value);
                        setError("");
                        setMessage("");

                        if (item.value === "acepta_cita") {
                          setAppointmentCity(customer.city || "");
                          setAppointmentAddress(customer.address || "");
                        }
                      }}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">
                            {item.label}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {item.description}
                          </p>
                        </div>

                        {selected ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedResult === "llamar_despues" ? (
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Fecha y hora de próxima llamada
                  </label>

                  <input
                    type="datetime-local"
                    min={getNowLocalInputValue()}
                    value={nextCallAt}
                    onChange={(event) => setNextCallAt(event.target.value)}
                    className="input"
                  />
                </div>
              ) : null}

              {selectedResult === "acepta_cita" ? (
                <div className="mt-4 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div>
                    <p className="text-sm font-black text-emerald-900">
                      Datos de la cita
                    </p>

                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      Al registrar la llamada se creará automáticamente una cita
                      para el vendedor.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-emerald-700">
                      Fecha y hora de cita
                    </label>

                    <input
                      type="datetime-local"
                      min={getNowLocalInputValue()}
                      value={appointmentAt}
                      onChange={(event) => setAppointmentAt(event.target.value)}
                      className="input bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-emerald-700">
                      Dirección o lugar de la cita
                    </label>

                    <input
                      value={appointmentAddress}
                      onChange={(event) =>
                        setAppointmentAddress(event.target.value)
                      }
                      className="input bg-white"
                      placeholder="Ej: Dirección del cliente, punto de encuentro o zona"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-emerald-700">
                      Ciudad
                    </label>

                    <input
                      value={appointmentCity}
                      onChange={(event) =>
                        setAppointmentCity(event.target.value)
                      }
                      className="input bg-white"
                      placeholder={customer.city || "Ciudad"}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-emerald-700">
                      Notas para el vendedor
                    </label>

                    <textarea
                      value={appointmentNotes}
                      onChange={(event) =>
                        setAppointmentNotes(event.target.value)
                      }
                      className="input min-h-[90px] resize-none bg-white"
                      placeholder="Ej: Cliente solicita visita en la mañana. Interesada en producto específico."
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Observación
                </label>

                <textarea
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  className="input min-h-[120px] resize-none"
                  placeholder={
                    selectedResultInfo
                      ? `Escribe el detalle de la llamada: ${selectedResultInfo.label.toLowerCase()}...`
                      : "Escribe el detalle de la llamada..."
                  }
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleRegisterCall}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedResult === "no_interesado" ||
                  selectedResult === "numero_equivocado" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                {selectedResult === "acepta_cita"
                  ? "Registrar llamada y crear cita"
                  : "Registrar llamada"}
              </button>
            </aside>
          </section>
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

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="mb-3 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-base font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}