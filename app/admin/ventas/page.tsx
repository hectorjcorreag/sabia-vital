"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Activity,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  Filter,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Target,
  Trophy,
} from "lucide-react";

type PeriodMode = "month" | "quarter" | "year" | "custom";

type SaleVisitRecord = {
  id: string;
  visitedDateKey: string;
  visitedMonthKey?: string;
  sellerId?: string;
  sellerName?: string;
  distributorId?: string;
  distributorName?: string;
  clientName?: string;
  salesCount: number;
  salesTotal: number;
  visitType?: string;
};

type TrendRow = {
  dateKey: string;
  label: string;
  salesCount: number;
  salesTotal: number;
  averageTicket: number;
};

type CommercialGroupRow = {
  name: string;
  salesCount: number;
  salesTotal: number;
  averageTicket: number;
  visitsWithSale: number;
};

const MONTHS = [
  { value: "01", label: "Enero", short: "Ene" },
  { value: "02", label: "Febrero", short: "Feb" },
  { value: "03", label: "Marzo", short: "Mar" },
  { value: "04", label: "Abril", short: "Abr" },
  { value: "05", label: "Mayo", short: "May" },
  { value: "06", label: "Junio", short: "Jun" },
  { value: "07", label: "Julio", short: "Jul" },
  { value: "08", label: "Agosto", short: "Ago" },
  { value: "09", label: "Septiembre", short: "Sep" },
  { value: "10", label: "Octubre", short: "Oct" },
  { value: "11", label: "Noviembre", short: "Nov" },
  { value: "12", label: "Diciembre", short: "Dic" },
];

const QUARTERS = [
  {
    value: "1",
    label: "Trimestre 1",
    short: "T1",
    fromMonth: "01",
    toMonth: "03",
  },
  {
    value: "2",
    label: "Trimestre 2",
    short: "T2",
    fromMonth: "04",
    toMonth: "06",
  },
  {
    value: "3",
    label: "Trimestre 3",
    short: "T3",
    fromMonth: "07",
    toMonth: "09",
  },
  {
    value: "4",
    label: "Trimestre 4",
    short: "T4",
    fromMonth: "10",
    toMonth: "12",
  },
];

function getBogotaYear() {
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
  }).format(new Date());

  return Number(value);
}

function getBogotaMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    month: "2-digit",
  }).format(new Date());
}

function getDaysInMonth(year: number, month: string) {
  return new Date(year, Number(month), 0).getDate();
}

function getQuarterFromMonth(month: string) {
  return Math.floor((Number(month) - 1) / 3) + 1;
}

function safeNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatCOP(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

function getDateRange(args: {
  mode: PeriodMode;
  year: number;
  month: string;
  quarter: string;
  customFrom: string;
  customTo: string;
}) {
  const { mode, year, month, quarter, customFrom, customTo } = args;

  if (mode === "year") {
    return {
      fromDateKey: `${year}-01-01`,
      toDateKey: `${year}-12-31`,
      label: `Año ${year}`,
    };
  }

  if (mode === "month") {
    const lastDay = getDaysInMonth(year, month);
    const monthLabel = MONTHS.find((item) => item.value === month)?.label;

    return {
      fromDateKey: `${year}-${month}-01`,
      toDateKey: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
      label: `${monthLabel} ${year}`,
    };
  }

  if (mode === "quarter") {
    const selectedQuarter =
      QUARTERS.find((item) => item.value === quarter) || QUARTERS[0];

    const lastDay = getDaysInMonth(year, selectedQuarter.toMonth);

    return {
      fromDateKey: `${year}-${selectedQuarter.fromMonth}-01`,
      toDateKey: `${year}-${selectedQuarter.toMonth}-${String(lastDay).padStart(
        2,
        "0"
      )}`,
      label: `${selectedQuarter.label} · ${year}`,
    };
  }

  return {
    fromDateKey: customFrom,
    toDateKey: customTo,
    label: `${customFrom} a ${customTo}`,
  };
}

function getSellerFullName(raw: any) {
  const firstName = raw.firstName || raw.personal?.firstName || "";
  const lastName = raw.lastName || raw.personal?.lastName || "";

  return (
    raw.personal?.fullName ||
    raw.sellerName ||
    raw.fullName ||
    raw.name ||
    `${firstName} ${lastName}`.trim() ||
    raw.displayName ||
    "Sin nombre"
  );
}

function resolveSellerName(raw: any, sellersMap: Map<string, string>) {
  const sellerId = raw.sellerId || raw.seller?.id || "";

  const directName =
    raw.sellerName ||
    raw.sellerFullName ||
    raw.seller?.fullName ||
    raw.seller?.name ||
    "";

  if (directName) return directName;

  if (sellerId && sellersMap.has(sellerId)) {
    return sellersMap.get(sellerId) || "Sin vendedor";
  }

  return "Sin vendedor";
}

function resolveDistributorName(raw: any) {
  return (
    raw.distributorName ||
    raw.distributor?.name ||
    raw.distributor?.businessName ||
    "Sin distribuidor"
  );
}

function groupCommercialData(
  data: SaleVisitRecord[],
  nameGetter: (item: SaleVisitRecord) => string
): CommercialGroupRow[] {
  const map = new Map<string, CommercialGroupRow>();

  data.forEach((item) => {
    const name = nameGetter(item) || "Sin dato";

    const current =
      map.get(name) ||
      {
        name,
        salesCount: 0,
        salesTotal: 0,
        averageTicket: 0,
        visitsWithSale: 0,
      };

    const salesCount = safeNumber(item.salesCount);
    const salesTotal = safeNumber(item.salesTotal);

    current.salesCount += salesCount;
    current.salesTotal += salesTotal;

    if (salesCount > 0 || salesTotal > 0) {
      current.visitsWithSale += 1;
    }

    current.averageTicket =
      current.salesCount > 0 ? current.salesTotal / current.salesCount : 0;

    map.set(name, current);
  });

  return Array.from(map.values()).sort((a, b) => b.salesTotal - a.salesTotal);
}

export default function AdminSalesStatisticsPage() {
  const currentYear = getBogotaYear();
  const currentMonth = getBogotaMonth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<SaleVisitRecord[]>([]);
  const [sellersMap, setSellersMap] = useState<Map<string, string>>(new Map());

  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(
    String(getQuarterFromMonth(currentMonth))
  );

  const [customFrom, setCustomFrom] = useState(
    `${currentYear}-${currentMonth}-01`
  );

  const [customTo, setCustomTo] = useState(
    `${currentYear}-${currentMonth}-${String(
      getDaysInMonth(currentYear, currentMonth)
    ).padStart(2, "0")}`
  );

  const [selectedDistributor, setSelectedDistributor] = useState("all");
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [onlyWithSales, setOnlyWithSales] = useState(true);

  const dateRange = useMemo(() => {
    return getDateRange({
      mode: periodMode,
      year: selectedYear,
      month: selectedMonth,
      quarter: selectedQuarter,
      customFrom,
      customTo,
    });
  }, [
    periodMode,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    customFrom,
    customTo,
  ]);

  async function loadSellersMap() {
    const snap = await getDocs(collection(db, "sellers"));

    const map = new Map<string, string>();

    snap.docs.forEach((docSnap) => {
      const raw = docSnap.data() as any;
      const fullName = getSellerFullName(raw);

      map.set(docSnap.id, fullName);
    });

    setSellersMap(map);

    return map;
  }

  async function loadSalesData() {
    setLoading(true);
    setError("");

    try {
      const currentSellersMap = await loadSellersMap();

      const q = query(
        collection(db, "visits"),
        where("visitedDateKey", ">=", dateRange.fromDateKey),
        where("visitedDateKey", "<=", dateRange.toDateKey),
        orderBy("visitedDateKey", "asc")
      );

      const snap = await getDocs(q);

      const data: SaleVisitRecord[] = snap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        const sellerId = raw.sellerId || raw.seller?.id || "";

        return {
          id: docSnap.id,
          visitedDateKey: raw.visitedDateKey || "",
          visitedMonthKey: raw.visitedMonthKey || "",
          sellerId,
          sellerName: resolveSellerName(raw, currentSellersMap),
          distributorId: raw.distributorId || raw.distributor?.id || "",
          distributorName: resolveDistributorName(raw),
          clientName: raw.clientName || raw.client?.name || "",
          salesCount: safeNumber(raw.salesCount),
          salesTotal: safeNumber(raw.salesTotal),
          visitType: raw.visitType || "",
        };
      });

      setRecords(data);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "No fue posible cargar las estadísticas de ventas. Revisa permisos o índices de Firestore."
      );
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSalesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.fromDateKey, dateRange.toDateKey]);

  const availableYears = useMemo(() => {
    const base = new Set<number>();
    base.add(currentYear);
    base.add(currentYear - 1);
    base.add(currentYear + 1);

    records.forEach((record) => {
      if (record.visitedDateKey?.length >= 4) {
        base.add(Number(record.visitedDateKey.slice(0, 4)));
      }
    });

    return Array.from(base).sort((a, b) => b - a);
  }, [records, currentYear]);

  const availableDistributors = useMemo(() => {
    const map = new Map<string, string>();

    records.forEach((record) => {
      const key =
        record.distributorId ||
        record.distributorName ||
        "unknown-distributor";

      const name = record.distributorName || "Sin distribuidor";

      map.set(key, name);
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .filter((item) => item.name && item.name !== "Sin distribuidor")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const availableSellers = useMemo(() => {
    const map = new Map<string, string>();

    records.forEach((record) => {
      const id = record.sellerId || "";

      if (!id) return;

      const nameFromRecord =
        record.sellerName && record.sellerName !== "Sin vendedor"
          ? record.sellerName
          : "";

      const nameFromCollection = sellersMap.get(id) || "";

      const finalName = nameFromRecord || nameFromCollection || "Sin vendedor";

      if (finalName !== "Sin vendedor") {
        map.set(id, finalName);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, sellersMap]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const distributorMatch =
        selectedDistributor === "all" ||
        record.distributorId === selectedDistributor ||
        record.distributorName === selectedDistributor;

      const sellerMatch =
        selectedSeller === "all" || record.sellerId === selectedSeller;

      const salesMatch =
        !onlyWithSales ||
        safeNumber(record.salesCount) > 0 ||
        safeNumber(record.salesTotal) > 0;

      return distributorMatch && sellerMatch && salesMatch;
    });
  }, [records, selectedDistributor, selectedSeller, onlyWithSales]);

  const totals = useMemo(() => {
    const result = {
      recordsTotal: 0,
      visitsTotalInPeriod: records.length,
      visitsWithSale: 0,
      salesCount: 0,
      salesTotal: 0,
      averageTicket: 0,
      averageSaleByRecord: 0,
      conversionRate: 0,
      uniqueSellers: 0,
      uniqueDistributors: 0,
      uniqueClients: 0,
    };

    const sellers = new Set<string>();
    const distributors = new Set<string>();
    const clients = new Set<string>();

    filteredRecords.forEach((record) => {
      const salesCount = safeNumber(record.salesCount);
      const salesTotal = safeNumber(record.salesTotal);

      result.recordsTotal += 1;
      result.salesCount += salesCount;
      result.salesTotal += salesTotal;

      if (salesCount > 0 || salesTotal > 0) {
        result.visitsWithSale += 1;
      }

      if (record.sellerId || record.sellerName) {
        sellers.add(record.sellerId || record.sellerName || "");
      }

      if (record.distributorId || record.distributorName) {
        distributors.add(record.distributorId || record.distributorName || "");
      }

      if (record.clientName) {
        clients.add(record.clientName);
      }
    });

    result.averageTicket =
      result.salesCount > 0 ? result.salesTotal / result.salesCount : 0;

    result.averageSaleByRecord =
      result.recordsTotal > 0 ? result.salesTotal / result.recordsTotal : 0;

    result.conversionRate = percent(result.visitsWithSale, records.length);

    result.uniqueSellers = sellers.size;
    result.uniqueDistributors = distributors.size;
    result.uniqueClients = clients.size;

    return result;
  }, [filteredRecords, records.length]);

  const dailyTrend = useMemo<TrendRow[]>(() => {
    const map = new Map<string, TrendRow>();

    filteredRecords.forEach((record) => {
      const dateKey = record.visitedDateKey || "Sin fecha";

      const current =
        map.get(dateKey) ||
        {
          dateKey,
          label: dateKey.length >= 10 ? dateKey.slice(5) : dateKey,
          salesCount: 0,
          salesTotal: 0,
          averageTicket: 0,
        };

      current.salesCount += safeNumber(record.salesCount);
      current.salesTotal += safeNumber(record.salesTotal);
      current.averageTicket =
        current.salesCount > 0 ? current.salesTotal / current.salesCount : 0;

      map.set(dateKey, current);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );
  }, [filteredRecords]);

  const monthlyTrend = useMemo<TrendRow[]>(() => {
    const base: TrendRow[] = MONTHS.map((month) => ({
      dateKey: `${selectedYear}-${month.value}`,
      label: month.short,
      salesCount: 0,
      salesTotal: 0,
      averageTicket: 0,
    }));

    filteredRecords.forEach((record) => {
      const month = record.visitedDateKey?.slice(5, 7);
      const item = base.find((row) => row.dateKey.endsWith(`-${month}`));

      if (!item) return;

      item.salesCount += safeNumber(record.salesCount);
      item.salesTotal += safeNumber(record.salesTotal);
      item.averageTicket =
        item.salesCount > 0 ? item.salesTotal / item.salesCount : 0;
    });

    return base;
  }, [filteredRecords, selectedYear]);

  const quarterlyTrend = useMemo<TrendRow[]>(() => {
    const base: TrendRow[] = QUARTERS.map((quarter) => ({
      dateKey: `${selectedYear}-Q${quarter.value}`,
      label: quarter.short,
      salesCount: 0,
      salesTotal: 0,
      averageTicket: 0,
    }));

    filteredRecords.forEach((record) => {
      const month = record.visitedDateKey?.slice(5, 7);
      const quarter = String(getQuarterFromMonth(month));
      const item = base.find(
        (row) => row.dateKey === `${selectedYear}-Q${quarter}`
      );

      if (!item) return;

      item.salesCount += safeNumber(record.salesCount);
      item.salesTotal += safeNumber(record.salesTotal);
      item.averageTicket =
        item.salesCount > 0 ? item.salesTotal / item.salesCount : 0;
    });

    return base;
  }, [filteredRecords, selectedYear]);

  const mainTrend: TrendRow[] =
    periodMode === "year" ? monthlyTrend : dailyTrend;

  const sellerComparison = useMemo(() => {
    return groupCommercialData(filteredRecords, (record) => {
      if (record.sellerName && record.sellerName !== "Sin vendedor") {
        return record.sellerName;
      }

      return sellersMap.get(record.sellerId || "") || "Sin vendedor";
    }).slice(0, 12);
  }, [filteredRecords, sellersMap]);

  const distributorComparison = useMemo(() => {
    return groupCommercialData(
      filteredRecords,
      (record) => record.distributorName || "Sin distribuidor"
    ).slice(0, 12);
  }, [filteredRecords]);

  const distributorPie = useMemo(() => {
    return distributorComparison.slice(0, 6).map((item) => ({
      name: item.name,
      value: item.salesTotal,
    }));
  }, [distributorComparison]);

  const topSeller = sellerComparison[0];
  const topDistributor = distributorComparison[0];

  function resetFilters() {
    setSelectedDistributor("all");
    setSelectedSeller("all");
    setOnlyWithSales(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-6 text-white shadow-lg">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
                <Activity className="h-4 w-4" />
                Inteligencia comercial
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Estadísticas de ventas
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
                Analiza ventas registradas, valor total vendido, ticket promedio,
                desempeño por vendedor, distribuidor y comportamiento por periodo.
              </p>
            </div>

            <button
              type="button"
              onClick={loadSalesData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-black text-slate-950">
              Filtros comerciales
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
            <Field label="Periodo">
              <select
                value={periodMode}
                onChange={(event) =>
                  setPeriodMode(event.target.value as PeriodMode)
                }
                className="input"
              >
                <option value="month">Mes</option>
                <option value="quarter">Trimestre</option>
                <option value="year">Año</option>
                <option value="custom">Personalizado</option>
              </select>
            </Field>

            <Field label="Año">
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="input"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>

            {periodMode === "month" ? (
              <Field label="Mes">
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="input"
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {periodMode === "quarter" ? (
              <Field label="Trimestre">
                <select
                  value={selectedQuarter}
                  onChange={(event) => setSelectedQuarter(event.target.value)}
                  className="input"
                >
                  {QUARTERS.map((quarter) => (
                    <option key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {periodMode === "custom" ? (
              <>
                <Field label="Desde">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="input"
                  />
                </Field>

                <Field label="Hasta">
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="input"
                  />
                </Field>
              </>
            ) : null}

            <Field label="Distribuidor">
              <select
                value={selectedDistributor}
                onChange={(event) => setSelectedDistributor(event.target.value)}
                className="input"
              >
                <option value="all">Todos</option>
                {availableDistributors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vendedor">
              <select
                value={selectedSeller}
                onChange={(event) => setSelectedSeller(event.target.value)}
                className="input"
              >
                <option value="all">Todos</option>
                {availableSellers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Registros">
              <select
                value={onlyWithSales ? "withSales" : "all"}
                onChange={(event) =>
                  setOnlyWithSales(event.target.value === "withSales")
                }
                className="input"
              >
                <option value="withSales">Solo con ventas</option>
                <option value="all">Todos los registros</option>
              </select>
            </Field>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Limpiar
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-500">
            Periodo consultado:{" "}
            <span className="text-emerald-700">{dateRange.label}</span> ·{" "}
            {dateRange.fromDateKey} a {dateRange.toDateKey}
          </p>
        </section>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 shadow-sm">
            Cargando estadísticas de ventas...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Valor total vendido"
                value={formatCOP(totals.salesTotal)}
                description="Suma total registrada"
                icon={<Banknote className="h-5 w-5" />}
                featured
              />

              <StatCard
                title="Ventas registradas"
                value={totals.salesCount.toString()}
                description="Cantidad total de ventas"
                icon={<ShoppingCart className="h-5 w-5" />}
              />

              <StatCard
                title="Ticket promedio"
                value={formatCOP(totals.averageTicket)}
                description="Valor promedio por venta"
                icon={<Wallet className="h-5 w-5" />}
              />

              <StatCard
                title="Promedio por registro"
                value={formatCOP(totals.averageSaleByRecord)}
                description="Venta promedio por registro filtrado"
                icon={<BarChart3 className="h-5 w-5" />}
              />

              <StatCard
                title="Registros con venta"
                value={totals.visitsWithSale.toString()}
                description={`Conversión: ${formatPercent(totals.conversionRate)}`}
                icon={<Target className="h-5 w-5" />}
              />

              <StatCard
                title="Vendedor líder"
                value={topSeller?.name || "Sin datos"}
                description={
                  topSeller
                    ? `${formatCOP(topSeller.salesTotal)} · ${topSeller.salesCount} ventas`
                    : "No hay ventas en el periodo"
                }
                icon={<Trophy className="h-5 w-5" />}
              />

              <StatCard
                title="Distribuidor líder"
                value={topDistributor?.name || "Sin datos"}
                description={
                  topDistributor
                    ? `${formatCOP(topDistributor.salesTotal)} · ${topDistributor.salesCount} ventas`
                    : "No hay ventas en el periodo"
                }
                icon={<Building2 className="h-5 w-5" />}
              />

              <StatCard
                title="Cobertura comercial"
                value={`${totals.uniqueDistributors} dist. / ${totals.uniqueSellers} vend.`}
                description={`${totals.uniqueClients} clientes registrados`}
                icon={<Users className="h-5 w-5" />}
              />
            </section>

            {totals.salesTotal === 0 && totals.salesCount === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h3 className="text-lg font-black text-slate-800">
                  No hay ventas para el periodo seleccionado
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Cambia el mes, trimestre, año o revisa los filtros de vendedor
                  y distribuidor.
                </p>
              </div>
            ) : (
              <>
                <section className="grid gap-6 xl:grid-cols-3">
                  <ChartCard
                    title="Tendencia de ventas"
                    description="Valor vendido y cantidad de ventas en el periodo"
                    className="xl:col-span-2"
                  >
                    <ResponsiveContainer width="100%" height={330}>
                      <LineChart data={mainTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis yAxisId="left" allowDecimals={false} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          allowDecimals={false}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "Valor vendido") {
                              return formatCOP(Number(value));
                            }

                            return Number(value).toLocaleString("es-CO");
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="salesTotal"
                          name="Valor vendido"
                          strokeWidth={3}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="salesCount"
                          name="Número de ventas"
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Participación por distribuidor"
                    description="Distribución del valor total vendido"
                  >
                    <ResponsiveContainer width="100%" height={330}>
                      <PieChart>
                        <Pie
                          data={distributorPie}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={105}
                          label
                        >
                          {distributorPie.map((_, index) => (
                            <Cell key={index} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCOP(Number(value))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <ChartCard
                    title="Ventas por distribuidor"
                    description="Comparativo por valor vendido"
                  >
                    <ResponsiveContainer width="100%" height={370}>
                      <BarChart data={distributorComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={90}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => formatCOP(Number(value))}
                        />
                        <Legend />
                        <Bar
                          dataKey="salesTotal"
                          name="Valor vendido"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Ventas por vendedor"
                    description="Comparativo por valor vendido"
                  >
                    <ResponsiveContainer width="100%" height={370}>
                      <BarChart data={sellerComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={90}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => formatCOP(Number(value))}
                        />
                        <Legend />
                        <Bar
                          dataKey="salesTotal"
                          name="Valor vendido"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <ChartCard
                    title="Número de ventas por vendedor"
                    description="Cantidad total de ventas registradas"
                  >
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={sellerComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={90}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="salesCount"
                          name="Número de ventas"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Resumen trimestral"
                    description="Ventas acumuladas por trimestre del año seleccionado"
                  >
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={quarterlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => formatCOP(Number(value))}
                        />
                        <Legend />
                        <Bar
                          dataKey="salesTotal"
                          name="Valor vendido"
                          radius={[10, 10, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <CommercialTable
                    title="Ranking por distribuidor"
                    data={distributorComparison}
                  />
                  <CommercialTable
                    title="Ranking por vendedor"
                    data={sellerComparison}
                  />
                </section>

                <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <h2 className="text-lg font-black text-emerald-950">
                    Lectura comercial del periodo
                  </h2>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <InsightCard
                      title="Resultado global"
                      text={`En el periodo ${dateRange.label} se registraron ${totals.salesCount} ventas por un valor total de ${formatCOP(
                        totals.salesTotal
                      )}.`}
                    />

                    <InsightCard
                      title="Ticket promedio"
                      text={`El ticket promedio fue de ${formatCOP(
                        totals.averageTicket
                      )}, útil para comparar calidad de cierre entre vendedores y distribuidores.`}
                    />

                    <InsightCard
                      title="Foco de gestión"
                      text={
                        topSeller
                          ? `${topSeller.name} lidera el resultado comercial con ${formatCOP(
                              topSeller.salesTotal
                            )}. Conviene revisar qué prácticas pueden replicarse en el equipo.`
                          : "No hay suficiente información para identificar un líder comercial."
                      }
                    />
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.55rem 0.75rem;
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

function StatCard({
  title,
  value,
  description,
  icon,
  featured,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${
        featured
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`inline-flex rounded-2xl p-3 ${
          featured
            ? "bg-white text-emerald-700"
            : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-500">{title}</h3>

      <p className="mt-1 truncate text-2xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      {children}
    </article>
  );
}

function CommercialTable({
  title,
  data,
}: {
  title: string;
  data: CommercialGroupRow[];
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Nombre</th>
              <th className="px-3 py-3 text-right">Ventas</th>
              <th className="px-3 py-3 text-right">Valor</th>
              <th className="px-3 py-3 text-right">Ticket prom.</th>
              <th className="px-3 py-3 text-right">Reg. con venta</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Sin información disponible.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.name} className="hover:bg-slate-50">
                  <td className="max-w-[220px] truncate px-3 py-3 font-bold text-slate-800">
                    {item.name}
                  </td>
                  <td className="px-3 py-3 text-right font-black">
                    {item.salesCount}
                  </td>
                  <td className="px-3 py-3 text-right font-black">
                    {formatCOP(item.salesTotal)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatCOP(item.averageTicket)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.visitsWithSale}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function InsightCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h3 className="font-black text-emerald-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}