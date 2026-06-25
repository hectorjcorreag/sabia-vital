"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { MenuItem } from "@/config/menus";

type AppShellProps = {
  children: React.ReactNode;
  menu: MenuItem[];
  roleLabel: string;
};

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeRoleLabel(role?: string | null, fallback = "Usuario") {
  if (!role) return fallback;

  const cleanRole = role.toLowerCase().trim();

  const labels: Record<string, string> = {
    administrador: "Administrador",
    admin: "Administrador",
    vendedor: "Vendedor",
    seller: "Vendedor",
    distribuidor: "Distribuidor",
    distributor: "Distribuidor",
    mercaderista: "Mercaderista",
    merchandiser: "Mercaderista",
  };

  return labels[cleanRole] || fallback;
}

export default function AppShell({
  children,
  menu,
  roleLabel,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useCurrentUser();

  const userName = profile?.displayName ?? "Usuario";
  const userEmail = profile?.email ?? "Sin correo registrado";
  const userRole = normalizeRoleLabel(profile?.role, roleLabel);
  const userPhoto = profile?.photoURL ?? null;
  const assignedName = profile?.assignedName ?? null;

  const isActive =
    profile?.activo !== false &&
    String(profile?.estado || "").toLowerCase() !== "inactivo";

  const homeHref = menu[0]?.href || "/";

  async function handleLogout() {
    try {
      await signOut(auth);

      if (typeof window !== "undefined") {
        localStorage.removeItem("sv_user_welcome");
        localStorage.removeItem("sv_user_role");
        localStorage.removeItem("sv_user_uid");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f8fc] text-slate-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white p-5 shadow-sm lg:flex lg:flex-col">
        <Link href={homeHref} className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <Image
              src="/brand/siana-vital.png"
              alt="Logo SIANA Vital"
              width={80}
              height={80}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B3D91]">
              SIANA Vital
            </p>
            <h1 className="truncate text-lg font-black text-slate-900">
              {roleLabel}
            </h1>
          </div>
        </Link>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {menu.map((item) => {
            const isCurrent =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "block rounded-2xl px-4 py-3 text-sm font-bold transition",
                  isCurrent
                    ? "bg-[#0B3D91] text-white shadow-lg shadow-blue-950/15"
                    : "text-slate-600 hover:bg-blue-50 hover:text-[#0B3D91]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-[#f8fbff] p-4">
          <div className="flex items-center gap-3">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={userName}
                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D91] text-sm font-black text-white shadow-sm">
                {getInitials(userName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">
                {loading ? "Cargando..." : userName}
              </p>

              <p className="truncate text-xs font-semibold text-slate-500">
                {userEmail}
              </p>

              {assignedName ? (
                <p className="mt-0.5 truncate text-[11px] font-bold text-[#0B3D91]">
                  {assignedName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase text-[#0B3D91]">
              {userRole}
            </span>

            <span
              className={[
                "rounded-full px-3 py-1 text-[11px] font-black uppercase",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700",
              ].join(" ")}
            >
              {isActive ? "Sesión activa" : "Inactiva"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Cerrar sesión
          </button>
        </section>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Panel
              </p>

              <h2 className="truncate text-xl font-black text-slate-900">
                {roleLabel}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-[190px] truncate text-sm font-black text-slate-900">
                  {loading ? "Cargando..." : userName}
                </p>

                <p className="text-xs font-semibold text-slate-500">
                  {isActive ? "Sesión activa" : "Sesión inactiva"}
                </p>

                {assignedName ? (
                  <p className="max-w-[190px] truncate text-[11px] font-bold text-[#0B3D91]">
                    {assignedName}
                  </p>
                ) : null}
              </div>

              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B3D91] text-sm font-black text-white shadow-sm">
                  {getInitials(userName)}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-700 md:inline-flex"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbff] p-3">
            <div className="flex min-w-0 items-center gap-3">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="h-10 w-10 rounded-2xl object-cover ring-1 ring-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0B3D91] text-xs font-black text-white">
                  {getInitials(userName)}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  {loading ? "Cargando..." : userName}
                </p>

                <p className="truncate text-xs font-semibold text-slate-500">
                  {userRole} · {isActive ? "Activa" : "Inactiva"}
                </p>

                {assignedName ? (
                  <p className="truncate text-[11px] font-bold text-[#0B3D91]">
                    {assignedName}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-red-50 hover:text-red-700"
            >
              Salir
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {menu.map((item) => {
              const isCurrent =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "shrink-0 rounded-full px-4 py-2 text-xs font-black transition",
                    isCurrent
                      ? "bg-[#0B3D91] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#0B3D91]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}