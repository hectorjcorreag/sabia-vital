"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

function getTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export default function UsuarioVendedorPage() {
  const { sellerId } = useParams<{ sellerId: string }>();

  const [seller, setSeller] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSeller() {
      try {
        setLoading(true);

        const snap = await getDoc(doc(db, "sellers", sellerId));

        if (!snap.exists()) {
          setSeller(null);
          return;
        }

        const data = {
          id: snap.id,
          ...(snap.data() as any),
        };

        setSeller(data);

        const sellerEmail = getTextValue(
          data.personal?.email,
          data.email,
          data.correo
        );

        setEmail(sellerEmail);
      } catch (error) {
        console.error("Error cargando vendedor:", error);
        setErr("No se pudo cargar la información del vendedor.");
      } finally {
        setLoading(false);
      }
    }

    if (sellerId) {
      loadSeller();
    }
  }, [sellerId]);

  async function assignUser() {
    setErr("");
    setMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErr("Email y contraseña son obligatorios.");
      return;
    }

    try {
      setSaving(true);

      const token = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/users/assign-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          sellerId,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Error asignando usuario");
      }

      setMsg("Usuario creado y vinculado correctamente.");
      setPassword("");
    } catch (error: any) {
      setErr(error?.message ?? "Error creando usuario.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-slate-500">Cargando vendedor...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">
          Vendedor no encontrado
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          No fue posible encontrar el registro solicitado.
        </p>

        <Link
          href="/admin/vendedores"
          className="mt-5 inline-flex rounded-2xl bg-[#0B3D91] px-4 py-2 text-sm font-black text-white"
        >
          Volver a vendedores
        </Link>
      </div>
    );
  }

  const sellerName =
    getTextValue(
      seller.personal?.fullName,
      seller.displayName,
      seller.fullName,
      seller.name,
      seller.nombre
    ) || "Vendedor sin nombre";

  const sellerDocument =
    getTextValue(
      seller.personal?.document,
      seller.document,
      seller.documento,
      seller.cedula,
      seller.identification
    ) || "No registrado";

  const currentUserId = getTextValue(seller.userId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0B3D91]">
              Vendedores
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              Usuario vendedor
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Crea o vincula las credenciales de acceso para este vendedor.
            </p>
          </div>

          <Link
            href="/admin/vendedores"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Volver
          </Link>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {msg}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-slate-900">
            Crear credenciales
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Al crear el usuario, se registrará en Firebase Auth y se creará su
            documento en la colección users con el perfil tipo seller.
          </p>

          <div className="mt-5 grid gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                Correo electrónico
              </label>

              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@dominio.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                Contraseña temporal
              </label>

              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Contraseña"
                type="password"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={assignUser}
            disabled={saving || Boolean(currentUserId)}
            className="mt-5 w-full rounded-2xl bg-[#0B3D91] px-5 py-3 text-sm font-black text-white shadow-xl shadow-blue-950/15 transition hover:bg-[#092f70] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {currentUserId
              ? "Este vendedor ya tiene usuario"
              : saving
              ? "Creando y vinculando..."
              : "Crear y vincular usuario"}
          </button>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            Modelo esperado en users:{" "}
            <span className="font-black">
              role: vendedor · profile.type: seller · profile.id: sellerId
            </span>
          </p>
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-slate-900">
            Perfil del vendedor
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Nombre
              </p>
              <p className="mt-1 font-black text-slate-900">{sellerName}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Documento
              </p>
              <p className="mt-1 font-semibold text-slate-700">
                {sellerDocument}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Seller ID
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {seller.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Usuario asignado
              </p>

              {currentUserId ? (
                <p className="mt-1 break-all rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  {currentUserId}
                </p>
              ) : (
                <p className="mt-1 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                  Sin usuario asignado
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}