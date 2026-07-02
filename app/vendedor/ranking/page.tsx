"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  Award,
  Building2,
  CalendarDays,
  Loader2,
  Medal,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";

import { db } from "@/lib/firebase";

import { RankingFilters } from "@/components/ranking/RankingFilters";
import { RankingKpiCards } from "@/components/ranking/RankingKpiCards";
import { RankingHighlights } from "@/components/ranking/RankingHighlights";
import { RankingPodium } from "@/components/ranking/RankingPodium";

import {
  buildRankingHighlights,
  buildRankingKpis,
  buildRankingRows,
  todayBogotaKey,
  validateRankingFilters,
} from "@/components/ranking/rankingUtils";

import type {
  DistributorCatalogItem,
  RankingFilters as RankingFiltersType,
  SellerCatalogItem,
  VisitStatsDailyDoc,
} from "@/components/ranking/rankingTypes";

type PlatformUser = {
  uid: string;
  role: string;
  profileId: string;
  profileType: string;
  displayName: string;
};

type CurrentSeller = {
  id: string;
  uid?: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  distributorId?: string;
  distributorName?: string;
  photoUrl?: string;
};

function cleanString(value: any) {
  return String(value || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function monthStartKey() {
  const today = todayBogotaKey();
  const [year, month] = today.split("-");

  return `${year}-${month}-01`;
}

function getSellerName(seller?: CurrentSeller | SellerCatalogItem | null) {
  if (!seller) return "Vendedor";

  return (
    (seller as any).fullName ||
    (seller as any).name ||
    [(seller as any).firstName, (seller as any).lastName]
      .filter(Boolean)
      .join(" ") ||
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

function getDistributorName(distributor?: DistributorCatalogItem | any) {
  if (!distributor) return "Distribuidora";

  return (
    distributor.name ||
    distributor.distributorName ||
    distributor.businessName ||
    distributor.legalName ||
    distributor.companyName ||
    "Distribuidora"
  );
}

function getDistributorPhotoUrl(raw: any) {
  return (
    raw?.logo?.url ||
    raw?.photo?.url ||
    raw?.logoUrl ||
    raw?.logoURL ||
    raw?.photoUrl ||
    raw?.photoURL ||
    raw?.imageUrl ||
    raw?.avatarUrl ||
    ""
  );
}

function isActiveSeller(raw: any) {
  const status = String(raw?.status || raw?.state || "active")
    .toLowerCase()
    .trim();

  return ![
    "inactive",
    "inactivo",
    "disabled",
    "deshabilitado",
    "bloqueado",
    "blocked",
  ].includes(status);
}

function getRowId(row: any) {
  return cleanString(
    row.id ||
      row.sellerId ||
      row.distributorId ||
      row.entityId ||
      row.itemId ||
      ""
  );
}

function getRowSellerId(row: any) {
  return cleanString(row.sellerId || row.id || row.entityId || "");
}

function getRowDistributorId(row: any) {
  return cleanString(
    row.distributorId ||
      row.id ||
      row.entityId ||
      row.distributor?.id ||
      ""
  );
}

function getRowName(row: any) {
  return (
    row.name ||
    row.sellerName ||
    row.distributorName ||
    row.fullName ||
    row.businessName ||
    "Sin nombre"
  );
}

function getRowPhoto(row: any) {
  return (
    row.photoUrl ||
    row.photoURL ||
    row.photo?.url ||
    row.logoUrl ||
    row.logo?.url ||
    ""
  );
}

function numberValue(...values: any[]) {
  for (const value of values) {
    const number = Number(value || 0);

    if (!Number.isNaN(number) && number !== 0) {
      return Math.round(number * 100) / 100;
    }
  }

  return 0;
}

function getMetricLabel(metricFocus: string) {
  const labels: Record<string, string> = {
    visits: "Visitas",
    totalVisits: "Visitas",
    instantVisits: "Visitas instantáneas",
    referrals: "Referidos",
    referred: "Referidos",
    resets: "Resets",
    recipeControls: "Control receta",
    sales: "Ventas",
    purchases: "Ventas",
    idc: "Índice general",
    general: "Índice general",
    effectiveness: "Efectividad",
    average: "Promedio",
  };

  return labels[metricFocus] || metricFocus || "Indicador";
}

function getMetricValue(row: any, metricFocus: string) {
  if (metricFocus === "idc" || metricFocus === "general") {
    return numberValue(
      row.idc,
      row.idcScore,
      row.index,
      row.generalScore,
      row.score,
      row.metricValue
    );
  }

  if (metricFocus === "visits" || metricFocus === "totalVisits") {
    return numberValue(row.totalVisits, row.visits, row.visitCount);
  }

  if (metricFocus === "instantVisits") {
    return numberValue(
      row.instantVisits,
      row.totalInstantVisits,
      row.instantVisitCount
    );
  }

  if (metricFocus === "referrals" || metricFocus === "referred") {
    return numberValue(row.referrals, row.referred, row.totalReferrals);
  }

  if (metricFocus === "resets" || metricFocus === "recipeControls") {
    return numberValue(
      row.resets,
      row.recipeControls,
      row.totalRecipeControls,
      row.controlReceta
    );
  }

  if (metricFocus === "sales" || metricFocus === "purchases") {
    return numberValue(row.sales, row.totalSales, row.purchases, row.totalPurchases);
  }

  if (metricFocus === "effectiveness") {
    return numberValue(row.effectiveness, row.effectiveRate, row.visitEffectiveness);
  }

  return numberValue(row[metricFocus], row.metricValue, row.score);
}

function getVisits(row: any) {
  return numberValue(row.totalVisits, row.visits, row.visitCount);
}

function getReferrals(row: any) {
  return numberValue(row.referrals, row.referred, row.totalReferrals);
}

function getResets(row: any) {
  return numberValue(
    row.resets,
    row.recipeControls,
    row.totalRecipeControls,
    row.controlReceta
  );
}

function getSales(row: any) {
  return numberValue(row.sales, row.totalSales, row.purchases, row.totalPurchases);
}

function getIdc(row: any) {
  return numberValue(row.idc, row.idcScore, row.index, row.generalScore, row.score);
}

export default function SellerRankingPage() {
  const [filters, setFilters] = useState<RankingFiltersType>({
    scope: "sellers",
    metricFocus: "idc",
    fromDateKey: monthStartKey(),
    toDateKey: todayBogotaKey(),
    distributorId: "all",
    sellerType: "all",
    minVisits: 0,
    minSellers: 0,
  });

  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [currentSeller, setCurrentSeller] = useState<CurrentSeller | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [err, setErr] = useState("");

  const [sellersById, setSellersById] = useState<
    Record<string, SellerCatalogItem>
  >({});

  const [distributorsById, setDistributorsById] = useState<
    Record<string, DistributorCatalogItem>
  >({});

  const [statsDocs, setStatsDocs] = useState<VisitStatsDailyDoc[]>([]);

  const loading = loadingUser || loadingCatalogs || loadingStats;

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingUser(true);
      setErr("");
      setCurrentSeller(null);

      try {
        if (!firebaseUser) {
          setErr("No hay una sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userSnap.exists()) {
          setErr(
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
          raw.profile?.type ||
          raw.type ||
          raw.role ||
          "seller";

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
          setErr("No encontramos el vendedor asociado a este usuario.");
          return;
        }

        setCurrentSeller(seller);
      } catch (error: any) {
        console.error(error);
        setErr(
          error?.message ||
            "No fue posible validar el perfil del vendedor para cargar el ranking."
        );
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loadCurrentSeller(user: PlatformUser) {
    let sellerData: CurrentSeller | null = null;

    if (user.profileId) {
      const sellerSnap = await getDoc(doc(db, "sellers", user.profileId));

      if (sellerSnap.exists()) {
        const raw = sellerSnap.data() as any;

        sellerData = {
          id: sellerSnap.id,
          uid: raw.uid || raw.userUid || raw.authUid || user.uid,
          firstName: raw.firstName || "",
          lastName: raw.lastName || "",
          fullName:
            raw.fullName ||
            raw.name ||
            [raw.firstName, raw.lastName].filter(Boolean).join(" "),
          name: raw.name || "",
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
    }

    if (!sellerData) {
      const sellersRef = collection(db, "sellers");
      const uidFields = ["uid", "userUid", "authUid"];

      for (const field of uidFields) {
        const snap = await getDocs(query(sellersRef, where(field, "==", user.uid)));

        if (!snap.empty) {
          const sellerDoc = snap.docs[0];
          const raw = sellerDoc.data() as any;

          sellerData = {
            id: sellerDoc.id,
            uid: raw.uid || raw.userUid || raw.authUid || user.uid,
            firstName: raw.firstName || "",
            lastName: raw.lastName || "",
            fullName:
              raw.fullName ||
              raw.name ||
              [raw.firstName, raw.lastName].filter(Boolean).join(" "),
            name: raw.name || "",
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

          break;
        }
      }
    }

    return sellerData;
  }

  async function loadCatalogs() {
    setLoadingCatalogs(true);
    setErr("");

    try {
      const sellersSnap = await getDocs(collection(db, "sellers"));

      const sellersEntries = sellersSnap.docs
        .map((docSnap) => {
          const rawData = docSnap.data() as any;

          if (!isActiveSeller(rawData)) return null;

          const seller: SellerCatalogItem = {
            id: docSnap.id,
            ...(rawData as Omit<SellerCatalogItem, "id">),
            photoUrl: getSellerPhotoUrl(rawData),
          };

          return [docSnap.id, seller] as const;
        })
        .filter(Boolean) as [string, SellerCatalogItem][];

      const sellersMap = Object.fromEntries(sellersEntries);

      const distributorsSnap = await getDocs(collection(db, "distributors"));

      const distributorsEntries = distributorsSnap.docs.map((docSnap) => {
        const rawData = docSnap.data() as any;

        const distributor: DistributorCatalogItem = {
          id: docSnap.id,
          ...(rawData as Omit<DistributorCatalogItem, "id">),
          photoUrl: getDistributorPhotoUrl(rawData),
        };

        return [docSnap.id, distributor] as const;
      });

      const distributorsMap = Object.fromEntries(distributorsEntries);

      setSellersById(sellersMap);
      setDistributorsById(distributorsMap);
    } catch (error: any) {
      console.error(error);

      setErr(
        error?.message ||
          "No se pudieron cargar los catálogos de vendedores y distribuidoras."
      );
    } finally {
      setLoadingCatalogs(false);
    }
  }

  async function loadStats(nextFilters = filters) {
    setLoadingStats(true);
    setErr("");

    const validation = validateRankingFilters(nextFilters);

    if (validation) {
      setErr(validation);
      setStatsDocs([]);
      setLoadingStats(false);
      return;
    }

    try {
      const qy = query(
        collection(db, "visit_stats_daily"),
        where("dateKey", ">=", nextFilters.fromDateKey),
        where("dateKey", "<=", nextFilters.toDateKey)
      );

      const snap = await getDocs(qy);

      const rows: VisitStatsDailyDoc[] = [];

      snap.forEach((docSnap) => {
        rows.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VisitStatsDailyDoc, "id">),
        });
      });

      setStatsDocs(rows);
    } catch (error: any) {
      console.error(error);

      setErr(
        error?.message ||
          "No se pudieron cargar las estadísticas de visitas del periodo seleccionado."
      );

      setStatsDocs([]);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadStats(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.fromDateKey, filters.toDateKey]);

  const distributorOptions = useMemo(() => {
    const ids = new Set<string>();

    Object.values(sellersById).forEach((seller: any) => {
      if (seller.distributorId) {
        ids.add(String(seller.distributorId));
      }
    });

    Object.keys(distributorsById).forEach((id) => {
      ids.add(id);
    });

    return Array.from(ids).sort((a, b) => {
      const aName = getDistributorName(distributorsById[a]);
      const bName = getDistributorName(distributorsById[b]);

      return String(aName).localeCompare(String(bName));
    });
  }, [sellersById, distributorsById]);

  const rankingRows = useMemo(() => {
    return buildRankingRows({
      statsDocs,
      sellersById,
      distributorsById,
      filters,
    });
  }, [statsDocs, sellersById, distributorsById, filters]);

  const kpis = useMemo(() => {
    return buildRankingKpis(rankingRows);
  }, [rankingRows]);

  const highlights = useMemo(() => {
    return buildRankingHighlights(rankingRows);
  }, [rankingRows]);

  const currentSellerGlobalPosition = useMemo(() => {
    if (!currentSeller || filters.scope !== "sellers") return null;

    const index = rankingRows.findIndex((row: any) => {
      const rowSellerId = getRowSellerId(row);
      return rowSellerId === currentSeller.id || getRowId(row) === currentSeller.id;
    });

    if (index < 0) return null;

    return {
      position: index + 1,
      total: rankingRows.length,
      row: rankingRows[index] as any,
    };
  }, [rankingRows, currentSeller, filters.scope]);

  const currentSellerDistributorPosition = useMemo(() => {
    if (!currentSeller || filters.scope !== "sellers") return null;
    if (!currentSeller.distributorId) return null;

    const distributorRows = rankingRows.filter((row: any) => {
      return String(row.distributorId || "") === String(currentSeller.distributorId);
    });

    const index = distributorRows.findIndex((row: any) => {
      const rowSellerId = getRowSellerId(row);
      return rowSellerId === currentSeller.id || getRowId(row) === currentSeller.id;
    });

    if (index < 0) return null;

    return {
      position: index + 1,
      total: distributorRows.length,
      row: distributorRows[index] as any,
    };
  }, [rankingRows, currentSeller, filters.scope]);

  const currentDistributorPosition = useMemo(() => {
    if (!currentSeller || filters.scope !== "distributors") return null;
    if (!currentSeller.distributorId) return null;

    const index = rankingRows.findIndex((row: any) => {
      return getRowDistributorId(row) === currentSeller.distributorId;
    });

    if (index < 0) return null;

    return {
      position: index + 1,
      total: rankingRows.length,
      row: rankingRows[index] as any,
    };
  }, [rankingRows, currentSeller, filters.scope]);

  function handleFiltersChange(next: RankingFiltersType) {
    setFilters(next);
  }

  async function handleReload() {
    await loadCatalogs();
    await loadStats(filters);
  }

  const myDistributor = currentSeller?.distributorId
    ? distributorsById[currentSeller.distributorId]
    : null;

  const metricLabel = getMetricLabel(filters.metricFocus);

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-500 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-lime-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-3 py-1 text-xs font-black text-white shadow-sm backdrop-blur">
                <Trophy className="h-4 w-4" />
                SIANA VITAL • Ranking vendedor
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                Ranking y Desempeño Comercial
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50 md:text-base">
                Compara tu desempeño con todos los vendedores y todas las
                distribuidoras. Tu posición aparece resaltada para motivarte a
                subir en el ranking.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <HeaderBadge
                  icon={<UserRound className="h-4 w-4" />}
                  text={getSellerName(currentSeller)}
                />

                <HeaderBadge
                  icon={<Building2 className="h-4 w-4" />}
                  text={
                    getDistributorName(myDistributor) ||
                    currentSeller?.distributorName ||
                    "Sin distribuidora"
                  }
                />

                <HeaderBadge
                  icon={<Target className="h-4 w-4" />}
                  text={metricLabel}
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
                onClick={handleReload}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <RankingFilters
          filters={filters}
          onChange={handleFiltersChange}
          distributorsById={distributorsById}
          distributorOptions={distributorOptions}
          loading={loading}
          onReload={handleReload}
        />

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {err}
          </div>
        ) : null}

        <MyPositionCard
          loading={loading}
          metricLabel={metricLabel}
          filters={filters}
          currentSeller={currentSeller}
          sellerGlobalPosition={currentSellerGlobalPosition}
          sellerDistributorPosition={currentSellerDistributorPosition}
          distributorPosition={currentDistributorPosition}
          distributor={myDistributor}
        />

        <RankingKpiCards kpis={kpis} />

        <RankingHighlights highlights={highlights} />

        <RankingPodium rows={rankingRows} metricFocus={filters.metricFocus} />

        <SellerChallengeTable
          rows={rankingRows}
          loading={loading}
          filters={filters}
          metricLabel={metricLabel}
          currentSeller={currentSeller}
        />
      </div>
    </div>
  );
}

function MyPositionCard({
  loading,
  metricLabel,
  filters,
  currentSeller,
  sellerGlobalPosition,
  sellerDistributorPosition,
  distributorPosition,
  distributor,
}: {
  loading: boolean;
  metricLabel: string;
  filters: RankingFiltersType;
  currentSeller: CurrentSeller | null;
  sellerGlobalPosition: any;
  sellerDistributorPosition: any;
  distributorPosition: any;
  distributor: any;
}) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-black/50">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          Calculando tu ubicación en el ranking...
        </div>
      </section>
    );
  }

  if (!currentSeller) return null;

  const myMetricValue =
    filters.scope === "sellers"
      ? getMetricValue(sellerGlobalPosition?.row || {}, filters.metricFocus)
      : getMetricValue(distributorPosition?.row || {}, filters.metricFocus);

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-3xl border-4 border-white bg-emerald-100 shadow-md">
            {currentSeller.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSeller.photoUrl}
                alt={getSellerName(currentSeller)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 to-lime-500 text-white">
                <UserRound className="h-9 w-9" />
              </div>
            )}
          </div>

          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white">
              <Sparkles className="h-4 w-4" />
              Este eres tú
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {getSellerName(currentSeller)}
            </h2>

            <p className="text-sm font-semibold text-slate-500">
              {getDistributorName(distributor) ||
                currentSeller.distributorName ||
                "Sin distribuidora"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {filters.scope === "sellers" ? (
            <>
              <PositionMiniCard
                label="Puesto general"
                value={
                  sellerGlobalPosition
                    ? `#${sellerGlobalPosition.position} de ${sellerGlobalPosition.total}`
                    : "Sin datos"
                }
                icon={<Trophy className="h-5 w-5" />}
              />

              <PositionMiniCard
                label="Puesto en mi distribuidora"
                value={
                  sellerDistributorPosition
                    ? `#${sellerDistributorPosition.position} de ${sellerDistributorPosition.total}`
                    : "Sin datos"
                }
                icon={<Medal className="h-5 w-5" />}
              />

              <PositionMiniCard
                label={metricLabel}
                value={String(myMetricValue || 0)}
                icon={<Zap className="h-5 w-5" />}
              />
            </>
          ) : (
            <>
              <PositionMiniCard
                label="Mi distribuidora"
                value={
                  distributorPosition
                    ? `#${distributorPosition.position} de ${distributorPosition.total}`
                    : "Sin datos"
                }
                icon={<Building2 className="h-5 w-5" />}
              />

              <PositionMiniCard
                label={metricLabel}
                value={String(myMetricValue || 0)}
                icon={<Zap className="h-5 w-5" />}
              />

              <PositionMiniCard
                label="Reto"
                value="Subir posición"
                icon={<Award className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SellerChallengeTable({
  rows,
  loading,
  filters,
  metricLabel,
  currentSeller,
}: {
  rows: any[];
  loading: boolean;
  filters: RankingFiltersType;
  metricLabel: string;
  currentSeller: CurrentSeller | null;
}) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-black/10 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
        <p className="mt-3 text-sm font-black text-black/50">
          Cargando ranking...
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-black/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-black">
            {filters.scope === "sellers"
              ? "Ranking general de vendedores"
              : "Ranking general de distribuidoras"}
          </h2>

          <p className="text-sm text-black/50">
            Indicador seleccionado: <strong>{metricLabel}</strong>. Tu registro
            aparece resaltado en verde.
          </p>
        </div>

        <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">
          {rows.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-black/[0.03] text-xs uppercase tracking-wide text-black/50">
            <tr>
              <th className="px-4 py-3 font-black">Puesto</th>
              <th className="px-4 py-3 font-black">
                {filters.scope === "sellers" ? "Vendedor" : "Distribuidora"}
              </th>
              <th className="px-4 py-3 font-black">{metricLabel}</th>
              <th className="px-4 py-3 font-black">Visitas</th>
              <th className="px-4 py-3 font-black">Referidos</th>
              <th className="px-4 py-3 font-black">Resets</th>
              <th className="px-4 py-3 font-black">Ventas</th>
              <th className="px-4 py-3 font-black">IDC</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center font-bold text-black/40"
                >
                  No hay datos para el ranking con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isMySeller =
                  filters.scope === "sellers" &&
                  currentSeller &&
                  getRowSellerId(row) === currentSeller.id;

                const isMyDistributor =
                  filters.scope === "distributors" &&
                  currentSeller?.distributorId &&
                  getRowDistributorId(row) === currentSeller.distributorId;

                const isMe = Boolean(isMySeller || isMyDistributor);

                return (
                  <tr
                    key={`${getRowId(row)}-${index}`}
                    className={
                      isMe
                        ? "bg-gradient-to-r from-emerald-50 via-lime-50 to-white ring-2 ring-inset ring-emerald-300"
                        : "hover:bg-black/[0.02]"
                    }
                  >
                    <td className="px-4 py-4">
                      <RankPill rank={index + 1} isMe={isMe} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-12 w-12 overflow-hidden rounded-2xl border bg-black/5 ${
                            isMe
                              ? "border-emerald-400 ring-2 ring-emerald-200"
                              : "border-black/10"
                          }`}
                        >
                          {getRowPhoto(row) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getRowPhoto(row)}
                              alt={getRowName(row)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 to-lime-500 text-white">
                              {filters.scope === "sellers" ? (
                                <UserRound className="h-5 w-5" />
                              ) : (
                                <Building2 className="h-5 w-5" />
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="font-black text-black">
                            {getRowName(row)}
                          </p>

                          {isMe ? (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-black text-white">
                              <Sparkles className="h-3 w-3" />
                              {filters.scope === "sellers"
                                ? "Este eres tú"
                                : "Tu distribuidora"}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs font-semibold text-black/40">
                              {filters.scope === "sellers"
                                ? row.distributorName || "Sin distribuidora"
                                : "Distribuidora"}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">
                        {getMetricValue(row, filters.metricFocus)}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-bold text-black/70">
                      {getVisits(row)}
                    </td>

                    <td className="px-4 py-4 font-bold text-black/70">
                      {getReferrals(row)}
                    </td>

                    <td className="px-4 py-4 font-bold text-black/70">
                      {getResets(row)}
                    </td>

                    <td className="px-4 py-4 font-bold text-emerald-700">
                      {getSales(row)}
                    </td>

                    <td className="px-4 py-4 font-bold text-black/70">
                      {getIdc(row)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PositionMiniCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>

      <p className="text-xl font-black text-slate-950">{value}</p>
    </div>
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

function RankPill({ rank, isMe }: { rank: number; isMe: boolean }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
        <Trophy className="h-4 w-4" />
        #{rank}
      </span>
    );
  }

  if (rank === 2 || rank === 3) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
        <Medal className="h-4 w-4" />
        #{rank}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
        isMe
          ? "bg-emerald-700 text-white"
          : "bg-black/[0.06] text-black/60"
      }`}
    >
      #{rank}
    </span>
  );
}