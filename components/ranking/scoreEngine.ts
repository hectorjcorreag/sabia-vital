export type MetricFocus =
  | "idc"
  | "salesTotal"
  | "visitsTotal"
  | "visitsEffective"
  | "visitsReset"
  | "referredTotal"
  | "avgSale"
  | "avgSalePerVisit"
  | "avgSalePerEffectiveVisit"
  | "effectiveRate"
  | "salesConversionRate"
  | "resetControl"
  | "referralRate"
  | "productivity";

export type PerformanceLevel =
  | "Élite comercial"
  | "Alto desempeño"
  | "Desempeño sólido"
  | "En desarrollo"
  | "Requiere acompañamiento";

export type BaseAgg = {
  visitsTotal: number;
  visitsEffective: number;
  visitsReset: number;
  salesCountTotal: number;
  salesTotal: number;
  referredTotal: number;
  instantAppointmentsTotal?: number;
  sellersCount?: number;
};

export type RankingTotalsContext = {
  totalSalesCountAllRows: number;
  totalSalesAmountAllRows: number;
  totalReferredAllRows: number;
};

export type RankingScores = {
  scoreEffectiveVisits: number;
  scoreSalesConversion: number;
  scoreEconomicValue: number;
  scoreReferrals: number;
  scoreResetControl: number;
  instantAppointmentBonus: number;
  idc: number;
};

export type RankingMetrics = BaseAgg & {
  avgSale: number;
  avgSalePerVisit: number;
  avgSalePerEffectiveVisit: number;

  effectiveRate: number;
  resetRate: number;

  /**
   * Nueva lógica:
   * ventas realizadas del participante / total de ventas realizadas del grupo.
   */
  salesConversionRate: number;

  /**
   * Nueva lógica:
   * referidos del participante / total de referidos del grupo.
   */
  referralRate: number;

  /**
   * Nueva lógica:
   * 1 - (resets / visitas totales del participante).
   */
  resetControl: number;

  /**
   * Nueva lógica:
   * valor vendido del participante / valor total vendido del grupo.
   */
  economicShare: number;

  salesShare: number;
  referralShare: number;
  instantAppointmentBonus: number;

  salesPerSeller: number;
  visitsPerSeller: number;
  effectiveVisitsPerSeller: number;
  referralsPerSeller: number;

  scores: RankingScores;
  level: PerformanceLevel;
};

export type RankingRowBase = RankingMetrics & {
  id: string;
  type: "seller" | "distributor";

  name: string;
  subtitle: string;
  photoUrl: string;

  distributorId?: string;
  sellerType?: string;

  rank?: number;
};

function safeNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function safeDivide(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return numerator / denominator;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function scoreRate(rate: number, expectedMax: number) {
  if (!expectedMax || expectedMax <= 0) return 0;
  return clamp(Math.round((rate / expectedMax) * 100));
}

export function performanceLevel(score: number): {
  label: PerformanceLevel;
  badge: string;
  tone: "elite" | "high" | "solid" | "developing" | "risk";
} {
  if (score >= 90) {
    return {
      label: "Élite comercial",
      badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
      tone: "elite",
    };
  }

  if (score >= 80) {
    return {
      label: "Alto desempeño",
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      tone: "high",
    };
  }

  if (score >= 70) {
    return {
      label: "Desempeño sólido",
      badge: "bg-blue-50 text-blue-800 border-blue-200",
      tone: "solid",
    };
  }

  if (score >= 60) {
    return {
      label: "En desarrollo",
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      tone: "developing",
    };
  }

  return {
    label: "Requiere acompañamiento",
    badge: "bg-red-50 text-red-800 border-red-200",
    tone: "risk",
  };
}

/**
 * IDC · Índice de Desempeño Comercial
 *
 * Pesos:
 * - Efectividad de visitas: 25%
 * - Aporte a ventas realizadas: 25%
 * - Aporte económico: 20%
 * - Aporte a referidos: 15%
 * - Control de resets: 15%
 *
 * Bono:
 * - Cada cita/visita instantánea suma 0.5 puntos al IDC final.
 */
export function computeRankingMetrics(
  agg: BaseAgg,
  context?: RankingTotalsContext
): RankingMetrics {
  const visitsTotal = safeNumber(agg.visitsTotal);
  const visitsEffective = safeNumber(agg.visitsEffective);
  const visitsReset = safeNumber(agg.visitsReset);
  const salesCountTotal = safeNumber(agg.salesCountTotal);
  const salesTotal = safeNumber(agg.salesTotal);
  const referredTotal = safeNumber(agg.referredTotal);
  const instantAppointmentsTotal = safeNumber(agg.instantAppointmentsTotal);
  const sellersCount = safeNumber(agg.sellersCount);

  const totalSalesCountAllRows = safeNumber(context?.totalSalesCountAllRows);
  const totalSalesAmountAllRows = safeNumber(context?.totalSalesAmountAllRows);
  const totalReferredAllRows = safeNumber(context?.totalReferredAllRows);

  const avgSale = safeDivide(salesTotal, salesCountTotal);
  const avgSalePerVisit = safeDivide(salesTotal, visitsTotal);
  const avgSalePerEffectiveVisit = safeDivide(salesTotal, visitsEffective);

  /**
   * Individuales por vendedor/distribuidora.
   */
  const effectiveRate = safeDivide(visitsEffective, visitsTotal);
  const resetRate = safeDivide(visitsReset, visitsTotal);
  const resetControl = visitsTotal > 0 ? 1 - safeDivide(visitsReset, visitsTotal) : 0;

  /**
   * Aporte relativo frente al total del grupo evaluado.
   */
  const salesShare = safeDivide(salesCountTotal, totalSalesCountAllRows);
  const economicShare = safeDivide(salesTotal, totalSalesAmountAllRows);
  const referralShare = safeDivide(referredTotal, totalReferredAllRows);

  /**
   * Para compatibilidad con componentes existentes:
   * salesConversionRate ahora representa aporte a ventas realizadas.
   * referralRate ahora representa aporte a referidos.
   */
  const salesConversionRate = salesShare;
  const referralRate = referralShare;

  const salesPerSeller = safeDivide(salesTotal, sellersCount);
  const visitsPerSeller = safeDivide(visitsTotal, sellersCount);
  const effectiveVisitsPerSeller = safeDivide(visitsEffective, sellersCount);
  const referralsPerSeller = safeDivide(referredTotal, sellersCount);

  /**
   * Puntajes del IDC.
   */
  const scoreEffectiveVisits = scoreRate(effectiveRate, 0.9);
  const scoreSalesConversion = scoreRate(salesShare, 0.3);
  const scoreEconomicValue = scoreRate(economicShare, 0.3);
  const scoreReferrals = scoreRate(referralShare, 0.3);
  const scoreResetControl = clamp(Math.round(resetControl * 100));

  const instantAppointmentBonus = round(instantAppointmentsTotal * 0.5, 1);

  const weightedScore =
    scoreEffectiveVisits * 0.25 +
    scoreSalesConversion * 0.25 +
    scoreEconomicValue * 0.2 +
    scoreReferrals * 0.15 +
    scoreResetControl * 0.15;

  const idc = round(clamp(weightedScore + instantAppointmentBonus), 1);

  const level = performanceLevel(idc).label;

  return {
    visitsTotal,
    visitsEffective,
    visitsReset,
    salesCountTotal,
    salesTotal,
    referredTotal,
    instantAppointmentsTotal,
    sellersCount,

    avgSale: round(avgSale),
    avgSalePerVisit: round(avgSalePerVisit),
    avgSalePerEffectiveVisit: round(avgSalePerEffectiveVisit),

    effectiveRate: round(effectiveRate, 4),
    resetRate: round(resetRate, 4),
    salesConversionRate: round(salesConversionRate, 4),
    referralRate: round(referralRate, 4),
    resetControl: round(resetControl, 4),

    economicShare: round(economicShare, 4),
    salesShare: round(salesShare, 4),
    referralShare: round(referralShare, 4),
    instantAppointmentBonus,

    salesPerSeller: round(salesPerSeller),
    visitsPerSeller: round(visitsPerSeller),
    effectiveVisitsPerSeller: round(effectiveVisitsPerSeller),
    referralsPerSeller: round(referralsPerSeller),

    scores: {
      scoreEffectiveVisits,
      scoreSalesConversion,
      scoreEconomicValue,
      scoreReferrals,
      scoreResetControl,
      instantAppointmentBonus,
      idc,
    },

    level,
  };
}

export function metricFocusLabel(metric: MetricFocus) {
  switch (metric) {
    case "idc":
      return "IDC general";
    case "salesTotal":
      return "Ventas totales";
    case "visitsTotal":
      return "Visitas totales";
    case "visitsEffective":
      return "Visitas efectivas";
    case "visitsReset":
      return "Resets";
    case "referredTotal":
      return "Referidos";
    case "avgSale":
      return "Promedio de venta";
    case "avgSalePerVisit":
      return "Promedio venta por visita";
    case "avgSalePerEffectiveVisit":
      return "Promedio venta por visita efectiva";
    case "effectiveRate":
      return "Efectividad de visitas";
    case "salesConversionRate":
      return "Aporte a ventas realizadas";
    case "resetControl":
      return "Control de resets";
    case "referralRate":
      return "Aporte a referidos";
    case "productivity":
      return "Productividad";
    default:
      return "Ranking";
  }
}

export function getMetricValue(row: RankingRowBase, metric: MetricFocus) {
  switch (metric) {
    case "idc":
      return row.scores.idc;
    case "salesTotal":
      return row.salesTotal;
    case "visitsTotal":
      return row.visitsTotal;
    case "visitsEffective":
      return row.visitsEffective;
    case "visitsReset":
      return row.visitsReset;
    case "referredTotal":
      return row.referredTotal;
    case "avgSale":
      return row.avgSale;
    case "avgSalePerVisit":
      return row.avgSalePerVisit;
    case "avgSalePerEffectiveVisit":
      return row.avgSalePerEffectiveVisit;
    case "effectiveRate":
      return row.effectiveRate;
    case "salesConversionRate":
      return row.salesConversionRate;
    case "resetControl":
      return row.resetControl;
    case "referralRate":
      return row.referralRate;
    case "productivity":
      return row.type === "distributor"
        ? row.salesPerSeller
        : row.avgSalePerVisit;
    default:
      return row.scores.idc;
  }
}

export function sortRankingRows<T extends RankingRowBase>(
  rows: T[],
  metric: MetricFocus
) {
  return [...rows]
    .sort((a, b) => {
      const primary = getMetricValue(b, metric) - getMetricValue(a, metric);

      if (primary !== 0) return primary;

      return b.scores.idc - a.scores.idc;
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export function formatRate(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export function formatDecimal(value: number, decimals = 2) {
  return Number(value || 0).toFixed(decimals);
}

export function formatCOP(value: number) {
  return `$${Math.round(Number(value || 0)).toLocaleString("es-CO")}`;
}

export function formatScore(value: number) {
  const n = Number(value || 0);

  if (Number.isInteger(n)) {
    return String(n);
  }

  return n.toFixed(1);
}