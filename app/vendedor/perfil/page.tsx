"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleUserRound,
  CreditCard,
  FileText,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { db } from "@/lib/firebase";

type SellerProfile = {
  id: string;
  uid?: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;

  photoUrl?: string;
  photoURL?: string;
  imageUrl?: string;
  avatarUrl?: string;

  photo?: {
    path?: string;
    url?: string;
    updatedAt?: any;
  };

  documentType?: string;
  documentNumber?: string;

  phone?: string;
  phoneNormalized?: string;
  secondaryPhone?: string;
  email?: string;

  city?: string;
  address?: string;

  status?: string;
  role?: string;

  distributorId?: string;
  distributorName?: string;
  distributorUid?: string;

  createdAt?: any;
  updatedAt?: any;

  salesGoal?: number;
  monthlyGoal?: number;
  quarterlyGoal?: number;

  totalSales?: number;
  totalVisits?: number;
  totalCustomers?: number;
};

type PlatformUser = {
  uid: string;
  role: string;
  profileId: string;
  profileType: string;
  displayName: string;
};

export default function SellerProfilePage() {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingUser(true);
      setLoadingSeller(false);
      setError("");
      setSeller(null);

      try {
        if (!firebaseUser) {
          setPlatformUser(null);
          setError("No hay una sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userSnap.exists()) {
          setPlatformUser(null);
          setError(
            "El usuario tiene inicio de sesión, pero no tiene perfil asignado en la plataforma."
          );
          return;
        }

        const raw = userSnap.data() as any;

        const role =
          raw.role ||
          raw.type ||
          raw.profile?.type ||
          "seller";

        const profileType =
          raw.profile?.type ||
          raw.type ||
          raw.role ||
          "seller";

        const profileId =
          raw.profileId ||
          raw.profile?.id ||
          raw.sellerId ||
          raw.assignedSellerId ||
          "";

        const displayName =
          raw.displayName ||
          raw.name ||
          raw.fullName ||
          raw.profile?.name ||
          firebaseUser.displayName ||
          "Vendedor";

        const userProfile: PlatformUser = {
          uid: firebaseUser.uid,
          role,
          profileId,
          profileType,
          displayName,
        };

        setPlatformUser(userProfile);
        await loadSellerProfile(userProfile);
      } catch (e: any) {
        console.error("Error cargando usuario vendedor:", e);
        setError(
          e?.message ||
          "No fue posible validar el perfil del vendedor en la plataforma."
        );
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loadSellerProfile(user = platformUser) {
    if (!user) return;

    setLoadingSeller(true);
    setError("");

    try {
      let sellerData: SellerProfile | null = null;

      /**
       * 1. Búsqueda principal:
       * users/{uid}.profile.id normalmente debe apuntar al documento en sellers.
       */
      if (user.profileId) {
        const sellerSnap = await getDoc(doc(db, "sellers", user.profileId));

        if (sellerSnap.exists()) {
          sellerData = mapSellerProfile(sellerSnap.id, sellerSnap.data());
        }
      }

      /**
       * 2. Respaldo por uid:
       * por si el usuario no tiene profile.id, pero el vendedor sí guarda uid/userUid/authUid.
       */
      if (!sellerData) {
        const sellersRef = collection(db, "sellers");

        const possibleUidFields = ["uid", "userUid", "authUid"];

        for (const field of possibleUidFields) {
          const snap = await getDocs(
            query(sellersRef, where(field, "==", user.uid))
          );

          if (!snap.empty) {
            const sellerDoc = snap.docs[0];
            sellerData = mapSellerProfile(sellerDoc.id, sellerDoc.data());
            break;
          }
        }
      }

      if (!sellerData) {
        setSeller(null);
        setError(
          "No encontramos un documento de vendedor asociado a este usuario."
        );
        return;
      }

      /**
       * Seguridad visual:
       * La página solo muestra el vendedor asociado al usuario autenticado.
       * La seguridad real también debe estar en reglas de Firestore.
       */
      setSeller(sellerData);
    } catch (e: any) {
      console.error("Error cargando perfil del vendedor:", e);
      setError(
        e?.message ||
        "No fue posible cargar la información del vendedor."
      );
    } finally {
      setLoadingSeller(false);
    }
  }

  const sellerName = useMemo(() => {
    if (!seller) return "Vendedor";

    return (
      seller.fullName ||
      seller.name ||
      [seller.firstName, seller.lastName].filter(Boolean).join(" ") ||
      "Vendedor"
    );
  }, [seller]);

  const photoUrl = useMemo(() => {
    if (!seller) return "";

    return (
      seller.photoUrl ||
      seller.photoURL ||
      seller.imageUrl ||
      seller.avatarUrl ||
      ""
    );
  }, [seller]);

  const initials = useMemo(() => {
    return sellerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [sellerName]);

  if (loadingUser || loadingSeller) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-700" />
            <p className="mt-4 text-sm font-black text-slate-600">
              Cargando perfil del vendedor...
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-500 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-lime-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative">
                <div className="h-36 w-36 overflow-hidden rounded-[2rem] border-4 border-white/30 bg-white/15 shadow-2xl backdrop-blur md:h-44 md:w-44">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={sellerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 to-lime-500 text-5xl font-black text-white">
                      {initials || <CircleUserRound className="h-20 w-20" />}
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-3 -right-3 rounded-2xl border-4 border-white bg-emerald-600 p-3 text-white shadow-lg">
                  <Camera className="h-5 w-5" />
                </div>
              </div>

              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  Perfil comercial
                </p>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  {sellerName}
                </h1>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge icon={<BadgeCheck className="h-4 w-4" />} text="Vendedor" />
                  <Badge
                    icon={<Building2 className="h-4 w-4" />}
                    text={seller?.distributorName || "Sin distribuidor"}
                  />
                  <Badge
                    icon={<ShieldCheck className="h-4 w-4" />}
                    text={getStatusLabel(seller?.status)}
                  />
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-emerald-50 md:text-base">
                  Este espacio muestra la información personal y comercial asociada
                  a tu usuario. Por ahora es solo de consulta.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/vendedor"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>

              <button
                type="button"
                onClick={() => loadSellerProfile()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </section>
        ) : null}

        {seller ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <ProfileMetric
                icon={<Phone className="h-5 w-5" />}
                label="Teléfono"
                value={seller.phone || seller.phoneNormalized || "Sin teléfono"}
              />

              <ProfileMetric
                icon={<Mail className="h-5 w-5" />}
                label="Correo"
                value={seller.email || "Sin correo"}
              />

              <ProfileMetric
                icon={<MapPin className="h-5 w-5" />}
                label="Ciudad"
                value={seller.city || "Sin ciudad"}
              />

              <ProfileMetric
                icon={<BriefcaseBusiness className="h-5 w-5" />}
                label="Distribuidor"
                value={seller.distributorName || "Sin distribuidor"}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Información personal
                    </h2>
                    <p className="text-sm text-slate-500">
                      Datos básicos registrados en la plataforma.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoCard
                    icon={<UserRound className="h-4 w-4" />}
                    label="Nombre completo"
                    value={sellerName}
                  />

                  <InfoCard
                    icon={<IdCard className="h-4 w-4" />}
                    label="Documento"
                    value={`${seller.documentType || "Documento"} ${seller.documentNumber || "sin número"
                      }`}
                  />

                  <InfoCard
                    icon={<Phone className="h-4 w-4" />}
                    label="Teléfono principal"
                    value={seller.phone || seller.phoneNormalized || "Sin teléfono"}
                  />

                  <InfoCard
                    icon={<Phone className="h-4 w-4" />}
                    label="Teléfono secundario"
                    value={seller.secondaryPhone || "Sin teléfono secundario"}
                  />

                  <InfoCard
                    icon={<Mail className="h-4 w-4" />}
                    label="Correo electrónico"
                    value={seller.email || "Sin correo"}
                  />

                  <InfoCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Dirección"
                    value={seller.address || "Sin dirección registrada"}
                  />
                </div>
              </article>

              <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-lime-50 p-3 text-lime-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Estado del perfil
                    </h2>
                    <p className="text-sm text-slate-500">
                      Información de acceso y vinculación.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <StatusLine
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Estado"
                    value={getStatusLabel(seller.status)}
                  />

                  <StatusLine
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    label="Rol"
                    value="Vendedor"
                  />

                  <StatusLine
                    icon={<Building2 className="h-4 w-4" />}
                    label="Distribuidor"
                    value={seller.distributorName || "Sin distribuidor"}
                  />

                  <StatusLine
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Creado"
                    value={formatDate(seller.createdAt)}
                  />

                  <StatusLine
                    icon={<RefreshCw className="h-4 w-4" />}
                    label="Actualizado"
                    value={formatDate(seller.updatedAt)}
                  />
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Vinculación
                    </h2>
                    <p className="text-sm text-slate-500">
                      Relación comercial asignada.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <InfoRow label="ID vendedor" value={seller.id} />
                  <InfoRow label="UID usuario" value={seller.uid || platformUser?.uid || "Sin UID"} />
                  <InfoRow label="ID distribuidor" value={seller.distributorId || "Sin ID"} />
                  <InfoRow label="Distribuidor" value={seller.distributorName || "Sin distribuidor"} />
                </div>
              </article>

              <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <CreditCard className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Información comercial
                    </h2>
                    <p className="text-sm text-slate-500">
                      Resumen visible del perfil comercial del vendedor.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <CommercialCard
                    label="Meta mensual"
                    value={formatNumber(seller.monthlyGoal || seller.salesGoal)}
                  />

                  <CommercialCard
                    label="Meta trimestral"
                    value={formatNumber(seller.quarterlyGoal)}
                  />

                  <CommercialCard
                    label="Ventas registradas"
                    value={formatNumber(seller.totalSales)}
                  />

                  <CommercialCard
                    label="Visitas"
                    value={formatNumber(seller.totalVisits)}
                  />

                  <CommercialCard
                    label="Clientes"
                    value={formatNumber(seller.totalCustomers)}
                  />

                  <CommercialCard
                    label="Estado"
                    value={getStatusLabel(seller.status)}
                  />
                </div>
              </article>
            </section>

            <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-emerald-700">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-black text-emerald-950">
                    Nota del módulo
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Esta página es solo de consulta. Más adelante podemos agregar
                    edición controlada, cambio de foto, documentos, metas e indicadores
                    personales del vendedor.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function mapSellerProfile(id: string, raw: any): SellerProfile {
  const fullName =
    raw.fullName ||
    raw.name ||
    [raw.firstName, raw.lastName].filter(Boolean).join(" ") ||
    "";

  return {
    id,
    uid: raw.uid || raw.userUid || raw.authUid || "",

    firstName: raw.firstName || "",
    lastName: raw.lastName || "",
    fullName,
    name: raw.name || fullName,

    photo: {
      path: raw.photo?.path || "",
      url: raw.photo?.url || "",
      updatedAt: raw.photo?.updatedAt || null,
    },

    photoUrl:
      raw.photo?.url ||
      raw.photoUrl ||
      raw.photoURL ||
      raw.imageUrl ||
      raw.avatarUrl ||
      "",

    photoURL: raw.photoURL || "",
    imageUrl: raw.imageUrl || "",
    avatarUrl: raw.avatarUrl || "",

    documentType: raw.documentType || raw.document?.type || "",
    documentNumber: raw.documentNumber || raw.document?.number || "",

    phone: raw.phone || "",
    phoneNormalized: raw.phoneNormalized || "",
    secondaryPhone: raw.secondaryPhone || "",
    email: raw.email || "",

    city: raw.city || "",
    address: raw.address || "",

    status: raw.status || raw.state || "active",
    role: raw.role || "seller",

    distributorId:
      raw.distributorId ||
      raw.assignedDistributorId ||
      raw.distributor?.id ||
      "",

    distributorName:
      raw.distributorName ||
      raw.assignedDistributorName ||
      raw.distributor?.name ||
      "Sin distribuidor",

    distributorUid:
      raw.distributorUid ||
      raw.assignedDistributorUid ||
      raw.distributor?.uid ||
      "",

    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,

    salesGoal: Number(raw.salesGoal || 0),
    monthlyGoal: Number(raw.monthlyGoal || 0),
    quarterlyGoal: Number(raw.quarterlyGoal || 0),

    totalSales: Number(raw.totalSales || 0),
    totalVisits: Number(raw.totalVisits || 0),
    totalCustomers: Number(raw.totalCustomers || 0),
  };
}

function Badge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-black text-white backdrop-blur">
      {icon}
      {text}
    </span>
  );
}

function ProfileMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black text-slate-950">
        {value}
      </p>
    </article>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <span className="text-emerald-700">{icon}</span>
        {label}
      </p>

      <p className="break-words font-bold text-slate-950">{value}</p>
    </div>
  );
}

function StatusLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-600">
        <span className="text-emerald-700">{icon}</span>
        <span className="text-xs font-black uppercase tracking-wide">
          {label}
        </span>
      </div>

      <span className="text-right text-sm font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function CommercialCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toLowerCase();

  const labels: Record<string, string> = {
    active: "Activo",
    activo: "Activo",
    inactive: "Inactivo",
    inactivo: "Inactivo",
    pending: "Pendiente",
    pendiente: "Pendiente",
    blocked: "Bloqueado",
    bloqueado: "Bloqueado",
  };

  return labels[normalized] || status || "Sin estado";
}

function formatDate(value: any) {
  const date = toDate(value);

  if (!date) return "Sin registro";

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDate(value: any): Date | null {
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

function formatNumber(value?: number) {
  const number = Number(value || 0);

  if (!number) return "0";

  return number.toLocaleString("es-CO");
}