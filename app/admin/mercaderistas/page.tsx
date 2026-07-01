"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type MerchandiserStatus = "Activo" | "Inactivo" | "Retirado";

type Merchandiser = {
  id: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  documentType?: string;
  documentNumber?: string;
  birthDate?: string;

  photoUrl?: string;
  documentPhotoUrl?: string;

  phone?: string;
  email?: string;
  city?: string;
  address?: string;

  eps?: string;
  arl?: string;
  pensionFund?: string;

  merchandiserCode?: string;
  status?: MerchandiserStatus | string;
  uid?: string;
  userUid?: string;
  authUid?: string;

  startDate?: string;
  endDate?: string;

  createdAt?: any;
  updatedAt?: any;
};

type Seller = {
  id: string;
  name: string;
  uid?: string;
  distributorId?: string;
  distributorName?: string;
  documentNumber?: string;
  photoUrl?: string;
  active?: boolean;
};

type Assignment = {
  id: string;

  merchandiserId: string;
  merchandiserName: string;
  merchandiserUid?: string;

  sellerId: string;
  sellerName: string;
  sellerUid?: string;

  distributorId?: string;
  distributorName?: string;

  active: boolean;
};

const ROUTES = {
  dashboard: "/admin",
  nuevoMercaderista: "/admin/mercaderistas/nuevo",
  detalleMercaderista: (id: string) => `/admin/mercaderistas/${id}`,
};

function toMillis(ts: any): number {
  try {
    return ts?.toMillis ? ts.toMillis() : 0;
  } catch {
    return 0;
  }
}

function getInitials(fullName?: string, firstName?: string, lastName?: string) {
  const name =
    fullName?.trim() ||
    `${firstName || ""} ${lastName || ""}`.trim() ||
    "M";

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getSellerInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getDisplayName(m: Merchandiser) {
  return (
    m.fullName?.trim() ||
    `${m.firstName || ""} ${m.lastName || ""}`.trim() ||
    "Sin nombre"
  );
}

function getPersonName(raw: any) {
  const firstName = raw.firstName || raw.personal?.firstName || "";
  const lastName = raw.lastName || raw.personal?.lastName || "";

  return (
    raw.name ||
    raw.fullName ||
    raw.displayName ||
    raw.sellerName ||
    raw.personal?.fullName ||
    `${firstName} ${lastName}`.trim() ||
    "Sin nombre"
  );
}

function extractPhotoUrl(raw: any) {
  return (
    raw.photo?.url ||
    raw.photoUrl ||
    raw.photoURL ||
    raw.imageUrl ||
    raw.imageURL ||
    raw.avatarUrl ||
    raw.avatarURL ||
    raw.profilePhotoUrl ||
    raw.profilePhotoURL ||
    raw.personal?.photo?.url ||
    raw.personal?.photoUrl ||
    raw.personal?.photoURL ||
    ""
  );
}

function getStatusStyles(status?: string) {
  const value = String(status || "Activo").toLowerCase();

  if (value === "inactivo") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "retirado") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}

export default function MercaderistasPage() {
  const [rows, setRows] = useState<Merchandiser[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [qText, setQText] = useState("");
  const [sellerSearch, setSellerSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedMerchandiser, setSelectedMerchandiser] =
    useState<Merchandiser | null>(null);

  const [modalMode, setModalMode] = useState<"view" | "add" | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const qy = query(
      collection(db, "merchandisers"),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Merchandiser, "id">),
        }));

        data.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));

        setRows(data);
        setLoading(false);
      },
      (err) => {
        console.error("merchandisers snapshot error:", err);
        setError("No fue posible cargar mercaderistas.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const qy = query(collection(db, "sellers"), orderBy("firstName", "asc"));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data: Seller[] = snap.docs
          .map((d) => {
            const raw = d.data() as any;

            return {
              id: d.id,
              name: getPersonName(raw),
              uid: raw.uid || raw.userUid || raw.authUid || "",
              distributorId: raw.distributorId || raw.distributor?.id || "",
              distributorName:
                raw.distributorName ||
                raw.distributor?.name ||
                raw.distributor?.businessName ||
                "",
              documentNumber:
                raw.documentNumber ||
                raw.document ||
                raw.identification ||
                raw.personal?.documentNumber ||
                raw.personal?.document ||
                "",
              photoUrl: extractPhotoUrl(raw),
              active: raw.active !== false && raw.activo !== false,
            };
          })
          .filter((seller) => seller.active && seller.name !== "Sin nombre")
          .sort((a, b) => a.name.localeCompare(b.name));

        setSellers(data);
        setLoadingSellers(false);
      },
      (err) => {
        console.error("sellers snapshot error:", err);
        setError("No fue posible cargar vendedores.");
        setLoadingSellers(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const qy = collection(db, "merchandiser_seller_assignments");

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data: Assignment[] = snap.docs
          .map((d) => {
            const raw = d.data() as any;

            return {
              id: d.id,
              merchandiserId: raw.merchandiserId || "",
              merchandiserName: raw.merchandiserName || "",
              merchandiserUid: raw.merchandiserUid || "",

              sellerId: raw.sellerId || "",
              sellerName: raw.sellerName || "",
              sellerUid: raw.sellerUid || "",

              distributorId: raw.distributorId || "",
              distributorName: raw.distributorName || "",

              active: raw.active !== false,
            };
          })
          .filter((item) => item.active);

        setAssignments(data);
        setLoadingAssignments(false);
      },
      (err) => {
        console.error("assignments snapshot error:", err);
        setError("No fue posible cargar asignaciones.");
        setLoadingAssignments(false);
      }
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const text = qText.trim().toLowerCase();

    if (!text) return rows;

    return rows.filter((m) =>
      [
        m.merchandiserCode,
        m.firstName,
        m.lastName,
        m.fullName,
        m.documentType,
        m.documentNumber,
        m.phone,
        m.email,
        m.city,
        m.eps,
        m.arl,
        m.pensionFund,
        m.status,
        m.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [rows, qText]);

  const totals = useMemo(() => {
    const active = rows.filter(
      (m) => String(m.status || "Activo").toLowerCase() === "activo"
    ).length;

    const inactive = rows.filter(
      (m) => String(m.status || "").toLowerCase() === "inactivo"
    ).length;

    const retired = rows.filter(
      (m) => String(m.status || "").toLowerCase() === "retirado"
    ).length;

    return {
      total: rows.length,
      active,
      inactive,
      retired,
    };
  }, [rows]);

  const assignmentsByMerchandiser = useMemo(() => {
    const map = new Map<string, Assignment[]>();

    assignments.forEach((assignment) => {
      const current = map.get(assignment.merchandiserId) || [];
      current.push(assignment);
      map.set(assignment.merchandiserId, current);
    });

    return map;
  }, [assignments]);

  const selectedAssignments = useMemo(() => {
    if (!selectedMerchandiser) return [];

    return (assignmentsByMerchandiser.get(selectedMerchandiser.id) || []).sort(
      (a, b) => a.sellerName.localeCompare(b.sellerName)
    );
  }, [assignmentsByMerchandiser, selectedMerchandiser]);

  const assignedSellerIdsForSelected = useMemo(() => {
    return new Set(selectedAssignments.map((assignment) => assignment.sellerId));
  }, [selectedAssignments]);

  const availableSellersForSelected = useMemo(() => {
    const text = sellerSearch.trim().toLowerCase();

    return sellers
      .filter((seller) => !assignedSellerIdsForSelected.has(seller.id))
      .filter((seller) => {
        if (!text) return true;

        return [
          seller.name,
          seller.distributorName,
          seller.documentNumber,
          seller.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(text);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sellers, assignedSellerIdsForSelected, sellerSearch]);

  const assignedSellersForSelected = useMemo(() => {
    const text = sellerSearch.trim().toLowerCase();

    return selectedAssignments
      .map((assignment) => {
        const seller = sellers.find((item) => item.id === assignment.sellerId);

        return {
          assignment,
          seller,
        };
      })
      .filter(({ assignment, seller }) => {
        if (!text) return true;

        return [
          seller?.name || assignment.sellerName,
          seller?.distributorName || assignment.distributorName,
          seller?.documentNumber,
          seller?.id || assignment.sellerId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(text);
      })
      .sort((a, b) =>
        (a.seller?.name || a.assignment.sellerName).localeCompare(
          b.seller?.name || b.assignment.sellerName
        )
      );
  }, [selectedAssignments, sellers, sellerSearch]);

  function openModal(merchandiser: Merchandiser, mode: "view" | "add") {
    setSelectedMerchandiser(merchandiser);
    setModalMode(mode);
    setSellerSearch("");
    setMessage("");
    setError("");
  }

  function closeModal() {
    setSelectedMerchandiser(null);
    setModalMode(null);
    setSellerSearch("");
    setSaving(false);
  }

  async function assignSeller(seller: Seller) {
    if (!selectedMerchandiser) return;

    if (assignedSellerIdsForSelected.has(seller.id)) {
      setMessage("Este vendedor ya está asignado a la mercaderista.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const currentUser = auth.currentUser;
      const merchandiserName = getDisplayName(selectedMerchandiser);

      await addDoc(collection(db, "merchandiser_seller_assignments"), {
        merchandiserId: selectedMerchandiser.id,
        merchandiserName,
        merchandiserUid:
          selectedMerchandiser.uid ||
          selectedMerchandiser.userUid ||
          selectedMerchandiser.authUid ||
          "",

        sellerId: seller.id,
        sellerName: seller.name,
        sellerUid: seller.uid || "",

        distributorId: seller.distributorId || "",
        distributorName: seller.distributorName || "",

        active: true,

        assignedBy: currentUser?.uid || "",
        assignedByName: currentUser?.email || "Administrador",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage(`Vendedor asignado a ${merchandiserName}.`);
    } catch (err: any) {
      console.error("assign seller error:", err);
      setError(err?.message || "No fue posible asignar el vendedor.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(assignment: Assignment) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await deleteDoc(
        doc(db, "merchandiser_seller_assignments", assignment.id)
      );

      setMessage("Asignación eliminada correctamente.");
    } catch (err: any) {
      console.error("remove assignment error:", err);
      setError(err?.message || "No fue posible quitar la asignación.");
    } finally {
      setSaving(false);
    }
  }

  const globalLoading = loading || loadingSellers || loadingAssignments;

  return (
    <div className="min-h-screen bg-[#F6F7FB] px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/55 shadow-sm">
              SIANA VITAL • Equipo comercial
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-black">
              Mercaderistas
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-black/55">
              Consulta el equipo de mercaderistas, revisa su información y
              asigna los vendedores que gestionarán en referidos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={ROUTES.dashboard}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-sm font-extrabold shadow-sm hover:bg-black/5"
            >
              Panel admin
            </Link>

            <Link
              href={ROUTES.nuevoMercaderista}
              className="rounded-xl bg-[#0B5ED7] px-4 py-2 text-center text-sm font-extrabold text-white shadow-sm hover:bg-[#0A54C2]"
            >
              + Nuevo mercaderista
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total" value={totals.total} />
          <SummaryCard label="Activos" value={totals.active} />
          <SummaryCard label="Inactivos" value={totals.inactive} />
          <SummaryCard label="Retirados" value={totals.retired} />
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-black">
                Listado de mercaderistas
              </h2>

              <p className="mt-1 text-sm text-black/50">
                Busca por nombre, documento, ciudad, contacto o estado.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Buscar mercaderista..."
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#0B5ED7] focus:ring-4 focus:ring-[#0B5ED7]/10 sm:w-[340px]"
              />

              <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-center text-sm font-bold text-black/60">
                {filtered.length} registro(s)
              </div>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-black/10">
            <table className="min-w-[1320px] w-full text-sm">
              <thead>
                <tr className="border-b bg-black/[0.03] text-left">
                  <th className="px-4 py-3">Mercaderista</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Ciudad</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Seguridad social</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Vendedores</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {globalLoading && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-black/50"
                    >
                      Cargando mercaderistas...
                    </td>
                  </tr>
                )}

                {!globalLoading &&
                  filtered.map((m) => {
                    const displayName = getDisplayName(m);
                    const photoUrl = m.photoUrl || "";
                    const assignedCount =
                      assignmentsByMerchandiser.get(m.id)?.length || 0;

                    return (
                      <tr
                        key={m.id}
                        className="border-b last:border-b-0 hover:bg-black/[0.025]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-black/10 bg-black/[0.04]">
                              {photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={photoUrl}
                                  alt={displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-black text-black/45">
                                  {getInitials(
                                    m.fullName,
                                    m.firstName,
                                    m.lastName
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="font-black text-black">
                                {displayName}
                              </div>

                              <div className="text-xs text-black/45">
                                {m.email || "Sin correo registrado"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-[#C86A2B]/10 px-3 py-1 text-xs font-black text-[#C86A2B]">
                            {m.merchandiserCode || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-black/75">
                            {m.documentNumber || "—"}
                          </div>

                          <div className="text-xs text-black/40">
                            {m.documentType || "Documento"}
                          </div>
                        </td>

                        <td className="px-4 py-3">{m.city || "—"}</td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-black/75">
                            {m.phone || "—"}
                          </div>

                          <div className="text-xs text-black/40">
                            {m.address || "Sin dirección"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-black/75">
                            EPS: {m.eps || "—"}
                          </div>

                          <div className="text-xs text-black/45">
                            ARL: {m.arl || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                              getStatusStyles(m.status),
                            ].join(" ")}
                          >
                            {m.status || "Activo"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openModal(m, "view")}
                            className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100"
                          >
                            {assignedCount} asignado(s) · Ver
                          </button>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openModal(m, "add")}
                              className="inline-flex rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-800"
                            >
                              Agregar vendedor
                            </button>

                            <Link
                              href={ROUTES.detalleMercaderista(m.id)}
                              className="inline-flex rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold hover:bg-black/5"
                            >
                              Ver perfil →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!globalLoading && !filtered.length && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="text-base font-black text-black">
                          No hay mercaderistas para mostrar
                        </div>

                        <p className="mt-1 text-sm text-black/50">
                          Puedes crear el primer registro desde el botón “Nuevo
                          mercaderista”.
                        </p>

                        <Link
                          href={ROUTES.nuevoMercaderista}
                          className="mt-4 inline-flex rounded-xl bg-[#0B5ED7] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#0A54C2]"
                        >
                          Crear mercaderista
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-black/45">
            La información mostrada corresponde a los registros activos en la
            colección de mercaderistas.
          </div>
        </div>
      </div>

      {modalMode && selectedMerchandiser ? (
        <AssignmentModal
          mode={modalMode}
          merchandiser={selectedMerchandiser}
          assignedItems={assignedSellersForSelected}
          availableSellers={availableSellersForSelected}
          sellerSearch={sellerSearch}
          setSellerSearch={setSellerSearch}
          saving={saving}
          onClose={closeModal}
          onAssign={assignSeller}
          onRemove={removeAssignment}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-black/40">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-black">{value}</div>
    </div>
  );
}

function AssignmentModal({
  mode,
  merchandiser,
  assignedItems,
  availableSellers,
  sellerSearch,
  setSellerSearch,
  saving,
  onClose,
  onAssign,
  onRemove,
}: {
  mode: "view" | "add";
  merchandiser: Merchandiser;
  assignedItems: {
    assignment: Assignment;
    seller?: Seller;
  }[];
  availableSellers: Seller[];
  sellerSearch: string;
  setSellerSearch: (value: string) => void;
  saving: boolean;
  onClose: () => void;
  onAssign: (seller: Seller) => void;
  onRemove: (assignment: Assignment) => void;
}) {
  const merchandiserName = getDisplayName(merchandiser);
  const isView = mode === "view";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-black/10 bg-[#F6F7FB] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                {isView ? "Vendedores asignados" : "Agregar vendedores"}
              </p>

              <h2 className="mt-1 text-2xl font-black text-black">
                {merchandiserName}
              </h2>

              <p className="mt-1 text-sm text-black/55">
                {isView
                  ? "Consulta los vendedores asignados y quita asignaciones cuando sea necesario."
                  : "Solo se muestran vendedores que aún no están asignados a esta mercaderista."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-black text-black/65 hover:bg-black/5"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4">
            <input
              value={sellerSearch}
              onChange={(e) => setSellerSearch(e.target.value)}
              placeholder="Buscar por vendedor, documento o distribuidor..."
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />
          </div>
        </div>

        <div className="max-h-[62vh] overflow-auto p-5">
          {isView ? (
            assignedItems.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assignedItems.map(({ assignment, seller }) => (
                  <SellerCard
                    key={assignment.id}
                    seller={{
                      id: assignment.sellerId,
                      name: seller?.name || assignment.sellerName,
                      uid: seller?.uid || assignment.sellerUid,
                      distributorId:
                        seller?.distributorId || assignment.distributorId,
                      distributorName:
                        seller?.distributorName || assignment.distributorName,
                      documentNumber: seller?.documentNumber || "",
                      photoUrl: seller?.photoUrl || "",
                      active: true,
                    }}
                    actionLabel="Quitar asignación"
                    actionVariant="danger"
                    saving={saving}
                    onClick={() => onRemove(assignment)}
                  />
                ))}
              </div>
            ) : (
              <EmptyModalState
                title="No hay vendedores asignados"
                text="Esta mercaderista todavía no tiene vendedores asignados."
              />
            )
          ) : availableSellers.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableSellers.map((seller) => (
                <SellerCard
                  key={seller.id}
                  seller={seller}
                  actionLabel="Asignar vendedor"
                  actionVariant="success"
                  saving={saving}
                  onClick={() => onAssign(seller)}
                />
              ))}
            </div>
          ) : (
            <EmptyModalState
              title="No hay vendedores disponibles"
              text="Todos los vendedores visibles ya están asignados o no coinciden con la búsqueda."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SellerCard({
  seller,
  actionLabel,
  actionVariant,
  saving,
  onClick,
}: {
  seller: Seller;
  actionLabel: string;
  actionVariant: "success" | "danger";
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-emerald-100">
          <SellerAvatar seller={seller} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-black">
            {seller.name}
          </h3>

          <p className="mt-1 truncate text-sm font-semibold text-black/50">
            {seller.distributorName || "Sin distribuidor"}
          </p>

          {seller.documentNumber ? (
            <p className="mt-1 text-xs font-bold text-black/40">
              Doc. {seller.documentNumber}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={onClick}
        className={[
          "mt-4 w-full rounded-2xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
          actionVariant === "success"
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
        ].join(" ")}
      >
        {saving ? "Procesando..." : actionLabel}
      </button>
    </article>
  );
}

function SellerAvatar({ seller }: { seller: Seller }) {
  const [imageError, setImageError] = useState(false);

  const hasValidPhoto =
    seller.photoUrl &&
    typeof seller.photoUrl === "string" &&
    seller.photoUrl.trim() !== "" &&
    !imageError;

  if (!hasValidPhoto) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-lg font-black text-emerald-700">
        {getSellerInitials(seller.name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={seller.photoUrl}
      alt={seller.name}
      className="h-full w-full object-cover"
      onError={() => setImageError(true)}
    />
  );
}

function EmptyModalState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-black/[0.02] p-10 text-center">
      <h3 className="text-lg font-black text-black">{title}</h3>
      <p className="mt-2 text-sm text-black/50">{text}</p>
    </div>
  );
}