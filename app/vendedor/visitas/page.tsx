"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";

import { db } from "@/lib/firebase";

type PeriodMode = "month" | "quarter" | "semester" | "year" | "custom";

type PlatformUser = {
  uid: string;
  role: string;
  profileId: string;
  profileType: string;
  displayName: string;
};

type Seller = {
  id: string;
  uid?: string;
  userUid?: string;
  authUid?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  status?: string;
  distributorId?: string;
  distributorName?: string;
  photoUrl?: string;
};

type Visit = {
  id: string;

  sellerId?: string;
  assignedSellerId?: string;
  sellerDocId?: string;
  sellerProfileId?: string;

  sellerUid?: string;
  assignedSellerUid?: string;
  uid?: string;
  userUid?: string;
  authUid?: string;

  sellerName?: string;
  assignedSellerName?: string;

  distributorId?: string;
  distributorName?: string;

  customerId?: string;
  customerName?: string;
  fullName?: string;
  clientName?: string;
  patientName?: string;

  phone?: string;
  customerPhone?: string;
  clientPhone?: string;

  city?: string;
  address?: string;
  location?: string;

  status?: string;
  visitStatus?: string;

  type?: string;
  visitType?: string;

  dateKey?: string;
  visitDateKey?: string;
  createdDateKey?: string;

  visitAt?: any;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;

  notes?: string;
  observation?: string;
  observations?: string;
  comments?: string;

  isInstant?: boolean;
  instantVisit?: boolean;

  isEffective?: boolean;
  effective?: boolean;

  hasPurchase?: boolean;
  purchaseCreated?: boolean;
  saleCreated?: boolean;

  hasRecipeControl?: boolean;
  recipeControl?: boolean;
  controlReceta?: boolean;
  hasReset?: boolean;
  resetCreated?: boolean;
  prescriptionControl?: boolean;

  amount?: number;
  totalAmount?: number;
  salesAmount?: number;
  totalPurchasedAmount?: number;
};

type PeriodRange = {
  label: string;
  fromDateKey: string;
  toDateKey: string;
  previousFromDateKey: string;
  previousToDateKey: string;
};

function cleanId(value: any) {
  return String(value || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function todayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number) {
  const clone = new Date(date);
  clone.setMonth(clone.getMonth() + months);
  return clone;
}

function getPeriodRange(anchorDate: Date, mode: PeriodMode): PeriodRange {
  if (mode === "month") {
    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    const previousStart = startOfMonth(addMonths(anchorDate, -1));
    const previousEnd = endOfMonth(addMonths(anchorDate, -1));

    return {
      label: anchorDate.toLocaleDateString("es-CO", {
        month: "long",
        year: "numeric",
      }),
      fromDateKey: dateKey(start),
      toDateKey: dateKey(end),
      previousFromDateKey: dateKey(previousStart),
      previousToDateKey: dateKey(previousEnd),
    };
  }

  if (mode === "quarter") {
    const quarterIndex = Math.floor(anchorDate.getMonth() / 3);
    const start = new Date(anchorDate.getFullYear(), quarterIndex * 3, 1);
    const end = endOfMonth(
      new Date(anchorDate.getFullYear(), quarterIndex * 3 + 2, 1)
    );

    const previousAnchor = addMonths(start, -3);
    const previousQuarterIndex = Math.floor(previousAnchor.getMonth() / 3);
    const previousStart = new Date(
      previousAnchor.getFullYear(),
      previousQuarterIndex * 3,
      1
    );
    const previousEnd = endOfMonth(
      new Date(previousAnchor.getFullYear(), previousQuarterIndex * 3 + 2, 1)
    );

    return {
      label: `Trimestre ${quarterIndex + 1} de ${anchorDate.getFullYear()}`,
      fromDateKey: dateKey(start),
      toDateKey: dateKey(end),
      previousFromDateKey: dateKey(previousStart),
      previousToDateKey: dateKey(previousEnd),
    };
  }

  if (mode === "semester") {
    const semesterIndex = anchorDate.getMonth() < 6 ? 0 : 1;
    const start = new Date(anchorDate.getFullYear(), semesterIndex * 6, 1);
    const end = endOfMonth(
      new Date(anchorDate.getFullYear(), semesterIndex * 6 + 5, 1)
    );

    const previousAnchor = addMonths(start, -6);
    const previousSemesterIndex = previousAnchor.getMonth() < 6 ? 0 : 1;
    const previousStart = new Date(
      previousAnchor.getFullYear(),
      previousSemesterIndex * 6,
      1
    );
    const previousEnd = endOfMonth(
      new Date(previousAnchor.getFullYear(), previousSemesterIndex * 6 + 5, 1)
    );

    return {
      label: `${
        semesterIndex === 0 ? "Primer" : "Segundo"
      } semestre de ${anchorDate.getFullYear()}`,
      fromDateKey: dateKey(start),
      toDateKey: dateKey(end),
      previousFromDateKey: dateKey(previousStart),
      previousToDateKey: dateKey(previousEnd),
    };
  }

  const start = new Date(anchorDate.getFullYear(), 0, 1);
  const end = new Date(anchorDate.getFullYear(), 11, 31);
  const previousStart = new Date(anchorDate.getFullYear() - 1, 0, 1);
  const previousEnd = new Date(anchorDate.getFullYear() - 1, 11, 31);

  return {
    label: `Año ${anchorDate.getFullYear()}`,
    fromDateKey: dateKey(start),
    toDateKey: dateKey(end),
    previousFromDateKey: dateKey(previousStart),
    previousToDateKey: dateKey(previousEnd),
  };
}

function shiftAnchorDate(date: Date, mode: PeriodMode, direction: number) {
  if (mode === "month") return addMonths(date, direction);
  if (mode === "quarter") return addMonths(date, direction * 3);
  if (mode === "semester") return addMonths(date, direction * 6);

  const clone = new Date(date);
  clone.setFullYear(clone.getFullYear() + direction);
  return clone;
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

function formatDateTime(value: any) {
  const date = toDate(value);

  if (!date) return "Sin fecha";

  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: any) {
  const date = toDate(value);

  if (!date) return "Sin fecha";

  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function numberFrom(...values: any[]) {
  for (const value of values) {
    const number = Number(value || 0);

    if (!Number.isNaN(number) && number > 0) {
      return Math.round(number * 100) / 100;
    }
  }

  return 0;
}

function getSellerName(raw: any) {
  return (
    raw?.fullName ||
    raw?.name ||
    [raw?.firstName, raw?.lastName].filter(Boolean).join(" ") ||
    "Vendedor"
  );
}

function getSellerPhotoUrl(raw: any) {
  return (
    raw?.photo?.url ||
    raw?.photoUrl ||
    raw?.photoURL ||
    raw?.profilePhotoUrl ||
    raw?.profilePhotoURL ||
    raw?.imageUrl ||
    raw?.avatarUrl ||
    ""
  );
}

function getVisitSellerId(visit: Visit) {
  return cleanId(
    visit.sellerId ||
      visit.assignedSellerId ||
      visit.sellerDocId ||
      visit.sellerProfileId ||
      ""
  );
}

function getVisitSellerUid(visit: Visit) {
  return cleanId(
    visit.sellerUid ||
      visit.assignedSellerUid ||
      visit.uid ||
      visit.userUid ||
      visit.authUid ||
      ""
  );
}

function getVisitDate(visit: Visit) {
  return (
    toDate(visit.visitAt) ||
    toDate(visit.completedAt) ||
    toDate(visit.createdAt) ||
    toDate(visit.updatedAt)
  );
}

function getVisitDateKey(visit: Visit) {
  const fromField =
    visit.dateKey || visit.visitDateKey || visit.createdDateKey || "";

  if (fromField) return String(fromField).slice(0, 10);

  const date = getVisitDate(visit);

  if (!date) return "";

  return dateKey(date);
}

function getVisitCustomerName(visit: Visit) {
  return (
    visit.customerName ||
    visit.fullName ||
    visit.clientName ||
    visit.patientName ||
    "Sin cliente"
  );
}

function getVisitPhone(visit: Visit) {
  return visit.customerPhone || visit.clientPhone || visit.phone || "";
}

function getVisitStatus(visit: Visit) {
  return String(visit.status || visit.visitStatus || "registrada")
    .toLowerCase()
    .trim();
}

function getVisitType(visit: Visit) {
  return String(visit.type || visit.visitType || "normal")
    .toLowerCase()
    .trim();
}

function isInstantVisit(visit: Visit) {
  const type = getVisitType(visit);

  return (
    visit.isInstant === true ||
    visit.instantVisit === true ||
    type.includes("instant") ||
    type.includes("instantanea") ||
    type.includes("instantánea")
  );
}

function isEffectiveVisit(visit: Visit) {
  const status = getVisitStatus(visit);

  return (
    visit.isEffective === true ||
    visit.effective === true ||
    ["realizada", "completed", "done", "effective", "efectiva"].includes(status)
  );
}

function hasSale(visit: Visit) {
  const status = getVisitStatus(visit);

  return (
    visit.hasPurchase === true ||
    visit.purchaseCreated === true ||
    visit.saleCreated === true ||
    ["venta_realizada", "sale", "converted", "convertida"].includes(status)
  );
}

function hasReset(visit: Visit) {
  return (
    visit.hasRecipeControl === true ||
    visit.recipeControl === true ||
    visit.controlReceta === true ||
    visit.hasReset === true ||
    visit.resetCreated === true ||
    visit.prescriptionControl === true
  );
}

function getVisitAmount(visit: Visit) {
  return numberFrom(
    visit.totalPurchasedAmount,
    visit.totalAmount,
    visit.salesAmount,
    visit.amount
  );
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toLowerCase();

  const labels: Record<string, string> = {
    registrada: "Registrada",
    realizada: "Realizada",
    completed: "Realizada",
    done: "Realizada",
    effective: "Efectiva",
    efectiva: "Efectiva",
    cancelada: "Cancelada",
    cancelled: "Cancelada",
    canceled: "Cancelada",
    pendiente: "Pendiente",
    pending: "Pendiente",
    venta_realizada: "Venta realizada",
    sale: "Venta realizada",
  };

  return labels[normalized] || status || "Sin estado";
}

function getStatusClass(visit: Visit) {
  if (hasSale(visit)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (isEffectiveVisit(visit)) return "border-lime-200 bg-lime-50 text-lime-800";
  if (getVisitStatus(visit).includes("cancel")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function SellerVisitsPage() {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);

  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const [customFrom, setCustomFrom] = useState(() => {
    const range = getPeriodRange(new Date(), "month");
    return range.fromDateKey;
  });

  const [customTo, setCustomTo] = useState(todayKey());

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const effectiveRange = useMemo(() => {
    if (periodMode !== "custom") {
      return getPeriodRange(anchorDate, periodMode);
    }

    const fromDate = new Date(`${customFrom}T00:00:00`);
    const toDate = new Date(`${customTo}T00:00:00`);
    const days = Math.max(
      1,
      Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
    );

    const previousTo = new Date(fromDate);
    previousTo.setDate(previousTo.getDate() - 1);

    const previousFrom = new Date(previousTo);
    previousFrom.setDate(previousFrom.getDate() - days + 1);

    return {
      label: "Periodo personalizado",
      fromDateKey: customFrom,
      toDateKey: customTo,
      previousFromDateKey: dateKey(previousFrom),
      previousToDateKey: dateKey(previousTo),
    };
  }, [periodMode, anchorDate, customFrom, customTo]);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingUser(true);
      setError("");
      setCurrentSeller(null);

      try {
        if (!firebaseUser) {
          setError("No hay una sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userSnap.exists()) {
          setError(
            "El usuario tiene inicio de sesión, pero no tiene perfil asignado en la plataforma."
          );
          return;
        }

        const raw = userSnap.data() as any;

        const profileId =
          raw.profileId ||
          raw.profile?.id ||
          raw.sellerId ||
          raw.assignedSellerId ||
          "";

        const profileType =
          raw.profile?.type || raw.type || raw.role || "seller";

        const role = raw.role || raw.type || profileType;

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

        const seller = await loadCurrentSeller(userProfile);

        if (!seller) {
          setError("No encontramos el vendedor asociado a este usuario.");
          return;
        }

        setCurrentSeller(seller);
      } catch (e: any) {
        console.error(e);
        setError(
          e?.message ||
            "No fue posible validar el perfil del vendedor para cargar las visitas."
        );
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentSeller) return;

    loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeller, effectiveRange.fromDateKey, effectiveRange.toDateKey]);

  async function loadCurrentSeller(user: PlatformUser) {
    let sellerData: Seller | null = null;

    if (user.profileId) {
      const sellerSnap = await getDoc(doc(db, "sellers", user.profileId));

      if (sellerSnap.exists()) {
        sellerData = mapSeller(sellerSnap.id, sellerSnap.data(), user.uid);
      }
    }

    if (!sellerData) {
      const sellersRef = collection(db, "sellers");

      for (const field of ["uid", "userUid", "authUid"]) {
        const snap = await getDocs(
          query(sellersRef, where(field, "==", user.uid))
        );

        if (!snap.empty) {
          const sellerDoc = snap.docs[0];
          sellerData = mapSeller(sellerDoc.id, sellerDoc.data(), user.uid);
          break;
        }
      }
    }

    return sellerData;
  }

  function mapSeller(id: string, raw: any, fallbackUid = ""): Seller {
    return {
      id,
      uid: raw.uid || raw.userUid || raw.authUid || fallbackUid,
      userUid: raw.userUid || "",
      authUid: raw.authUid || "",
      firstName: raw.firstName || "",
      lastName: raw.lastName || "",
      fullName:
        raw.fullName ||
        raw.name ||
        [raw.firstName, raw.lastName].filter(Boolean).join(" "),
      name: raw.name || "",
      status: raw.status || raw.state || "active",
      distributorId:
        raw.distributorId ||
        raw.assignedDistributorId ||
        raw.distributor?.id ||
        "",
      distributorName:
        raw.distributorName ||
        raw.assignedDistributorName ||
        raw.distributor?.name ||
        "",
      photoUrl: getSellerPhotoUrl(raw),
    };
  }

  async function loadVisits() {
    if (!currentSeller) return;

    setLoadingVisits(true);
    setError("");

    try {
      const visitsRef = collection(db, "visits");
      const queriesToRun = [];

      const sellerId = cleanId(currentSeller.id);
      const sellerUid = cleanId(
        currentSeller.uid || currentSeller.userUid || currentSeller.authUid
      );

      if (sellerId) {
        queriesToRun.push(
          query(visitsRef, where("sellerId", "==", sellerId)),
          query(visitsRef, where("assignedSellerId", "==", sellerId))
        );
      }

      if (sellerUid) {
        queriesToRun.push(
          query(visitsRef, where("sellerUid", "==", sellerUid)),
          query(visitsRef, where("assignedSellerUid", "==", sellerUid))
        );
      }

      const snapResults = await Promise.all(
        queriesToRun.map(async (qy) => {
          try {
            return await getDocs(qy);
          } catch (e) {
            console.warn("Consulta de visits omitida:", e);
            return null;
          }
        })
      );

      const map = new Map<string, Visit>();

      snapResults.forEach((snap) => {
        if (!snap) return;

        snap.docs.forEach((docSnap) => {
          const raw = docSnap.data() as any;

          const visit: Visit = {
            id: docSnap.id,
            ...raw,
          };

          const visitDate = getVisitDateKey(visit);

          if (
            visitDate &&
            visitDate >= effectiveRange.fromDateKey &&
            visitDate <= effectiveRange.toDateKey
          ) {
            map.set(visit.id, visit);
          }
        });
      });

      const list = Array.from(map.values()).sort((a, b) => {
        const dateA = getVisitDate(a)?.getTime() || 0;
        const dateB = getVisitDate(b)?.getTime() || 0;
        return dateB - dateA;
      });

      setVisits(list);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible cargar el historial de visitas.");
      setVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  }

  const filteredVisits = useMemo(() => {
    const term = search.trim().toLowerCase();

    return visits.filter((visit) => {
      if (statusFilter !== "all") {
        if (statusFilter === "effective" && !isEffectiveVisit(visit)) return false;
        if (statusFilter === "sale" && !hasSale(visit)) return false;
        if (statusFilter === "reset" && !hasReset(visit)) return false;
        if (statusFilter === "registered" && isEffectiveVisit(visit)) return false;
      }

      if (typeFilter !== "all") {
        if (typeFilter === "instant" && !isInstantVisit(visit)) return false;
        if (typeFilter === "normal" && isInstantVisit(visit)) return false;
      }

      if (term) {
        const haystack = [
          getVisitCustomerName(visit),
          getVisitPhone(visit),
          visit.city,
          visit.address,
          visit.location,
          visit.notes,
          visit.observation,
          visit.observations,
          visit.comments,
          getVisitStatus(visit),
          getVisitType(visit),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [visits, search, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    return {
      total: filteredVisits.length,
      instant: filteredVisits.filter(isInstantVisit).length,
      effective: filteredVisits.filter(isEffectiveVisit).length,
      sales: filteredVisits.filter(hasSale).length,
      resets: filteredVisits.filter(hasReset).length,
      amount: filteredVisits.reduce((sum, visit) => sum + getVisitAmount(visit), 0),
    };
  }, [filteredVisits]);

  const visitsByDay = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        label: string;
        total: number;
        effective: number;
        sales: number;
        resets: number;
      }
    >();

    filteredVisits.forEach((visit) => {
      const key = getVisitDateKey(visit) || "sin-fecha";

      if (!map.has(key)) {
        map.set(key, {
          dateKey: key,
          label: formatDateOnly(getVisitDate(visit)),
          total: 0,
          effective: 0,
          sales: 0,
          resets: 0,
        });
      }

      const record = map.get(key)!;

      record.total += 1;
      if (isEffectiveVisit(visit)) record.effective += 1;
      if (hasSale(visit)) record.sales += 1;
      if (hasReset(visit)) record.resets += 1;
    });

    return Array.from(map.values()).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
  }, [filteredVisits]);

  function handlePreviousPeriod() {
    if (periodMode === "custom") return;
    setAnchorDate((date) => shiftAnchorDate(date, periodMode, -1));
  }

  function handleNextPeriod() {
    if (periodMode === "custom") return;
    setAnchorDate((date) => shiftAnchorDate(date, periodMode, 1));
  }

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-700" />
            <p className="mt-4 text-sm font-black text-slate-600">
              Validando perfil del vendedor...
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-500 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-lime-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-3 py-1 text-xs font-black text-white shadow-sm backdrop-blur">
                <MapPin className="h-4 w-4" />
                SIANA VITAL • Visitas vendedor
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                Historial de mis visitas
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50 md:text-base">
                Consulta tus visitas en orden cronológico, de la más reciente a
                la más antigua, con sus principales estadísticas.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <HeaderBadge
                  icon={<UserRound className="h-4 w-4" />}
                  text={getSellerName(currentSeller)}
                />

                <HeaderBadge
                  icon={<Building2 className="h-4 w-4" />}
                  text={currentSeller?.distributorName || "Sin distribuidora"}
                />

                <HeaderBadge
                  icon={<CalendarDays className="h-4 w-4" />}
                  text={effectiveRange.label}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/vendedor"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>

              <button
                type="button"
                onClick={loadVisits}
                disabled={loadingVisits}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                {loadingVisits ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Actualizar
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {error}
          </div>
        ) : null}

        <VisitsPeriodControls
          periodMode={periodMode}
          setPeriodMode={setPeriodMode}
          effectiveRange={effectiveRange}
          customFrom={customFrom}
          customTo={customTo}
          setCustomFrom={setCustomFrom}
          setCustomTo={setCustomTo}
          onPrevious={handlePreviousPeriod}
          onNext={handleNextPeriod}
        />

        <section className="grid gap-4 md:grid-cols-6">
          <MetricCard
            icon={<MapPin className="h-5 w-5" />}
            label="Total visitas"
            value={String(metrics.total)}
          />

          <MetricCard
            icon={<Zap className="h-5 w-5" />}
            label="Instantáneas"
            value={String(metrics.instant)}
          />

          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Efectivas"
            value={String(metrics.effective)}
          />

          <MetricCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Ventas"
            value={String(metrics.sales)}
          />

          <MetricCard
            icon={<Target className="h-5 w-5" />}
            label="Resets"
            value={String(metrics.resets)}
          />

          <MetricCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Valor"
            value={formatMoney(metrics.amount)}
          />
        </section>

        <VisitsFilters
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <VisitsByDaySummary rows={visitsByDay} />

          <VisitsHistory
            visits={filteredVisits}
            loading={loadingVisits}
          />
        </section>
      </section>
    </main>
  );
}

function VisitsPeriodControls({
  periodMode,
  setPeriodMode,
  effectiveRange,
  customFrom,
  customTo,
  setCustomFrom,
  setCustomTo,
  onPrevious,
  onNext,
}: {
  periodMode: PeriodMode;
  setPeriodMode: (mode: PeriodMode) => void;
  effectiveRange: PeriodRange;
  customFrom: string;
  customTo: string;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const modes: { value: PeriodMode; label: string }[] = [
    { value: "month", label: "Mensual" },
    { value: "quarter", label: "Trimestral" },
    { value: "semester", label: "Semestral" },
    { value: "year", label: "Anual" },
    { value: "custom", label: "Personalizado" },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-black capitalize text-slate-950">
              {effectiveRange.label}
            </h2>
            <p className="text-sm text-slate-500">
              {effectiveRange.fromDateKey} a {effectiveRange.toDateKey}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-1">
            {modes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setPeriodMode(mode.value)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                  periodMode === mode.value
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-950"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {periodMode === "custom" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
              />

              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevious}
                className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onNext}
                className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function VisitsFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
}: {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
          <Filter className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">
            Filtros de visitas
          </h2>
          <p className="text-sm text-slate-500">
            Busca por cliente, teléfono, ciudad, dirección u observaciones.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
            Buscar
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, ciudad, teléfono..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
            Estado
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
          >
            <option value="all">Todos</option>
            <option value="registered">Registradas</option>
            <option value="effective">Efectivas</option>
            <option value="sale">Con venta</option>
            <option value="reset">Con reset / receta</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
            Tipo
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
          >
            <option value="all">Todas</option>
            <option value="normal">Normales</option>
            <option value="instant">Instantáneas</option>
          </select>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function VisitsByDaySummary({
  rows,
}: {
  rows: {
    dateKey: string;
    label: string;
    total: number;
    effective: number;
    sales: number;
    resets: number;
  }[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
          <BarChart3 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">
            Resumen por día
          </h2>
          <p className="text-sm text-slate-500">
            Días con visitas registradas en el periodo.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
          No hay visitas registradas en este periodo.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.dateKey}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="capitalize text-sm font-black text-slate-950">
                {row.label}
              </p>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <MiniStat label="Total" value={row.total} />
                <MiniStat label="Efec." value={row.effective} />
                <MiniStat label="Ventas" value={row.sales} />
                <MiniStat label="Resets" value={row.resets} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function VisitsHistory({
  visits,
  loading,
}: {
  visits: Visit[];
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Historial cronológico
          </h2>
          <p className="text-sm text-slate-500">
            Ordenado de la visita más reciente a la más antigua.
          </p>
        </div>

        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
          {visits.length} visitas
        </span>
      </div>

      {loading ? (
        <div className="p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
          <p className="mt-3 text-sm font-black text-slate-500">
            Cargando visitas...
          </p>
        </div>
      ) : visits.length === 0 ? (
        <div className="p-10 text-center">
          <MapPin className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-400">
            No hay visitas con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </section>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const amount = getVisitAmount(visit);

  return (
    <article className="p-5 hover:bg-slate-50/80">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <MapPin className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">
                {getVisitCustomerName(visit)}
              </h3>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                  visit
                )}`}
              >
                {hasSale(visit)
                  ? "Venta realizada"
                  : getStatusLabel(getVisitStatus(visit))}
              </span>

              {isInstantVisit(visit) ? (
                <Tag className="border-sky-200 bg-sky-50 text-sky-700">
                  Instantánea
                </Tag>
              ) : null}

              {hasReset(visit) ? (
                <Tag className="border-violet-200 bg-violet-50 text-violet-700">
                  Reset / receta
                </Tag>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-4 w-4" />
                {formatDateTime(getVisitDate(visit))}
              </span>

              {getVisitPhone(visit) ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {getVisitPhone(visit)}
                </span>
              ) : null}

              {visit.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {visit.city}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {visit.address || visit.location || "Sin dirección registrada"}
            </p>

            {visit.notes ||
            visit.observation ||
            visit.observations ||
            visit.comments ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <FileText className="h-3 w-3 text-emerald-700" />
                  Observaciones
                </p>

                <p className="whitespace-pre-line">
                  {visit.notes ||
                    visit.observation ||
                    visit.observations ||
                    visit.comments}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-[180px] grid-cols-2 gap-2 md:text-right">
          <SmallBox label="Valor" value={amount ? formatMoney(amount) : "$0"} />
          <SmallBox
            label="Tipo"
            value={isInstantVisit(visit) ? "Instant." : "Normal"}
          />
          <SmallBox
            label="Efectiva"
            value={isEffectiveVisit(visit) ? "Sí" : "No"}
          />
          <SmallBox label="Venta" value={hasSale(visit) ? "Sí" : "No"} />
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function SmallBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {children}
    </span>
  );
}

function HeaderBadge({
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