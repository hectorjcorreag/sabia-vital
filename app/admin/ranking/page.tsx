"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import { db, storage } from "@/lib/firebase";

import { RankingFilters } from "@/components/ranking/RankingFilters";
import { RankingKpiCards } from "@/components/ranking/RankingKpiCards";
import { RankingHighlights } from "@/components/ranking/RankingHighlights";
import { RankingPodium } from "@/components/ranking/RankingPodium";
import { RankingTable } from "@/components/ranking/RankingTable";
import { RankingExportButtons } from "@/components/ranking/RankingExportButtons";
import { RankingExportCard } from "@/components/ranking/RankingExportCard";

import {
  buildRankingHighlights,
  buildRankingKpis,
  buildRankingRows,
  exportRowsForExcel,
  todayBogotaKey,
  validateRankingFilters,
} from "@/components/ranking/rankingUtils";

import type {
  DistributorCatalogItem,
  RankingFilters as RankingFiltersType,
  SellerCatalogItem,
  VisitStatsDailyDoc,
} from "@/components/ranking/rankingTypes";

function cleanString(value: any) {
  return String(value || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function getRawSellerPhotoPathOrUrl(seller: any) {
  const photo = seller?.photo || {};

  return (
    seller?.photoUrl ||
    seller?.photoURL ||
    seller?.profilePhotoUrl ||
    seller?.profilePhotoURL ||
    seller?.photoPath ||
    photo?.url ||
    photo?.downloadURL ||
    photo?.path ||
    photo?.storagePath ||
    ""
  );
}

function getRawDistributorPhotoPathOrUrl(distributor: any) {
  const photo = distributor?.photo || {};
  const logo = distributor?.logo || {};

  return (
    distributor?.photoUrl ||
    distributor?.photoURL ||
    distributor?.logoUrl ||
    distributor?.logoURL ||
    distributor?.photoPath ||
    distributor?.logoPath ||
    photo?.url ||
    photo?.downloadURL ||
    photo?.path ||
    photo?.storagePath ||
    logo?.url ||
    logo?.downloadURL ||
    logo?.path ||
    logo?.storagePath ||
    ""
  );
}

function isStoragePath(value: string) {
  const clean = cleanString(value);

  if (!clean) return false;
  if (clean.startsWith("http://")) return false;
  if (clean.startsWith("https://")) return false;
  if (clean.startsWith("data:")) return false;
  if (clean.startsWith("blob:")) return false;

  return clean.includes("/");
}

async function resolveStorageImage(value: any) {
  const clean = cleanString(value);

  if (!clean) return "";

  if (!isStoragePath(clean)) {
    return clean;
  }

  try {
    return await getDownloadURL(ref(storage, clean));
  } catch (error) {
    console.warn("No se pudo resolver imagen desde Storage:", clean, error);
    return "";
  }
}
async function imageUrlToDataUrl(url: string) {
  const clean = cleanString(url);

  if (!clean) return "";

  if (clean.startsWith("data:")) return clean;

  try {
    const response = await fetch(clean, {
      mode: "cors",
      cache: "force-cache",
    });

    if (!response.ok) {
      console.warn("No se pudo descargar imagen para exportar:", clean);
      return "";
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(String(reader.result || ""));
      };

      reader.onerror = () => {
        resolve("");
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("No se pudo convertir imagen a base64:", clean, error);
    return "";
  }
}

function isUnsupportedColorValue(value: string) {
  return (
    value.includes("lab(") ||
    value.includes("oklab(") ||
    value.includes("lch(") ||
    value.includes("oklch(") ||
    value.includes("color-mix(")
  );
}

function sanitizeCanvasColors(clonedDocument: Document) {
  const all = Array.from(clonedDocument.querySelectorAll("*")) as HTMLElement[];

  const props = [
    {
      computed: "color",
      css: "color",
      fallback: "#111827",
    },
    {
      computed: "backgroundColor",
      css: "background-color",
      fallback: "#ffffff",
    },
    {
      computed: "borderTopColor",
      css: "border-top-color",
      fallback: "rgba(0,0,0,0.12)",
    },
    {
      computed: "borderRightColor",
      css: "border-right-color",
      fallback: "rgba(0,0,0,0.12)",
    },
    {
      computed: "borderBottomColor",
      css: "border-bottom-color",
      fallback: "rgba(0,0,0,0.12)",
    },
    {
      computed: "borderLeftColor",
      css: "border-left-color",
      fallback: "rgba(0,0,0,0.12)",
    },
    {
      computed: "outlineColor",
      css: "outline-color",
      fallback: "rgba(0,0,0,0.12)",
    },
    {
      computed: "textDecorationColor",
      css: "text-decoration-color",
      fallback: "#111827",
    },
    {
      computed: "caretColor",
      css: "caret-color",
      fallback: "#111827",
    },
  ] as const;

  all.forEach((el) => {
    const style = clonedDocument.defaultView?.getComputedStyle(el);

    if (!style) return;

    props.forEach((item) => {
      const value = style[item.computed as any];

      if (value && isUnsupportedColorValue(String(value))) {
        el.style.setProperty(item.css, item.fallback);
      }
    });

    const boxShadow = style.boxShadow;
    const textShadow = style.textShadow;
    const backgroundImage = style.backgroundImage;

    if (boxShadow && isUnsupportedColorValue(boxShadow)) {
      el.style.boxShadow = "none";
    }

    if (textShadow && isUnsupportedColorValue(textShadow)) {
      el.style.textShadow = "none";
    }

    if (backgroundImage && isUnsupportedColorValue(backgroundImage)) {
      el.style.backgroundImage = "none";
    }
  });
}

export default function RankingPage() {
  const exportCardRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState<RankingFiltersType>({
    scope: "sellers",
    metricFocus: "idc",
    fromDateKey: todayBogotaKey(),
    toDateKey: todayBogotaKey(),
    distributorId: "all",
    sellerType: "all",
    minVisits: 0,
    minSellers: 0,
  });

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [err, setErr] = useState("");

  const [sellersById, setSellersById] = useState<
    Record<string, SellerCatalogItem>
  >({});

  const [distributorsById, setDistributorsById] = useState<
    Record<string, DistributorCatalogItem>
  >({});

  const [statsDocs, setStatsDocs] = useState<VisitStatsDailyDoc[]>([]);

  const loading = loadingCatalogs || loadingStats;

  async function loadCatalogs() {
    setLoadingCatalogs(true);
    setErr("");

    try {
      const sellersSnap = await getDocs(collection(db, "sellers"));

      const sellersEntries = await Promise.all(
        sellersSnap.docs.map(async (docSnap) => {
          const rawData = docSnap.data();

          const rawPhoto = getRawSellerPhotoPathOrUrl(rawData);
          const resolvedPhotoUrl = await resolveStorageImage(rawPhoto);

          const seller: SellerCatalogItem = {
            id: docSnap.id,
            ...(rawData as Omit<SellerCatalogItem, "id">),
            photoUrl: resolvedPhotoUrl,
          };

          return [docSnap.id, seller] as const;
        })
      );

      const sellersMap = Object.fromEntries(sellersEntries);

      const distributorsSnap = await getDocs(collection(db, "distributors"));

      const distributorsEntries = await Promise.all(
        distributorsSnap.docs.map(async (docSnap) => {
          const rawData = docSnap.data();

          const rawPhoto = getRawDistributorPhotoPathOrUrl(rawData);
          const resolvedPhotoUrl = await resolveStorageImage(rawPhoto);

          const distributor: DistributorCatalogItem = {
            id: docSnap.id,
            ...(rawData as Omit<DistributorCatalogItem, "id">),
            photoUrl: resolvedPhotoUrl,
          };

          return [docSnap.id, distributor] as const;
        })
      );

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
        "No se pudieron cargar las estadísticas del periodo seleccionado."
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

    Object.values(sellersById).forEach((seller) => {
      if (seller.distributorId) {
        ids.add(String(seller.distributorId));
      }
    });

    Object.keys(distributorsById).forEach((id) => {
      ids.add(id);
    });

    return Array.from(ids).sort((a, b) => {
      const aName =
        distributorsById[a]?.name ||
        distributorsById[a]?.distributorName ||
        distributorsById[a]?.businessName ||
        a;

      const bName =
        distributorsById[b]?.name ||
        distributorsById[b]?.distributorName ||
        distributorsById[b]?.businessName ||
        b;

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

  const [rankingRowsForExport, setRankingRowsForExport] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;

    async function prepareExportPhotos() {
      const rows = await Promise.all(
        rankingRows.map(async (row) => {
          const dataUrl = await imageUrlToDataUrl(row.photoUrl);

          return {
            ...row,
            photoDataUrl: dataUrl,
          };
        })
      );

      if (alive) {
        setRankingRowsForExport(rows);
      }
    }

    prepareExportPhotos();

    return () => {
      alive = false;
    };
  }, [rankingRows]);

  const kpis = useMemo(() => {
    return buildRankingKpis(rankingRows);
  }, [rankingRows]);

  const highlights = useMemo(() => {
    return buildRankingHighlights(rankingRows);
  }, [rankingRows]);

  function handleFiltersChange(next: RankingFiltersType) {
    setFilters(next);
  }

  async function handleReload() {
    await loadCatalogs();
    await loadStats(filters);
  }

  function exportAsExcel() {
    const rows = exportRowsForExcel(rankingRows, filters.metricFocus);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Ranking");

    XLSX.writeFile(
      wb,
      `ranking-${filters.scope}-${filters.metricFocus}-${filters.fromDateKey}-a-${filters.toDateKey}.xlsx`
    );
  }

  async function waitForImages(node: HTMLElement) {
    const images = Array.from(node.querySelectorAll("img"));

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();

        return new Promise<void>((resolve) => {
          const done = () => resolve();

          img.onload = done;
          img.onerror = done;

          setTimeout(done, 1200);
        });
      })
    );
  }

  async function exportAsPNG() {
    if (!exportCardRef.current) return;

    setExporting(true);
    setErr("");

    try {
      const node = exportCardRef.current;

      await document.fonts?.ready;
      await waitForImages(node);
      await new Promise((resolve) => setTimeout(resolve, 300));

      await document.fonts?.ready;
      await waitForImages(node);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        logging: false,
        onclone: (clonedDocument) => {
          sanitizeCanvasColors(clonedDocument);
        },
      });

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 1);
      });

      if (!blob) {
        setErr("No se pudo generar el archivo PNG.");
        return;
      }

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ranking-${filters.scope}-${filters.metricFocus}-${filters.fromDateKey}-a-${filters.toDateKey}.png`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      setErr(
        "No se pudo exportar el PNG. Revisa si alguna imagen externa está bloqueando la exportación."
      );
    } finally {
      setExporting(false);
    }
  }
  async function exportPDFviaPrint() {
    if (!exportCardRef.current) return;

    const node = exportCardRef.current;

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;

    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((el) => (el as HTMLElement).outerHTML)
      .join("\n");

    doc.open();

    doc.write(`
      <html>
        <head>
          <title>Ranking y Desempeño Comercial</title>
          <meta charset="utf-8" />
          ${styles}
          <style>
            @page { size: A4; margin: 10mm; }
            body {
              margin: 0;
              background: white;
              font-family: Arial, sans-serif;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-wrap {
              display: flex;
              justify-content: center;
              padding: 6mm;
            }
          </style>
        </head>
        <body>
          <div class="print-wrap">
            ${node.outerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);

    doc.close();

    const printWindow = iframe.contentWindow;

    if (printWindow) {
      printWindow.onafterprint = () => {
        document.body.removeChild(iframe);
      };
    } else {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/50 shadow-sm">
              SIANA VITAL • Desempeño comercial
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-black">
              Ranking y Desempeño Comercial
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-black/55">
              Evalúa vendedores y distribuidoras con una métrica profesional:
              ventas, visitas, resets, referidos, promedios e IDC.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/admin"
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-sm font-extrabold shadow-sm hover:bg-black/5"
            >
              ← Panel admin
            </Link>

            <RankingExportButtons
              exporting={exporting}
              disabled={loading || !rankingRows.length}
              onExportExcel={exportAsExcel}
              onExportPNG={exportAsPNG}
              onExportPDF={exportPDFviaPrint}
            />
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

        <RankingKpiCards kpis={kpis} />

        <RankingHighlights highlights={highlights} />

        <RankingPodium rows={rankingRows} metricFocus={filters.metricFocus} />

        <RankingTable
          rows={rankingRows}
          metricFocus={filters.metricFocus}
          loading={loading}
        />

        <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-lg font-black text-black">
              Vista para exportación
            </h2>

            <p className="text-sm text-black/50">
              Esta pieza se usa para generar el PNG y el PDF ejecutivo del
              ranking.
            </p>
          </div>

          <div className="overflow-auto">
            <div ref={exportCardRef} className="inline-block">
              <RankingExportCard
                rows={rankingRowsForExport.length ? rankingRowsForExport : rankingRows}
                kpis={kpis}
                metricFocus={filters.metricFocus}
                scope={filters.scope}
                fromDateKey={filters.fromDateKey}
                toDateKey={filters.toDateKey}
                brand="SIANA VITAL"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}