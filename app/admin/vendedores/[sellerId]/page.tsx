"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  collection,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { PhotoUploader } from "@/components/PhotoUploader";

type MsgType = "success" | "error" | "info";

type DistributorOption = {
  id: string;
  name?: string;
  distributorCode?: string;
  status?: string;
};

type SellerDoc = {
  sellerCode?: string;
  sellerType?: string;
  status?: string;

  distributorId?: string;
  distributorName?: string;

  firstName?: string;
  lastName?: string;
  neighborhood?: string;
  phone?: string;

  personal?: {
    address?: string;
    birthDate?: any;
    childrenCount?: number;
    city?: string;
    civilStatus?: string;
    documentNumber?: string;
    documentType?: string;
    email?: string;
  };

  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };

  photo?: {
    url?: string;
    path?: string;
    updatedAt?: any;
  };

  work?: {
    availability?: string;
    monthlyGoal?: number;
    notes?: string;
    startDate?: any;
    territory?: string;
    transport?: string;
  };

  socialSecurity?: {
    arl?: { name?: string; riskLevel?: string; status?: string };
    compensationFund?: { name?: string };
    eps?: { name?: string };
    pension?: { name?: string; regime?: string };
  };

  bank?: {
    accountNumber?: string;
    accountType?: string;
    bankName?: string;
    holderName?: string;
  };

  compliance?: {
    createdAt?: any;
    createdBy?: string;
    updatedAt?: any;
    updatedBy?: string;
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

function normalizePhoneCO(input: string, required = false) {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) {
    return required
      ? { ok: false, value: "", reason: "El teléfono es obligatorio." }
      : { ok: true, value: "", reason: "" };
  }

  let ten = "";
  if (digits.length === 10) ten = digits;
  else if (digits.length === 12 && digits.startsWith("57")) ten = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith("057")) ten = digits.slice(3);
  else return { ok: false, value: "", reason: "Teléfono inválido. Usa 3001234567 o +57 3001234567." };

  if (!ten.startsWith("3")) return { ok: false, value: "", reason: "El teléfono debe iniciar por 3 (celular colombiano)." };

  return { ok: true, value: `+57${ten}`, reason: "" };
}

function toDateInputValue(ts: any): string {
  try {
    if (!ts) return "";
    const d: Date = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    // yyyy-mm-dd
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

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

  try {
    URL.revokeObjectURL(img.src);
  } catch {}

  return new File([blob], `photo_${Date.now()}.webp`, { type: "image/webp" });
}

export default function VendedorDetallePage() {
  const params = useParams<{ sellerId: string }>();
  const SellerId = params?.sellerId;

  const router = useRouter();
  const backHref = "/admin/vendedores";

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<MsgType>("info");

  const [seller, setSeller] = useState<SellerDoc | null>(null);

  // Distribuidores activos para selector
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);
  const [loadingDists, setLoadingDists] = useState(true);

  // Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Form (edit)
  const [fSellerCode, setFSellerCode] = useState("");
  const [fSellerType, setFSellerType] = useState("");
  const [fStatus, setFStatus] = useState("Activo");

  const [fDistributorId, setFDistributorId] = useState("");
  const [fDistributorName, setFDistributorName] = useState("");

  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fNeighborhood, setFNeighborhood] = useState("");
  const [fPhone, setFPhone] = useState("");

  // personal
  const [pAddress, setPAddress] = useState("");
  const [pBirthDate, setPBirthDate] = useState(""); // yyyy-mm-dd
  const [pChildrenCount, setPChildrenCount] = useState("0");
  const [pCity, setPCity] = useState("");
  const [pCivilStatus, setPCivilStatus] = useState("");
  const [pDocNumber, setPDocNumber] = useState("");
  const [pDocType, setPDocType] = useState("");
  const [pEmail, setPEmail] = useState("");

  // emergency
  const [eName, setEName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eRelationship, setERelationship] = useState("");

  // work
  const [wAvailability, setWAvailability] = useState("");
  const [wMonthlyGoal, setWMonthlyGoal] = useState("0");
  const [wNotes, setWNotes] = useState("");
  const [wStartDate, setWStartDate] = useState("");
  const [wTerritory, setWTerritory] = useState("");
  const [wTransport, setWTransport] = useState("");

  // social security
  const [arlName, setArlName] = useState("");
  const [arlRiskLevel, setArlRiskLevel] = useState("");
  const [arlStatus, setArlStatus] = useState("");
  const [compFundName, setCompFundName] = useState("");
  const [epsName, setEpsName] = useState("");
  const [pensionName, setPensionName] = useState("");
  const [pensionRegime, setPensionRegime] = useState("");

  // bank
  const [bankName, setBankName] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");

  // delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [ackDelete, setAckDelete] = useState(false);

  const colors = useMemo(
    () => ({
      azul: "bg-[#0B5ED7] hover:bg-[#0A54C2] text-white",
      ocre: "#C86A2B",
    }),
    []
  );

  function showMessage(type: MsgType, text: string) {
    setMsgType(type);
    setMsg(text);
  }

  function fullNameView(s: SellerDoc) {
    const n = `${String(s.firstName || "").trim()} ${String(s.lastName || "").trim()}`.trim();
    return n || "Vendedor";
  }

  // Cargar distribuidor activos
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

  // Cargar vendedor
  useEffect(() => {
    const run = async () => {
      if (!SellerId) return;

      setLoading(true);
      try {
        const refDoc = doc(db, "sellers", SellerId);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          showMessage("error", "El vendedor no existe o fue eliminado.");
          setTimeout(() => router.push(backHref), 800);
          return;
        }

        const data = snap.data() as SellerDoc;
        setSeller(data);

        // Prellenar form
        setFSellerCode(data.sellerCode || "");
        setFSellerType(data.sellerType || "");
        setFStatus(data.status || "Activo");

        setFDistributorId(data.distributorId || "");
        setFDistributorName(data.distributorName || "");

        setFFirstName(data.firstName || "");
        setFLastName(data.lastName || "");
        setFNeighborhood(data.neighborhood || "");
        setFPhone(data.phone || "");

        setPAddress(data.personal?.address || "");
        setPBirthDate(toDateInputValue(data.personal?.birthDate));
        setPChildrenCount(String(data.personal?.childrenCount ?? 0));
        setPCity(data.personal?.city || "");
        setPCivilStatus(data.personal?.civilStatus || "");
        setPDocNumber(data.personal?.documentNumber || "");
        setPDocType(data.personal?.documentType || "");
        setPEmail(data.personal?.email || "");

        setEName(data.emergencyContact?.name || "");
        setEPhone(data.emergencyContact?.phone || "");
        setERelationship(data.emergencyContact?.relationship || "");

        setWAvailability(data.work?.availability || "");
        setWMonthlyGoal(String(data.work?.monthlyGoal ?? 0));
        setWNotes(data.work?.notes || "");
        setWStartDate(toDateInputValue(data.work?.startDate));
        setWTerritory(data.work?.territory || "");
        setWTransport(data.work?.transport || "");

        setArlName(data.socialSecurity?.arl?.name || "");
        setArlRiskLevel(data.socialSecurity?.arl?.riskLevel || "");
        setArlStatus(data.socialSecurity?.arl?.status || "");
        setCompFundName(data.socialSecurity?.compensationFund?.name || "");
        setEpsName(data.socialSecurity?.eps?.name || "");
        setPensionName(data.socialSecurity?.pension?.name || "");
        setPensionRegime(data.socialSecurity?.pension?.regime || "");

        setBankName(data.bank?.bankName || "");
        setBankAccountType(data.bank?.accountType || "");
        setBankAccountNumber(data.bank?.accountNumber || "");
        setBankHolderName(data.bank?.holderName || "");

        setMode("view");
        setPhotoFile(null);
      } catch (e) {
        console.error(e);
        showMessage("error", "No se pudo cargar el vendedor.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [SellerId, router]);

  async function sellerCodeInUse(codeUpper: string) {
    const qy = query(collection(db, "sellers"), where("sellerCode", "==", codeUpper), limit(1));
    const snap = await getDocs(qy);
    if (snap.empty) return false;
    return snap.docs[0].id !== SellerId;
  }

  function validateEdit(): string {
    const code = normalizeSellerCode(fSellerCode);
    if (!code) return "El código del vendedor es obligatorio.";
    if (!cleanText(fSellerType)) return "El tipo de vendedor es obligatorio.";
    if (!fDistributorId) return "Selecciona un distribuidor activo.";

    if (!cleanText(fFirstName)) return "El nombre es obligatorio.";
    if (!cleanText(fLastName)) return "El apellido es obligatorio.";

    const phoneNorm = normalizePhoneCO(fPhone, true);
    if (!phoneNorm.ok) return phoneNorm.reason;

    if (!cleanText(pDocType)) return "El tipo de documento es obligatorio.";
    if (!cleanText(pDocNumber)) return "El número de documento es obligatorio.";

    const email = pEmail.trim().toLowerCase();
    if (email && !isValidEmail(email)) return "El correo no tiene un formato válido.";

    if (ePhone.trim()) {
      const ePhoneNorm = normalizePhoneCO(ePhone, false);
      if (!ePhoneNorm.ok) return "Teléfono de emergencia inválido.";
    }

    const accDigits = bankAccountNumber.replace(/\D/g, "");
    if (bankAccountNumber.trim() && accDigits.length < 6) return "Número de cuenta inválido.";

    return "";
  }

  async function uploadNewPhotoIfNeeded(): Promise<{ url: string; path: string } | null> {
    if (!photoFile) return null;

    const webp = await compressToWebP(photoFile, 900, 0.82);
    const path = `sellers/photos/${Date.now()}_${Math.random().toString(16).slice(2)}.webp`;

    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, webp);

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        () => {},
        (err) => reject(err),
        () => resolve()
      );
    });

    const url = await getDownloadURL(task.snapshot.ref);
    return { url, path };
  }

  async function refresh() {
    if (SellerId) return;
    const snap = await getDoc(doc(db, "sellers", SellerId));
    if (snap.exists()) setSeller(snap.data() as SellerDoc);
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const error = validateEdit();
    if (error) return showMessage("info", error);

    setSaving(true);
    try {
      const code = normalizeSellerCode(fSellerCode);
      if (await sellerCodeInUse(code)) {
        showMessage("error", `El código "${code}" ya está en uso por otro vendedor.`);
        return;
      }

      const phoneNorm = normalizePhoneCO(fPhone, true);
      const ePhoneNorm = ePhone.trim() ? normalizePhoneCO(ePhone, false) : { ok: true, value: "", reason: "" };

      // distributorName desde selector
      const dist = distributors.find((d) => d.id === fDistributorId);
      const distName = dist?.name || fDistributorName || "";

      // Si hay foto nueva, se sube
      const uploaded = await uploadNewPhotoIfNeeded();

      const actor = auth?.currentUser?.email || auth?.currentUser?.uid || "";

      await updateDoc(doc(db, "sellers", SellerId!), {
        sellerCode: code,
        sellerType: cleanText(fSellerType),
        status: fStatus,

        distributorId: fDistributorId,
        distributorName: distName,

        firstName: cleanText(fFirstName),
        lastName: cleanText(fLastName),
        neighborhood: cleanText(fNeighborhood),
        phone: phoneNorm.value,

        personal: {
          address: cleanText(pAddress),
          birthDate: pBirthDate ? new Date(`${pBirthDate}T10:00:00`) : "",
          childrenCount: Number.isFinite(Number(pChildrenCount)) ? Math.max(0, Math.trunc(Number(pChildrenCount))) : 0,
          city: cleanText(pCity),
          civilStatus: cleanText(pCivilStatus),
          documentNumber: cleanText(pDocNumber),
          documentType: cleanText(pDocType),
          email: pEmail.trim().toLowerCase(),
        },

        emergencyContact: {
          name: cleanText(eName),
          phone: ePhone.trim() ? ePhoneNorm.value : "",
          relationship: cleanText(eRelationship),
        },

        ...(uploaded
          ? {
              photo: {
                url: uploaded.url,
                path: uploaded.path,
                updatedAt: serverTimestamp(),
              },
            }
          : {}),

        work: {
          availability: cleanText(wAvailability),
          monthlyGoal: Number.isFinite(Number(wMonthlyGoal)) ? Math.max(0, Number(wMonthlyGoal)) : 0,
          notes: cleanText(wNotes),
          startDate: wStartDate ? new Date(`${wStartDate}T10:00:00`) : "",
          territory: cleanText(wTerritory),
          transport: cleanText(wTransport),
        },

        socialSecurity: {
          arl: { name: cleanText(arlName), riskLevel: cleanText(arlRiskLevel), status: cleanText(arlStatus) },
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
          ...(seller?.compliance?.createdAt ? { createdAt: seller.compliance.createdAt } : { createdAt: serverTimestamp() }),
          createdBy: seller?.compliance?.createdBy || actor,
          updatedAt: serverTimestamp(),
          updatedBy: actor,
        },
      });

      await refresh();
      setMode("view");
      setPhotoFile(null);
      showMessage("success", "Cambios guardados correctamente.");
    } catch (err) {
      console.error(err);
      showMessage("error", "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  async function markInactive() {
    if (!SellerId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "sellers", SellerId), {
        status: "Inactivo",
        compliance: {
          ...(seller?.compliance || {}),
          updatedAt: serverTimestamp(),
          updatedBy: auth?.currentUser?.email || auth?.currentUser?.uid || "",
        },
      });
      await refresh();
      setShowDelete(false);
      setMode("view");
      showMessage("success", "El vendedor quedó como Inactivo.");
    } catch (e) {
      console.error(e);
      showMessage("error", "No se pudo cambiar el estado.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSeller() {
    if (!SellerId) return;

    const okWord = deleteText.trim().toUpperCase() === "ELIMINAR";
    if (!ackDelete || !okWord) {
      showMessage("info", "Para eliminar: marca la casilla y escribe ELIMINAR.");
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "sellers", SellerId));
      showMessage("success", "Vendedor eliminado.");
      setTimeout(() => router.push(backHref), 700);
    } catch (e) {
      console.error(e);
      showMessage("error", "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">Cargando…</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          No se encontró el vendedor.
          <div className="mt-4">
            <Link href={backHref} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5">
              ← Volver
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const title = fullNameView(seller);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-extrabold text-black/60">
            SIANA VITAL • Vendedores
          </div>
          <h1 className="text-3xl font-black mt-2">{title}</h1>
          <p className="text-sm text-black/60 mt-1">
            {mode === "view" ? "Vista de lectura." : "Edición habilitada."}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/configuracion" className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5">
            ← Configuración
          </Link>
          <Link href={backHref} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5">
            ← Volver
          </Link>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div
          className={[
            "mb-4 rounded-xl border px-3 py-2 text-sm",
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

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        {/* Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-[#C86A2B]/10 text-[#C86A2B] px-3 py-1 text-xs font-extrabold">
              {seller.sellerCode || "SIN CÓDIGO"}
            </span>
            <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold text-black/60">
              {seller.status || "—"}
            </span>
          </div>

          <div className="flex gap-2">
            {mode === "view" ? (
              <button
                type="button"
                onClick={() => {
                  setMsg(null);
                  setMode("edit");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-extrabold ${colors.azul}`}
              >
                Editar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMsg(null);
                  setMode("view");
                  setPhotoFile(null);
                  // rehidratar desde seller para descartar cambios
                  setFSellerCode(seller.sellerCode || "");
                  setFSellerType(seller.sellerType || "");
                  setFStatus(seller.status || "Activo");
                  setFDistributorId(seller.distributorId || "");
                  setFDistributorName(seller.distributorName || "");
                  setFFirstName(seller.firstName || "");
                  setFLastName(seller.lastName || "");
                  setFNeighborhood(seller.neighborhood || "");
                  setFPhone(seller.phone || "");

                  setPAddress(seller.personal?.address || "");
                  setPBirthDate(toDateInputValue(seller.personal?.birthDate));
                  setPChildrenCount(String(seller.personal?.childrenCount ?? 0));
                  setPCity(seller.personal?.city || "");
                  setPCivilStatus(seller.personal?.civilStatus || "");
                  setPDocNumber(seller.personal?.documentNumber || "");
                  setPDocType(seller.personal?.documentType || "");
                  setPEmail(seller.personal?.email || "");

                  setEName(seller.emergencyContact?.name || "");
                  setEPhone(seller.emergencyContact?.phone || "");
                  setERelationship(seller.emergencyContact?.relationship || "");

                  setWAvailability(seller.work?.availability || "");
                  setWMonthlyGoal(String(seller.work?.monthlyGoal ?? 0));
                  setWNotes(seller.work?.notes || "");
                  setWStartDate(toDateInputValue(seller.work?.startDate));
                  setWTerritory(seller.work?.territory || "");
                  setWTransport(seller.work?.transport || "");

                  setArlName(seller.socialSecurity?.arl?.name || "");
                  setArlRiskLevel(seller.socialSecurity?.arl?.riskLevel || "");
                  setArlStatus(seller.socialSecurity?.arl?.status || "");
                  setCompFundName(seller.socialSecurity?.compensationFund?.name || "");
                  setEpsName(seller.socialSecurity?.eps?.name || "");
                  setPensionName(seller.socialSecurity?.pension?.name || "");
                  setPensionRegime(seller.socialSecurity?.pension?.regime || "");

                  setBankName(seller.bank?.bankName || "");
                  setBankAccountType(seller.bank?.accountType || "");
                  setBankAccountNumber(seller.bank?.accountNumber || "");
                  setBankHolderName(seller.bank?.holderName || "");
                }}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold hover:bg-black/5"
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
              className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm font-extrabold hover:bg-red-100"
            >
              Eliminar
            </button>
          </div>
        </div>

        {/* BODY */}
        {mode === "view" ? (
          <div className="space-y-6">
            {/* Foto */}
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={seller.photo?.url || "/placeholder-user.png"}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover border border-black/10"
              />
              <div className="flex-1">
                <ReadRow label="Nombre" value={fullNameView(seller)} />
                <ReadRow label="Código" value={seller.sellerCode || "—"} />
                <ReadRow label="Tipo" value={seller.sellerType || "—"} />
                <ReadRow label="Distribuidor" value={seller.distributorName || seller.distributorId || "—"} />
                <ReadRow label="Teléfono" value={seller.phone || "—"} />
              </div>
            </div>

            <Section title="Personal" color={colors.ocre}>
              <ReadGrid>
                <ReadRow label="Documento" value={`${seller.personal?.documentType || "—"} ${seller.personal?.documentNumber || ""}`.trim()} />
                <ReadRow label="Correo" value={seller.personal?.email || "—"} />
                <ReadRow label="Nacimiento" value={toDateInputValue(seller.personal?.birthDate) || "—"} />
                <ReadRow label="Hijos" value={String(seller.personal?.childrenCount ?? 0)} />
                <ReadRow label="Ciudad" value={seller.personal?.city || "—"} />
                <ReadRow label="Dirección" value={seller.personal?.address || "—"} />
                <ReadRow label="Estado civil" value={seller.personal?.civilStatus || "—"} />
              </ReadGrid>
            </Section>

            <Section title="Emergencia" color={colors.ocre}>
              <ReadGrid>
                <ReadRow label="Nombre" value={seller.emergencyContact?.name || "—"} />
                <ReadRow label="Teléfono" value={seller.emergencyContact?.phone || "—"} />
                <ReadRow label="Relación" value={seller.emergencyContact?.relationship || "—"} />
              </ReadGrid>
            </Section>

            <Section title="Trabajo" color={colors.ocre}>
              <ReadGrid>
                <ReadRow label="Inicio" value={toDateInputValue(seller.work?.startDate) || "—"} />
                <ReadRow label="Disponibilidad" value={seller.work?.availability || "—"} />
                <ReadRow label="Territorio" value={seller.work?.territory || "—"} />
                <ReadRow label="Transporte" value={seller.work?.transport || "—"} />
                <ReadRow label="Meta mensual" value={String(seller.work?.monthlyGoal ?? 0)} />
                <ReadRow label="Notas" value={seller.work?.notes || "—"} />
              </ReadGrid>
            </Section>

            <Section title="Seguridad social" color={colors.ocre}>
              <ReadGrid>
                <ReadRow label="ARL" value={seller.socialSecurity?.arl?.name || "—"} />
                <ReadRow label="Riesgo" value={seller.socialSecurity?.arl?.riskLevel || "—"} />
                <ReadRow label="Estado ARL" value={seller.socialSecurity?.arl?.status || "—"} />
                <ReadRow label="Caja" value={seller.socialSecurity?.compensationFund?.name || "—"} />
                <ReadRow label="EPS" value={seller.socialSecurity?.eps?.name || "—"} />
                <ReadRow label="Pensión" value={seller.socialSecurity?.pension?.name || "—"} />
                <ReadRow label="Régimen" value={seller.socialSecurity?.pension?.regime || "—"} />
              </ReadGrid>
            </Section>

            <Section title="Banco" color={colors.ocre}>
              <ReadGrid>
                <ReadRow label="Banco" value={seller.bank?.bankName || "—"} />
                <ReadRow label="Tipo" value={seller.bank?.accountType || "—"} />
                <ReadRow label="Cuenta" value={seller.bank?.accountNumber || "—"} />
                <ReadRow label="Titular" value={seller.bank?.holderName || "—"} />
              </ReadGrid>
            </Section>
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-6">
            {/* Foto */}
            <div>
              <PhotoUploader
                label="Foto del vendedor"
                required={false}
                valueFile={photoFile}
                valueUrl={seller.photo?.url || null}
                onChangeFile={(f) => setPhotoFile(f)}
                hint=""
              />
            </div>

            <Section title="Datos principales" color={colors.ocre}>
              <Grid2>
                <Field label="Código del vendedor *">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={fSellerCode} onChange={(e) => setFSellerCode(e.target.value)} />
                </Field>

                <Field label="Tipo de vendedor *">
                  <select
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                    value={fSellerType}
                    onChange={(e) => setFSellerType(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    <option value="Distribuidor">Distribuidor</option>
                    <option value="Emprendedor">Emprendedor</option>
                  </select>
                </Field>

                <Field label="Distribuidor (activo) *">
                  <select
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                    value={fDistributorId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFDistributorId(next);
                      const d = distributors.find((x) => x.id === next);
                      setFDistributorName(d?.name || "");
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
                  <select className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </Field>

                <Field label="Nombres *">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} />
                </Field>

                <Field label="Apellidos *">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={fLastName} onChange={(e) => setFLastName(e.target.value)} />
                </Field>

                <Field label="Teléfono *">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
                </Field>

                <Field label="Barrio">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={fNeighborhood} onChange={(e) => setFNeighborhood(e.target.value)} />
                </Field>
              </Grid2>
            </Section>

            <Section title="Personal" color={colors.ocre}>
              <Grid2>
                <Field label="Tipo de documento *">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pDocType} onChange={(e) => setPDocType(e.target.value)} />
                </Field>
                <Field label="Número de documento *">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pDocNumber} onChange={(e) => setPDocNumber(e.target.value)} />
                </Field>

                <Field label="Correo">
                  <input type="email" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
                </Field>

                <Field label="Estado civil">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pCivilStatus} onChange={(e) => setPCivilStatus(e.target.value)} />
                </Field>

                <Field label="Fecha de nacimiento">
                  <input type="date" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pBirthDate} onChange={(e) => setPBirthDate(e.target.value)} />
                </Field>

                <Field label="Cantidad de hijos">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pChildrenCount} onChange={(e) => setPChildrenCount(e.target.value)} />
                </Field>

                <Field label="Ciudad">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pCity} onChange={(e) => setPCity(e.target.value)} />
                </Field>

                <Field label="Dirección">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={pAddress} onChange={(e) => setPAddress(e.target.value)} />
                </Field>
              </Grid2>
            </Section>

            <Section title="Emergencia" color={colors.ocre}>
              <Grid3>
                <Field label="Nombre">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={eName} onChange={(e) => setEName(e.target.value)} />
                </Field>
                <Field label="Teléfono">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={ePhone} onChange={(e) => setEPhone(e.target.value)} />
                </Field>
                <Field label="Relación">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={eRelationship} onChange={(e) => setERelationship(e.target.value)} />
                </Field>
              </Grid3>
            </Section>

            <Section title="Trabajo" color={colors.ocre}>
              <Grid2>
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
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={wMonthlyGoal} onChange={(e) => setWMonthlyGoal(e.target.value)} />
                </Field>
                <Field label="Notas">
                  <textarea className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm min-h-[90px]" value={wNotes} onChange={(e) => setWNotes(e.target.value)} />
                </Field>
              </Grid2>
            </Section>

            <Section title="Seguridad social" color={colors.ocre}>
              <Grid3>
                <Field label="ARL - Nombre">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={arlName} onChange={(e) => setArlName(e.target.value)} />
                </Field>
                <Field label="ARL - Nivel de riesgo">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={arlRiskLevel} onChange={(e) => setArlRiskLevel(e.target.value)} />
                </Field>
                <Field label="ARL - Estado">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={arlStatus} onChange={(e) => setArlStatus(e.target.value)} />
                </Field>
              </Grid3>

              <Grid2>
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
              </Grid2>
            </Section>

            <Section title="Banco" color={colors.ocre}>
              <Grid2>
                <Field label="Banco">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </Field>
                <Field label="Tipo de cuenta">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankAccountType} onChange={(e) => setBankAccountType(e.target.value)} />
                </Field>
                <Field label="Número de cuenta">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                </Field>
                <Field label="Titular">
                  <input className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm" value={bankHolderName} onChange={(e) => setBankHolderName(e.target.value)} />
                </Field>
              </Grid2>
            </Section>

            <div className="flex gap-2">
              <button disabled={saving} className={`rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-60 ${colors.azul}`}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete modal */}
      {showDelete ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-black/10 shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-red-700">Eliminar vendedor</h3>
                <p className="text-sm text-black/70 mt-1">
                  Eliminar puede afectar información asociada (visitas, reportes, estadísticas).
                  Recomendación: mantener como <b>Inactivo</b>.
                </p>
              </div>
              <button
                onClick={() => setShowDelete(false)}
                className="rounded-xl border border-black/10 bg-white px-3 py-1 text-sm font-extrabold hover:bg-black/5"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              ⚠️ Esta acción no se puede deshacer.
            </div>

            <div className="mt-4 flex items-start gap-2">
              <input id="ack" type="checkbox" checked={ackDelete} onChange={(e) => setAckDelete(e.target.checked)} />
              <label htmlFor="ack" className="text-sm text-black/70">
                Entiendo el riesgo de eliminar y que puede afectar datos relacionados.
              </label>
            </div>

            <div className="mt-3">
              <label className="text-sm font-extrabold">Escribe ELIMINAR para confirmar</label>
              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                placeholder="ELIMINAR"
              />
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={saving || deleting}
                onClick={markInactive}
                className={`px-4 py-2 rounded-xl font-extrabold disabled:opacity-60 ${colors.azul}`}
              >
                {saving ? "Procesando..." : "Marcar como Inactivo (recomendado)"}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={deleteSeller}
                className="px-4 py-2 rounded-xl font-extrabold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* UI helpers */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-extrabold mb-1">{label}</div>
      {children}
    </label>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-black mb-3" style={{ color }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ReadGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-2">{children}</div>;
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-12 gap-3 border-b last:border-b-0 py-2">
      <div className="col-span-4 text-xs font-extrabold text-black/60">{label}</div>
      <div className="col-span-8 text-sm font-semibold text-black">{value}</div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-4">{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-3 gap-4">{children}</div>;
}