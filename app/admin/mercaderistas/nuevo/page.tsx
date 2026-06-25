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

type DocumentType = "CC" | "CE" | "TI" | "PASAPORTE";
type MerchandiserStatus = "Activo" | "Inactivo" | "Retirado";
type MsgType = "success" | "error" | "info";

type MerchandiserForm = {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  eps: string;
  arl: string;
  pensionFund: string;
  merchandiserCode: string;
  status: MerchandiserStatus;
  startDate: string;
  endDate: string;
};

const ROUTES = {
  mercaderistas: "/admin/mercaderistas",
  panelAdmin: "/admin",
};

const DOCUMENT_TYPES: DocumentType[] = ["CC", "CE", "TI", "PASAPORTE"];
const STATUS_OPTIONS: MerchandiserStatus[] = ["Activo", "Inactivo", "Retirado"];

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildFullName(firstName: string, lastName: string) {
  return `${cleanText(firstName)} ${cleanText(lastName)}`.trim();
}

function normalizeCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeDocumentNumber(value: string) {
  return value.trim().replace(/\D/g, "");
}

function normalizeSingleText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhoneCO(input: string) {
  const digits = (input || "").replace(/\D/g, "");

  if (!digits) {
    return { ok: true, value: "", reason: "" };
  }

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
      reason: "El teléfono debe tener 10 dígitos o incluir el prefijo +57.",
    };
  }

  if (!ten.startsWith("3")) {
    return {
      ok: false,
      value: "",
      reason: "El celular debe iniciar por 3.",
    };
  }

  return {
    ok: true,
    value: `+57${ten}`,
    reason: "",
  };
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
    throw new Error("No se pudo preparar la imagen.");
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("No se pudo preparar la imagen."));
        else resolve(blob);
      },
      "image/webp",
      0.82
    );
  });
}

export default function NuevoMercaderistaPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<MsgType>("info");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const today = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const [form, setForm] = useState<MerchandiserForm>({
    firstName: "",
    lastName: "",
    documentType: "CC",
    documentNumber: "",
    birthDate: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    eps: "",
    arl: "",
    pensionFund: "",
    merchandiserCode: "",
    status: "Activo",
    startDate: today,
    endDate: "",
  });

  const set = (key: keyof MerchandiserForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function showMessage(type: MsgType, text: string) {
    setMsgType(type);
    setMsg(text);
  }

  async function existsByCode(code: string) {
    const qy = query(
      collection(db, "merchandisers"),
      where("merchandiserCode", "==", code),
      limit(1)
    );

    const snap = await getDocs(qy);
    return !snap.empty;
  }

  async function existsByDocument(documentNumber: string) {
    const qy = query(
      collection(db, "merchandisers"),
      where("documentNumber", "==", documentNumber),
      limit(1)
    );

    const snap = await getDocs(qy);
    return !snap.empty;
  }

  async function uploadPhoto(merchandiserId: string, file: File) {
    const compressedImage = await compressImageToWebp(file);

    const storageRef = ref(
      storage,
      `merchandisers/${merchandiserId}/profile.webp`
    );

    await uploadBytes(storageRef, compressedImage, {
      contentType: "image/webp",
    });

    return await getDownloadURL(storageRef);
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    const firstName = cleanText(form.firstName).toUpperCase();
    const lastName = cleanText(form.lastName).toUpperCase();
    const fullName = buildFullName(firstName, lastName);

    const documentNumber = normalizeDocumentNumber(form.documentNumber);
    const merchandiserCode = normalizeCode(form.merchandiserCode);
    const email = form.email.trim().toLowerCase();

    if (!firstName) {
      return showMessage("info", "Ingresa los nombres del mercaderista.");
    }

    if (!lastName) {
      return showMessage("info", "Ingresa los apellidos del mercaderista.");
    }

    if (!documentNumber) {
      return showMessage("info", "Ingresa el número de documento.");
    }

    if (!merchandiserCode) {
      return showMessage("info", "Ingresa el código del mercaderista.");
    }

    if (email && !isValidEmail(email)) {
      return showMessage("info", "El correo no tiene un formato válido.");
    }

    const phoneNorm = normalizePhoneCO(form.phone);

    if (!phoneNorm.ok) {
      return showMessage("info", phoneNorm.reason);
    }

    if (form.status === "Retirado" && !form.endDate) {
      return showMessage(
        "info",
        "Si el estado es Retirado, registra la fecha de retiro."
      );
    }

    setLoading(true);

    try {
      const codeExists = await existsByCode(merchandiserCode);

      if (codeExists) {
        showMessage(
          "error",
          `El código ${merchandiserCode} ya está asignado a otro mercaderista.`
        );
        return;
      }

      const documentExists = await existsByDocument(documentNumber);

      if (documentExists) {
        showMessage(
          "error",
          `El documento ${documentNumber} ya está registrado.`
        );
        return;
      }

      const merchandiserRef = doc(collection(db, "merchandisers"));

      let photoUrl = "";

      if (photoFile) {
        photoUrl = await uploadPhoto(merchandiserRef.id, photoFile);
      }

      await setDoc(merchandiserRef, {
        firstName,
        lastName,
        fullName,
        documentType: form.documentType,
        documentNumber,
        birthDate: form.birthDate || "",

        photoUrl,

        phone: phoneNorm.value || "",
        email,
        city: cleanText(form.city).toUpperCase(),
        address: cleanText(form.address).toUpperCase(),

        eps: normalizeSingleText(form.eps).toUpperCase(),
        arl: normalizeSingleText(form.arl).toUpperCase(),
        pensionFund: normalizeSingleText(form.pensionFund).toUpperCase(),

        merchandiserCode,
        status: form.status,
        startDate: form.startDate || "",
        endDate: form.status === "Retirado" ? form.endDate || "" : "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showMessage("success", "Mercaderista creado correctamente.");

      setTimeout(() => {
        router.push(ROUTES.mercaderistas);
      }, 700);
    } catch (error: any) {
      console.error(error);

      const errorCode = String(error?.code || "");

      if (errorCode.includes("permission-denied")) {
        showMessage(
          "error",
          "No tienes permisos suficientes para crear este mercaderista."
        );
      } else if (errorCode.includes("storage/unauthorized")) {
        showMessage(
          "error",
          "No tienes permisos suficientes para subir la imagen."
        );
      } else {
        showMessage(
          "error",
          "No se pudo guardar el mercaderista. Revisa la información e inténtalo nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/50 shadow-sm">
              SIANA VITAL • Mercaderistas
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-black">
              Nuevo mercaderista
            </h1>

            <p className="mt-1 max-w-xl text-sm text-black/50">
              Completa los datos principales para crear el perfil.
            </p>
          </div>

          <Link
            href={ROUTES.mercaderistas}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-sm font-extrabold shadow-sm hover:bg-black/5"
          >
            Volver al listado
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-5 lg:grid-cols-12"
        >
          <aside className="lg:col-span-4">
            <div className="sticky top-6 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <PhotoUploader
                label="Foto del mercaderista"
                required={false}
                valueFile={photoFile}
                valueUrl={null}
                onChangeFile={setPhotoFile}
                hint="Agrega una foto clara para identificarlo fácilmente."
              />

              <div className="mt-5 rounded-2xl bg-[#F7F8FA] p-4">
                <div className="text-sm font-black text-black">
                  Perfil del equipo
                </div>

                <p className="mt-1 text-sm leading-relaxed text-black/50">
                  Esta imagen aparecerá en el listado y en el perfil del
                  mercaderista.
                </p>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
              <SimpleSection title="Datos personales">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nombres *">
                    <input
                      className="input-clean"
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      placeholder="Nombres"
                      autoComplete="given-name"
                    />
                  </Field>

                  <Field label="Apellidos *">
                    <input
                      className="input-clean"
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      placeholder="Apellidos"
                      autoComplete="family-name"
                    />
                  </Field>

                  <Field label="Tipo de documento *">
                    <select
                      className="input-clean"
                      value={form.documentType}
                      onChange={(e) =>
                        set("documentType", e.target.value as DocumentType)
                      }
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Número de documento *">
                    <input
                      className="input-clean"
                      value={form.documentNumber}
                      onChange={(e) => set("documentNumber", e.target.value)}
                      placeholder="Ej: 1037597377"
                      autoComplete="off"
                    />
                  </Field>

                  <Field label="Fecha de nacimiento">
                    <input
                      type="date"
                      className="input-clean"
                      value={form.birthDate}
                      onChange={(e) => set("birthDate", e.target.value)}
                    />
                  </Field>

                  <Field label="Código de mercaderista *">
                    <input
                      className="input-clean"
                      value={form.merchandiserCode}
                      onChange={(e) => set("merchandiserCode", e.target.value)}
                      placeholder="Ej: MER-001"
                      autoComplete="off"
                    />
                  </Field>
                </div>
              </SimpleSection>

              <SimpleSection title="Contacto">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Teléfono">
                    <input
                      className="input-clean"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="Ej: 3009877650"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field label="Correo">
                    <input
                      type="email"
                      className="input-clean"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="correo@empresa.com"
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Ciudad">
                    <input
                      className="input-clean"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Ciudad"
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field label="Dirección">
                    <input
                      className="input-clean"
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Dirección"
                      autoComplete="street-address"
                    />
                  </Field>
                </div>
              </SimpleSection>

              <SimpleSection title="Seguridad social">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="EPS">
                    <input
                      className="input-clean"
                      value={form.eps}
                      onChange={(e) => set("eps", e.target.value)}
                      placeholder="EPS"
                    />
                  </Field>

                  <Field label="ARL">
                    <input
                      className="input-clean"
                      value={form.arl}
                      onChange={(e) => set("arl", e.target.value)}
                      placeholder="ARL"
                    />
                  </Field>

                  <Field label="Fondo de pensión">
                    <input
                      className="input-clean"
                      value={form.pensionFund}
                      onChange={(e) => set("pensionFund", e.target.value)}
                      placeholder="Pensión"
                    />
                  </Field>
                </div>
              </SimpleSection>

              <SimpleSection title="Estado">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Estado">
                    <select
                      className="input-clean"
                      value={form.status}
                      onChange={(e) =>
                        set("status", e.target.value as MerchandiserStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Fecha de inicio">
                    <input
                      type="date"
                      className="input-clean"
                      value={form.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                    />
                  </Field>

                  <Field label="Fecha de retiro">
                    <input
                      type="date"
                      className="input-clean"
                      value={form.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                      disabled={form.status !== "Retirado"}
                    />
                  </Field>
                </div>
              </SimpleSection>

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
                  href={ROUTES.mercaderistas}
                  className="rounded-xl border border-black/10 bg-white px-5 py-3 text-center text-sm font-extrabold hover:bg-black/5"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[#0B5ED7] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A54C2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Guardar mercaderista"}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>

      <style jsx global>{`
        .input-clean {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: white;
          padding: 0.72rem 0.85rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            background-color 0.15s ease;
        }

        .input-clean:focus {
          border-color: #0b5ed7;
          box-shadow: 0 0 0 3px rgba(11, 94, 215, 0.1);
        }

        .input-clean::placeholder {
          color: rgba(0, 0, 0, 0.35);
        }

        .input-clean:disabled {
          cursor: not-allowed;
          background: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.45);
        }
      `}</style>
    </div>
  );
}

function SimpleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-black/10 py-5 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="mb-4 text-base font-black text-black">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-black text-black/75">{label}</div>
      {children}
    </label>
  );
}