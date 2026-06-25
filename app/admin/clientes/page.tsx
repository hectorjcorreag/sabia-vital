"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Client = {
  id: string;
  status?: "active" | "inactive";
  fullName?: string; // si lo tienes plano
  sellerId?: string;
  sellerName?: string; // opcional denormalizado
  distributorId?: string;
  distributorName?: string; // opcional denormalizado
  contact?: {
    fullName?: string;
    phone?: string;
    email?: string;
    city?: string;
    address?: string;
    documentType?: string;
    documentNumber?: string;
  };
  commercial?: {
    creditApproved?: boolean;
    creditLimit?: number;
    riskLevel?: "low" | "med" | "high";
    notes?: string;
  };
  createdAt?: any;
};

type Seller = { id: string; personal?: { fullName?: string }; status?: string };

function Pill({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-[#FFF6EF] px-2 py-1 text-xs font-extrabold text-[#FF6A00]">
      {text}
    </span>
  );
}

export default function AdminClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [credit, setCredit] = useState<"all" | "approved" | "notApproved">("all");
  const [sellerId, setSellerId] = useState<string>("all");

  async function load() {
    setLoading(true);

    // clientes
    const cSnap = await getDocs(collection(db, "clients"));
    const cList = cSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[];
    setClients(cList);

    // vendedores (para filtro)
    const sSnap = await getDocs(collection(db, "sellers"));
    const sList = sSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Seller[];
    setSellers(sList);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return clients.filter((c) => {
      const name = (c.contact?.fullName || c.fullName || "").toLowerCase();
      const phone = (c.contact?.phone || "").toLowerCase();
      const docn = (c.contact?.documentNumber || "").toLowerCase();

      if (needle) {
        const ok =
          name.includes(needle) ||
          phone.includes(needle) ||
          docn.includes(needle);
        if (!ok) return false;
      }

      if (status !== "all" && (c.status || "active") !== status) return false;

      const approved = !!c.commercial?.creditApproved;
      if (credit === "approved" && !approved) return false;
      if (credit === "notApproved" && approved) return false;

      if (sellerId !== "all" && c.sellerId !== sellerId) return false;

      return true;
    });
  }, [clients, q, status, credit, sellerId]);

  const totals = useMemo(() => {
    const t = {
      total: clients.length,
      active: clients.filter((c) => (c.status || "active") === "active").length,
      creditApproved: clients.filter((c) => !!c.commercial?.creditApproved).length,
    };
    return t;
  }, [clients]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Clientes</h1>
          <p className="text-sm text-black/60">
            CRUD de clientes + base para financiación y cartera.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            Recargar
          </button>

          <Link
            href="/dashboard/admin/clientes/nuevo"
            className="rounded-xl bg-[#0B3D91] px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:opacity-95"
          >
            + Nuevo cliente
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-black/50">Clientes</p>
          <p className="mt-1 text-2xl font-black">{totals.total}</p>
          <p className="mt-1 text-xs text-black/60">Total registrados</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-black/50">Activos</p>
          <p className="mt-1 text-2xl font-black">{totals.active}</p>
          <p className="mt-1 text-xs text-black/60">En operación</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-black/50">Crédito aprobado</p>
          <p className="mt-1 text-2xl font-black">{totals.creditApproved}</p>
          <p className="mt-1 text-xs text-black/60">Habilitados para financiación</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3 md:grid-cols-4">
        <input
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          placeholder="Buscar por nombre, teléfono o documento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="all">Estado: Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>

        <select
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          value={credit}
          onChange={(e) => setCredit(e.target.value as any)}
        >
          <option value="all">Crédito: Todos</option>
          <option value="approved">Aprobado</option>
          <option value="notApproved">No aprobado</option>
        </select>

        <select
          className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
        >
          <option value="all">Vendedor: Todos</option>
          {sellers
            .filter((s) => (s.status || "active") === "active")
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.personal?.fullName || s.id}
              </option>
            ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Cliente</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Contacto</th>
              <th className="px-3 py-2 text-xs font-black uppercase text-black/60">Crédito</th>
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
              filtered.map((c) => {
                const name = c.contact?.fullName || c.fullName || "Sin nombre";
                const phone = c.contact?.phone || "";
                const city = c.contact?.city || "";
                const approved = !!c.commercial?.creditApproved;
                const limit = Number(c.commercial?.creditLimit || 0);

                return (
                  <tr key={c.id} className="border-t border-black/10">
                    <td className="px-3 py-2">
                      <p className="font-extrabold">{name}</p>
                      <p className="text-xs text-black/60">
                        {c.contact?.documentType || ""} {c.contact?.documentNumber || ""}
                      </p>
                    </td>

                    <td className="px-3 py-2">
                      <p className="font-semibold">{phone}</p>
                      <p className="text-xs text-black/60">{city}</p>
                    </td>

                    <td className="px-3 py-2">
                      {approved ? (
                        <div className="space-y-1">
                          <Pill text="Aprobado" />
                          <p className="text-xs text-black/60">
                            Límite: ${limit.toLocaleString("es-CO")}
                          </p>
                        </div>
                      ) : (
                        <Pill text="No aprobado" />
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <Pill text={(c.status || "active") === "active" ? "Activo" : "Inactivo"} />
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/admin/clientes/${c.id}`}
                          className="rounded-lg border border-black/10 px-3 py-1 font-bold hover:bg-black/5"
                        >
                          Ver / Editar
                        </Link>
                        <Link
                          href={`/dashboard/admin/clientes/${c.id}?tab=financiacion`}
                          className="rounded-lg bg-[#0B3D91] px-3 py-1 font-extrabold text-white hover:opacity-95"
                        >
                          Financiación
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-black/50">
        Siguiente: crear <b>/clientes/nuevo</b> y <b>/clientes/[id]</b> con pestaña de financiación (créditos, saldo, cuotas).
      </p>
    </div>
  );
}