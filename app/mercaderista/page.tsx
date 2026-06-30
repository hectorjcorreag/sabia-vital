"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";

function waitForAuthUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export default function MercaderistaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        setLoading(true);
        setAuthError("");

        const currentUser = auth.currentUser || (await waitForAuthUser());

        if (!mounted) return;

        if (!currentUser) {
          setAuthError("No hay sesión activa.");
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error("Error cargando sesión:", error);

        if (mounted) {
          setAuthError("No fue posible cargar la sesión.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Cargando módulo de mercaderista...
          </p>
        </div>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-500">
            Sesión no disponible
          </p>

          <h1 className="mt-3 text-2xl font-black text-red-700">
            No fue posible cargar el módulo
          </h1>

          <p className="mt-3 max-w-3xl text-red-600">
            {authError || "No hay sesión activa. Vuelve a iniciar sesión."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">
          Panel del mercaderista
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-900">
          Bienvenido al módulo de mercaderista
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          Desde aquí podrás gestionar referidos, llamadas, citas, rutas, visitas,
          evidencias y actividades en punto de venta.
        </p>

        <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-700">
            Sesión activa: {user.email || user.uid}
          </p>
        </div>
      </section>
    </div>
  );
}