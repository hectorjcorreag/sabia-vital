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
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  Target,
  MousePointerClick,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";

type VisitType = "efectiva" | "reset";
type PeriodMode = "year" | "month" | "quarter" | "custom";

type VisitRecord = {
  id: string;
  visitedDateKey: string;
  visitedMonthKey?: string;
  sellerId?: string;
  sellerName?: string;
  distributorId?: string;
  distributorName?: string;
  clientName?: string;
  visitType?: VisitType;
  referredCount?: number;
  instantAppointmentsCount?: number;
  salesCount?: number;
  salesTotal?: number;
};
type TrendRow = {
  dateKey: string;
  label: string;
  total: number;
  efectivas: number;
  reset: number;
  ventas: number;
  citasInstantaneas: number;
  referidos: number;
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
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    month: "2-digit",
  }).format(new Date());

  return value;
}

function getDaysInMonth(year: number, month: string) {
  return new Date(year, Number(month), 0).getDate();
}

function getQuarterFromMonth(month: string) {
  return Math.floor((Number(month) - 1) / 3) + 1;
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

    return {
      fromDateKey: `${year}-${month}-01`,
      toDateKey: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
      label: `${MONTHS.find((item) => item.value === month)?.label} ${year}`,
    };
  }

  if (mode === "quarter") {
    const selectedQuarter = QUARTERS.find((item) => item.value === quarter) || QUARTERS[0];
    const lastDay = getDaysInMonth(year, selectedQuarter.toMonth);

    return {
      fromDateKey: `${year}-${selectedQuarter.fromMonth}-01`,
      toDateKey: `${year}-${selectedQuarter.toMonth}-${String(lastDay).padStart(2, "0")}`,
      label: `${selectedQuarter.label} · ${year}`,
    };
  }

  return {
    fromDateKey: customFrom,
    toDateKey: customTo,
    label: `${customFrom} a ${customTo}`,
  };
}

function formatCOP(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function safeNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function groupByName(
  data: VisitRecord[],
  nameGetter: (item: VisitRecord) => string
) {
  const map = new Map<
    string,
    {
      name: string;
      visitsTotal: number;
      visitsEffective: number;
      visitsReset: number;
      referredTotal: number;
      instantAppointmentsTotal: number;
      salesCountTotal: number;
      salesTotal: number;
    }
  >();

  data.forEach((visit) => {
    const name = nameGetter(visit) || "Sin dato";

    const current =
      map.get(name) ||
      {
        name,
        visitsTotal: 0,
        visitsEffective: 0,
        visitsReset: 0,
        referredTotal: 0,
        instantAppointmentsTotal: 0,
        salesCountTotal: 0,
        salesTotal: 0,
      };

    current.visitsTotal += 1;

    if (visit.visitType === "reset") {
      current.visitsReset += 1;
    } else {
      current.visitsEffective += 1;
    }

    current.referredTotal += safeNumber(visit.referredCount);
    current.instantAppointmentsTotal += safeNumber(visit.instantAppointmentsCount);
    current.salesCountTotal += safeNumber(visit.salesCount);
    current.salesTotal += safeNumber(visit.salesTotal);

    map.set(name, current);
  });

  return Array.from(map.values()).sort((a, b) => b.visitsTotal - a.visitsTotal);
}

export default function AdminVisitStatisticsPage() {
  const currentYear = getBogotaYear();
  const currentMonth = getBogotaMonth();

  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [error, setError] = useState("");

  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(
    String(getQuarterFromMonth(currentMonth))
  );

  const [customFrom, setCustomFrom] = useState(`${currentYear}-${currentMonth}-01`);
  const [customTo, setCustomTo] = useState(
    `${currentYear}-${currentMonth}-${String(
      getDaysInMonth(currentYear, currentMonth)
    ).padStart(2, "0")}`
  );

  const [selectedDistributor, setSelectedDistributor] = useState("all");
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedVisitType, setSelectedVisitType] = useState("all");

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

  async function loadVisits() {
    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "visits"),
        where("visitedDateKey", ">=", dateRange.fromDateKey),
        where("visitedDateKey", "<=", dateRange.toDateKey),
        orderBy("visitedDateKey", "asc")
      );

      const snap = await getDocs(q);

      const data: VisitRecord[] = snap.docs.map((doc) => {
        const raw = doc.data() as any;

        return {
          id: doc.id,
          visitedDateKey: raw.visitedDateKey || "",
          visitedMonthKey: raw.visitedMonthKey || "",
          sellerId: raw.sellerId || "",
          sellerName:
            raw.sellerName ||
            raw.seller?.name ||
            raw.seller?.fullName ||
            "Sin vendedor",
          distributorId: raw.distributorId || "",
          distributorName:
            raw.distributorName ||
            raw.distributor?.name ||
            raw.distributor?.businessName ||
            "Sin distribuidor",
          clientName: raw.clientName || "",
          visitType: raw.visitType || "efectiva",
          referredCount: safeNumber(raw.referredCount),
          instantAppointmentsCount: safeNumber(raw.instantAppointmentsCount),
          salesCount: safeNumber(raw.salesCount),
          salesTotal: safeNumber(raw.salesTotal),
        };
      });

      setVisits(data);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "No fue posible cargar las estadísticas de visitas. Revisa permisos o índices de Firestore."
      );
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.fromDateKey, dateRange.toDateKey]);

  const availableYears = useMemo(() => {
    const base = new Set<number>();
    base.add(currentYear);

    visits.forEach((visit) => {
      if (visit.visitedDateKey?.length >= 4) {
        base.add(Number(visit.visitedDateKey.slice(0, 4)));
      }
    });

    return Array.from(base).sort((a, b) => b - a);
  }, [visits, currentYear]);

  const availableDistributors = useMemo(() => {
    const map = new Map<string, string>();

    visits.forEach((visit) => {
      const key = visit.distributorId || visit.distributorName || "Sin distribuidor";
      const name = visit.distributorName || "Sin distribuidor";
      map.set(key, name);
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visits]);

  const availableSellers = useMemo(() => {
    const map = new Map<string, string>();

    visits.forEach((visit) => {
      const key = visit.sellerId || visit.sellerName || "Sin vendedor";
      const name = visit.sellerName || "Sin vendedor";
      map.set(key, name);
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visits]);

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      const distributorMatch =
        selectedDistributor === "all" ||
        visit.distributorId === selectedDistributor ||
        visit.distributorName === selectedDistributor;

      const sellerMatch =
        selectedSeller === "all" ||
        visit.sellerId === selectedSeller ||
        visit.sellerName === selectedSeller;

      const typeMatch =
        selectedVisitType === "all" || visit.visitType === selectedVisitType;

      return distributorMatch && sellerMatch && typeMatch;
    });
  }, [visits, selectedDistributor, selectedSeller, selectedVisitType]);

  const totals = useMemo(() => {
    const result = {
      visitsTotal: 0,
      visitsEffective: 0,
      visitsReset: 0,
      referredTotal: 0,
      instantAppointmentsTotal: 0,
      salesCountTotal: 0,
      salesTotal: 0,
      uniqueClients: 0,
      uniqueSellers: 0,
      uniqueDistributors: 0,
    };

    const clients = new Set<string>();
    const sellers = new Set<string>();
    const distributors = new Set<string>();

    filteredVisits.forEach((visit) => {
      result.visitsTotal += 1;

      if (visit.visitType === "reset") {
        result.visitsReset += 1;
      } else {
        result.visitsEffective += 1;
      }

      result.referredTotal += safeNumber(visit.referredCount);
      result.instantAppointmentsTotal += safeNumber(visit.instantAppointmentsCount);
      result.salesCountTotal += safeNumber(visit.salesCount);
      result.salesTotal += safeNumber(visit.salesTotal);

      if (visit.clientName) clients.add(visit.clientName);
      if (visit.sellerId || visit.sellerName) {
        sellers.add(visit.sellerId || visit.sellerName || "");
      }
      if (visit.distributorId || visit.distributorName) {
        distributors.add(visit.distributorId || visit.distributorName || "");
      }
    });

    result.uniqueClients = clients.size;
    result.uniqueSellers = sellers.size;
    result.uniqueDistributors = distributors.size;

    return result;
  }, [filteredVisits]);

  const dailyTrend = useMemo<TrendRow[]>(() => {
  const map = new Map<string, TrendRow>();

  filteredVisits.forEach((visit) => {
    const dateKey = visit.visitedDateKey || "Sin fecha";

    const current =
      map.get(dateKey) ||
      {
        dateKey,
        label: dateKey.length >= 10 ? dateKey.slice(5) : dateKey,
        total: 0,
        efectivas: 0,
        reset: 0,
        ventas: 0,
        citasInstantaneas: 0,
        referidos: 0,
      };

    current.total += 1;

    if (visit.visitType === "reset") {
      current.reset += 1;
    } else {
      current.efectivas += 1;
    }

    current.ventas += safeNumber(visit.salesCount);
    current.citasInstantaneas += safeNumber(visit.instantAppointmentsCount);
    current.referidos += safeNumber(visit.referredCount);

    map.set(dateKey, current);
  });

  return Array.from(map.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );
}, [filteredVisits]);

  const monthlyTrend = useMemo<TrendRow[]>(() => {
  const base: TrendRow[] = MONTHS.map((month) => ({
    dateKey: `${selectedYear}-${month.value}`,
    label: month.short,
    total: 0,
    efectivas: 0,
    reset: 0,
    ventas: 0,
    citasInstantaneas: 0,
    referidos: 0,
  }));

  filteredVisits.forEach((visit) => {
    const month = visit.visitedDateKey?.slice(5, 7);
    const item = base.find((row) => row.dateKey.endsWith(`-${month}`));

    if (!item) return;

    item.total += 1;

    if (visit.visitType === "reset") {
      item.reset += 1;
    } else {
      item.efectivas += 1;
    }

    item.ventas += safeNumber(visit.salesCount);
    item.citasInstantaneas += safeNumber(visit.instantAppointmentsCount);
    item.referidos += safeNumber(visit.referredCount);
  });

  return base;
}, [filteredVisits, selectedYear]);

  const quarterlyTrend = useMemo(() => {
    const base = QUARTERS.map((quarter) => ({
      quarter: quarter.value,
      label: quarter.short,
      total: 0,
      efectivas: 0,
      reset: 0,
      ventas: 0,
      citasInstantaneas: 0,
      referidos: 0,
    }));

    filteredVisits.forEach((visit) => {
      const month = visit.visitedDateKey?.slice(5, 7);
      const quarter = String(getQuarterFromMonth(month));
      const item = base.find((row) => row.quarter === quarter);

      if (!item) return;

      item.total += 1;

      if (visit.visitType === "reset") {
        item.reset += 1;
      } else {
        item.efectivas += 1;
      }

      item.ventas += safeNumber(visit.salesCount);
      item.citasInstantaneas += safeNumber(visit.instantAppointmentsCount);
      item.referidos += safeNumber(visit.referredCount);
    });

    return base;
  }, [filteredVisits]);

  const distributorComparison = useMemo(() => {
    return groupByName(
      filteredVisits,
      (visit) => visit.distributorName || "Sin distribuidor"
    ).slice(0, 12);
  }, [filteredVisits]);

  const sellerComparison = useMemo(() => {
    return groupByName(
      filteredVisits,
      (visit) => visit.sellerName || "Sin vendedor"
    ).slice(0, 12);
  }, [filteredVisits]);

  const visitTypePie = useMemo(() => {
    return [
      { name: "Efectivas", value: totals.visitsEffective },
      { name: "Reset", value: totals.visitsReset },
    ];
  }, [totals.visitsEffective, totals.visitsReset]);

  const distributorPie = useMemo(() => {
    return distributorComparison.slice(0, 6).map((item) => ({
      name: item.name,
      value: item.visitsTotal,
    }));
  }, [distributorComparison]);

  const mainTrend =
    periodMode === "year"
      ? monthlyTrend
      : periodMode === "quarter"
        ? dailyTrend
        : periodMode === "month"
          ? dailyTrend
          : dailyTrend;

  const effectiveRate = percent(totals.visitsEffective, totals.visitsTotal);
  const resetRate = percent(totals.visitsReset, totals.visitsTotal);
  const salesRate = percent(totals.salesCountTotal, totals.visitsTotal);
  const instantAppointmentRate = percent(
    totals.instantAppointmentsTotal,
    totals.visitsTotal
  );

  function resetFilters() {
    setSelectedDistributor("all");
    setSelectedSeller("all");
    setSelectedVisitType("all");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-lime-500 p-6 text-white shadow-lg">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                <Activity className="h-4 w-4" />
                Inteligencia administrativa
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Estadísticas de visitas
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
                Consulta tendencias, compara distribuidores y vendedores, analiza
                visitas efectivas, reset, citas instantáneas, referidos y registros
                asociados a ventas.
              </p>
            </div>

            <button
              type="button"
              onClick={loadVisits}
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
            <h2 className="text-lg font-black text-slate-900">
              Filtros de análisis
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
            <Field label="Tipo de periodo">
              <select
                value={periodMode}
                onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
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
                {!availableYears.includes(currentYear - 1) ? (
                  <option value={currentYear - 1}>{currentYear - 1}</option>
                ) : null}
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

            <Field label="Tipo visita">
              <select
                value={selectedVisitType}
                onChange={(event) => setSelectedVisitType(event.target.value)}
                className="input"
              >
                <option value="all">Todas</option>
                <option value="efectiva">Efectivas</option>
                <option value="reset">Reset</option>
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
            Cargando estadísticas de visitas...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total visitas"
                value={totals.visitsTotal.toString()}
                description="Registros encontrados"
                icon={<CalendarDays className="h-5 w-5" />}
              />

              <StatCard
                title="Visitas efectivas"
                value={`${totals.visitsEffective}`}
                description={`${formatPercent(effectiveRate)} del total`}
                icon={<Target className="h-5 w-5" />}
              />

              <StatCard
                title="Reset"
                value={`${totals.visitsReset}`}
                description={`${formatPercent(resetRate)} del total`}
                icon={<RotateCcw className="h-5 w-5" />}
                danger={resetRate >= 35}
              />

              <StatCard
                title="Citas instantáneas"
                value={totals.instantAppointmentsTotal.toString()}
                description={`${formatPercent(instantAppointmentRate)} sobre visitas`}
                icon={<MousePointerClick className="h-5 w-5" />}
              />

              <StatCard
                title="Referidos"
                value={totals.referredTotal.toString()}
                description="Total de referidos registrados"
                icon={<Users className="h-5 w-5" />}
              />

              <StatCard
                title="Ventas registradas"
                value={totals.salesCountTotal.toString()}
                description={`${formatPercent(salesRate)} sobre visitas`}
                icon={<ShoppingCart className="h-5 w-5" />}
              />

              <StatCard
                title="Valor ventas"
                value={formatCOP(totals.salesTotal)}
                description="Valor reportado en visitas"
                icon={<TrendingUp className="h-5 w-5" />}
              />

              <StatCard
                title="Cobertura"
                value={`${totals.uniqueDistributors} dist. / ${totals.uniqueSellers} vend.`}
                description={`${totals.uniqueClients} clientes visitados`}
                icon={<Building2 className="h-5 w-5" />}
              />
            </section>

            {totals.visitsTotal === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h3 className="text-lg font-black text-slate-800">
                  No hay visitas para el periodo seleccionado
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Cambia el mes, trimestre, año o los filtros de vendedor y distribuidor.
                </p>
              </div>
            ) : (
              <>
                <section className="grid gap-6 xl:grid-cols-3">
                  <ChartCard
                    title="Tendencia de visitas"
                    description="Total, efectivas y reset en el periodo seleccionado"
                    className="xl:col-span-2"
                  >
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={mainTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total"
                          strokeWidth={2}
                          fillOpacity={0.2}
                        />
                        <Line
                          type="monotone"
                          dataKey="efectivas"
                          name="Efectivas"
                          strokeWidth={3}
                        />
                        <Line
                          type="monotone"
                          dataKey="reset"
                          name="Reset"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Efectivas vs Reset"
                    description="Distribución del tipo de visita"
                  >
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={visitTypePie}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {visitTypePie.map((_, index) => (
                            <Cell key={index} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <ChartCard
                    title="Comparativo por distribuidor"
                    description="Distribuidores con mayor número de visitas"
                  >
                    <ResponsiveContainer width="100%" height={360}>
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
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="visitsTotal" name="Total visitas" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="visitsEffective" name="Efectivas" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Comparativo por vendedor"
                    description="Vendedores con mayor actividad en visitas"
                  >
                    <ResponsiveContainer width="100%" height={360}>
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
                        <Bar dataKey="visitsTotal" name="Total visitas" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="visitsEffective" name="Efectivas" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-3">
                  <ChartCard
                    title="Participación por distribuidor"
                    description="Peso relativo de los principales distribuidores"
                  >
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={distributorPie}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {distributorPie.map((_, index) => (
                            <Cell key={index} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Citas instantáneas y referidos"
                    description="Relación de gestión derivada de la visita"
                    className="xl:col-span-2"
                  >
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={mainTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="citasInstantaneas"
                          name="Citas instantáneas"
                          strokeWidth={3}
                        />
                        <Line
                          type="monotone"
                          dataKey="referidos"
                          name="Referidos"
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <RankingTable
                    title="Top distribuidores"
                    data={distributorComparison}
                    type="distributor"
                  />

                  <RankingTable
                    title="Top vendedores"
                    data={sellerComparison}
                    type="seller"
                  />
                </section>

                <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <h2 className="text-lg font-black text-emerald-950">
                    Lectura administrativa del periodo
                  </h2>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <InsightCard
                      title="Efectividad de visitas"
                      text={`El periodo registra ${formatPercent(
                        effectiveRate
                      )} de visitas efectivas. Este indicador ayuda a medir la calidad de la gestión presencial.`}
                    />

                    <InsightCard
                      title="Nivel de reset"
                      text={
                        resetRate >= 35
                          ? `El reset está en ${formatPercent(
                              resetRate
                            )}, conviene revisar agenda, confirmación previa y calidad de contacto.`
                          : `El reset está en ${formatPercent(
                              resetRate
                            )}, dentro de un comportamiento controlado para seguimiento operativo.`
                      }
                    />

                    <InsightCard
                      title="Gestión comercial derivada"
                      text={`Se registran ${totals.instantAppointmentsTotal} citas instantáneas, ${totals.referredTotal} referidos y ${totals.salesCountTotal} ventas asociadas a visitas.`}
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
  danger,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`rounded-2xl p-3 ${
            danger ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {icon}
        </div>
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-500">{title}</h3>

      <p
        className={`mt-1 truncate text-2xl font-black ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
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

function RankingTable({
  title,
  data,
  type,
}: {
  title: string;
  type: "seller" | "distributor";
  data: {
    name: string;
    visitsTotal: number;
    visitsEffective: number;
    visitsReset: number;
    referredTotal: number;
    instantAppointmentsTotal: number;
    salesCountTotal: number;
    salesTotal: number;
  }[];
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {type === "seller" ? (
          <Users className="h-5 w-5 text-emerald-700" />
        ) : (
          <Building2 className="h-5 w-5 text-emerald-700" />
        )}
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Nombre</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Efectivas</th>
              <th className="px-3 py-3 text-right">Reset</th>
              <th className="px-3 py-3 text-right">Citas inst.</th>
              <th className="px-3 py-3 text-right">Ventas</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
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
                    {item.visitsTotal}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.visitsEffective}
                  </td>
                  <td className="px-3 py-3 text-right">{item.visitsReset}</td>
                  <td className="px-3 py-3 text-right">
                    {item.instantAppointmentsTotal}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.salesCountTotal}
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