import type { MetricFocus, RankingRowBase } from "./scoreEngine";

export type RankingScope = "sellers" | "distributors";

export type SellerTypeFilter = "all" | "Distribuidor" | "Emprendedor";

export type DateRangeFilter = {
  fromDateKey: string;
  toDateKey: string;
};

export type RankingFilters = {
  scope: RankingScope;
  metricFocus: MetricFocus;
  fromDateKey: string;
  toDateKey: string;
  distributorId: string;
  sellerType: SellerTypeFilter;
  minVisits: number;
  minSellers: number;
};

export type SellerCatalogItem = {
  id: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;

  sellerCode?: string;
  sellerType?: "Distribuidor" | "Emprendedor" | string;

  distributorId?: string;

  photoUrl?: string;
  photoURL?: string;
  profilePhotoUrl?: string;
  profilePhotoURL?: string;
  photoPath?: string;

  photo?: {
    url?: string;
    downloadURL?: string;
    path?: string;
  };

  status?: string;
};

export type DistributorCatalogItem = {
  id: string;

  name?: string;
  distributorName?: string;
  businessName?: string;
  distributorCode?: string;

  city?: string;
  status?: string;

  photoUrl?: string;
  photoURL?: string;
  logoUrl?: string;
  logoURL?: string;
  photoPath?: string;
  logoPath?: string;

  photo?: {
    url?: string;
    downloadURL?: string;
    path?: string;
  };

  logo?: {
    url?: string;
    path?: string;
  };
};

export type VisitStatsDailyDoc = {
  id: string;

  dateKey?: string;

  sellerId?: string;
  distributorId?: string;

  visitsTotal?: number;
  visitsEffective?: number;
  visitsReset?: number;

  salesCountTotal?: number;
  salesTotal?: number;

  referredTotal?: number;
  instantAppointmentsTotal?: number;
};

export type RankingRow = RankingRowBase & {
  sellerId?: string;
  distributorId?: string;
  photoDataUrl?: string;

  sellerCode?: string;
  distributorCode?: string;

  city?: string;
  status?: string;

  sellersCount?: number;
};

export type RankingKpis = {
  participants: number;

  salesTotal: number;
  salesCountTotal: number;

  visitsTotal: number;
  visitsEffective: number;
  visitsReset: number;

  referredTotal: number;

  avgSale: number;
  avgSalePerVisit: number;
  avgSalePerEffectiveVisit: number;

  effectiveRate: number;
  resetRate: number;
  salesConversionRate: number;
  referralRate: number;
  resetControl: number;
};

export type RankingHighlight = {
  title: string;
  label: string;
  value: string;
  row?: RankingRow;
  helper?: string;
};

export type RankingExportKind = "excel" | "pdf" | "png";

export type RankingTab = {
  key: RankingScope;
  label: string;
  description: string;
};