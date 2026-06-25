"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { PhotoUploader } from "@/components/PhotoUploader";

type DistributorForm = {
  distributorCode: string;
  name: string;
  nit: string;
  city: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  status: "Activo" | "Inactivo";
};

type MsgType = "success" | "error" | "info";

const ROUTES = {
  configuracion: "/admin/configuracion",
  distribuidores: "/admin/distribuidores",
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeDistributorCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizePhoneCO(input: string) {
  const digits = (input || "").replace(/\D/g, "");

  if (!digits) return { ok: true, value: "", reason: "" };

  let ten = "";

  if (digits.length === 10) {
    ten = digits;
  } else if (digits.length === 12 && digits.startsWith("57")) {
    ten = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith("057")) {
    ten = digits.slice(3);
  } else {
    return {
      ok: false,
      value: "",
      reason:
        "El teléfono debe tener 10 dígitos o incluir el prefijo +57.",
    };
  }

  if (!ten.startsWith("3")) {
    return {
      ok: false,
      value: "",
      reason: "El celular debe iniciar por 3.",
    };
  }

  return { ok: true, value: `+57${ten}`, reason: "" };
}

function normalizeNit(nit: string) {
  return nit.trim().replace(/\s+/g, "");
}

async function compressImageToWebp(file: File): Promise<Blob> {
  const imageBitmap = await createImageBitmap(file);

  const maxSize = 900;
  const scale = Math.min(
    maxSize / imageBitmap.width,
    maxSize / imageBitmap.height,
    1
  );

  const width = Math.round(imageBitmap.width * scale);
  const height = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo procesar la imagen.");
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("No se pudo comprimir la imagen."));
        else resolve(blob);
      },
      "image/webp",
      0.82
    );
  });
}

export default function NuevoDistribuidorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<MsgType>("info");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [form, setForm] = useState<DistributorForm>({
    distributorCode: "",
    name: "",
    nit: "",
    city: "",
    address: "",
    contactName: "",
    email: "",
    phone: "",
    status: "Activo",
  });

  const colors = useMemo(
    () => ({
      blue: "bg-[#0B5ED7]",
      blueHover: "hover:bg-[#0A54C2]",
      orange: "bg-[#C86A2B]",
      softOrange: "bg-[#FFF4EC]",
      textOrange: "text-[#C86A2B]",
      muted: "text-black/55",
    }),
    []
  );

  const set = (k: keyof DistributorForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
  };

  function showMessage(type: MsgType, text: string) {
    setMsgType(type);
    setMsg(text);
  }

  async function existsDistributorCode(codeUpper: string) {
    const q = query(
      collection(db, "distributors"),
      where("distributorCode", "==", codeUpper),
      limit(1)
    );

    const snap = await getDocs(q);
    return !snap.empty;
  }

  async function uploadDistributorPhoto(distributorId: string, file: File) {
    const compressed = await compressImageToWebp(file);

    const storageRef = ref(
      storage,
      `distributors/${distributorId}/profile.webp`
    );

    await uploadBytes(storageRef, compressed, {
      contentType: "image/webp",
    });

    return await getDownloadURL(storageRef);
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    const name = form.name.trim();
    const code = normalizeDistributorCode(form.distributorCode);
    const email = form.email.trim().toLowerCase();

    if (!name) {
      return showMessage("info", "Ingresa el nombre del distribuidor.");
    }

    if (!code) {
      return showMessage("info", "Ingresa el código del distribuidor.");
    }

    if (email && !isValidEmail(email)) {
      return showMessage("info", "El correo no tiene un formato válido.");
    }

    const phoneNorm = normalizePhoneCO(form.phone);

    if (!phoneNorm.ok) {
      return showMessage("info", phoneNorm.reason);
    }

    setLoading(true);

    try {
      const codeExists = await existsDistributorCode(code);

      if (codeExists) {
        showMessage(
          "error",
          `El código ${code} ya está asignado a otro distribuidor.`
        );
        return;
      }

      const distributorRef = doc(collection(db, "distributors"));

      let photoUrl = "";

      if (photoFile) {
        photoUrl = await uploadDistributorPhoto(distributorRef.id, photoFile);
      }

      await setDoc(distributorRef, {
        distributorCode: code,
        name,
        nit: normalizeNit(form.nit) || "",
        city: form.city.trim() || "",
        address: form.address.trim() || "",
        contactName: form.contactName.trim() || "",
        email,
        phone: phoneNorm.value || "",
        status: form.status || "Activo",
        photoUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showMessage("success", "Distribuidor creado correctamente.");

      setTimeout(() => {
        router.push(ROUTES.distribuidores);
      }, 700);
    } catch (err: any) {
      console.error(err);

      const code = String(err?.code || "");

      if (code.includes("permission-denied")) {
        showMessage(
          "error",
          "No tienes permisos suficientes para guardar este distribuidor."
        );
      } else {
        showMessage(
          "error",
          "No se pudo guardar el distribuidor. Revisa la información e inténtalo nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/55 shadow-sm">
              SIANA VITAL • Distribuidores
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-black">
              Nuevo distribuidor
            </h1>

            <p className={`mt-1 max-w-2xl text-sm ${colors.muted}`}>
              Registra la información comercial, los datos de contacto y una
              imagen representativa del distribuidor.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={ROUTES.configuracion}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-sm font-extrabold shadow-sm hover:bg-black/5"
            >
              Configuración
            </Link>

            <Link
              href={ROUTES.distribuidores}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-sm font-extrabold shadow-sm hover:bg-black/5"
            >
              Ver distribuidores
            </Link>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="sticky top-6 space-y-5">
              <PhotoUploader
                label="Foto del distribuidor"
                required={false}
                valueFile={photoFile}
                valueUrl={null}
                onChangeFile={setPhotoFile}
                hint="Puedes subir un logo o una imagen representativa."
              />

              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl ${colors.softOrange} flex items-center justify-center`}>
                    <span className={`text-lg font-black ${colors.textOrange}`}>
                      ✓
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-black">Registro limpio</h2>
                    <p className="text-xs text-black/50">
                      Completa solo lo necesario para crear el distribuidor.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-black/65">
                  <div className="rounded-2xl bg-black/[0.03] p-3">
                    El código permite identificar rápidamente al distribuidor.
                  </div>

                  <div className="rounded-2xl bg-black/[0.03] p-3">
                    El teléfono se guarda en formato colombiano.
                  </div>

                  <div className="rounded-2xl bg-black/[0.03] p-3">
                    La foto aparecerá luego en el listado y en el perfil.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex flex-col gap-1 border-b border-black/10 pb-4">
                <h2 className="text-xl font-black">Información general</h2>
                <p className="text-sm text-black/50">
                  Los campos marcados con asterisco son obligatorios.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Código de distribuidor *"
                  hint="Ej: 92060"
                >
                  <input
                    className="input-clean"
                    value={form.distributorCode}
                    onChange={(e) => set("distributorCode", e.target.value)}
                    placeholder="Ej: 92060"
                    autoComplete="off"
                  />
                </Field>

                <Field
                  label="Nombre del distribuidor *"
                  hint="Razón social o nombre comercial"
                >
                  <input
                    className="input-clean"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ej: HEVENS VITAL"
                    autoComplete="organization"
                  />
                </Field>

                <Field label="NIT" hint="Opcional">
                  <input
                    className="input-clean"
                    value={form.nit}
                    onChange={(e) => set("nit", e.target.value)}
                    placeholder="Ej: 901234564"
                    autoComplete="off"
                  />
                </Field>

                <Field label="Ciudad" hint="Opcional">
                  <input
                    className="input-clean"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Ej: La Ceja"
                    autoComplete="address-level2"
                  />
                </Field>

                <Field label="Dirección" hint="Opcional">
                  <input
                    className="input-clean"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Ej: Calle 15B-31"
                    autoComplete="street-address"
                  />
                </Field>

                <Field label="Nombre de contacto" hint="Opcional">
                  <input
                    className="input-clean"
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="Ej: Steven Patiño"
                    autoComplete="name"
                  />
                </Field>

                <Field label="Correo" hint="Opcional">
                  <input
                    type="email"
                    className="input-clean"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="Ej: contacto@empresa.com"
                    autoComplete="email"
                  />
                </Field>

                <Field label="Teléfono" hint="Opcional">
                  <input
                    className="input-clean"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="Ej: 3009877650"
                    autoComplete="tel"
                  />
                </Field>

                <Field label="Estado" hint="Disponibilidad actual">
                  <select
                    className="input-clean"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value as any)}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </Field>
              </div>

              {msg && (
                <div
                  className={[
                    "mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold",
                    msgType === "success"
                      ? "border-green-200 bg-green-50 text-green-900"
                      : msgType === "error"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-900",
                  ].join(" ")}
                >
                  {msg}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
                <Link
                  href={ROUTES.distribuidores}
                  className="rounded-xl border border-black/10 bg-white px-5 py-3 text-center text-sm font-extrabold hover:bg-black/5"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className={[
                    "rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60",
                    colors.blue,
                    colors.blueHover,
                  ].join(" ")}
                >
                  {loading ? "Guardando..." : "Guardar distribuidor"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input-clean {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: white;
          padding: 0.7rem 0.8rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .input-clean:focus {
          border-color: #0b5ed7;
          box-shadow: 0 0 0 3px rgba(11, 94, 215, 0.1);
        }

        .input-clean::placeholder {
          color: rgba(0, 0, 0, 0.35);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="text-sm font-black text-black">{label}</div>
        {hint ? (
          <div className="text-right text-xs font-medium text-black/40">
            {hint}
          </div>
        ) : null}
      </div>

      {children}
    </label>
  );
}