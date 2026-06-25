"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Seller = {
  id: string;

  // En tu colección real:
  sellerCode?: string;
  sellerType?: string; // "Distribuidor" | "Emprendedor" (o minúsculas)
  status?: string;     // "Activo" | "Inactivo" | "pending" | etc.

  distributorId?: string;
  distributorName?: string;

  firstName?: string;
  lastName?: string;
  neighborhood?: string;
  phone?: string;

  personal?: { email?: string };
  photo?: { url?: string };
};

type Distributor = { id: string; name?: string; status?: string };

function isActiveStatus(s?: string) {
  const v = String(s || "").trim().toLowerCase();
  return v === "active" || v === "activo";
}

function fullNameOf(s: Seller) {
  const fn = String(s.firstName || "").trim();
  const ln = String(s.lastName || "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || "Sin nombre";
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<"all" | string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | string>("all");
  const [filterDistributor, setFilterDistributor] = useState<string>("all");

  async function load() {
    setLoading(true);

    // Distribuidores
    const distSnap = await getDocs(query(collection(db, "distributors")));
    const dists = distSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Distributor[];
    setDistributors(dists);

    // Sellers
    const sellersSnap = await getDocs(collection(db, "sellers"));
    const list = sellersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Seller[];
    setSellers(list);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return sellers.filter((s) => {
      if (filterType !== "all" && String(s.sellerType || "") !== filterType) return false;
      if (filterStatus !== "all" && String(s.status || "") !== filterStatus) return false;
      if (filterDistributor !== "all" && String(s.distributorId || "") !== filterDistributor) return false;
      return true;
    });
  }, [sellers, filterType, filterStatus, filterDistributor]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Vendedores</h1>
          <p className="text-sm text-black/60">Gestiona ficha y visitas por vendedor.</p>
        </div>

        <Link
          href="/admin/vendedores/nuevo"
          className="rounded-xl bg-[#0B3D91] px-4 py-2 text-sm font-extrabold text-white"
        >
          + Nuevo vendedor
        </Link>
      </div>

      {/* filtros */}
      <div className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3 md:grid-cols-3">
        <select
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
        >
          <option value="all">Tipo: Todos</option>
          <option value="Emprendedor">Emprendedor</option>
          <option value="Distribuidor">Distribuidor</option>
          {/* por si en tu BD vienen en minúscula */}
          <option value="emprendedor">emprendedor</option>
          <option value="distribuidor">distribuidor</option>
        </select>

        <select
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="all">Estado: Todos</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="pending">Pendiente</option>
          {/* por si en tu BD vienen en inglés */}
         </select>

        <select
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          value={filterDistributor}
          onChange={(e) => setFilterDistributor(e.target.value)}
        >
          <option value="all">Distribuidora: Todas</option>
          {distributors
            .filter((d) => isActiveStatus(d.status))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.id}
              </option>
            ))}
        </select>
      </div>

      {/* tabla */}
      <div className="overflow-hidden rounded-2xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Vendedor</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Tipo</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Distribuidora</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Estado</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={5}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={5}>
                  Sin resultados.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-t border-black/10">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.photo?.url || "/placeholder-user.png"}
                        className="h-9 w-9 rounded-xl object-cover border border-black/10"
                        alt=""
                      />
                      <div>
                        {/* ✅ nombre completo */}
                        <p className="font-extrabold">{fullNameOf(s)}</p>

                        {/* ✅ código vendedor + teléfono */}
                        <p className="text-xs text-black/60">
                          {s.sellerCode ? `Código: ${s.sellerCode}` : "Código: —"}
                          {s.phone ? ` • ${s.phone}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2">{s.sellerType || "—"}</td>

                  <td className="px-3 py-2">{s.distributorName || s.distributorId || "—"}</td>

                  <td className="px-3 py-2">
                    <span className="rounded-full bg-[#FFF6EF] px-2 py-1 text-xs font-extrabold text-[#FF6A00]">
                      {s.status || "—"}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="rounded-lg border border-black/10 px-3 py-1 font-bold hover:bg-black/5"
                        href={`/admin/vendedores/${s.id}`}
                      >
                        Editar
                      </Link>
                      
                      <Link
                        className="rounded-lg bg-[#0B3D91] px-3 py-1 font-extrabold text-white hover:opacity-95"
                        href={`/admin/vendedores/${s.id}/visitas`}
                      >
                        Visitas
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}