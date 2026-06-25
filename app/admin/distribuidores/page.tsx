"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROUTES = {
  configuracion: "/admin/configuracion",
  nuevoDistribuidor: "/admin/distribuidores/nuevo",
  detalleDistribuidor: (id: string) =>
    `/admin/distribuidores/${id}`,
};

type Distributor = {
  id: string;
  distributorCode?: string;
  name?: string;
  city?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status?: string;
  photoUrl?: string;
  photo?: string;
  createdAt?: any;
  updatedAt?: any;
};

function toMillis(ts: any): number {
  try {
    return ts?.toMillis ? ts.toMillis() : 0;
  } catch {
    return 0;
  }
}

function getInitials(name?: string) {
  if (!name) return "D";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function DistribuidoresPage() {
  const [rows, setRows] = useState<Distributor[]>([]);
  const [qText, setQText] = useState("");

  useEffect(() => {
    const qy = query(
      collection(db, "distributors"),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Distributor[];

        data.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));

        setRows(data);
      },
      (err) => console.error("distributors snapshot error:", err)
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();

    if (!t) return rows;

    return rows.filter((d) =>
      [
        d.distributorCode,
        d.name,
        d.city,
        d.contactName,
        d.email,
        d.phone,
        d.status,
        d.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, qText]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-extrabold text-black/60">
            SIANA VITAL • Configuración • Distribuidores
          </div>

          <h1 className="text-3xl font-black mt-2">Distribuidores</h1>

          <p className="text-sm text-black/60 mt-1">
            Consulta, busca y entra al detalle para editar o ver información.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={ROUTES.configuracion}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            ← Configuración
          </Link>

          <Link
            href={ROUTES.nuevoDistribuidor}
            className="rounded-xl px-4 py-2 text-sm font-extrabold text-white bg-[#0B5ED7] hover:bg-[#0A54C2]"
          >
            + Nuevo distribuidor
          </Link>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Buscar por código, nombre, ciudad, contacto, correo, teléfono, estado..."
            className="w-full md:w-[560px] rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#0B5ED7] focus:ring-2 focus:ring-[#0B5ED7]/10"
          />

          <div className="text-sm text-black/60">
            {filtered.length} registro(s)
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1180px] w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-black/[0.02]">
                <th className="py-3 pr-4 pl-2">Foto</th>
                <th className="py-3 pr-4">Código</th>
                <th className="py-3 pr-4">Distribuidor</th>
                <th className="py-3 pr-4">Ciudad</th>
                <th className="py-3 pr-4">Contacto</th>
                <th className="py-3 pr-4">Teléfono</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">Acción</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((d) => {
                const imageUrl = d.photoUrl || d.photo || "";

                return (
                  <tr key={d.id} className="border-b hover:bg-black/5">
                    <td className="py-3 pr-4 pl-2">
                      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={d.name || "Foto distribuidor"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-black text-black/50">
                            {getInitials(d.name)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-full bg-[#C86A2B]/10 text-[#C86A2B] px-3 py-1 text-xs font-extrabold">
                        {d.distributorCode || "—"}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      <div className="font-extrabold text-black">
                        {d.name || "—"}
                      </div>
                      <div className="text-xs text-black/50">
                        {d.email || "Sin correo"}
                      </div>
                    </td>

                    <td className="py-3 pr-4">{d.city || "—"}</td>

                    <td className="py-3 pr-4">{d.contactName || "—"}</td>

                    <td className="py-3 pr-4">{d.phone || "—"}</td>

                    <td className="py-3 pr-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
                          String(d.status || "").toLowerCase() === "inactivo"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-green-50 text-green-700 border border-green-200",
                        ].join(" ")}
                      >
                        {d.status || "Activo"}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      <Link
                        href={ROUTES.detalleDistribuidor(d.id)}
                        className="inline-flex items-center rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-extrabold hover:bg-black/5"
                        title="Ver detalle y editar"
                      >
                        Ver / Editar →
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-black/50">
                    No hay distribuidores para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-black/50">
          Tip: si no ves registros, revisa permisos o que la colección sea
          exactamente <b>distributors</b>.
        </div>
      </div>
    </div>
  );
}