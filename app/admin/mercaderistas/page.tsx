"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  startDate?: string;
  endDate?: string;

  createdAt?: any;
  updatedAt?: any;
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

function getDisplayName(m: Merchandiser) {
  return (
    m.fullName?.trim() ||
    `${m.firstName || ""} ${m.lastName || ""}`.trim() ||
    "Sin nombre"
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
  const [qText, setQText] = useState("");
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
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
              accede al perfil para actualizar sus datos.
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
            <table className="min-w-[1180px] w-full text-sm">
              <thead>
                <tr className="border-b bg-black/[0.03] text-left">
                  <th className="px-4 py-3">Mercaderista</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Ciudad</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Seguridad social</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-black/50">
                      Cargando mercaderistas...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((m) => {
                    const displayName = getDisplayName(m);
                    const photoUrl = m.photoUrl || "";

                    return (
                      <tr key={m.id} className="border-b last:border-b-0 hover:bg-black/[0.025]">
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

                        <td className="px-4 py-3">
                          {m.city || "—"}
                        </td>

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

                        <td className="px-4 py-3 text-right">
                          <Link
                            href={ROUTES.detalleMercaderista(m.id)}
                            className="inline-flex rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold hover:bg-black/5"
                          >
                            Ver perfil →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && !filtered.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="text-base font-black text-black">
                          No hay mercaderistas para mostrar
                        </div>

                        <p className="mt-1 text-sm text-black/50">
                          Puedes crear el primer registro desde el botón
                          “Nuevo mercaderista”.
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
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-black/40">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-black">
        {value}
      </div>
    </div>
  );
}