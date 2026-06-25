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

type MsgType = "success" | "error" | "info";

type Distributor = {
  distributorCode?: string;
  name?: string;
  nit?: string;
  city?: string;
  address?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status?: "Activo" | "Inactivo" | string;
  photoUrl?: string;
  createdAt?: any;
  updatedAt?: any;
};

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
  photoUrl: string;
};

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

function normalizeNit(nit: string) {
  return nit.trim().replace(/\s+/g, "");
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

  return { ok: true, value: `+57${ten}`, reason: "" };
}

function toText(ts: any) {
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

function getInitials(name?: string) {
  if (!name) return "D";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

export default function DistribuidorDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [data, setData] = useState<Distributor | null>(null);
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
    photoUrl: "",
  });

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<MsgType>("info");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [ackDelete, setAckDelete] = useState(false);

  const set = (key: keyof DistributorForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function showMessage(type: MsgType, text: string) {
    setMsgType(type);
    setMsg(text);
  }

  function fillForm(d: Distributor) {
    setForm({
      distributorCode: d.distributorCode ?? "",
      name: d.name ?? "",
      nit: d.nit ?? "",
      city: d.city ?? "",
      address: d.address ?? "",
      contactName: d.contactName ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
      status: (d.status as "Activo" | "Inactivo") ?? "Activo",
      photoUrl: d.photoUrl ?? "",
    });

    setPhotoFile(null);
  }

  async function loadDistributor() {
    if (!id) return;

    setLoading(true);

    try {
      const refDoc = doc(db, "distributors", id);
      const snap = await getDoc(refDoc);

      if (!snap.exists()) {
        showMessage("error", "Este distribuidor no existe o fue eliminado.");

        setTimeout(() => {
          router.push(ROUTES.distribuidores);
        }, 900);

        return;
      }

      const d = snap.data() as Distributor;

      setData(d);
      fillForm(d);
      setMode("view");
    } catch (error) {
      console.error(error);
      showMessage("error", "No se pudo cargar la información del distribuidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDistributor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = useMemo(() => {
    const code = normalizeDistributorCode(form.distributorCode);
    const name = form.name.trim();

    if (!name) {
      return { ok: false, reason: "Ingresa el nombre del distribuidor." };
    }

    if (!code) {
      return { ok: false, reason: "Ingresa el código del distribuidor." };
    }

    const email = form.email.trim();

    if (email && !isValidEmail(email)) {
      return { ok: false, reason: "El correo no tiene un formato válido." };
    }

    const phoneNorm = normalizePhoneCO(form.phone);

    if (!phoneNorm.ok) {
      return { ok: false, reason: phoneNorm.reason };
    }

    return { ok: true, reason: "" };
  }, [form]);

  async function distributorCodeInUse(code: string) {
    const qy = query(
      collection(db, "distributors"),
      where("distributorCode", "==", code),
      limit(1)
    );

    const snap = await getDocs(qy);

    if (snap.empty) return false;

    return snap.docs[0].id !== id;
  }

  async function uploadDistributorPhoto(file: File) {
    if (!id) return "";

    const compressedImage = await compressImageToWebp(file);

    const storageRef = ref(storage, `distributors/${id}/profile.webp`);

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

    const code = normalizeDistributorCode(form.distributorCode);
    const phoneNorm = normalizePhoneCO(form.phone);

    setSaving(true);

    try {
      const codeExists = await distributorCodeInUse(code);

      if (codeExists) {
        showMessage(
          "error",
          `El código ${code} ya está asignado a otro distribuidor.`
        );
        return;
      }

      let photoUrl = form.photoUrl || "";

      if (photoFile) {
        photoUrl = await uploadDistributorPhoto(photoFile);
      }

      await updateDoc(doc(db, "distributors", id), {
        distributorCode: code,
        name: form.name.trim(),
        nit: normalizeNit(form.nit),
        city: form.city.trim(),
        address: form.address.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: phoneNorm.value,
        status: form.status || "Activo",
        photoUrl,
        updatedAt: serverTimestamp(),
      });

      showMessage("success", "Cambios guardados correctamente.");

      const updatedSnap = await getDoc(doc(db, "distributors", id));

      if (updatedSnap.exists()) {
        const updatedData = updatedSnap.data() as Distributor;
        setData(updatedData);
        fillForm(updatedData);
      }

      setMode("view");
    } catch (error: any) {
      console.error(error);

      const errorCode = String(error?.code || "");

      if (errorCode.includes("permission-denied")) {
        showMessage(
          "error",
          "No tienes permisos suficientes para editar este distribuidor."
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
      await updateDoc(doc(db, "distributors", id), {
        status: "Inactivo",
        updatedAt: serverTimestamp(),
      });

      showMessage("success", "El distribuidor quedó marcado como Inactivo.");
      setShowDelete(false);
      await loadDistributor();
    } catch (error) {
      console.error(error);
      showMessage("error", "No se pudo cambiar el estado del distribuidor.");
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
      await deleteDoc(doc(db, "distributors", id));

      showMessage("success", "Distribuidor eliminado correctamente.");

      setTimeout(() => {
        router.push(ROUTES.distribuidores);
      }, 700);
    } catch (error) {
      console.error(error);
      showMessage("error", "No se pudo eliminar el distribuidor.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            Cargando información...
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-sm text-black/60">
              No se encontró el distribuidor.
            </p>

            <Link
              href={ROUTES.distribuidores}
              className="mt-4 inline-flex rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
            >
              Volver al listado
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusLower = String(data.status || "Activo").toLowerCase();
  const photoUrl = data.photoUrl || "";
  const title = data.name || "Detalle del distribuidor";

  return (
    <div className="min-h-screen bg-[#F6F7FB] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/55 shadow-sm">
              SIANA VITAL • Distribuidores
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-black">
              {title}
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-black/55">
              Consulta la información del distribuidor y actualiza sus datos
              cuando sea necesario.
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
          <div className="lg:col-span-4">
            <div className="sticky top-6 space-y-5">
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="h-36 w-36 overflow-hidden rounded-3xl border border-black/10 bg-black/[0.04] shadow-sm">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={data.name || "Foto del distribuidor"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-black/35">
                        {getInitials(data.name)}
                      </div>
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-black text-black">
                    {data.name || "Distribuidor"}
                  </h2>

                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#C86A2B]/10 px-3 py-1 text-xs font-black text-[#C86A2B]">
                      {data.distributorCode || "Sin código"}
                    </span>

                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
                        statusLower === "inactivo"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-green-200 bg-green-50 text-green-700",
                      ].join(" ")}
                    >
                      {data.status || "Activo"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 text-sm">
                  <MiniInfo label="Contacto" value={data.contactName || "—"} />
                  <MiniInfo label="Ciudad" value={data.city || "—"} />
                  <MiniInfo label="Teléfono" value={data.phone || "—"} />
                  <MiniInfo label="Correo" value={data.email || "—"} />
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                <h3 className="text-base font-black text-black">
                  Control del registro
                </h3>

                <div className="mt-4 space-y-3 text-sm">
                  <MiniInfo label="Creado" value={toText(data.createdAt)} />
                  <MiniInfo label="Actualizado" value={toText(data.updatedAt)} />
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
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {mode === "view" ? (
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 border-b border-black/10 pb-4">
                  <h2 className="text-xl font-black text-black">
                    Información del distribuidor
                  </h2>

                  <p className="mt-1 text-sm text-black/50">
                    Datos registrados actualmente en la plataforma.
                  </p>
                </div>

                <div className="grid gap-3">
                  <ReadRow label="Código de distribuidor" value={data.distributorCode || "—"} />
                  <ReadRow label="Nombre" value={data.name || "—"} />
                  <ReadRow label="NIT" value={data.nit || "—"} />
                  <ReadRow label="Ciudad" value={data.city || "—"} />
                  <ReadRow label="Dirección" value={data.address || "—"} />
                  <ReadRow label="Nombre de contacto" value={data.contactName || "—"} />
                  <ReadRow label="Correo" value={data.email || "—"} />
                  <ReadRow label="Teléfono" value={data.phone || "—"} />
                  <ReadRow label="Estado" value={data.status || "Activo"} />
                </div>
              </div>
            ) : (
              <form
                onSubmit={onSave}
                className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6"
              >
                <div className="mb-5 border-b border-black/10 pb-4">
                  <h2 className="text-xl font-black text-black">
                    Editar distribuidor
                  </h2>

                  <p className="mt-1 text-sm text-black/50">
                    Actualiza la información y guarda los cambios.
                  </p>
                </div>

                <div className="mb-6">
                  <PhotoUploader
                    label="Foto del distribuidor"
                    required={false}
                    valueFile={photoFile}
                    valueUrl={form.photoUrl || null}
                    onChangeFile={setPhotoFile}
                    hint="Puedes conservar la imagen actual o seleccionar una nueva."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Código de distribuidor *" hint="Ej: 92060">
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
                      onChange={(e) =>
                        set("status", e.target.value as "Activo" | "Inactivo")
                      }
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </Field>
                </div>

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
          </div>
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
                  el distribuidor como inactivo.
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
                Entiendo que eliminar el distribuidor puede afectar consultas o
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

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-12 gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
      <div className="col-span-12 text-xs font-black uppercase tracking-wide text-black/45 md:col-span-4">
        {label}
      </div>

      <div className="col-span-12 text-sm font-semibold text-black md:col-span-8">
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