"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Phone,
  Save,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import {
  ExistingCustomer,
  MerchandiserProfile,
  NewReferralFormData,
  SellerOption,
} from "@/lib/customers/customerTypes";

import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  normalizePhone,
} from "@/lib/customers/customerUtils";

import {
  createReferralCustomer,
  findCustomerByPhone,
  loadAllowedSellersForMerchandiser,
  loadMerchandiserProfile,
} from "@/lib/customers/customerService";

function waitForAuthUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-2">
        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>

        {hint ? (
          <span className="text-[11px] font-semibold text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>

      {children}

      {error ? (
        <p className="text-xs font-bold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

const initialFormData: NewReferralFormData = {
  fullName: "",
  phone: "",
  secondaryPhone: "",
  email: "",
  city: "",
  address: "",
  selectedSellerId: "",
  interestProduct: "",
  initialObservation: "",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function NewReferralPage() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<MerchandiserProfile | null>(null);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(
    null
  );

  const [sellerSearch, setSellerSearch] = useState("");

  const [formData, setFormData] =
    useState<NewReferralFormData>(initialFormData);

  const [checkingPhone, setCheckingPhone] = useState(false);
  const [existingCustomer, setExistingCustomer] =
    useState<ExistingCustomer | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [registeredCountForSeller, setRegisteredCountForSeller] = useState(0);

  const phoneNormalized = useMemo(
    () => normalizePhone(formData.phone),
    [formData.phone]
  );

  const filteredSellers = useMemo(() => {
    const term = sellerSearch.trim().toLowerCase();

    return sellers
      .filter((seller) => {
        if (!term) return true;

        return (
          seller.name.toLowerCase().includes(term) ||
          seller.distributorName?.toLowerCase().includes(term) ||
          seller.documentNumber?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sellers, sellerSearch]);

  function updateField<K extends keyof NewReferralFormData>(
    field: K,
    value: NewReferralFormData[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setMessage("");
    setError("");

    if (field === "phone") {
      setExistingCustomer(null);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  async function loadInitialData(user: User) {
    setLoading(true);
    setError("");

    try {
      const currentProfile = await loadMerchandiserProfile(user);
      const allowedSellers = await loadAllowedSellersForMerchandiser(
        currentProfile
      );

      setProfile(currentProfile);
      setSellers(allowedSellers);

      if (allowedSellers.length === 1) {
        selectSeller(allowedSellers[0]);
      }
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "No fue posible cargar la información inicial del módulo."
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

    loadInitialData(authUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser]);

  function selectSeller(seller: SellerOption) {
    setSelectedSeller(seller);
    setRegisteredCountForSeller(0);
    setMessage("");
    setError("");
    setExistingCustomer(null);
    setFieldErrors({});

    setFormData({
      ...initialFormData,
      selectedSellerId: seller.id,
    });
  }

  function changeSeller() {
    setSelectedSeller(null);
    setRegisteredCountForSeller(0);
    setMessage("");
    setError("");
    setExistingCustomer(null);
    setFieldErrors({});
    setFormData(initialFormData);
  }

  async function checkExistingCustomer(normalized: string) {
    if (!authReady || !authUser) return;

    if (normalized.length < 7) {
      setExistingCustomer(null);
      return;
    }

    setCheckingPhone(true);

    try {
      const customer = await findCustomerByPhone(normalized);
      setExistingCustomer(customer);
    } catch (e: any) {
      console.error("Error validando teléfono:", e);
      setError(
        e?.message ||
          "No fue posible validar el teléfono. Revisa permisos o conexión."
      );
    } finally {
      setCheckingPhone(false);
    }
  }

  useEffect(() => {
    if (!authReady || !authUser) return;

    const timeout = setTimeout(() => {
      checkExistingCustomer(phoneNormalized);
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNormalized, authReady, authUser]);

  function resetOnlyReferralForm() {
    setFormData({
      ...initialFormData,
      selectedSellerId: selectedSeller?.id || "",
    });

    setExistingCustomer(null);
    setFieldErrors({});
    setError("");
  }

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!selectedSeller) {
      errors.selectedSellerId = "Selecciona primero un vendedor.";
    }

    if (!formData.fullName.trim()) {
      errors.fullName = "El nombre del referido es obligatorio.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "El teléfono principal es obligatorio.";
    }

    if (phoneNormalized.length < 7) {
      errors.phone = "Ingresa un teléfono válido.";
    }

    if (existingCustomer) {
      errors.phone =
        "Este teléfono ya existe en el sistema. No se puede crear duplicado.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  async function saveReferral() {
    setError("");
    setMessage("");

    if (!profile) {
      setError("No se encontró el perfil de la mercaderista.");
      return;
    }

    if (!selectedSeller) {
      setError("Selecciona un vendedor válido.");
      return;
    }

    if (!validateForm()) return;

    const user = authUser || auth.currentUser || (await waitForAuthUser());

    if (!user) {
      setError("No hay sesión activa. Vuelve a iniciar sesión.");
      return;
    }

    setSaving(true);

    try {
      await createReferralCustomer({
        user,
        profile,
        selectedSeller,
        formData: {
          ...formData,
          selectedSellerId: selectedSeller.id,
        },
      });

      setRegisteredCountForSeller((current) => current + 1);

      setMessage(
        `Referido registrado correctamente para ${selectedSeller.name}. Puedes ingresar otro referido para este mismo vendedor.`
      );

      resetOnlyReferralForm();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible guardar el referido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-lime-500 p-6 text-white shadow-lg">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
            <UserPlus className="h-4 w-4" />
            Gestión de referidos
          </p>

          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Nuevo referido
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
            Selecciona primero el vendedor y registra varios referidos para él
            sin repetir la asignación en cada formulario.
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
              Cargando sesión y vendedores disponibles...
            </p>
          </section>
        ) : !authUser ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="mt-3 text-lg font-black text-red-700">
              Sesión no disponible
            </h2>
            <p className="mt-2 text-sm font-bold text-red-600">
              Vuelve a iniciar sesión para registrar referidos.
            </p>
          </section>
        ) : !selectedSeller ? (
          <section className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-700" />
                    <h2 className="text-xl font-black text-slate-950">
                      Selecciona el vendedor
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    El referido quedará asignado al vendedor seleccionado. Puedes
                    registrar varios referidos consecutivos para el mismo
                    vendedor.
                  </p>
                </div>

                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={sellerSearch}
                    onChange={(event) => setSellerSearch(event.target.value)}
                    className="input pl-9"
                    placeholder="Buscar vendedor o distribuidor..."
                  />
                </div>
              </div>
            </article>

            {filteredSellers.length === 0 ? (
              <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h3 className="text-lg font-black text-slate-800">
                  No se encontraron vendedores
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Revisa el filtro o verifica que existan vendedores activos
                  asignados.
                </p>
              </section>
            ) : (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSellers.map((seller) => (
                  <button
                    key={seller.id}
                    type="button"
                    onClick={() => selectSeller(seller)}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-emerald-100">
                        {seller.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={seller.photoUrl}
                            alt={seller.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-black text-emerald-700">
                            {getInitials(seller.name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-black text-slate-950 group-hover:text-emerald-700">
                          {seller.name}
                        </h3>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                          {seller.distributorName || "Sin distribuidor"}
                        </p>

                        {seller.documentNumber ? (
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            Doc. {seller.documentNumber}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2 text-center text-sm font-black text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                      Registrar referidos
                    </div>
                  </button>
                ))}
              </section>
            )}
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white">
                      {selectedSeller.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedSeller.photoUrl}
                          alt={selectedSeller.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-black text-emerald-700">
                          {getInitials(selectedSeller.name)}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                        Registrando referidos para
                      </p>

                      <h2 className="text-xl font-black text-emerald-950">
                        {selectedSeller.name}
                      </h2>

                      <p className="text-sm font-semibold text-emerald-700">
                        {selectedSeller.distributorName ||
                          "Sin distribuidor asignado"}
                      </p>

                      {registeredCountForSeller > 0 ? (
                        <p className="mt-1 text-xs font-black text-emerald-800">
                          Referidos registrados en esta sesión:{" "}
                          {registeredCountForSeller}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={changeSeller}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Cambiar vendedor
                  </button>
                </div>
              </div>

              <div className="mb-5 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-black text-slate-950">
                  Información del referido
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre completo"
                  required
                  error={fieldErrors.fullName}
                >
                  <input
                    value={formData.fullName}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    className="input"
                    placeholder="Ej: María Gómez"
                  />
                </Field>

                <Field
                  label="Teléfono principal"
                  required
                  hint="Se valida duplicado"
                  error={fieldErrors.phone}
                >
                  <div className="relative">
                    <input
                      value={formData.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      className="input pr-10"
                      placeholder="Ej: 3001234567"
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingPhone ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : phoneNormalized.length >= 7 && existingCustomer ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : phoneNormalized.length >= 7 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Phone className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </Field>

                <Field label="Teléfono secundario">
                  <input
                    value={formData.secondaryPhone}
                    onChange={(event) =>
                      updateField("secondaryPhone", event.target.value)
                    }
                    className="input"
                    placeholder="Opcional"
                  />
                </Field>

                <Field label="Correo">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    className="input"
                    placeholder="Opcional"
                  />
                </Field>

                <Field label="Ciudad">
                  <input
                    value={formData.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    className="input"
                    placeholder="Ej: Medellín"
                  />
                </Field>

                <Field label="Dirección o zona">
                  <input
                    value={formData.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    className="input"
                    placeholder="Opcional"
                  />
                </Field>

                <Field label="Producto de interés">
                  <input
                    value={formData.interestProduct}
                    onChange={(event) =>
                      updateField("interestProduct", event.target.value)
                    }
                    className="input"
                    placeholder="Opcional"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Observación inicial">
                    <textarea
                      value={formData.initialObservation}
                      onChange={(event) =>
                        updateField("initialObservation", event.target.value)
                      }
                      className="input min-h-[110px] resize-none"
                      placeholder="Ej: Referido interesado en conocer el producto. Prefiere llamada en la tarde."
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={resetOnlyReferralForm}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  Limpiar referido
                </button>

                <button
                  type="button"
                  disabled={saving || Boolean(existingCustomer)}
                  onClick={saveReferral}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar referido
                </button>
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Search className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-lg font-black text-slate-950">
                    Validación
                  </h2>
                </div>

                {!phoneNormalized ? (
                  <p className="text-sm text-slate-500">
                    Ingresa un teléfono para validar si el referido ya existe en
                    el sistema.
                  </p>
                ) : checkingPhone ? (
                  <p className="text-sm font-bold text-slate-500">
                    Verificando número...
                  </p>
                ) : existingCustomer ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />

                      <div>
                        <h3 className="font-black text-red-700">
                          Teléfono ya registrado
                        </h3>

                        <p className="mt-1 text-sm text-red-700">
                          Este número ya existe en la base de clientes. No se
                          debe crear un duplicado.
                        </p>

                        <div className="mt-3 space-y-1 text-xs font-bold text-red-700">
                          <p>
                            Tipo:{" "}
                            {CUSTOMER_TYPE_LABELS[
                              existingCustomer.customerType || ""
                            ] ||
                              existingCustomer.customerType ||
                              "Sin dato"}
                          </p>

                          <p>
                            Estado:{" "}
                            {CUSTOMER_STATUS_LABELS[
                              existingCustomer.customerStatus || ""
                            ] ||
                              existingCustomer.customerStatus ||
                              "Sin dato"}
                          </p>

                          <p>
                            Vendedor:{" "}
                            {existingCustomer.assignedSellerName ||
                              "Sin vendedor"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : phoneNormalized.length >= 7 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />

                      <div>
                        <h3 className="font-black text-emerald-800">
                          Número disponible
                        </h3>

                        <p className="mt-1 text-sm text-emerald-700">
                          Puedes registrar este referido para{" "}
                          <span className="font-black">
                            {selectedSeller.name}
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    El teléfono aún no tiene suficientes dígitos para validar.
                  </p>
                )}
              </article>

              <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <h2 className="text-lg font-black text-emerald-950">
                  Flujo de registro
                </h2>

                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <p>
                    El referido se guardará en{" "}
                    <span className="font-black">customers</span>.
                  </p>

                  <p>
                    Quedará como{" "}
                    <span className="font-black">Referido / Nuevo</span>.
                  </p>

                  <p>
                    Será asignado automáticamente a{" "}
                    <span className="font-black">{selectedSeller.name}</span>.
                  </p>

                  <p>
                    Podrás seguir registrando más referidos para este mismo
                    vendedor.
                  </p>
                </div>
              </article>
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