"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Role = "pending" | "admin" | "seller" | "coordinator" | "viewer";
type Status = "active" | "pending" | "inactive";

function firebaseAuthErrorES(err: any): string {
  const code = String(err?.code || "");
  switch (code) {
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado. Usa otro correo o envía un restablecimiento de contraseña.";
    case "auth/invalid-email":
      return "El correo no tiene un formato válido. Revisa e inténtalo de nuevo.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Debe tener mínimo 6 caracteres (recomendado: 8 o más).";
    case "auth/operation-not-allowed":
      return "La creación de usuarios por correo/contraseña no está habilitada en Firebase.";
    case "auth/network-request-failed":
      return "Falló la conexión a internet. Verifica tu red e inténtalo nuevamente.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
    case "auth/internal-error":
      return "Ocurrió un error interno. Intenta de nuevo en unos segundos.";
    default:
      return err?.message
        ? `No se pudo completar la acción. (${code || "error"})`
        : "No se pudo completar la acción. Intenta nuevamente.";
  }
}

export default function RegistroPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");

  const firebaseConfig = useMemo(
    () => ({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    }),
    []
  );

  function getSecondaryAuth() {
    const name = "secondaryAuthApp";
    const existing = getApps().find((a) => a.name === name);
    const app2 = existing ?? initializeApp(firebaseConfig, name);
    return getAuth(app2);
  }

  async function ensureAdmin(uid: string) {
    const q = query(collection(db, "users"), where("uid", "==", uid), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return false;

    const data = snap.docs[0].data() as any;
    const role = String(data.role || "").toLowerCase();
    const status = String(data.status || "").toLowerCase();
    return role === "admin" && status !== "inactive";
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.replace("/login");
          return;
        }
        const ok = await ensureAdmin(user.uid);
        setIsAdmin(ok);
        if (!ok) router.replace("/dashboard");
      } catch (e) {
        console.error(e);
        router.replace("/dashboard");
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function createUserDoc(params: {
    uid: string;
    email: string;
    displayName: string;
    role: Role;
    status: Status;
  }) {
    // Si ya existe por uid, no creamos duplicado
    const q1 = query(collection(db, "users"), where("uid", "==", params.uid), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return;

    await addDoc(collection(db, "users"), {
      uid: params.uid,
      email: params.email,
      displayName: params.displayName,
      role: params.role,
      status: params.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  function showMessage(type: "success" | "error" | "info", text: string) {
    setMsgType(type);
    setMsg(text);
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!isAdmin) return;

    const name = displayName.trim();
    const mail = email.trim().toLowerCase();
    const pass = password;

    if (!name) return showMessage("info", "Falta el nombre completo.");
    if (!mail) return showMessage("info", "Falta el correo.");
    if (!pass || pass.length < 6)
      return showMessage("info", "La contraseña debe tener mínimo 6 caracteres.");

    setLoadingCreate(true);

    try {
      const secondaryAuth = getSecondaryAuth();

      // ✅ Crea el usuario sin tocar la sesión principal
      const cred = await createUserWithEmailAndPassword(secondaryAuth, mail, pass);
      await updateProfile(cred.user, { displayName: name });

      await createUserDoc({
        uid: cred.user.uid,
        email: mail,
        displayName: name,
        role: "pending",
        status: "active",
      });

      // ✅ Cierra SOLO la sesión del auth secundario
      await signOut(secondaryAuth);

      setDisplayName("");
      setEmail("");
      setPassword("");

      showMessage(
        "success",
        "✅ Usuario creado. Quedó con rol 'pending'. Puedes asignarle rol desde Configuración → Usuarios."
      );

      // opcional: devolver al listado
      setTimeout(() => router.push("/dashboard/admin/configuracion/usuarios"), 900);
    } catch (err: any) {
      console.error(err);
      showMessage("error", firebaseAuthErrorES(err));
    } finally {
      setLoadingCreate(false);
    }
  }

  async function enviarReset() {
    setMsg(null);
    const mail = email.trim().toLowerCase();
    if (!mail) return showMessage("info", "Escribe el correo para enviar el restablecimiento.");

    setLoadingReset(true);
    try {
      await sendPasswordResetEmail(auth, mail);
      showMessage(
        "success",
        "📩 Listo: se envió el correo para restablecer la contraseña. (Revisa bandeja de entrada y spam)"
      );
    } catch (err: any) {
      console.error(err);
      const code = String(err?.code || "");
      if (code === "auth/user-not-found") {
        showMessage("error", "Ese correo no está registrado. Verifica el correo o crea el usuario primero.");
      } else {
        showMessage("error", firebaseAuthErrorES(err));
      }
    } finally {
      setLoadingReset(false);
    }
  }

  if (checking) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          Verificando permisos...
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-extrabold text-black/60">
            Administración • Usuarios
          </div>
          <h1 className="text-3xl font-black mt-2">Registro de usuario</h1>
          <p className="text-sm text-black/60 mt-1">
            Crea usuarios sin perder tu sesión de administrador y envía restablecimiento de contraseña sin APIs.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/admin/configuracion"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            ← Configuración
          </Link>

          <Link
            href="/dashboard/admin/configuracion/usuarios"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            Ver usuarios
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Formulario */}
        <div className="lg:col-span-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">Crear nuevo usuario</h2>
            <span className="text-xs rounded-full bg-black/5 px-3 py-1 font-bold text-black/60">
              Rol inicial: pending
            </span>
          </div>

          <form onSubmit={crearUsuario} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-black/60">Nombre completo</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                placeholder="Ej: Juan David Pérez"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-black/60">Correo</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                placeholder="usuario@correo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-black/45 mt-1">
                Tip: si el correo ya existe, usa el botón <b>Enviar restablecimiento</b>.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-black/60">Contraseña inicial</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                placeholder="Mínimo 6 caracteres"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                disabled={loadingCreate || loadingReset}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-extrabold hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingCreate ? "Creando..." : "Crear usuario"}
              </button>

              <button
                type="button"
                onClick={enviarReset}
                disabled={loadingCreate || loadingReset}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5 disabled:opacity-60"
              >
                {loadingReset ? "Enviando..." : "Enviar restablecimiento"}
              </button>
            </div>

            {msg && (
              <div
                className={[
                  "mt-3 rounded-xl border px-3 py-2 text-sm",
                  msgType === "success"
                    ? "border-green-200 bg-green-50 text-green-900"
                    : msgType === "error"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-black/10 bg-black/5 text-black/70",
                ].join(" ")}
              >
                {msg}
              </div>
            )}
          </form>
        </div>

        {/* Panel lateral de ayuda */}
        <div className="lg:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black mb-2">Guía rápida</h3>

          <div className="space-y-3 text-sm text-black/70">
            <div className="rounded-xl border border-black/10 bg-white p-3">
              <div className="font-extrabold mb-1">✅ No te saca de la sesión</div>
              <p>
                Creamos usuarios con un <b>Auth secundario</b>, así tu sesión de admin no cambia.
              </p>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-3">
              <div className="font-extrabold mb-1">🔐 Restablecer contraseña (sin APIs)</div>
              <p>
                El botón <b>Enviar restablecimiento</b> manda el correo oficial de Firebase.
              </p>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-3">
              <div className="font-extrabold mb-1">👤 Rol inicial</div>
              <p>
                El usuario queda en <b>pending</b>. Luego lo asignas en <b>Configuración → Usuarios</b>.
              </p>
            </div>

            <div className="text-xs text-black/50">
              Si al crear te aparece “correo ya registrado”, no es un fallo: significa que ya existe ese usuario en
              Firebase Auth.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}