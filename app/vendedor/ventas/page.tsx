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
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRound,
  UsersRound,
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

type Distributor = {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
};

type VisitStat = {
  id: string;
  dateKey?: string;
  monthKey?: string;
  createdMonthKey?: string;
  visitMonthKey?: string;

  sellerId?: string;
  assignedSellerId?: string;
  sellerDocId?: string;
  sellerProfileId?: string;
  sellerCode?: string;
  seller_id?: string;
  assignedSellerDocId?: string;
  assignedSellerProfileId?: string;

  sellerUid?: string;
  assignedSellerUid?: string;
  uid?: string;
  userUid?: string;
  authUid?: string;

  sellerName?: string;
  assignedSellerName?: string;

  distributorId?: string;
  distributorName?: string;

  sales?: number;
  totalSales?: number;
  salesCount?: number;
  saleCount?: number;
  salesTotal?: number;

  purchases?: number;
  totalPurchases?: number;
  purchaseCount?: number;
  purchaseTotal?: number;

  ventas?: number;
  totalVentas?: number;
  compras?: number;
  totalCompras?: number;

  amount?: number;
  totalAmount?: number;
  salesAmount?: number;
  totalPurchasedAmount?: number;
  purchaseAmount?: number;
  totalPurchaseAmount?: number;
  totalSalesAmount?: number;
  ventaValor?: number;
  valorVentas?: number;
  montoVentas?: number;

  visits?: number;
  totalVisits?: number;
  visitCount?: number;
  totalVisitCount?: number;
  visitas?: number;
  totalVisitas?: number;
};

type SellerSalesRow = {
  sellerId: string;
  sellerUid?: string;
  sellerName: string;
  sellerPhotoUrl?: string;
  sales: number;
  amount: number;
  visits: number;
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

function numberFrom(...values: any[]) {
  for (const value of values) {
    const number = Number(value || 0);

    if (!Number.isNaN(number) && number > 0) {
      return Math.round(number * 100) / 100;
    }
  }

  return 0;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("es-CO");
}

function percentageChange(current: number, previous: number) {
  if (!previous && current > 0) return 100;
  if (!previous && !current) return 0;

  return Math.round(((current - previous) / previous) * 1000) / 10;
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

function getDistributorName(raw: any) {
  return (
    raw?.name ||
    raw?.businessName ||
    raw?.legalName ||
    raw?.companyName ||
    raw?.distributorName ||
    "Distribuidora"
  );
}

function getDistributorLogo(raw: any) {
  return (
    raw?.logo?.url ||
    raw?.photo?.url ||
    raw?.logoUrl ||
    raw?.logoURL ||
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
    "blocked",
    "bloqueado",
  ].includes(status);
}

function statSellerId(stat: VisitStat) {
  return cleanId(
    stat.sellerId ||
      stat.assignedSellerId ||
      stat.sellerDocId ||
      stat.sellerProfileId ||
      stat.assignedSellerDocId ||
      stat.assignedSellerProfileId ||
      stat.sellerCode ||
      stat.seller_id ||
      ""
  );
}

function statSellerUid(stat: VisitStat) {
  return cleanId(
    stat.sellerUid ||
      stat.assignedSellerUid ||
      stat.uid ||
      stat.userUid ||
      stat.authUid ||
      ""
  );
}

function statSales(stat: VisitStat) {
  return numberFrom(
    stat.totalSales,
    stat.sales,
    stat.salesCount,
    stat.saleCount,
    stat.salesTotal,
    stat.totalPurchases,
    stat.purchases,
    stat.purchaseCount,
    stat.purchaseTotal,
    stat.ventas,
    stat.totalVentas,
    stat.compras,
    stat.totalCompras
  );
}

function statAmount(stat: VisitStat) {
  return numberFrom(
    stat.totalPurchasedAmount,
    stat.totalAmount,
    stat.salesAmount,
    stat.amount,
    stat.purchaseAmount,
    stat.totalPurchaseAmount,
    stat.totalSalesAmount,
    stat.ventaValor,
    stat.valorVentas,
    stat.montoVentas
  );
}

function statVisits(stat: VisitStat) {
  return numberFrom(
    stat.totalVisits,
    stat.visits,
    stat.visitCount,
    stat.totalVisitCount,
    stat.visitas,
    stat.totalVisitas
  );
}

export default function SellerSalesPage() {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [distributor, setDistributor] = useState<Distributor | null>(null);

  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const [customFrom, setCustomFrom] = useState(() => {
    const range = getPeriodRange(new Date(), "month");
    return range.fromDateKey;
  });

  const [customTo, setCustomTo] = useState(todayKey());

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<VisitStat[]>([]);
  const [previousStats, setPreviousStats] = useState<VisitStat[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

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
      setDistributor(null);

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
            "No fue posible validar el perfil del vendedor para cargar las ventas."
        );
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentSeller) return;

    loadSalesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentSeller,
    effectiveRange.fromDateKey,
    effectiveRange.toDateKey,
    effectiveRange.previousFromDateKey,
    effectiveRange.previousToDateKey,
  ]);

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
        raw.distributorId || raw.assignedDistributorId || raw.distributor?.id || "",
      distributorName:
        raw.distributorName ||
        raw.assignedDistributorName ||
        raw.distributor?.name ||
        "",
      photoUrl: getSellerPhotoUrl(raw),
    };
  }

  async function loadSalesData() {
    if (!currentSeller) return;

    setLoadingData(true);
    setError("");

    try {
      let finalSellers: Seller[] = [currentSeller];

      const distributorId = currentSeller.distributorId || "";

      if (!distributorId) {
        setDistributor(null);
        setError(
          "Este vendedor no tiene distribuidora asignada. Se muestran solo sus datos."
        );
      } else {
        const distributorSnap = await getDoc(doc(db, "distributors", distributorId));

        if (distributorSnap.exists()) {
          const rawDistributor = distributorSnap.data() as any;

          setDistributor({
            id: distributorSnap.id,
            name: getDistributorName(rawDistributor),
            city: rawDistributor.city || rawDistributor.municipality || "",
            phone: rawDistributor.phone || rawDistributor.contactPhone || "",
            email: rawDistributor.email || rawDistributor.contactEmail || "",
            logoUrl: getDistributorLogo(rawDistributor),
          });
        } else {
          setDistributor(null);
        }

        const sellersSnap = await getDocs(
          query(collection(db, "sellers"), where("distributorId", "==", distributorId))
        );

        const distributorSellers = sellersSnap.docs
          .map((sellerDoc) => mapSeller(sellerDoc.id, sellerDoc.data()))
          .filter(isActiveSeller)
          .sort((a, b) => getSellerName(a).localeCompare(getSellerName(b)));

        finalSellers = distributorSellers.length
          ? distributorSellers
          : [currentSeller];
      }

      setSellers(finalSellers);

      const [currentSnap, previousSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "visit_stats_daily"),
            where("dateKey", ">=", effectiveRange.fromDateKey),
            where("dateKey", "<=", effectiveRange.toDateKey)
          )
        ),
        getDocs(
          query(
            collection(db, "visit_stats_daily"),
            where("dateKey", ">=", effectiveRange.previousFromDateKey),
            where("dateKey", "<=", effectiveRange.previousToDateKey)
          )
        ),
      ]);

      const currentRows: VisitStat[] = [];
      const previousRows: VisitStat[] = [];

      currentSnap.forEach((docSnap) => {
        currentRows.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VisitStat, "id">),
        });
      });

      previousSnap.forEach((docSnap) => {
        previousRows.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VisitStat, "id">),
        });
      });

      console.group("🔎 Diagnóstico ventas vendedor");
      console.log("Vendedor actual:", currentSeller);
      console.log("Vendedores distribuidora:", finalSellers.length);
      console.log("Rango actual:", effectiveRange.fromDateKey, effectiveRange.toDateKey);
      console.log("Docs visit_stats_daily actual:", currentRows.length);
      console.log("Docs visit_stats_daily anterior:", previousRows.length);
      console.log("Primer doc actual:", currentRows[0]);
      console.groupEnd();

      setStats(currentRows);
      setPreviousStats(previousRows);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message || "No fue posible cargar las ventas desde visit_stats_daily."
      );
      setStats([]);
      setPreviousStats([]);
    } finally {
      setLoadingData(false);
    }
  }

  const sellerIds = useMemo(() => {
    return new Set(sellers.map((seller) => cleanId(seller.id)).filter(Boolean));
  }, [sellers]);

  const sellerUids = useMemo(() => {
    return new Set(
      sellers
        .map((seller) => cleanId(seller.uid || seller.userUid || seller.authUid))
        .filter(Boolean)
    );
  }, [sellers]);

  const currentPeriodStats = useMemo(() => {
    return stats.filter((stat) => {
      const id = statSellerId(stat);
      const uid = statSellerUid(stat);

      return sellerIds.has(id) || sellerUids.has(uid);
    });
  }, [stats, sellerIds, sellerUids]);

  const previousPeriodStats = useMemo(() => {
    return previousStats.filter((stat) => {
      const id = statSellerId(stat);
      const uid = statSellerUid(stat);

      return sellerIds.has(id) || sellerUids.has(uid);
    });
  }, [previousStats, sellerIds, sellerUids]);

  const myCurrentStats = useMemo(() => {
    if (!currentSeller) return [];

    return currentPeriodStats.filter((stat) => {
      return (
        statSellerId(stat) === cleanId(currentSeller.id) ||
        statSellerUid(stat) ===
          cleanId(currentSeller.uid || currentSeller.userUid || currentSeller.authUid)
      );
    });
  }, [currentPeriodStats, currentSeller]);

  const myPreviousStats = useMemo(() => {
    if (!currentSeller) return [];

    return previousPeriodStats.filter((stat) => {
      return (
        statSellerId(stat) === cleanId(currentSeller.id) ||
        statSellerUid(stat) ===
          cleanId(currentSeller.uid || currentSeller.userUid || currentSeller.authUid)
      );
    });
  }, [previousPeriodStats, currentSeller]);

  const totals = useMemo(() => {
    const mySales = myCurrentStats.reduce((sum, stat) => sum + statSales(stat), 0);
    const myAmount = myCurrentStats.reduce((sum, stat) => sum + statAmount(stat), 0);
    const myVisits = myCurrentStats.reduce((sum, stat) => sum + statVisits(stat), 0);

    const myPreviousSales = myPreviousStats.reduce(
      (sum, stat) => sum + statSales(stat),
      0
    );
    const myPreviousAmount = myPreviousStats.reduce(
      (sum, stat) => sum + statAmount(stat),
      0
    );

    const distributorSales = currentPeriodStats.reduce(
      (sum, stat) => sum + statSales(stat),
      0
    );

    const distributorAmount = currentPeriodStats.reduce(
      (sum, stat) => sum + statAmount(stat),
      0
    );

    const distributorVisits = currentPeriodStats.reduce(
      (sum, stat) => sum + statVisits(stat),
      0
    );

    const distributorPreviousSales = previousPeriodStats.reduce(
      (sum, stat) => sum + statSales(stat),
      0
    );

    const distributorPreviousAmount = previousPeriodStats.reduce(
      (sum, stat) => sum + statAmount(stat),
      0
    );

    return {
      mySales,
      myAmount,
      myVisits,
      myPreviousSales,
      myPreviousAmount,
      distributorSales,
      distributorAmount,
      distributorVisits,
      distributorPreviousSales,
      distributorPreviousAmount,
    };
  }, [myCurrentStats, myPreviousStats, currentPeriodStats, previousPeriodStats]);

  const sellerRows = useMemo<SellerSalesRow[]>(() => {
    return sellers
      .map((seller) => {
        const sellerStats = currentPeriodStats.filter((stat) => {
          return (
            statSellerId(stat) === cleanId(seller.id) ||
            statSellerUid(stat) === cleanId(seller.uid || seller.userUid || seller.authUid)
          );
        });

        return {
          sellerId: seller.id,
          sellerUid: seller.uid || seller.userUid || seller.authUid || "",
          sellerName: getSellerName(seller),
          sellerPhotoUrl: seller.photoUrl || "",
          sales: sellerStats.reduce((sum, stat) => sum + statSales(stat), 0),
          amount: sellerStats.reduce((sum, stat) => sum + statAmount(stat), 0),
          visits: sellerStats.reduce((sum, stat) => sum + statVisits(stat), 0),
        };
      })
      .sort((a, b) => {
        if (b.sales !== a.sales) return b.sales - a.sales;
        if (b.amount !== a.amount) return b.amount - a.amount;
        if (b.visits !== a.visits) return b.visits - a.visits;
        return a.sellerName.localeCompare(b.sellerName);
      });
  }, [sellers, currentPeriodStats]);

  const monthlyComparison = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        mySales: number;
        distributorSales: number;
        myAmount: number;
        distributorAmount: number;
      }
    >();

    currentPeriodStats.forEach((stat) => {
      const key =
        stat.monthKey ||
        stat.createdMonthKey ||
        stat.visitMonthKey ||
        String(stat.dateKey || "").slice(0, 7);

      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          mySales: 0,
          distributorSales: 0,
          myAmount: 0,
          distributorAmount: 0,
        });
      }

      const record = map.get(key)!;

      record.distributorSales += statSales(stat);
      record.distributorAmount += statAmount(stat);

      if (
        currentSeller &&
        (statSellerId(stat) === cleanId(currentSeller.id) ||
          statSellerUid(stat) ===
            cleanId(currentSeller.uid || currentSeller.userUid || currentSeller.authUid))
      ) {
        record.mySales += statSales(stat);
        record.myAmount += statAmount(stat);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );
  }, [currentPeriodStats, currentSeller]);

  const myPosition = useMemo(() => {
    if (!currentSeller) return null;

    const index = sellerRows.findIndex((row) => {
      return (
        row.sellerId === currentSeller.id ||
        cleanId(row.sellerUid) ===
          cleanId(currentSeller.uid || currentSeller.userUid || currentSeller.authUid)
      );
    });

    if (index < 0) return null;

    return {
      position: index + 1,
      total: sellerRows.length,
      row: sellerRows[index],
    };
  }, [sellerRows, currentSeller]);

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
                <ShoppingCart className="h-4 w-4" />
                SIANA VITAL • Ventas vendedor
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                Mis ventas y mi distribuidora
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50 md:text-base">
                Consulta tus ventas desde las visitas registradas y compáralas
                por periodos mensuales, trimestrales, semestrales, anuales o personalizados.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <HeaderBadge
                  icon={<UserRound className="h-4 w-4" />}
                  text={getSellerName(currentSeller)}
                />

                <HeaderBadge
                  icon={<Building2 className="h-4 w-4" />}
                  text={distributor?.name || currentSeller?.distributorName || "Sin distribuidora"}
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
                onClick={loadSalesData}
                disabled={loadingData}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                {loadingData ? (
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

        <SalesPeriodControls
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

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Mis ventas"
            value={formatNumber(totals.mySales)}
            helper={`${percentageChange(
              totals.mySales,
              totals.myPreviousSales
            )}% vs periodo anterior`}
            trend={percentageChange(totals.mySales, totals.myPreviousSales)}
          />

          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Mi valor vendido"
            value={formatMoney(totals.myAmount)}
            helper={`${percentageChange(
              totals.myAmount,
              totals.myPreviousAmount
            )}% vs periodo anterior`}
            trend={percentageChange(totals.myAmount, totals.myPreviousAmount)}
          />

          <MetricCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Ventas distribuidora"
            value={formatNumber(totals.distributorSales)}
            helper={`${percentageChange(
              totals.distributorSales,
              totals.distributorPreviousSales
            )}% vs periodo anterior`}
            trend={percentageChange(
              totals.distributorSales,
              totals.distributorPreviousSales
            )}
          />

          <MetricCard
            icon={<Trophy className="h-5 w-5" />}
            label="Mi puesto"
            value={myPosition ? `#${myPosition.position}` : "-"}
            helper={
              myPosition
                ? `de ${myPosition.total} vendedores`
                : "Sin ventas en el periodo"
            }
          />
        </section>

        <DistributorSalesSummary
          distributor={distributor}
          sellerCount={sellers.length}
          totals={totals}
          currentSeller={currentSeller}
          myPosition={myPosition}
        />

        <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <SalesEvolutionChart rows={monthlyComparison} />

          <SellerSalesRanking
            rows={sellerRows}
            currentSellerId={currentSeller?.id || ""}
            currentSellerUid={
              cleanId(
                currentSeller?.uid ||
                  currentSeller?.userUid ||
                  currentSeller?.authUid ||
                  ""
              )
            }
          />
        </section>
      </section>
    </main>
  );
}

function SalesPeriodControls({
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

function MetricCard({
  icon,
  label,
  value,
  helper,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  trend?: number;
}) {
  const isPositive = Number(trend || 0) >= 0;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>

      <p
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${
          trend === undefined
            ? "bg-slate-100 text-slate-500"
            : isPositive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
        }`}
      >
        {trend !== undefined ? (
          isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )
        ) : null}
        {helper}
      </p>
    </article>
  );
}

function DistributorSalesSummary({
  distributor,
  sellerCount,
  totals,
  currentSeller,
  myPosition,
}: {
  distributor: Distributor | null;
  sellerCount: number;
  totals: any;
  currentSeller: Seller | null;
  myPosition: any;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_2fr]">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {distributor?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={distributor.logoUrl}
                alt={distributor.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 to-lime-500 text-white">
                <Building2 className="h-9 w-9" />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Mi distribuidora
            </p>

            <h2 className="text-2xl font-black text-slate-950">
              {distributor?.name ||
                currentSeller?.distributorName ||
                "Sin distribuidora"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {distributor?.city || "Sin ciudad"} · {sellerCount} vendedores activos
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MiniSummary label="Mis ventas" value={formatNumber(totals.mySales)} />
          <MiniSummary label="Mi valor" value={formatMoney(totals.myAmount)} />
          <MiniSummary
            label="Ventas distribuidora"
            value={formatNumber(totals.distributorSales)}
          />
          <MiniSummary
            label="Valor distribuidora"
            value={formatMoney(totals.distributorAmount)}
          />
          <MiniSummary label="Mis visitas" value={formatNumber(totals.myVisits)} />
          <MiniSummary
            label="Visitas distribuidora"
            value={formatNumber(totals.distributorVisits)}
          />
          <MiniSummary
            label="Mi puesto"
            value={myPosition ? `#${myPosition.position}` : "-"}
          />
          <MiniSummary
            label="Participación"
            value={
              totals.distributorSales > 0
                ? `${Math.round((totals.mySales / totals.distributorSales) * 100)}%`
                : "0%"
            }
          />
        </div>
      </div>
    </section>
  );
}

function SalesEvolutionChart({
  rows,
}: {
  rows: {
    monthKey: string;
    mySales: number;
    distributorSales: number;
    myAmount: number;
    distributorAmount: number;
  }[];
}) {
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Math.max(row.mySales, row.distributorSales))
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
          <BarChart3 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">
            Comparativo por mes
          </h2>
          <p className="text-sm text-slate-500">
            Mis ventas frente a la distribuidora.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
          No hay ventas registradas en el periodo.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const myWidth = Math.max(3, (row.mySales / maxValue) * 100);
            const distributorWidth = Math.max(
              3,
              (row.distributorSales / maxValue) * 100
            );

            return (
              <div key={row.monthKey}>
                <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
                  <span>{row.monthKey}</span>
                  <span>
                    Yo: {row.mySales} · Distribuidora: {row.distributorSales}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${myWidth}%` }}
                    />
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-lime-500"
                      style={{ width: `${distributorWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-3 pt-2 text-xs font-black text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-600" />
              Mis ventas
            </span>

            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-lime-500" />
              Distribuidora
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function SellerSalesRanking({
  rows,
  currentSellerId,
  currentSellerUid,
}: {
  rows: SellerSalesRow[];
  currentSellerId: string;
  currentSellerUid: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-950">
          Ranking de ventas del equipo
        </h2>
        <p className="text-sm text-slate-500">
          Tu fila aparece resaltada para comparar tu desempeño.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-black">Puesto</th>
              <th className="px-4 py-3 font-black">Vendedor</th>
              <th className="px-4 py-3 font-black">Ventas</th>
              <th className="px-4 py-3 font-black">Valor</th>
              <th className="px-4 py-3 font-black">Visitas</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center font-bold text-slate-400"
                >
                  No hay vendedores con ventas en el periodo.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isMe =
                  row.sellerId === currentSellerId ||
                  cleanId(row.sellerUid) === currentSellerUid;

                return (
                  <tr
                    key={row.sellerId}
                    className={
                      isMe
                        ? "bg-gradient-to-r from-emerald-50 via-lime-50 to-white ring-2 ring-inset ring-emerald-300"
                        : "hover:bg-slate-50/80"
                    }
                  >
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          isMe
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {row.sellerPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.sellerPhotoUrl}
                              alt={row.sellerName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 to-lime-500 text-white">
                              <UserRound className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="font-black text-slate-950">
                            {row.sellerName}
                          </p>

                          {isMe ? (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-black text-white">
                              <Sparkles className="h-3 w-3" />
                              Este eres tú
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-black text-emerald-700">
                      {formatNumber(row.sales)}
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-700">
                      {formatMoney(row.amount)}
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-700">
                      {formatNumber(row.visits)}
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

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
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