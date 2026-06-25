"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";
import {
    createUserWithEmailAndPassword,
    getAuth,
    sendPasswordResetEmail,
    signOut,
    updateProfile,
} from "firebase/auth";
import {
    deleteApp,
    getApp,
    getApps,
    initializeApp,
    type FirebaseApp,
} from "firebase/app";

import { auth, db, firebaseConfig } from "@/lib/firebase";

type AppRole =
    | "administrador"
    | "vendedor"
    | "distribuidor"
    | "mercaderista"
    | "pendiente";

type ProfileType = "admin" | "seller" | "distributor" | "merchandiser" | null;

type EstadoUsuario = "activo" | "pendiente" | "inactivo";

type AssignableProfile = {
    id: string;
    type: Exclude<ProfileType, null | "admin">;
    label: string;
    document: string;
    email: string;
    secondary: string;
    userId: string;
    photoURL: string;
};

const ROLE_OPTIONS: {
    value: AppRole;
    label: string;
    profileType: ProfileType;
}[] = [
        { value: "administrador", label: "Administrador", profileType: "admin" },
        { value: "vendedor", label: "Vendedor", profileType: "seller" },
        { value: "distribuidor", label: "Distribuidor", profileType: "distributor" },
        { value: "mercaderista", label: "Mercaderista", profileType: "merchandiser" },
        { value: "pendiente", label: "Pendiente", profileType: null },
    ];

const ESTADO_OPTIONS: { value: EstadoUsuario; label: string }[] = [
    { value: "activo", label: "Activo" },
    { value: "pendiente", label: "Pendiente" },
    { value: "inactivo", label: "Inactivo" },
];

const PROFILE_COLLECTIONS: Record<
    Exclude<ProfileType, null | "admin">,
    string
> = {
    seller: "sellers",
    distributor: "distributors",
    merchandiser: "merchandisers",
};

function getTextValue(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function getProfileTypeByRole(role: AppRole): ProfileType {
    return ROLE_OPTIONS.find((item) => item.value === role)?.profileType ?? null;
}

function getProfileLabel(profileType: ProfileType) {
    if (profileType === "admin") return "Administrador";
    if (profileType === "seller") return "Vendedor";
    if (profileType === "distributor") return "Distribuidor";
    if (profileType === "merchandiser") return "Mercaderista";
    return "Sin perfil";
}

function buildAssignableProfile(
    id: string,
    type: Exclude<ProfileType, null | "admin">,
    data: Record<string, any>
): AssignableProfile {
    const label =
        getTextValue(
            data.displayName,
            data.fullName,
            data.name,
            data.nombre,
            data.businessName,
            data.razonSocial,
            data.email
        ) || `Registro ${id}`;

    const document = getTextValue(
        data.document,
        data.documento,
        data.documentNumber,
        data.identification,
        data.cedula,
        data.nit,
        data.idNumber
    );

    const email = getTextValue(data.email, data.correo);

    const secondary = getTextValue(
        data.city,
        data.ciudad,
        data.zone,
        data.zona,
        data.phone,
        data.telefono,
        data.celular
    );

    const photoURL = getTextValue(
        data.photo?.url,
        data.logo?.url,
        data.photoURL,
        data.logoURL,
        data.avatarURL,
        data.imageURL
    );

    return {
        id,
        type,
        label,
        document,
        email,
        secondary,
        userId: getTextValue(data.userId),
        photoURL,
    };
}

function generateTemporaryPassword() {
    const random = Math.random().toString(36).slice(-8);
    return `Siana-${random}#2026`;
}

function getSecondaryFirebaseApp() {
    const appName = "siana-admin-create-user";
    const existingApp = getApps().find((item) => item.name === appName);

    if (existingApp) {
        return existingApp;
    }

    return initializeApp(firebaseConfig, appName);
}

function ToastLite({
    type,
    title,
    message,
    onClose,
}: {
    type: "success" | "error" | "info";
    title: string;
    message?: string;
    onClose: () => void;
}) {
    const styles =
        type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-[#0B3D91]";

    return (
        <div
            className={`fixed right-4 top-4 z-50 max-w-sm rounded-3xl border p-4 shadow-xl ${styles}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black">{title}</p>
                    {message ? (
                        <p className="mt-1 text-sm font-semibold opacity-80">{message}</p>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-2 text-sm font-black opacity-70 hover:opacity-100"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export default function NuevoUsuarioPage() {
    const router = useRouter();

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<AppRole>("vendedor");
    const [estado, setEstado] = useState<EstadoUsuario>("activo");
    const [sendReset, setSendReset] = useState(true);

    const [selectedProfile, setSelectedProfile] =
        useState<AssignableProfile | null>(null);

    const [sellers, setSellers] = useState<AssignableProfile[]>([]);
    const [distributors, setDistributors] = useState<AssignableProfile[]>([]);
    const [merchandisers, setMerchandisers] = useState<AssignableProfile[]>([]);

    const [profileSearch, setProfileSearch] = useState("");
    const [saving, setSaving] = useState(false);

    const [toast, setToast] = useState<{
        type: "success" | "error" | "info";
        title: string;
        message?: string;
    } | null>(null);

    const profileType = getProfileTypeByRole(role);
    const requiresExternalProfile =
        profileType !== null && profileType !== "admin";

    function showToast(
        type: "success" | "error" | "info",
        title: string,
        message?: string
    ) {
        setToast({ type, title, message });

        window.setTimeout(() => {
            setToast(null);
        }, 4500);
    }

    useEffect(() => {
        const unsubscribeSellers = onSnapshot(
            collection(db, "sellers"),
            (snapshot) => {
                const data = snapshot.docs.map((item) =>
                    buildAssignableProfile(item.id, "seller", item.data() as any)
                );

                data.sort((a, b) => a.label.localeCompare(b.label));
                setSellers(data);
            }
        );

        return () => unsubscribeSellers();
    }, []);

    useEffect(() => {
        const unsubscribeDistributors = onSnapshot(
            collection(db, "distributors"),
            (snapshot) => {
                const data = snapshot.docs.map((item) =>
                    buildAssignableProfile(item.id, "distributor", item.data() as any)
                );

                data.sort((a, b) => a.label.localeCompare(b.label));
                setDistributors(data);
            }
        );

        return () => unsubscribeDistributors();
    }, []);

    useEffect(() => {
        const unsubscribeMerchandisers = onSnapshot(
            collection(db, "merchandisers"),
            (snapshot) => {
                const data = snapshot.docs.map((item) =>
                    buildAssignableProfile(item.id, "merchandiser", item.data() as any)
                );

                data.sort((a, b) => a.label.localeCompare(b.label));
                setMerchandisers(data);
            },
            () => {
                setMerchandisers([]);
            }
        );

        return () => unsubscribeMerchandisers();
    }, []);

    useEffect(() => {
        setSelectedProfile(null);
        setProfileSearch("");
    }, [role]);

    const availableProfiles = useMemo(() => {
        let baseProfiles: AssignableProfile[] = [];

        if (profileType === "seller") {
            baseProfiles = sellers;
        }

        if (profileType === "distributor") {
            baseProfiles = distributors;
        }

        if (profileType === "merchandiser") {
            baseProfiles = merchandisers;
        }

        const text = profileSearch.trim().toLowerCase();

        return baseProfiles.filter((profile) => {
            const isAvailable = !profile.userId;

            const matchesSearch = !text
                ? true
                : [
                    profile.label,
                    profile.document,
                    profile.email,
                    profile.secondary,
                    profile.id,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(text);

            return isAvailable && matchesSearch;
        });
    }, [profileType, sellers, distributors, merchandisers, profileSearch]);

    async function handleCreateUser() {
        const cleanName = displayName.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName) {
            showToast("info", "Falta el nombre", "Escribe el nombre del usuario.");
            return;
        }

        if (!cleanEmail) {
            showToast("info", "Falta el correo", "Escribe el correo del usuario.");
            return;
        }

        if (requiresExternalProfile && !selectedProfile) {
            showToast(
                "info",
                "Falta asignación",
                `Selecciona a qué ${getProfileLabel(profileType).toLowerCase()} corresponde este usuario.`
            );
            return;
        }

        let secondaryApp: FirebaseApp | null = null;

        try {
            setSaving(true);

            secondaryApp = getSecondaryFirebaseApp();
            const secondaryAuth = getAuth(secondaryApp);
            const temporaryPassword = generateTemporaryPassword();

            const credential = await createUserWithEmailAndPassword(
                secondaryAuth,
                cleanEmail,
                temporaryPassword
            );

            const uid = credential.user.uid;

            await updateProfile(credential.user, {
                displayName: cleanName,
            });

            const batch = writeBatch(db);

            batch.set(doc(db, "users", uid), {
                uid,
                displayName: cleanName,
                email: cleanEmail,
                role,
                estado,
                status: estado,
                activo: estado === "activo",
                profile:
                    role === "administrador"
                        ? {
                            type: "admin",
                            id: "",
                        }
                        : {
                            type: profileType,
                            id: selectedProfile?.id || "",
                        },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),

                // Campos de compatibilidad temporal
                sellerId: selectedProfile?.type === "seller" ? selectedProfile.id : "",
                distributorId:
                    selectedProfile?.type === "distributor" ? selectedProfile.id : "",
                mercaderistaId:
                    selectedProfile?.type === "merchandiser" ? selectedProfile.id : "",
            });

            if (selectedProfile) {
                const collectionName = PROFILE_COLLECTIONS[selectedProfile.type];

                batch.update(doc(db, collectionName, selectedProfile.id), {
                    userId: uid,
                    updatedAt: serverTimestamp(),
                });
            }

            await batch.commit();

            if (sendReset) {
                await sendPasswordResetEmail(auth, cleanEmail);
            }

            await signOut(secondaryAuth);

            showToast(
                "success",
                "Usuario creado",
                sendReset
                    ? "Se creó el usuario y se envió el correo para establecer contraseña."
                    : "Se creó el usuario correctamente."
            );

            window.setTimeout(() => {
                router.push("/admin/usuarios");
            }, 1200);
        } catch (error: any) {
            console.error("Error creando usuario:", error);

            const code = String(error?.code || "");

            if (code.includes("auth/email-already-in-use")) {
                showToast("error", "Correo ya registrado", "Ese correo ya tiene cuenta.");
            } else if (code.includes("auth/invalid-email")) {
                showToast("error", "Correo inválido", "Revisa el formato del correo.");
            } else if (code.includes("permission-denied")) {
                showToast(
                    "error",
                    "Sin permisos",
                    "Revisa las reglas de Firebase para crear usuarios y asignar perfiles."
                );
            } else {
                showToast(
                    "error",
                    "Error",
                    error?.message || "No se pudo crear el usuario."
                );
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {toast ? (
                <ToastLite
                    type={toast.type}
                    title={toast.title}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            ) : null}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0B3D91]">
                            Administración
                        </p>

                        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                            Crear usuario
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Crea el acceso a SIANA Vital, asigna rol y relaciona el usuario
                            con el perfil correspondiente.
                        </p>
                    </div>

                    <Link
                        href="/admin/usuarios"
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                        Volver a usuarios
                    </Link>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="text-lg font-black text-slate-900">
                            Datos de acceso
                        </h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Nombre completo
                                </label>
                                <input
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    placeholder="Ej. Carlos Andrés Pérez"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Correo electrónico
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="correo@dominio.com"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Rol
                                </label>
                                <select
                                    value={role}
                                    onChange={(event) => setRole(event.target.value as AppRole)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                                >
                                    {ROLE_OPTIONS.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Estado
                                </label>
                                <select
                                    value={estado}
                                    onChange={(event) =>
                                        setEstado(event.target.value as EstadoUsuario)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                                >
                                    {ESTADO_OPTIONS.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <input
                                type="checkbox"
                                checked={sendReset}
                                onChange={(event) => setSendReset(event.target.checked)}
                                className="mt-1 h-4 w-4"
                            />

                            <span>
                                <span className="block text-sm font-black text-slate-800">
                                    Enviar correo para establecer contraseña
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    Se creará una contraseña temporal segura y luego se enviará un
                                    correo para que el usuario defina su propia clave.
                                </span>
                            </span>
                        </label>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">
                                    Perfil correspondiente
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {role === "administrador"
                                        ? "El administrador no requiere asignación externa."
                                        : `Selecciona el registro de ${getProfileLabel(
                                            profileType
                                        ).toLowerCase()} que corresponde a este usuario.`}
                                </p>
                            </div>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[#0B3D91]">
                                {getProfileLabel(profileType)}
                            </span>
                        </div>

                        {requiresExternalProfile ? (
                            <>
                                <input
                                    value={profileSearch}
                                    onChange={(event) => setProfileSearch(event.target.value)}
                                    placeholder="Buscar por nombre, documento, correo, ciudad o ID..."
                                    className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                                />

                                <div className="mt-4 grid max-h-[430px] gap-3 overflow-y-auto pr-1">
                                    {availableProfiles.length > 0 ? (
                                        availableProfiles.map((profile) => {
                                            const selected = selectedProfile?.id === profile.id;

                                            return (
                                                <button
                                                    key={profile.id}
                                                    type="button"
                                                    onClick={() => setSelectedProfile(profile)}
                                                    className={[
                                                        "rounded-3xl border p-4 text-left transition",
                                                        selected
                                                            ? "border-[#0B3D91] bg-blue-50"
                                                            : "border-slate-200 bg-white hover:bg-slate-50",
                                                    ].join(" ")}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {profile.photoURL ? (
                                                            <img
                                                                src={profile.photoURL}
                                                                alt={profile.label}
                                                                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-200"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D91] text-sm font-black text-white">
                                                                {profile.label.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-black text-slate-900">
                                                                {profile.label}
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                                Documento:{" "}
                                                                <span className="font-black">
                                                                    {profile.document || "No registrado"}
                                                                </span>
                                                            </p>
                                                            <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                                                                {profile.email || profile.secondary || profile.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                            <p className="text-lg font-black text-slate-800">
                                                No hay perfiles disponibles
                                            </p>
                                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                                Es posible que todos los perfiles de este rol ya tengan
                                                usuario asignado o que aún no existan registros.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-sm font-black text-slate-900">
                                    Administrador del sistema
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Este usuario tendrá acceso al panel administrativo. No se
                                    asociará a vendedores ni distribuidores.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-black text-slate-900">
                        Resumen del usuario
                    </h2>

                    <div className="mt-5 space-y-4 text-sm">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                                Nombre
                            </p>
                            <p className="mt-1 font-black text-slate-900">
                                {displayName || "Sin nombre"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                                Correo
                            </p>
                            <p className="mt-1 font-semibold text-slate-700">
                                {email || "Sin correo"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">Rol</p>
                            <p className="mt-1 font-black text-[#0B3D91]">
                                {ROLE_OPTIONS.find((item) => item.value === role)?.label}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                                Estado
                            </p>
                            <p className="mt-1 font-black text-slate-900">{estado}</p>
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                                Perfil asignado
                            </p>
                            <p className="mt-1 font-black text-slate-900">
                                {selectedProfile?.label ||
                                    (role === "administrador"
                                        ? "No requiere"
                                        : "Sin seleccionar")}
                            </p>
                            {selectedProfile?.document ? (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Documento: {selectedProfile.document}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleCreateUser}
                        disabled={saving}
                        className="mt-6 w-full rounded-2xl bg-[#0B3D91] px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-950/15 transition hover:bg-[#092f70] disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                        {saving ? "Creando usuario..." : "Crear usuario"}
                    </button>

                    <p className="mt-4 text-xs leading-5 text-slate-400">
                        El usuario quedará registrado en Firebase Authentication y en la
                        colección <span className="font-black">users</span>.
                    </p>
                </aside>
            </section>
        </div>
    );
}