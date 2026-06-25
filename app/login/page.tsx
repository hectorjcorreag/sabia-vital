"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { getDashboardRouteByRole } from "@/config/routes";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function getUserProfile(uid: string) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();

    return {
      role: userData.role || null,
      activo: userData.activo ?? true,
      estado: userData.estado || null,
      data: userData,
    };
  }

  async function handleLogin() {
    setErr("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErr("Escribe tu correo.");
      return;
    }

    if (!password) {
      setErr("Escribe tu contraseña.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const uid = credential.user.uid;
      const userProfile = await getUserProfile(uid);

      if (!userProfile) {
        setErr(
          "Tu usuario inició sesión, pero no tiene perfil asignado en la plataforma."
        );
        setLoading(false);
        return;
      }

      if (userProfile.activo === false || userProfile.estado === "inactivo") {
        setErr("Tu usuario está inactivo. Contacta al administrador.");
        setLoading(false);
        return;
      }

      const route = getDashboardRouteByRole(userProfile.role);

      if (route === "/pendiente") {
        router.push("/pendiente");
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("sv_user_welcome", "true");
        localStorage.setItem("sv_user_role", String(userProfile.role || ""));
        localStorage.setItem("sv_user_uid", uid);
      }

      router.push(route);
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String((error as { code?: string }).code)
          : "";

      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password")
      ) {
        setErr("Correo o contraseña incorrectos.");
      } else if (code.includes("auth/user-not-found")) {
        setErr("No existe una cuenta con ese correo.");
      } else if (code.includes("auth/invalid-email")) {
        setErr("El correo no es válido.");
      } else if (code.includes("permission-denied")) {
        setErr(
          "No tienes permisos para consultar tu perfil. Revisa las reglas de Firebase."
        );
      } else {
        setErr("No se pudo iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8fc] text-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#0B3D91]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[520px] w-[520px] rounded-full bg-[#0B3D91]/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f4f8fc] to-white" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-3">
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

          <div className="leading-tight">
            <p className="text-sm font-black text-slate-900">SIANA Vital</p>
            <p className="text-[11px] font-semibold text-slate-500">
              Acceso privado por roles
            </p>
          </div>
        </Link>

        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 sm:text-sm"
        >
          Volver
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-6xl items-center px-4 pb-12 sm:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0B3D91] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#0B3D91]" />
              Acceso seguro
            </div>

            <h1 className="mt-5 max-w-xl text-5xl font-black tracking-tight text-slate-950">
              Bienvenido a{" "}
              <span className="text-[#0B3D91]">SIANA Vital</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Ingresa para acceder al módulo correspondiente según tu rol:
              administrador, vendedor, distribuidor o mercaderista.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-900">
                Plataforma comercial multiusuario
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                El sistema validará tus permisos y te llevará automáticamente al
                panel que corresponde a tu perfil.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/brand/pues2.png"
                  alt="Logo PUES"
                  width={90}
                  height={90}
                  className="h-full w-full object-contain"
                />
              </div>

              <p className="text-xs font-bold leading-6 text-slate-400">
                Ecosistema PUES · Gestión comercial inteligente
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-blue-950/10 sm:p-8">
              <div className="mb-6 flex justify-center lg:hidden">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                  <Image
                    src="/brand/siana-vital.png"
                    alt="Logo SIANA Vital"
                    width={120}
                    height={120}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0B3D91]">
                Iniciar sesión
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Acceso a la plataforma
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ingresa tu correo y contraseña. El sistema abrirá el panel
                correspondiente a tu rol.
              </p>

              {err ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                  {err}
                </div>
              ) : null}

              <div className="mt-6 space-y-4">
                <Field label="Correo">
                  <input
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                    placeholder="correo@dominio.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                  />
                </Field>

                <Field label="Contraseña">
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleLogin();
                      }
                    }}
                  />
                </Field>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#0B3D91] px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-[#092f70] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                >
                  {loading ? "Validando acceso..." : "Ingresar"}
                </button>

                <p className="text-center text-xs font-semibold leading-6 text-slate-400">
                  © {new Date().getFullYear()} SIANA Vital · Acceso privado
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500 shadow-sm lg:hidden">
              <p className="font-black text-slate-800">Importante</p>
              <p className="mt-1">
                Si olvidaste tu contraseña, solicita apoyo al administrador de
                la plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}