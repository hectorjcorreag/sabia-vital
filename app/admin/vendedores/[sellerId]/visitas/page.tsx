"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

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

type VisitType = "efectiva" | "reset";
type Visit = any;

function todayBogotaKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

const monthKeyFromDateKey = (dateKey: string) => (dateKey || "").slice(0, 7); // YYYY-MM
const visitedAtFromDateKey = (dateKey: string) =>
  Timestamp.fromDate(new Date(`${dateKey}T00:00:00-05:00`));

function clampNonNegative(n: any) {
  const v = Number(n);
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(0, v);
}
function formatCOP(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-2">
        <label className="text-xs font-black text-black/60">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
        {hint ? <span className="text-[11px] text-black/40">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-[12px] font-bold text-red-600">{error}</p> : null}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-black">{title}</h3>
          <button
            type="button"
            className="rounded-xl border border-black/10 px-3 py-1 text-sm font-extrabold hover:bg-black/5"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

/* ------------------ Firestore data ------------------ */

async function listVisitsByRange(sellerId: string, fromDateKey: string, toDateKey: string) {
  const q = query(
    collection(db, "visits"),
    where("sellerId", "==", sellerId),
    where("visitedDateKey", ">=", fromDateKey),
    where("visitedDateKey", "<=", toDateKey),
    orderBy("visitedDateKey", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listDailyStatsByRange(sellerId: string, fromDateKey: string, toDateKey: string) {
  const q = query(
    collection(db, "visit_stats_daily"),
    where("sellerId", "==", sellerId),
    where("dateKey", ">=", fromDateKey),
    where("dateKey", "<=", toDateKey),
    orderBy("dateKey", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function createVisitAndUpdateDailyStats(payload: {
  sellerId: string;
  sellerName?: string;
  distributorId?: string;
  distributorName?: string;

  clientName: string;
  visitType: VisitType;
  referredCount: number;
  instantAppointmentsCount: number;
  salesCount: number;
  salesTotal: number;
  notes?: string;

  visitedDateKey: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay sesión activa.");

  const visitedMonthKey = monthKeyFromDateKey(payload.visitedDateKey);

  await addDoc(collection(db, "visits"), {
    ...payload,
    visitedMonthKey,
    visitedAt: visitedAtFromDateKey(payload.visitedDateKey),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const statsId = `${payload.sellerId}_${payload.visitedDateKey}`;
  const statsRef = doc(db, "visit_stats_daily", statsId);

  const incEffective = payload.visitType === "reset" ? 0 : 1;
  const incReset = payload.visitType === "reset" ? 1 : 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(statsRef);

    if (!snap.exists()) {
      tx.set(statsRef, {
        dateKey: payload.visitedDateKey,
        sellerId: payload.sellerId,
        distributorId: payload.distributorId || "",
        instantAppointmentsTotal: 0,
        referredTotal: 0,
        salesCountTotal: 0,
        salesTotal: 0,
        visitsEffective: 0,
        visitsReset: 0,
        visitsTotal: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    tx.set(
      statsRef,
      {
        dateKey: payload.visitedDateKey,
        sellerId: payload.sellerId,
        distributorId: payload.distributorId || "",
        visitsTotal: increment(1),
        visitsEffective: increment(incEffective),
        visitsReset: increment(incReset),
        referredTotal: increment(payload.referredCount || 0),
        instantAppointmentsTotal: increment(payload.instantAppointmentsCount || 0),
        salesCountTotal: increment(payload.salesCount || 0),
        salesTotal: increment(payload.salesTotal || 0),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function rebuildDailyStats(sellerId: string, visitedDateKey: string, distributorId?: string) {
  const q = query(
    collection(db, "visits"),
    where("sellerId", "==", sellerId),
    where("visitedDateKey", "==", visitedDateKey)
  );

  const snap = await getDocs(q);

  let visitsTotal = 0,
    visitsEffective = 0,
    visitsReset = 0,
    referredTotal = 0,
    instantAppointmentsTotal = 0,
    salesCountTotal = 0,
    salesTotal = 0;

  snap.forEach((d) => {
    const v: any = d.data();
    visitsTotal += 1;
    if (v.visitType === "reset") visitsReset += 1;
    else visitsEffective += 1;

    referredTotal += Number(v.referredCount || 0);
    instantAppointmentsTotal += Number(v.instantAppointmentsCount || 0);
    salesCountTotal += Number(v.salesCount || 0);
    salesTotal += Number(v.salesTotal || 0);
  });

  const statsId = `${sellerId}_${visitedDateKey}`;
  await setDoc(
    doc(db, "visit_stats_daily", statsId),
    {
      dateKey: visitedDateKey,
      sellerId,
      distributorId: distributorId || "",
      visitsTotal,
      visitsEffective,
      visitsReset,
      referredTotal,
      instantAppointmentsTotal,
      salesCountTotal,
      salesTotal,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function updateVisitAndRebuildDailyStats(args: {
  visitId: string;
  sellerId: string;
  newDayKey: string;
  oldDayKey?: string;
  distributorId?: string;
  patch: any;
}) {
  const { visitId, sellerId, newDayKey, oldDayKey, distributorId, patch } = args;

  await updateDoc(doc(db, "visits", visitId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });

  await rebuildDailyStats(sellerId, newDayKey, distributorId);

  if (oldDayKey && oldDayKey !== newDayKey) {
    await rebuildDailyStats(sellerId, oldDayKey, distributorId);
  }
}

async function deleteVisitAndRebuildDailyStats(args: {
  visitId: string;
  sellerId: string;
  dayKey: string;
  distributorId?: string;
}) {
  const { visitId, sellerId, dayKey, distributorId } = args;
  await deleteDoc(doc(db, "visits", visitId));
  await rebuildDailyStats(sellerId, dayKey, distributorId);
}

/* ------------------ Scoring ------------------ */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function scoreFromRate(rate: number, target: number) {
  return Math.round(100 * clamp01(rate / target));
}
function scoreFromInverseRate(rate: number, badMax: number) {
  return Math.round(100 * (1 - clamp01(rate / badMax)));
}
function scoreFromMoney(value: number, target: number) {
  return Math.round(100 * clamp01(value / target));
}
function gradeFromScore(s: number) {
  if (s >= 90) return { label: "Diamante", badge: "bg-cyan-100 text-cyan-800" };
  if (s >= 75) return { label: "Oro", badge: "bg-amber-100 text-amber-800" };
  if (s >= 60) return { label: "Plata", badge: "bg-slate-100 text-slate-800" };
  return { label: "Bronce", badge: "bg-orange-100 text-orange-800" };
}

function shortDate(d: string) {
  // YYYY-MM-DD -> MM-DD (para eje X)
  if (!d || d.length < 10) return d;
  return d.slice(5);
}

export default function SellerVisitsPage() {
  const { sellerId } = useParams<{ sellerId: string }>();

  const [seller, setSeller] = useState<any>(null);

  const [fromDateKey, setFromDateKey] = useState(todayBogotaKey());
  const [toDateKey, setToDateKey] = useState(todayBogotaKey());

  const [items, setItems] = useState<Visit[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [visitIdEditing, setVisitIdEditing] = useState<string | null>(null);
  const [visitDayKey, setVisitDayKey] = useState(todayBogotaKey());
  const [clientName, setClientName] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("efectiva");
  const [referredCount, setReferredCount] = useState(0);
  const [instantAppointmentsCount, setInstantAppointmentsCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [notes, setNotes] = useState("");

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const disabledMetrics = visitType === "reset";

  // Load seller
  useEffect(() => {
    (async () => {
      const s = await getDoc(doc(db, "sellers", sellerId));
      setSeller({ id: s.id, ...(s.data() as any) });
    })();
  }, [sellerId]);

  async function loadVisits() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const data = await listVisitsByRange(sellerId, fromDateKey, toDateKey);
      setItems(data);
    } catch (e: any) {
      setErr(e?.message || "Error cargando visitas.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const data = await listDailyStatsByRange(sellerId, fromDateKey, toDateKey);
      setDailyStats(data);
    } catch (e: any) {
      setErr((prev) => prev || e?.message || "Error cargando tablero.");
      setDailyStats([]);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadVisits();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, fromDateKey, toDateKey]);

  function resetForm() {
    setVisitIdEditing(null);
    setVisitDayKey(todayBogotaKey());
    setClientName("");
    setVisitType("efectiva");
    setReferredCount(0);
    setInstantAppointmentsCount(0);
    setSalesCount(0);
    setSalesTotal(0);
    setNotes("");
    setFieldErrors({});
    setErr("");
    setMsg("");
  }

  function startEdit(v: any) {
    setVisitIdEditing(v.id);
    setVisitDayKey(v.visitedDateKey || todayBogotaKey());
    setClientName(v.clientName || "");
    setVisitType((v.visitType as VisitType) || "efectiva");
    setReferredCount(clampNonNegative(v.referredCount || 0));
    setInstantAppointmentsCount(clampNonNegative(v.instantAppointmentsCount || 0));
    setSalesCount(clampNonNegative(v.salesCount || 0));
    setSalesTotal(clampNonNegative(v.salesTotal || 0));
    setNotes(v.notes || "");
    setFieldErrors({});
    setErr("");
    setMsg("");
  }

  function askDelete(v: any) {
    setDeleteTarget(v);
    setDeleteOpen(true);
  }

  useEffect(() => {
    if (visitType === "reset") {
      setReferredCount(0);
      setInstantAppointmentsCount(0);
      setSalesCount(0);
      setSalesTotal(0);
    }
  }, [visitType]);

  function validateForm() {
    const fe: Record<string, string> = {};
    if (!visitDayKey) fe.visitDayKey = "Selecciona la fecha de la visita.";
    if (!clientName.trim()) fe.clientName = "Este campo es obligatorio.";

    if (!disabledMetrics) {
      if (referredCount < 0) fe.referredCount = "Debe ser 0 o mayor.";
      if (instantAppointmentsCount < 0) fe.instantAppointmentsCount = "Debe ser 0 o mayor.";
      if (salesCount < 0) fe.salesCount = "Debe ser 0 o mayor.";
      if (salesTotal < 0) fe.salesTotal = "Debe ser 0 o mayor.";
      if (salesCount > 0 && salesTotal === 0) fe.salesTotal = "Si hay ventas, el total debería ser mayor a 0.";
    }

    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function save() {
    setErr("");
    setMsg("");
    if (!validateForm()) return;

    if (!auth.currentUser) {
      setErr("No hay sesión activa.");
      return;
    }

    setIsSaving(true);

    try {
      const base = {
        sellerId,
        sellerName: seller?.sellerName || seller?.personal?.fullName || seller?.name || "",
        distributorId: seller?.distributorId || "",
        distributorName: seller?.distributorName || "",
        clientName: clientName.trim(),
        visitType,
        referredCount: disabledMetrics ? 0 : clampNonNegative(referredCount),
        instantAppointmentsCount: disabledMetrics ? 0 : clampNonNegative(instantAppointmentsCount),
        salesCount: disabledMetrics ? 0 : clampNonNegative(salesCount),
        salesTotal: disabledMetrics ? 0 : clampNonNegative(salesTotal),
        notes: (notes || "").trim(),
        visitedDateKey: visitDayKey,
      };

      if (!visitIdEditing) {
        await createVisitAndUpdateDailyStats(base);
        setMsg("Visita registrada correctamente.");
        resetForm();
        await loadVisits();
        await loadStats();
        return;
      }

      const prev = items.find((x: any) => x.id === visitIdEditing);
      const oldDayKey = prev?.visitedDateKey;

      await updateVisitAndRebuildDailyStats({
        visitId: visitIdEditing,
        sellerId,
        newDayKey: visitDayKey,
        oldDayKey,
        distributorId: seller?.distributorId || "",
        patch: {
          ...base,
          visitedMonthKey: monthKeyFromDateKey(visitDayKey),
          visitedAt: visitedAtFromDateKey(visitDayKey),
        },
      });

      setMsg("Visita actualizada correctamente.");
      resetForm();
      await loadVisits();
      await loadStats();
    } catch (e: any) {
      setErr(e?.message || "Error guardando visita.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setErr("");
    setMsg("");

    try {
      await deleteVisitAndRebuildDailyStats({
        visitId: deleteTarget.id,
        sellerId,
        dayKey: deleteTarget.visitedDateKey,
        distributorId: seller?.distributorId || "",
      });

      setMsg("Visita eliminada correctamente.");
      setDeleteOpen(false);
      setDeleteTarget(null);

      if (visitIdEditing === deleteTarget.id) resetForm();

      await loadVisits();
      await loadStats();
    } catch (e: any) {
      setErr(e?.message || "Error eliminando visita.");
    } finally {
      setIsDeleting(false);
    }
  }

  /* ------------------ Board / Charts data ------------------ */

  const boardPro = useMemo(() => {
    const b = {
      days: dailyStats.length,
      visitsTotal: 0,
      visitsEffective: 0,
      visitsReset: 0,
      referredTotal: 0,
      instantAppointmentsTotal: 0,
      salesCountTotal: 0,
      salesTotal: 0,
    };

    for (const s of dailyStats) {
      b.visitsTotal += Number(s.visitsTotal || 0);
      b.visitsEffective += Number(s.visitsEffective || 0);
      b.visitsReset += Number(s.visitsReset || 0);
      b.referredTotal += Number(s.referredTotal || 0);
      b.instantAppointmentsTotal += Number(s.instantAppointmentsTotal || 0);
      b.salesCountTotal += Number(s.salesCountTotal || 0);
      b.salesTotal += Number(s.salesTotal || 0);
    }

    const total = Math.max(1, b.visitsTotal);
    const resetRate = b.visitsReset / total;
    const effectiveRate = b.visitsEffective / total;
    const salesRate = b.salesCountTotal / total;
    const avgSalePerVisit = b.salesTotal / total;
    const refPerVisit = b.referredTotal / total;

    // Umbrales ajustables
    const scoreReset = scoreFromInverseRate(resetRate, 0.4);
    const scoreEffective = scoreFromRate(effectiveRate, 0.85);
    const scoreSalesRate = scoreFromRate(salesRate, 0.35);
    const scoreAvgSale = scoreFromMoney(avgSalePerVisit, 150000);
    const scoreRef = scoreFromRate(refPerVisit, 0.6);

    const global = Math.round(
      scoreEffective * 0.25 +
        scoreReset * 0.2 +
        scoreSalesRate * 0.2 +
        scoreAvgSale * 0.2 +
        scoreRef * 0.15
    );

    const grade = gradeFromScore(global);

    return {
      ...b,
      resetRate,
      effectiveRate,
      salesRate,
      avgSalePerVisit,
      refPerVisit,
      scores: { scoreReset, scoreEffective, scoreSalesRate, scoreAvgSale, scoreRef, global },
      grade,
    };
  }, [dailyStats]);

  const chartData = useMemo(() => {
    return dailyStats.map((s: any) => ({
      dateKey: s.dateKey,
      d: shortDate(s.dateKey),
      total: Number(s.visitsTotal || 0),
      effective: Number(s.visitsEffective || 0),
      reset: Number(s.visitsReset || 0),
      salesCount: Number(s.salesCountTotal || 0),
      salesTotal: Number(s.salesTotal || 0),
      referred: Number(s.referredTotal || 0),
    }));
  }, [dailyStats]);

  const pieData = useMemo(() => {
    return [
      { name: "Efectivas", value: Number(boardPro.visitsEffective || 0) },
      { name: "Reset", value: Number(boardPro.visitsReset || 0) },
    ];
  }, [boardPro.visitsEffective, boardPro.visitsReset]);

  // Totales del listado visible
  const listTotals = useMemo(() => {
    const t = {
      visits: items.length,
      reset: 0,
      efectiva: 0,
      referredCount: 0,
      instantAppointmentsCount: 0,
      salesCount: 0,
      salesTotal: 0,
    };

    for (const v of items) {
      if (v.visitType === "reset") t.reset += 1;
      else t.efectiva += 1;

      t.referredCount += Number(v.referredCount || 0);
      t.instantAppointmentsCount += Number(v.instantAppointmentsCount || 0);
      t.salesCount += Number(v.salesCount || 0);
      t.salesTotal += Number(v.salesTotal || 0);
    }
    return t;
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Header + volver */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          {/* Ajusta esta ruta según tu proyecto */}
          <Link
            href="/dashboard/admin/vendedores"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            ← Volver a vendedores
          </Link>

          <h1 className="mt-3 text-2xl font-black">Visitas del vendedor</h1>
          <p className="text-sm text-black/60">
            {seller?.personal?.fullName || seller?.sellerName || ""}{" "}
            {seller?.sellerCode ? <span className="text-black/40">· {seller.sellerCode}</span> : null}
          </p>
        </div>
      </div>

      {/* Filtro rango */}
      <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 md:grid-cols-3">
        <Field label="Desde" required>
          <input
            type="date"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            value={fromDateKey}
            onChange={(e) => setFromDateKey(e.target.value)}
          />
        </Field>

        <Field label="Hasta" required hint="Incluye este día">
          <input
            type="date"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            value={toDateKey}
            onChange={(e) => setToDateKey(e.target.value)}
          />
        </Field>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={async () => {
              await loadVisits();
              await loadStats();
            }}
            className="w-full rounded-xl border border-black/15 px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            Aplicar filtro
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {err}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">
          {msg}
        </div>
      ) : null}

      {/* TABLERO PROFESIONAL */}
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold">Tablero profesional del vendedor</p>
            <p className="text-xs text-black/50">
              Rango: <b>{fromDateKey}</b> a <b>{toDateKey}</b> · Fuente: <b>visit_stats_daily</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${boardPro.grade.badge}`}>
              {boardPro.grade.label}
            </span>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black">
              Puntaje global: {boardPro.scores.global}/100
            </span>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black">
              {statsLoading ? "Cargando..." : `${boardPro.days} día(s)`}
            </span>
          </div>
        </div>

        {/* Fichas */}
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <div className="rounded-2xl border border-black/10 p-3">
            <p className="text-xs font-black text-black/50">Citas (Total)</p>
            <p className="text-xl font-black">{boardPro.visitsTotal}</p>
          </div>

          <div className="rounded-2xl border border-black/10 p-3">
            <p className="text-xs font-black text-black/50">Efectivas</p>
            <p className="text-xl font-black">
              {boardPro.visitsEffective} <span className="text-black/40">·</span>{" "}
              {Math.round(boardPro.effectiveRate * 100)}%
            </p>
            <p className="text-xs text-black/50">Índice: {boardPro.scores.scoreEffective}/100</p>
          </div>

          <div className="rounded-2xl border border-black/10 p-3">
            <p className="text-xs font-black text-black/50">Reset</p>
            <p className="text-xl font-black">
              {boardPro.visitsReset} <span className="text-black/40">·</span>{" "}
              {Math.round(boardPro.resetRate * 100)}%
            </p>
            <p className="text-xs text-black/50">Índice: {boardPro.scores.scoreReset}/100</p>
          </div>

          <div className="rounded-2xl border border-black/10 p-3">
            <p className="text-xs font-black text-black/50">Ventas / Cita</p>
            <p className="text-xl font-black">
              {boardPro.salesCountTotal} <span className="text-black/40">·</span>{" "}
              {Math.round(boardPro.salesRate * 100)}%
            </p>
            <p className="text-xs text-black/50">Índice: {boardPro.scores.scoreSalesRate}/100</p>
          </div>

          <div className="rounded-2xl border border-black/10 p-3 md:col-span-2">
            <p className="text-xs font-black text-black/50">Promedio venta por cita</p>
            <p className="text-xl font-black">{formatCOP(boardPro.avgSalePerVisit)}</p>
            <p className="text-xs text-black/50">Índice: {boardPro.scores.scoreAvgSale}/100</p>
          </div>

          <div className="rounded-2xl border border-black/10 p-3 md:col-span-2">
            <p className="text-xs font-black text-black/50">Referidos por cita</p>
            <p className="text-xl font-black">{boardPro.refPerVisit.toFixed(2)}</p>
            <p className="text-xs text-black/50">Índice: {boardPro.scores.scoreRef}/100</p>
          </div>
        </div>

        {/* Barras de índice */}
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {[
            ["Efectivas/Total", boardPro.scores.scoreEffective],
            ["Reset/Total", boardPro.scores.scoreReset],
            ["Ventas/Total", boardPro.scores.scoreSalesRate],
            ["Prom venta/cita", boardPro.scores.scoreAvgSale],
            ["Referidos/cita", boardPro.scores.scoreRef],
          ].map(([label, score]) => (
            <div key={String(label)} className="rounded-2xl border border-black/10 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-black/60">{label}</p>
                <p className="text-xs font-black">{score}/100</p>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-black/10">
                <div className="h-2 rounded-full bg-[#0B3D91]" style={{ width: `${Number(score)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-black/10 p-3 lg:col-span-2">
            <p className="text-sm font-extrabold">Citas por día (Total vs Efectivas)</p>
            <div className="mt-2 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="d" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" />
                  <Line type="monotone" dataKey="effective" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 p-3">
            <p className="text-sm font-extrabold">Distribución (Efectivas vs Reset)</p>
            <div className="mt-2 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                    {/* sin fijar colores específicos: dejamos default */}
                    <Cell />
                    <Cell />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 p-3 lg:col-span-3">
            <p className="text-sm font-extrabold">Ventas por día (cantidad de ventas)</p>
            <div className="mt-2 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="d" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="salesCount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-black/50">
          *Si Firestore te pide índice para rangos (sellerId + dateKey / visitedDateKey), créalo con el link que te da
          Firebase.
        </p>
      </div>

      {/* Totales del listado */}
      <div className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3 md:grid-cols-6">
        <div className="rounded-2xl border border-black/10 p-3">
          <p className="text-xs font-black text-black/50">Total visitas (listado)</p>
          <p className="text-lg font-black">{listTotals.visits}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-3">
          <p className="text-xs font-black text-black/50">Efectivas</p>
          <p className="text-lg font-black">{listTotals.efectiva}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-3">
          <p className="text-xs font-black text-black/50">Reset</p>
          <p className="text-lg font-black">{listTotals.reset}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-3">
          <p className="text-xs font-black text-black/50">Referidos</p>
          <p className="text-lg font-black">{listTotals.referredCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-3">
          <p className="text-xs font-black text-black/50">Citas instantáneas</p>
          <p className="text-lg font-black">{listTotals.instantAppointmentsCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-3">
          <p className="text-xs font-black text-black/50">Ventas / Total</p>
          <p className="text-lg font-black">
            {listTotals.salesCount} <span className="text-black/40">·</span> {formatCOP(listTotals.salesTotal)}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold">{visitIdEditing ? "Editar visita" : "Nueva visita"}</p>
            <p className="text-xs text-black/50">
              Guardamos: <b>visitedAt</b> (Timestamp), <b>visitedDateKey</b> y <b>visitedMonthKey</b>.
            </p>
          </div>

          <div className="flex gap-2">
            {visitIdEditing ? (
              <button
                className="rounded-xl border border-black/15 px-4 py-2 text-sm font-extrabold hover:bg-black/5"
                onClick={resetForm}
                type="button"
              >
                Cancelar edición
              </button>
            ) : null}

            <button
              onClick={save}
              type="button"
              disabled={isSaving}
              className={`rounded-xl px-5 py-2 text-sm font-extrabold text-white ${
                isSaving ? "bg-black/40" : "bg-[#0B3D91] hover:brightness-110"
              }`}
            >
              {isSaving ? "Guardando..." : visitIdEditing ? "Guardar cambios" : "Registrar visita"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Fecha de la visita" required error={fieldErrors.visitDayKey}>
            <input
              type="date"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={visitDayKey}
              onChange={(e) => setVisitDayKey(e.target.value)}
            />
          </Field>

          <Field label="Tipo de visita" required hint="Reset no registra métricas">
            <select
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={visitType}
              onChange={(e) => setVisitType(e.target.value as VisitType)}
            >
              <option value="efectiva">Efectiva</option>
              <option value="reset">Reset (no atendió)</option>
            </select>
          </Field>

          <Field label="Nombre del cliente" required error={fieldErrors.clientName}>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Ej: Droguería La 80"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </Field>

          <Field label="Notas" hint="Opcional">
            <textarea
              className="min-h-[42px] w-full resize-y rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Ej: pidió catálogo, agendar visita..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <Field label="Número de referidos" hint={disabledMetrics ? "Deshabilitado en Reset" : "0 o más"} error={fieldErrors.referredCount}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={disabledMetrics}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                disabledMetrics ? "border-black/10 bg-black/5 text-black/40" : "border-black/10"
              }`}
              value={referredCount}
              onChange={(e) => setReferredCount(clampNonNegative(e.target.value))}
            />
          </Field>

          <Field label="Citas instantáneas" hint={disabledMetrics ? "Deshabilitado en Reset" : "0 o más"} error={fieldErrors.instantAppointmentsCount}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={disabledMetrics}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                disabledMetrics ? "border-black/10 bg-black/5 text-black/40" : "border-black/10"
              }`}
              value={instantAppointmentsCount}
              onChange={(e) => setInstantAppointmentsCount(clampNonNegative(e.target.value))}
            />
          </Field>

          <Field label="Número de ventas" hint={disabledMetrics ? "Deshabilitado en Reset" : "0 o más"} error={fieldErrors.salesCount}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={disabledMetrics}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                disabledMetrics ? "border-black/10 bg-black/5 text-black/40" : "border-black/10"
              }`}
              value={salesCount}
              onChange={(e) => setSalesCount(clampNonNegative(e.target.value))}
            />
          </Field>

          <Field label="Total en ventas (COP)" hint={disabledMetrics ? "Deshabilitado en Reset" : `Vista previa: ${formatCOP(salesTotal)}`} error={fieldErrors.salesTotal}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={disabledMetrics}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                disabledMetrics ? "border-black/10 bg-black/5 text-black/40" : "border-black/10"
              }`}
              value={salesTotal}
              onChange={(e) => setSalesTotal(clampNonNegative(e.target.value))}
              placeholder="Ej: 250000"
            />
          </Field>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-black/10 p-3">
          <p className="text-sm font-extrabold">Listado de visitas</p>
          <button
            type="button"
            onClick={async () => {
              await loadVisits();
              await loadStats();
            }}
            className="rounded-xl border border-black/15 px-3 py-2 text-xs font-extrabold hover:bg-black/5"
          >
            Recargar
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Fecha</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Cliente</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Tipo</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Ref.</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Citas</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Ventas</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Total</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Acción</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-4">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4">
                  Sin visitas para el rango seleccionado.
                </td>
              </tr>
            ) : (
              items.map((v: any) => (
                <tr key={v.id} className="border-t border-black/10">
                  <td className="px-3 py-2 text-xs font-bold text-black/60">{v.visitedDateKey || "-"}</td>
                  <td className="px-3 py-2 font-semibold">{v.clientName}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-black ${
                        v.visitType === "reset" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {v.visitType === "reset" ? "Reset" : "Efectiva"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{Number(v.referredCount ?? 0)}</td>
                  <td className="px-3 py-2">{Number(v.instantAppointmentsCount ?? 0)}</td>
                  <td className="px-3 py-2">{Number(v.salesCount ?? 0)}</td>
                  <td className="px-3 py-2">{formatCOP(Number(v.salesTotal ?? 0))}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-black/10 px-3 py-1 font-extrabold hover:bg-black/5"
                        onClick={() => startEdit(v)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 font-extrabold text-red-700 hover:bg-red-100"
                        onClick={() => askDelete(v)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal delete */}
      <Modal
        open={deleteOpen}
        title="Eliminar visita"
        onClose={() => {
          if (!isDeleting) setDeleteOpen(false);
        }}
      >
        <p className="text-sm text-black/70">
          Vas a eliminar la visita de <b>{deleteTarget?.clientName || "—"}</b> del día{" "}
          <b>{deleteTarget?.visitedDateKey || "—"}</b>. Esta acción no se puede deshacer.
        </p>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Al eliminar, también se recalcula el consolidado del día en <b>visit_stats_daily</b>.
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-extrabold hover:bg-black/5"
            onClick={() => setDeleteOpen(false)}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-extrabold text-white ${
              isDeleting ? "bg-black/40" : "bg-red-600 hover:brightness-110"
            }`}
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}