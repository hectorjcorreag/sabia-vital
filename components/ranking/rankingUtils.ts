import {
  computeRankingMetrics,
  formatCOP,
  formatRate,
  getMetricValue,
  metricFocusLabel,
  sortRankingRows,
  type BaseAgg,
  type MetricFocus,
  type RankingTotalsContext,
} from "./scoreEngine";

import type {
  DistributorCatalogItem,
  RankingFilters,
  RankingHighlight,
  RankingKpis,
  RankingRow,
  SellerCatalogItem,
  VisitStatsDailyDoc,
} from "./rankingTypes";

export function todayBogotaKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${y}-${m}-${d}`;
}

export function normalizeUrl(value: any) {
  if (!value) return "";

  return String(value)
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

export function safeNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function safeDivide(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return numerator / denominator;
}

export function initialsOf(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "SV";

  const first = parts[0]?.[0] || "S";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "V" : "V";

  return `${first}${last}`.toUpperCase();
}

export function sellerFullName(seller?: SellerCatalogItem | null) {
  if (!seller) return "Vendedor sin nombre";

  const firstName = String(seller.firstName || "").trim();
  const lastName = String(seller.lastName || "").trim();

  const fromNames = `${firstName} ${lastName}`.trim();

  return (
    fromNames ||
    seller.fullName ||
    seller.name ||
    `Vendedor ${String(seller.id || "").slice(0, 6)}`
  );
}

export function sellerPhotoUrl(seller?: SellerCatalogItem | null) {
  if (!seller) return "";

  return normalizeUrl(
    seller.photoUrl ||
      seller.photoURL ||
      seller.profilePhotoUrl ||
      seller.profilePhotoURL ||
      seller.photo?.url ||
      seller.photo?.downloadURL ||
      seller.photo?.path ||
      seller.photoPath ||
      ""
  );
}

export function distributorName(
  distributor?: DistributorCatalogItem | null,
  id = ""
) {
  if (!distributor) return `Distribuidora ${id.slice(0, 6)}`;

  return (
    distributor.name ||
    distributor.distributorName ||
    distributor.businessName ||
    `Distribuidora ${String(distributor.id || id).slice(0, 6)}`
  );
}

export function distributorPhotoUrl(
  distributor?: DistributorCatalogItem | null
) {
  if (!distributor) return "";

  return normalizeUrl(
    distributor.photoUrl ||
      distributor.photoURL ||
      distributor.logoUrl ||
      distributor.logoURL ||
      distributor.photo?.url ||
      distributor.photo?.downloadURL ||
      distributor.photo?.path ||
      distributor.logo?.url ||
      distributor.logo?.path ||
      distributor.photoPath ||
      distributor.logoPath ||
      ""
  );
}

export function distributorSubtitle(
  distributor?: DistributorCatalogItem | null,
  sellersCount = 0
) {
  const code = distributor?.distributorCode
    ? `Código: ${distributor.distributorCode}`
    : "";

  const city = distributor?.city ? `Ciudad: ${distributor.city}` : "";
  const sellers = `${sellersCount} vendedor(es)`;

  return [code, city, sellers].filter(Boolean).join(" · ");
}

export function sellerSubtitle(
  seller?: SellerCatalogItem | null,
  distributor?: DistributorCatalogItem | null
) {
  const code = seller?.sellerCode ? `Código: ${seller.sellerCode}` : "";
  const type = seller?.sellerType ? String(seller.sellerType) : "";
  const dist = distributor ? distributorName(distributor, distributor.id) : "";

  return [code, type, dist].filter(Boolean).join(" · ");
}

function emptyAgg(extra?: Partial<BaseAgg>): BaseAgg {
  return {
    visitsTotal: 0,
    visitsEffective: 0,
    visitsReset: 0,
    salesCountTotal: 0,
    salesTotal: 0,
    referredTotal: 0,
    instantAppointmentsTotal: 0,
    sellersCount: 0,
    ...extra,
  };
}

function addStatsToAgg(agg: BaseAgg, doc: VisitStatsDailyDoc) {
  agg.visitsTotal += safeNumber(doc.visitsTotal);
  agg.visitsEffective += safeNumber(doc.visitsEffective);
  agg.visitsReset += safeNumber(doc.visitsReset);
  agg.salesCountTotal += safeNumber(doc.salesCountTotal);
  agg.salesTotal += safeNumber(doc.salesTotal);
  agg.referredTotal += safeNumber(doc.referredTotal);
  agg.instantAppointmentsTotal =
    safeNumber(agg.instantAppointmentsTotal) +
    safeNumber(doc.instantAppointmentsTotal);
}

function normalizeStatus(status?: string) {
  return String(status || "Activo")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shouldIncludeSeller(seller?: SellerCatalogItem | null) {
  if (!seller) return false;

  const status = normalizeStatus(seller.status);

  if (status === "eliminado") return false;
  if (status === "eliminada") return false;
  if (status === "retirado") return false;
  if (status === "retirada") return false;
  if (status === "deleted") return false;
  if (status === "removed") return false;

  return true;
}

function shouldIncludeDistributor(distributor?: DistributorCatalogItem | null) {
  if (!distributor) return false;

  const status = normalizeStatus(distributor.status);

  if (status === "eliminado") return false;
  if (status === "eliminada") return false;
  if (status === "retirado") return false;
  if (status === "retirada") return false;
  if (status === "deleted") return false;
  if (status === "removed") return false;

  return true;
}

function buildRankingContext(
  aggMap: Record<string, BaseAgg>
): RankingTotalsContext {
  const rows = Object.values(aggMap);

  return {
    totalSalesCountAllRows: rows.reduce(
      (sum, row) => sum + safeNumber(row.salesCountTotal),
      0
    ),
    totalSalesAmountAllRows: rows.reduce(
      (sum, row) => sum + safeNumber(row.salesTotal),
      0
    ),
    totalReferredAllRows: rows.reduce(
      (sum, row) => sum + safeNumber(row.referredTotal),
      0
    ),
  };
}

export function buildRankingRows({
  statsDocs,
  sellersById,
  distributorsById,
  filters,
}: {
  statsDocs: VisitStatsDailyDoc[];
  sellersById: Record<string, SellerCatalogItem>;
  distributorsById: Record<string, DistributorCatalogItem>;
  filters: RankingFilters;
}): RankingRow[] {
  const aggMap: Record<
    string,
    BaseAgg & {
      id: string;
      sellerId?: string;
      distributorId?: string;
    }
  > = {};

  const sellersByDistributor: Record<string, SellerCatalogItem[]> = {};

  Object.values(sellersById).forEach((seller) => {
    const distributorId = String(seller.distributorId || "");

    if (!distributorId) return;
    if (!shouldIncludeSeller(seller)) return;

    if (!sellersByDistributor[distributorId]) {
      sellersByDistributor[distributorId] = [];
    }

    sellersByDistributor[distributorId].push(seller);
  });

  for (const doc of statsDocs) {
    const sellerId = String(doc.sellerId || "");
    const seller = sellersById[sellerId];

    const distributorId = String(
      doc.distributorId || seller?.distributorId || ""
    );

    const distributor = distributorsById[distributorId];

    if (
      filters.distributorId !== "all" &&
      distributorId !== filters.distributorId
    ) {
      continue;
    }

    if (filters.scope === "sellers") {
      if (!sellerId) continue;

      if (!seller) continue;
      if (!shouldIncludeSeller(seller)) continue;

      const sellerType = String(seller?.sellerType || "");

      if (filters.sellerType !== "all" && sellerType !== filters.sellerType) {
        continue;
      }

      if (!aggMap[sellerId]) {
        aggMap[sellerId] = {
          id: sellerId,
          sellerId,
          distributorId,
          ...emptyAgg(),
        };
      }

      addStatsToAgg(aggMap[sellerId], doc);
    }

    if (filters.scope === "distributors") {
      if (!distributorId) continue;

      if (!distributor) continue;
      if (!shouldIncludeDistributor(distributor)) continue;

      if (sellerId) {
        if (!seller) continue;
        if (!shouldIncludeSeller(seller)) continue;
      }

      if (!aggMap[distributorId]) {
        aggMap[distributorId] = {
          id: distributorId,
          distributorId,
          ...emptyAgg(),
        };
      }

      addStatsToAgg(aggMap[distributorId], doc);
    }
  }

  const rankingContext = buildRankingContext(aggMap);

  const rows: RankingRow[] = Object.values(aggMap).map((agg) => {
    if (filters.scope === "sellers") {
      const seller = sellersById[String(agg.sellerId || "")];
      const distributor = distributorsById[String(agg.distributorId || "")];

      const metrics = computeRankingMetrics(
        {
          ...agg,
          sellersCount: 1,
        },
        rankingContext
      );

      return {
        ...metrics,
        id: String(agg.sellerId || agg.id),
        type: "seller",
        sellerId: String(agg.sellerId || ""),
        distributorId: String(agg.distributorId || ""),
        name: sellerFullName(seller),
        subtitle: sellerSubtitle(seller, distributor),
        photoUrl: sellerPhotoUrl(seller),
        sellerType: seller?.sellerType || "",
        sellerCode: seller?.sellerCode || "",
        distributorCode: distributor?.distributorCode || "",
        city: distributor?.city || "",
        status: seller?.status || "",
      };
    }

    const distributorId = String(agg.distributorId || agg.id);
    const distributor = distributorsById[distributorId];
    const sellersCount = sellersByDistributor[distributorId]?.length || 0;

    const metrics = computeRankingMetrics(
      {
        ...agg,
        sellersCount,
      },
      rankingContext
    );

    return {
      ...metrics,
      id: distributorId,
      type: "distributor",
      distributorId,
      name: distributorName(distributor, distributorId),
      subtitle: distributorSubtitle(distributor, sellersCount),
      photoUrl: distributorPhotoUrl(distributor),
      distributorCode: distributor?.distributorCode || "",
      city: distributor?.city || "",
      status: distributor?.status || "",
      sellersCount,
    };
  });

  const filtered = rows.filter((row) => {
    if (safeNumber(row.visitsTotal) < safeNumber(filters.minVisits)) {
      return false;
    }

    if (
      filters.scope === "distributors" &&
      safeNumber(row.sellersCount) < safeNumber(filters.minSellers)
    ) {
      return false;
    }

    return true;
  });

  return sortRankingRows(filtered, filters.metricFocus);
}

export function buildRankingKpis(rows: RankingRow[]): RankingKpis {
  const base = rows.reduce(
    (acc, row) => {
      acc.salesTotal += safeNumber(row.salesTotal);
      acc.salesCountTotal += safeNumber(row.salesCountTotal);
      acc.visitsTotal += safeNumber(row.visitsTotal);
      acc.visitsEffective += safeNumber(row.visitsEffective);
      acc.visitsReset += safeNumber(row.visitsReset);
      acc.referredTotal += safeNumber(row.referredTotal);

      return acc;
    },
    {
      participants: rows.length,
      salesTotal: 0,
      salesCountTotal: 0,
      visitsTotal: 0,
      visitsEffective: 0,
      visitsReset: 0,
      referredTotal: 0,
    }
  );

  const avgSale = safeDivide(base.salesTotal, base.salesCountTotal);
  const avgSalePerVisit = safeDivide(base.salesTotal, base.visitsTotal);
  const avgSalePerEffectiveVisit = safeDivide(
    base.salesTotal,
    base.visitsEffective
  );

  const effectiveRate = safeDivide(base.visitsEffective, base.visitsTotal);
  const resetRate = safeDivide(base.visitsReset, base.visitsTotal);
  const salesConversionRate = safeDivide(
    base.salesCountTotal,
    base.salesCountTotal
  );
  const referralRate = safeDivide(base.referredTotal, base.referredTotal);
  const resetControl =
    base.visitsTotal > 0
      ? 1 - safeDivide(base.visitsReset, base.visitsTotal)
      : 0;

  return {
    ...base,
    avgSale,
    avgSalePerVisit,
    avgSalePerEffectiveVisit,
    effectiveRate,
    resetRate,
    salesConversionRate,
    referralRate,
    resetControl,
  };
}

function bestBy(rows: RankingRow[], metric: MetricFocus) {
  if (!rows.length) return undefined;

  return [...rows].sort(
    (a, b) => getMetricValue(b, metric) - getMetricValue(a, metric)
  )[0];
}

export function buildRankingHighlights(rows: RankingRow[]): RankingHighlight[] {
  const bestIdc = bestBy(rows, "idc");
  const bestSales = bestBy(rows, "salesTotal");
  const bestConversion = bestBy(rows, "salesConversionRate");
  const bestReferrals = bestBy(rows, "referredTotal");
  const bestResetControl = bestBy(rows, "resetControl");

  return [
    {
      title: "Mejor desempeño",
      label: bestIdc?.name || "Sin datos",
      value: bestIdc ? `${bestIdc.scores.idc}/100` : "—",
      row: bestIdc,
      helper: "Mayor IDC del periodo",
    },
    {
      title: "Mayor venta",
      label: bestSales?.name || "Sin datos",
      value: bestSales ? formatCOP(bestSales.salesTotal) : "—",
      row: bestSales,
      helper: "Ventas acumuladas",
    },
    {
      title: "Aporte a ventas",
      label: bestConversion?.name || "Sin datos",
      value: bestConversion
        ? formatRate(bestConversion.salesConversionRate)
        : "—",
      row: bestConversion,
      helper: "Participación sobre ventas realizadas",
    },
    {
      title: "Más referidos",
      label: bestReferrals?.name || "Sin datos",
      value: bestReferrals ? String(bestReferrals.referredTotal) : "—",
      row: bestReferrals,
      helper: "Referidos generados",
    },
    {
      title: "Control de resets",
      label: bestResetControl?.name || "Sin datos",
      value: bestResetControl ? formatRate(bestResetControl.resetControl) : "—",
      row: bestResetControl,
      helper: "1 - (resets / visitas)",
    },
  ];
}

export function metricValueFormatted(row: RankingRow, metric: MetricFocus) {
  const value = getMetricValue(row, metric);

  if (
    metric === "salesTotal" ||
    metric === "avgSale" ||
    metric === "avgSalePerVisit" ||
    metric === "avgSalePerEffectiveVisit" ||
    metric === "productivity"
  ) {
    return formatCOP(value);
  }

  if (
    metric === "effectiveRate" ||
    metric === "salesConversionRate" ||
    metric === "resetControl" ||
    metric === "referralRate"
  ) {
    return formatRate(value);
  }

  if (metric === "idc") {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}/100` : `${rounded.toFixed(1)}/100`;
  }

  return Math.round(value).toLocaleString("es-CO");
}

export function rankingScopeLabel(scope: "sellers" | "distributors") {
  return scope === "sellers" ? "Vendedores" : "Distribuidoras";
}

export function rankingScopeDescription(scope: "sellers" | "distributors") {
  if (scope === "sellers") {
    return "Desempeño individual del equipo comercial.";
  }

  return "Desempeño consolidado por empresa distribuidora.";
}

export function validateRankingFilters(filters: RankingFilters) {
  if (!filters.fromDateKey || !filters.toDateKey) {
    return "Selecciona la fecha inicial y la fecha final.";
  }

  if (filters.fromDateKey > filters.toDateKey) {
    return "La fecha inicial no puede ser mayor que la fecha final.";
  }

  return "";
}

export function exportRowsForExcel(rows: RankingRow[], metric: MetricFocus) {
  return rows.map((row) => ({
    Puesto: row.rank || "",
    Nombre: row.name,
    Tipo: row.type === "seller" ? "Vendedor" : "Distribuidora",
    Subtitulo: row.subtitle,
    Medicion: metricFocusLabel(metric),
    ValorMedicion: metricValueFormatted(row, metric),

    IDC: row.scores.idc,
    Nivel: row.level,

    VentasTotalCOP: Math.round(row.salesTotal || 0),
    CantidadVentas: Math.round(row.salesCountTotal || 0),

    VisitasTotales: Math.round(row.visitsTotal || 0),
    VisitasEfectivas: Math.round(row.visitsEffective || 0),
    Resets: Math.round(row.visitsReset || 0),
    Referidos: Math.round(row.referredTotal || 0),
    CitasInstantaneas: Math.round(row.instantAppointmentsTotal || 0),

    PromedioVentaCOP: Math.round(row.avgSale || 0),
    PromedioVentaPorVisitaCOP: Math.round(row.avgSalePerVisit || 0),
    PromedioVentaPorVisitaEfectivaCOP: Math.round(
      row.avgSalePerEffectiveVisit || 0
    ),

    EfectividadVisitas: formatRate(row.effectiveRate),
    AporteVentasRealizadas: formatRate(row.salesConversionRate),
    AporteEconomico: formatRate(row.economicShare),
    AporteReferidos: formatRate(row.referralRate),
    ControlResets: formatRate(row.resetControl),
    BonoCitasInstantaneas: row.instantAppointmentBonus,

    PuntajeEfectividad: row.scores.scoreEffectiveVisits,
    PuntajeVentasRealizadas: row.scores.scoreSalesConversion,
    PuntajeValorEconomico: row.scores.scoreEconomicValue,
    PuntajeReferidos: row.scores.scoreReferrals,
    PuntajeControlResets: row.scores.scoreResetControl,

    Vendedores: row.sellersCount || "",
    ProductividadPorVendedorCOP: Math.round(row.salesPerSeller || 0),

    Estado: row.status || "",
    Ciudad: row.city || "",
  }));
}