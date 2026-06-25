"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { PhotoUploader } from "@/components/PhotoUploader";

type DocumentType = "CC" | "CE" | "TI" | "PASAPORTE";
type MerchandiserStatus = "Activo" | "Inactivo" | "Retirado";
type MsgType = "success" | "error" | "info";

type Merchandiser = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  documentType?: DocumentType | string;
  documentNumber?: string;
  birthDate?: string;

  photoUrl?: string;

  phone?: string;
  email?: string;
  city?: string;
  address?: string;

  eps?: string;
  arl?: string;
  pensionFund?: string;

  merchandiserCode?: string;
  status?: MerchandiserStatus | string;
  startDate?: string;
  endDate?: string;

  createdAt?: any;
  updatedAt?: any;
};

type MerchandiserForm = {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;

  photoUrl: string;

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

function safeDocumentType(value?: string): DocumentType {
  if (value === "CC" || value === "CE" || value === "TI" || value === "PASAPORTE") {
    return value;
  }

  return "CC";
}

function safeStatus(value?: string): MerchandiserStatus {
  if (value === "Activo" || value === "Inactivo" || value === "Retirado") {
    return value;
  }

  return "Activo";
}

function toTextDate(value?: string) {
  if (!value) return "—";

  try {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
  } catch {
    return value;
  }
}

function toTextTimestamp(ts: any) {
  try {
    if (!ts) return "—";

    const d = ts.toDate ? ts.toDate() : null;

    if (!d) return "—";

    return d.toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function getInitials(fullName?: string, firstName?: string, lastName?: string) {
  const name =
    fullName?.trim() ||
    `${firstName || ""} ${lastName || ""}`.trim() ||
    "M";

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getDisplayName(data?: Merchandiser | null) {
  if (!data) return "Mercaderista";

  return (
    data.fullName?.trim() ||
    `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
    "Mercaderista"
  );
}

function getStatusStyles(status?: string) {
  const value = String(status || "Activo").toLowerCase();

  if (value === "inactivo") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "retirado") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
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

export default function MercaderistaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<"view" | "edit">("view");

  const [data, setData] = useState<Merchandiser | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<MsgType>("info");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [ackDelete, setAckDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<MerchandiserForm>({
    firstName: "",
    lastName: "",
    documentType: "CC",
    documentNumber: "",
    birthDate: "",

    photoUrl: "",

    phone: "",
    email: "",
    city: "",
    address: "",

    eps: "",
    arl: "",
    pensionFund: "",

    merchandiserCode: "",
    status: "Activo",
    startDate: "",
    endDate: "",
  });

  const set = (key: keyof MerchandiserForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function showMessage(type: MsgType, text: string) {
    setMsgType(type);
    setMsg(text);
  }

  function fillForm(d: Merchandiser) {
    setForm({
      firstName: d.firstName || "",
      lastName: d.lastName || "",
      documentType: safeDocumentType(String(d.documentType || "CC")),
      documentNumber: d.documentNumber || "",
      birthDate: d.birthDate || "",

      photoUrl: d.photoUrl || "",

      phone: d.phone || "",
      email: d.email || "",
      city: d.city || "",
      address: d.address || "",

      eps: d.eps || "",
      arl: d.arl || "",
      pensionFund: d.pensionFund || "",

      merchandiserCode: d.merchandiserCode || "",
      status: safeStatus(String(d.status || "Activo")),
      startDate: d.startDate || "",
      endDate: d.endDate || "",
    });

    setPhotoFile(null);
  }

  async function loadMerchandiser() {
    if (!id) return;

    setLoading(true);
    setMsg(null);

    try {
      const refDoc = doc(db, "merchandisers", id);
      const snap = await getDoc(refDoc);

      if (!snap.exists()) {
        showMessage("error", "Este mercaderista no existe o fue eliminado.");

        setTimeout(() => {
          router.push(ROUTES.mercaderistas);
        }, 900);

        return;
      }

      const d = snap.data() as Merchandiser;

      setData(d);
      fillForm(d);
      setMode("view");
    } catch (error) {
      console.error(error);
      showMessage("error", "No se pudo cargar la información del mercaderista.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMerchandiser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = useMemo(() => {
    const firstName = cleanText(form.firstName);
    const lastName = cleanText(form.lastName);
    const documentNumber = normalizeDocumentNumber(form.documentNumber);
    const code = normalizeCode(form.merchandiserCode);
    const email = form.email.trim();

    if (!firstName) {
      return { ok: false, reason: "Ingresa los nombres del mercaderista." };
    }

    if (!lastName) {
      return { ok: false, reason: "Ingresa los apellidos del mercaderista." };
    }

    if (!documentNumber) {
      return { ok: false, reason: "Ingresa el número de documento." };
    }

    if (!code) {
      return { ok: false, reason: "Ingresa el código del mercaderista." };
    }

    if (email && !isValidEmail(email)) {
      return { ok: false, reason: "El correo no tiene un formato válido." };
    }

    const phoneNorm = normalizePhoneCO(form.phone);

    if (!phoneNorm.ok) {
      return { ok: false, reason: phoneNorm.reason };
    }

    if (form.status === "Retirado" && !form.endDate) {
      return {
        ok: false,
        reason: "Si el estado es Retirado, registra la fecha de retiro.",
      };
    }

    return { ok: true, reason: "" };
  }, [form]);

  async function codeInUse(code: string) {
    const qy = query(
      collection(db, "merchandisers"),
      where("merchandiserCode", "==", code),
      limit(1)
    );

    const snap = await getDocs(qy);

    if (snap.empty) return false;

    return snap.docs[0].id !== id;
  }

  async function documentInUse(documentNumber: string) {
    const qy = query(
      collection(db, "merchandisers"),
      where("documentNumber", "==", documentNumber),
      limit(1)
    );

    const snap = await getDocs(qy);

    if (snap.empty) return false;

    return snap.docs[0].id !== id;
  }

  async function uploadPhoto(file: File) {
    if (!id) return "";

    const compressedImage = await compressImageToWebp(file);

    const storageRef = ref(storage, `merchandisers/${id}/profile.webp`);

    await uploadBytes(storageRef, compressedImage, {
      contentType: "image/webp",
    });

    return await getDownloadURL(storageRef);
  }

  function cancelEdit() {
    if (data) {
      fillForm(data);
    }

    setMsg(null);
    setMode("view");
  }

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id) return;

    setMsg(null);

    if (!canSave.ok) {
      showMessage("info", canSave.reason);
      return;
    }

    const firstName = cleanText(form.firstName).toUpperCase();
    const lastName = cleanText(form.lastName).toUpperCase();
    const fullName = buildFullName(firstName, lastName);

    const documentNumber = normalizeDocumentNumber(form.documentNumber);
    const merchandiserCode = normalizeCode(form.merchandiserCode);
    const email = form.email.trim().toLowerCase();

    const phoneNorm = normalizePhoneCO(form.phone);

    setSaving(true);

    try {
      const duplicatedCode = await codeInUse(merchandiserCode);

      if (duplicatedCode) {
        showMessage(
          "error",
          `El código ${merchandiserCode} ya está asignado a otro mercaderista.`
        );
        return;
      }

      const duplicatedDocument = await documentInUse(documentNumber);

      if (duplicatedDocument) {
        showMessage(
          "error",
          `El documento ${documentNumber} ya está registrado en otro mercaderista.`
        );
        return;
      }

      let photoUrl = form.photoUrl || "";

      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      await updateDoc(doc(db, "merchandisers", id), {
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

        updatedAt: serverTimestamp(),
      });

      const updatedSnap = await getDoc(doc(db, "merchandisers", id));

      if (updatedSnap.exists()) {
        const updatedData = updatedSnap.data() as Merchandiser;

        setData(updatedData);
        fillForm(updatedData);
      }

      showMessage("success", "Cambios guardados correctamente.");
      setMode("view");
    } catch (error: any) {
      console.error(error);

      const errorCode = String(error?.code || "");

      if (errorCode.includes("permission-denied")) {
        showMessage(
          "error",
          "No tienes permisos suficientes para editar este mercaderista."
        );
      } else if (errorCode.includes("storage/unauthorized")) {
        showMessage(
          "error",
          "No tienes permisos suficientes para actualizar la imagen."
        );
      } else {
        showMessage(
          "error",
          "No se pudo guardar la información. Revisa los datos e inténtalo nuevamente."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  async function markInactive() {
    if (!id) return;

    setSaving(true);

    try {
      await updateDoc(doc(db, "merchandisers", id), {
        status: "Inactivo",
        updatedAt: serverTimestamp(),
      });

      showMessage("success", "El mercaderista quedó marcado como Inactivo.");
      setShowDelete(false);
      await loadMerchandiser();
    } catch (error) {
      console.error(error);
      showMessage("error", "No se pudo cambiar el estado del mercaderista.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!id) return;

    const okPhrase = deleteText.trim().toUpperCase() === "ELIMINAR";

    if (!ackDelete || !okPhrase) {
      showMessage(
        "info",
        "Marca la casilla y escribe ELIMINAR para confirmar."
      );
      return;
    }

    setDeleting(true);

    try {
      await deleteDoc(doc(db, "merchandisers", id));

      showMessage("success", "Mercaderista eliminado correctamente.");

      setTimeout(() => {
        router.push(ROUTES.mercaderistas);
      }, 700);
    } catch (error) {
      console.error(error);
      showMessage("error", "No se pudo eliminar el mercaderista.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            Cargando información...
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/60">
              No se encontró el mercaderista.
            </p>

            <Link
              href={ROUTES.mercaderistas}
              className="mt-4 inline-flex rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
            >
              Volver al listado
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(data);
  const photoUrl = data.photoUrl || "";
  const status = data.status || "Activo";

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/50 shadow-sm">
              SIANA VITAL • Mercaderistas
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-black">
              {displayName}
            </h1>

            <p className="mt-1 max-w-xl text-sm text-black/50">
              Consulta el perfil y actualiza la información cuando sea necesario.
            </p>
          </div>

          <Link
            href={ROUTES.mercaderistas}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-sm font-extrabold shadow-sm hover:bg-black/5"
          >
            Volver al listado
          </Link>
        </div>

        {msg && (
          <div
            className={[
              "mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold",
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-36 w-36 overflow-hidden rounded-3xl border border-black/10 bg-black/[0.04] shadow-sm">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black text-black/35">
                      {getInitials(data.fullName, data.firstName, data.lastName)}
                    </div>
                  )}
                </div>

                <h2 className="mt-4 text-xl font-black text-black">
                  {displayName}
                </h2>

                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex rounded-full bg-[#C86A2B]/10 px-3 py-1 text-xs font-black text-[#C86A2B]">
                    {data.merchandiserCode || "Sin código"}
                  </span>

                  <span
                    className={[
                      "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                      getStatusStyles(String(status)),
                    ].join(" ")}
                  >
                    {status}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <MiniInfo label="Documento" value={`${data.documentType || "CC"} ${data.documentNumber || "—"}`} />
                <MiniInfo label="Teléfono" value={data.phone || "—"} />
                <MiniInfo label="Correo" value={data.email || "—"} />
                <MiniInfo label="Ciudad" value={data.city || "—"} />
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {mode === "view" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMsg(null);
                      setMode("edit");
                    }}
                    className="rounded-xl bg-[#0B5ED7] px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A54C2]"
                  >
                    Editar información
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold hover:bg-black/5 disabled:opacity-60"
                  >
                    Cancelar edición
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMsg(null);
                    setShowDelete(true);
                    setDeleteText("");
                    setAckDelete(false);
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
                >
                  Desactivar o eliminar
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-[#F7F8FA] p-4 text-xs text-black/45">
                Última actualización: {toTextTimestamp(data.updatedAt)}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8">
            {mode === "view" ? (
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
                <SimpleSection title="Datos personales">
                  <div className="grid gap-3">
                    <ReadRow label="Nombres" value={data.firstName || "—"} />
                    <ReadRow label="Apellidos" value={data.lastName || "—"} />
                    <ReadRow label="Nombre completo" value={data.fullName || displayName} />
                    <ReadRow label="Tipo de documento" value={String(data.documentType || "CC")} />
                    <ReadRow label="Número de documento" value={data.documentNumber || "—"} />
                    <ReadRow label="Fecha de nacimiento" value={toTextDate(data.birthDate)} />
                    <ReadRow label="Código de mercaderista" value={data.merchandiserCode || "—"} />
                  </div>
                </SimpleSection>

                <SimpleSection title="Contacto">
                  <div className="grid gap-3">
                    <ReadRow label="Teléfono" value={data.phone || "—"} />
                    <ReadRow label="Correo" value={data.email || "—"} />
                    <ReadRow label="Ciudad" value={data.city || "—"} />
                    <ReadRow label="Dirección" value={data.address || "—"} />
                  </div>
                </SimpleSection>

                <SimpleSection title="Seguridad social">
                  <div className="grid gap-3">
                    <ReadRow label="EPS" value={data.eps || "—"} />
                    <ReadRow label="ARL" value={data.arl || "—"} />
                    <ReadRow label="Fondo de pensión" value={data.pensionFund || "—"} />
                  </div>
                </SimpleSection>

                <SimpleSection title="Estado laboral">
                  <div className="grid gap-3">
                    <ReadRow label="Estado" value={String(data.status || "Activo")} />
                    <ReadRow label="Fecha de inicio" value={toTextDate(data.startDate)} />
                    <ReadRow label="Fecha de retiro" value={toTextDate(data.endDate)} />
                    <ReadRow label="Creado" value={toTextTimestamp(data.createdAt)} />
                    <ReadRow label="Actualizado" value={toTextTimestamp(data.updatedAt)} />
                  </div>
                </SimpleSection>
              </div>
            ) : (
              <form
                onSubmit={onSave}
                className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6"
              >
                <SimpleSection title="Foto">
                  <PhotoUploader
                    label="Foto del mercaderista"
                    required={false}
                    valueFile={photoFile}
                    valueUrl={form.photoUrl || null}
                    onChangeFile={setPhotoFile}
                    hint="Puedes conservar la foto actual o seleccionar una nueva."
                  />
                </SimpleSection>

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

                {!canSave.ok && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    {canSave.reason}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-extrabold hover:bg-black/5 disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#0B5ED7] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A54C2] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-black">
                  Desactivar o eliminar
                </h3>

                <p className="mt-1 text-sm text-black/60">
                  Para conservar la información histórica, se recomienda marcar
                  el mercaderista como inactivo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm font-extrabold hover:bg-black/5"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-black/65">
              Si decides eliminarlo definitivamente, esta acción no se puede
              deshacer desde esta pantalla.
            </div>

            <div className="mt-4 flex items-start gap-2">
              <input
                id="ackDelete"
                type="checkbox"
                checked={ackDelete}
                onChange={(e) => setAckDelete(e.target.checked)}
                className="mt-1"
              />

              <label htmlFor="ackDelete" className="text-sm text-black/65">
                Entiendo que eliminar el mercaderista puede afectar consultas o
                registros relacionados.
              </label>
            </div>

            <div className="mt-4">
              <label className="text-sm font-black text-black">
                Escribe ELIMINAR para confirmar
              </label>

              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="input-clean mt-2"
                placeholder="ELIMINAR"
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={saving || deleting}
                onClick={markInactive}
                className="rounded-xl bg-[#0B5ED7] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#0A54C2] disabled:opacity-60"
              >
                {saving ? "Procesando..." : "Marcar como Inactivo"}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

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

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-12 gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
      <div className="col-span-12 text-xs font-black uppercase tracking-wide text-black/40 md:col-span-4">
        {label}
      </div>

      <div className="col-span-12 break-words text-sm font-semibold text-black/75 md:col-span-8">
        {value}
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] px-4 py-3">
      <div className="text-xs font-black uppercase tracking-wide text-black/40">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-semibold text-black/75">
        {value}
      </div>
    </div>
  );
}