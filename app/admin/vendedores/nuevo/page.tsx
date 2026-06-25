"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

// Ajusta el import si tu ruta es diferente:
import { PhotoUploader } from "@/components/PhotoUploader";

type MsgType = "success" | "error" | "info";

type DistributorOption = {
  id: string;
  name?: string;
  distributorCode?: string;
  status?: string; // "Activo"/"Inactivo"
};

type SellerPayload = {
  sellerCode: string;
  sellerType: string;
  status: string;

  distributorId: string;
  distributorName: string;

  firstName: string;
  lastName: string;
  neighborhood: string;
  phone: string;

  personal: {
    address: string;
    birthDate: any;
    childrenCount: number;
    city: string;
    civilStatus: string;
    documentNumber: string;
    documentType: string;
    email: string;
  };

  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };

  photo: {
    url: string;
    path: string;
    updatedAt: any;
  };

  work: {
    availability: string;
    monthlyGoal: number;
    notes: string;
    startDate: any;
    territory: string;
    transport: string;
  };

  socialSecurity: {
    arl: { name: string; riskLevel: string; status: string };
    compensationFund: { name: string };
    eps: { name: string };
    pension: { name: string; regime: string };
  };

  bank: {
    accountNumber: string;
    accountType: string;
    bankName: string;
    holderName: string;
  };

  compliance: {
    createdAt: any;
    createdBy: string;
    updatedAt: any;
    updatedBy: string;
  };
};

function cleanText(v: string) {
  return (v || "").trim().replace(/\s+/g, " ");
}

function normalizeSellerCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhoneCO(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return { ok: false, value: "", reason: "El teléfono es obligatorio." };

  let ten = "";
  if (digits.length === 10) ten = digits;
  else if (digits.length === 12 && digits.startsWith("57")) ten = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith("057")) ten = digits.slice(3);
  else return { ok: false, value: "", reason: "Teléfono inválido. Usa 3001234567 o +57 3001234567." };

  if (!ten.startsWith("3")) {
    return { ok: false, value: "", reason: "El teléfono debe iniciar por 3 (celular colombiano)." };
  }

  return { ok: true, value: `+57${ten}`, reason: "" };
}

function toIntSafe(v: string, fallback = 0) {
  const n = Number(String(v || "").replace(/[^\d\-]/g, ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

function toNumberSafe(v: string, fallback = 0) {
  const raw = String(v || "").trim();
  if (!raw) return fallback;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return fallback;
  const n = Number(digits);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Comprime una imagen a WEBP max 900px (lado mayor).
 * Devuelve un File listo para subir.
 */
async function compressToWebP(file: File, maxSide = 900, quality = 0.82): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  let targetW = w;
  let targetH = h;

  if (Math.max(w, h) > maxSide) {
    const ratio = maxSide / Math.max(w, h);
    targetW = Math.round(w * ratio);
    targetH = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || file), "image/webp", quality)
  );

  // limpieza
  try {
    URL.revokeObjectURL(img.src);
  } catch { }

  const webpFile = new File([blob], `photo_${Date.now()}.webp`, { type: "image/webp" });
  return webpFile;
}

export default function NuevoVendedorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<MsgType>("info");

  // Distribuidores activos
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);
  const [loadingDists, setLoadingDists] = useState(true);

  // Foto (manejada por PhotoUploader + subida en submit)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoExistingUrl] = useState<string | null>(null); // nuevo => null

  // Datos top
  const [sellerCode, setSellerCode] = useState("");
  const [sellerType, setSellerType] = useState("");
  const [status, setStatus] = useState<"Activo" | "Inactivo">("Activo");
  const [distributorId, setDistributorId] = useState("");
  const [distributorName, setDistributorName] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [phone, setPhone] = useState("");

  // Personal
  const [pAddress, setPAddress] = useState("");
  const [pBirthDate, setPBirthDate] = useState(""); // yyyy-mm-dd
  const [pChildrenCount, setPChildrenCount] = useState("0");
  const [pCity, setPCity] = useState("");
  const [pCivilStatus, setPCivilStatus] = useState("");
  const [pDocumentNumber, setPDocumentNumber] = useState("");
  const [pDocumentType, setPDocumentType] = useState("");
  const [pEmail, setPEmail] = useState("");

  // Emergency
  const [eName, setEName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eRelationship, setERelationship] = useState("");

  // Work
  const [wAvailability, setWAvailability] = useState("");
  const [wMonthlyGoal, setWMonthlyGoal] = useState("0");
  const [wNotes, setWNotes] = useState("");
  const [wStartDate, setWStartDate] = useState(""); // yyyy-mm-dd
  const [wTerritory, setWTerritory] = useState("");
  const [wTransport, setWTransport] = useState("");

  // Social security
  const [arlName, setArlName] = useState("");
  const [arlRiskLevel, setArlRiskLevel] = useState("");
  const [arlStatus, setArlStatus] = useState("");

  const [compFundName, setCompFundName] = useState("");
  const [epsName, setEpsName] = useState("");
  const [pensionName, setPensionName] = useState("");
  const [pensionRegime, setPensionRegime] = useState("");

  // Bank
  const [bankName, setBankName] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");

  const colors = useMemo(
    () => ({
      azulBtn: "bg-[#0B5ED7] hover:bg-[#0A54C2] text-white",
      ocre: "#C86A2B",
    }),
    []
  );

  function showMessage(type: MsgType, text: string) {
    setMsgType(type);
    setMsg(text);
  }

  // ✅ Solo distribuidores Activos
  useEffect(() => {
    const load = async () => {
      setLoadingDists(true);
      try {
        const qy = query(collection(db, "distributors"), where("status", "==", "Activo"));
        const snap = await getDocs(qy);
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as DistributorOption[];
        items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        setDistributors(items);
      } catch (e) {
        console.error(e);
        setDistributors([]);
      } finally {
        setLoadingDists(false);
      }
    };
    load();
  }, []);

  async function sellerCodeExists(codeUpper: string) {
    const qy = query(collection(db, "sellers"), where("sellerCode", "==", codeUpper), limit(1));
    const snap = await getDocs(qy);
    return !snap.empty;
  }

  async function uploadSellerPhoto(file: File): Promise<{ url: string; path: string }> {
    const webp = await compressToWebP(file, 900, 0.82);
    const path = `sellers/photos/${Date.now()}_${Math.random().toString(16).slice(2)}.webp`;

    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, webp);

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        () => { },
        (err) => reject(err),
        () => resolve()
      );
    });

    const url = await getDownloadURL(task.snapshot.ref);
    return { url, path };
  }

  function validate(): string {
    const code = normalizeSellerCode(sellerCode);
    if (!code) return "El código del vendedor es obligatorio.";
    if (!cleanText(sellerType)) return "El tipo de vendedor es obligatorio.";
    if (!distributorId) return "Selecciona un distribuidor activo.";

    if (!cleanText(firstName)) return "El nombre es obligatorio.";
    if (!cleanText(lastName)) return "El apellido es obligatorio.";

    const phoneNorm = normalizePhoneCO(phone);
    if (!phoneNorm.ok) return phoneNorm.reason;

    if (!cleanText(pDocumentType)) return "El tipo de documento es obligatorio.";
    if (!cleanText(pDocumentNumber)) return "El número de documento es obligatorio.";

    const email = pEmail.trim().toLowerCase();
    if (email && !isValidEmail(email)) return "El correo no tiene un formato válido.";

    if (ePhone.trim()) {
      const ePhoneNorm = normalizePhoneCO(ePhone);
      if (!ePhoneNorm.ok) return "Teléfono de contacto de emergencia inválido.";
    }

    const accDigits = bankAccountNumber.replace(/\D/g, "");
    if (bankAccountNumber.trim() && accDigits.length < 6) return "Número de cuenta inválido.";

    if (toIntSafe(pChildrenCount, 0) < 0) return "Cantidad de hijos inválida.";
    if (toNumberSafe(wMonthlyGoal, 0) < 0) return "Meta mensual inválida.";

    // Foto obligatoria para ficha (puedes cambiar a opcional si quieres)
    if (!photoFile) return "La foto es obligatoria.";

    return "";
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const error = validate();
    if (error) return showMessage("info", error);

    const code = normalizeSellerCode(sellerCode);
    const phoneNorm = normalizePhoneCO(phone);
    const ePhoneNorm = ePhone.trim() ? normalizePhoneCO(ePhone) : { ok: true, value: "", reason: "" };

    setLoading(true);
    try {
      if (await sellerCodeExists(code)) {
        showMessage("error", `El código "${code}" ya existe. Usa otro.`);
        return;
      }

      const user = auth?.currentUser;
      const actor = user?.email || user?.uid || "";

      // Asegura distributorName (por si no estaba)
      const dist = distributors.find((d) => d.id === distributorId);
      const distName = dist?.name || distributorName || "";

      // Subir foto (solo en submit)
      const uploaded = await uploadSellerPhoto(photoFile!);

      const payload: SellerPayload = {
        sellerCode: code,
        sellerType: cleanText(sellerType),
        status,

        distributorId,
        distributorName: distName,

        firstName: cleanText(firstName),
        lastName: cleanText(lastName),
        neighborhood: cleanText(neighborhood),
        phone: phoneNorm.value,

        personal: {
          address: cleanText(pAddress),
          birthDate: pBirthDate ? new Date(`${pBirthDate}T10:00:00`) : "",
          childrenCount: toIntSafe(pChildrenCount, 0),
          city: cleanText(pCity),
          civilStatus: cleanText(pCivilStatus),
          documentNumber: cleanText(pDocumentNumber),
          documentType: cleanText(pDocumentType),
          email: pEmail.trim().toLowerCase(),
        },

        emergencyContact: {
          name: cleanText(eName),
          phone: ePhone.trim() ? ePhoneNorm.value : "",
          relationship: cleanText(eRelationship),
        },

        photo: {
          url: uploaded.url,
          path: uploaded.path,
          updatedAt: serverTimestamp(),
        },

        work: {
          availability: cleanText(wAvailability),
          monthlyGoal: toNumberSafe(wMonthlyGoal, 0),
          notes: cleanText(wNotes),
          startDate: wStartDate ? new Date(`${wStartDate}T10:00:00`) : "",
          territory: cleanText(wTerritory),
          transport: cleanText(wTransport),
        },

        socialSecurity: {
          arl: {
            name: cleanText(arlName),
            riskLevel: cleanText(arlRiskLevel),
            status: cleanText(arlStatus),
          },
          compensationFund: { name: cleanText(compFundName) },
          eps: { name: cleanText(epsName) },
          pension: { name: cleanText(pensionName), regime: cleanText(pensionRegime) },
        },

        bank: {
          accountNumber: bankAccountNumber.replace(/\s+/g, ""),
          accountType: cleanText(bankAccountType),
          bankName: cleanText(bankName),
          holderName: cleanText(bankHolderName),
        },

        compliance: {
          createdAt: serverTimestamp(),
          createdBy: actor,
          updatedAt: serverTimestamp(),
          updatedBy: actor,
        },
      };

      await addDoc(collection(db, "sellers"), payload);

      showMessage("success", "Vendedor creado correctamente.");
      setTimeout(() => router.push("/dashboard/admin/configuracion/vendedores"), 700);
    } catch (err) {
      console.error(err);
      showMessage("error", "No se pudo guardar el vendedor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-extrabold text-black/60">
            SIANA VITAL • Configuración • Vendedores
          </div>
          <h1 className="text-3xl font-black mt-2">Nuevo vendedor</h1>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/configuracion"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            ← Configuración
          </Link>
          <Link
            href="/admin/vendedores"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
          >
            Ver vendedores
          </Link>
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        {/* FOTO (usa tu componente ya probado) */}
        <div className="mb-6">
          <PhotoUploader
            label="Foto del vendedor"
            required={true}
            valueFile={photoFile}
            valueUrl={photoExistingUrl}
            onChangeFile={(f) => setPhotoFile(f)}
            // si quieres más limpio todavía:
            hint=""
          />
        </div>

        <SectionTitle title="Datos principales" color={colors.ocre} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Código del vendedor *">
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={sellerCode}
              onChange={(e) => setSellerCode(e.target.value)}
              placeholder="VEND-001"
            />
          </Field>

          <Field label="Tipo de vendedor *">
            <select
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
              value={sellerType}
              onChange={(e) => setSellerType(e.target.value)}
            >
              <option value="">Selecciona</option>
              <option value="Distribuidor">Distribuidor</option>
              <option value="Emprendedor">Emprendedor</option>
            </select>
          </Field>

          <Field label="Distribuidor (activo) *">
            <select
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={distributorId}
              onChange={(e) => {
                const id = e.target.value;
                setDistributorId(id);
                const dist = distributors.find((d) => d.id === id);
                setDistributorName(dist?.name || "");
              }}
              disabled={loadingDists}
            >
              <option value="">{loadingDists ? "Cargando..." : "Selecciona"}</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {(d.distributorCode ? `${d.distributorCode} — ` : "") + (d.name || "Sin nombre")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Estado">
            <select
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </Field>

          <Field label="Nombres *">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Apellidos *">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>

          <Field label="Teléfono *">
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="3001234567"
            />
          </Field>

          <Field label="Barrio">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </Field>
        </div>

        <Divider />

        <SectionTitle title="Información personal" color={colors.ocre} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Tipo de documento *">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pDocumentType} onChange={(e) => setPDocumentType(e.target.value)} placeholder="CC / CE / TI..." />
          </Field>
          <Field label="Número de documento *">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pDocumentNumber} onChange={(e) => setPDocumentNumber(e.target.value)} />
          </Field>

          <Field label="Correo">
            <input type="email" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="correo@dominio.com" />
          </Field>

          <Field label="Estado civil">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pCivilStatus} onChange={(e) => setPCivilStatus(e.target.value)} />
          </Field>

          <Field label="Fecha de nacimiento">
            <input type="date" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pBirthDate} onChange={(e) => setPBirthDate(e.target.value)} />
          </Field>

          <Field label="Cantidad de hijos">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pChildrenCount} onChange={(e) => setPChildrenCount(e.target.value)} placeholder="0" />
          </Field>

          <Field label="Ciudad">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pCity} onChange={(e) => setPCity(e.target.value)} />
          </Field>

          <Field label="Dirección">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pAddress} onChange={(e) => setPAddress(e.target.value)} />
          </Field>
        </div>

        <Divider />

        <SectionTitle title="Contacto de emergencia" color={colors.ocre} />
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Nombre">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={eName} onChange={(e) => setEName(e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder="3001234567" />
          </Field>
          <Field label="Relación">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={eRelationship} onChange={(e) => setERelationship(e.target.value)} />
          </Field>
        </div>

        <Divider />

        <SectionTitle title="Información laboral" color={colors.ocre} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Fecha de inicio">
            <input type="date" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={wStartDate} onChange={(e) => setWStartDate(e.target.value)} />
          </Field>

          <Field label="Disponibilidad">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={wAvailability} onChange={(e) => setWAvailability(e.target.value)} />
          </Field>

          <Field label="Territorio">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={wTerritory} onChange={(e) => setWTerritory(e.target.value)} />
          </Field>

          <Field label="Transporte">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={wTransport} onChange={(e) => setWTransport(e.target.value)} />
          </Field>

          <Field label="Meta mensual">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={wMonthlyGoal} onChange={(e) => setWMonthlyGoal(e.target.value)} placeholder="0" />
          </Field>

          <Field label="Notas">
            <textarea className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm min-h-[90px]" value={wNotes} onChange={(e) => setWNotes(e.target.value)} />
          </Field>
        </div>

        <Divider />

        <SectionTitle title="Seguridad social" color={colors.ocre} />
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="ARL - Nombre">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={arlName} onChange={(e) => setArlName(e.target.value)} />
          </Field>
          <Field label="ARL - Nivel de riesgo">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={arlRiskLevel} onChange={(e) => setArlRiskLevel(e.target.value)} />
          </Field>
          <Field label="ARL - Estado">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={arlStatus} onChange={(e) => setArlStatus(e.target.value)} />
          </Field>

          <Field label="Caja de compensación">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={compFundName} onChange={(e) => setCompFundName(e.target.value)} />
          </Field>
          <Field label="EPS">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={epsName} onChange={(e) => setEpsName(e.target.value)} />
          </Field>
          <Field label="Pensión - Nombre">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pensionName} onChange={(e) => setPensionName(e.target.value)} />
          </Field>
          <Field label="Pensión - Régimen">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pensionRegime} onChange={(e) => setPensionRegime(e.target.value)} />
          </Field>
        </div>

        <Divider />

        <SectionTitle title="Información bancaria" color={colors.ocre} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Banco">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </Field>

          <Field label="Tipo de cuenta">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankAccountType} onChange={(e) => setBankAccountType(e.target.value)} placeholder="Ahorros / Corriente" />
          </Field>

          <Field label="Número de cuenta">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Solo números" />
          </Field>

          <Field label="Titular">
            <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankHolderName} onChange={(e) => setBankHolderName(e.target.value)} />
          </Field>
        </div>

        {msg && (
          <div
            className={[
              "mt-5 rounded-xl border px-3 py-2 text-sm",
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

        <div className="mt-6 flex flex-col sm:flex-row gap-2 items-center">
          <button disabled={loading || loadingDists} className={`px-4 py-2 rounded-xl font-extrabold disabled:opacity-60 ${colors.azulBtn}`}>
            {loading ? "Guardando..." : "Guardar"}
          </button>

          <Link
            href="/admin/vendedores"
            className="px-4 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 font-extrabold text-sm text-center"
          >
            Cancelar
          </Link>

          <span className="ml-auto text-xs font-extrabold" style={{ color: colors.ocre }}>
            SIANA VITAL
          </span>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-extrabold mb-1">{label}</div>
      {children}
    </label>
  );
}

function Divider() {
  return <div className="my-6 h-px bg-black/10" />;
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-black" style={{ color }}>
        {title}
      </div>
    </div>
  );
}