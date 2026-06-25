"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type AppRole =
  | "administrador"
  | "vendedor"
  | "distribuidor"
  | "mercaderista"
  | "pendiente";

type ProfileType = "admin" | "seller" | "distributor" | "merchandiser" | null;

type EstadoUsuario = "activo" | "pendiente" | "inactivo";

type UserDoc = {
  docId: string;
  uid?: string;
  displayName?: string;
  email?: string;
  role?: string;
  estado?: string;
  status?: string;
  activo?: boolean;
  createdAt?: any;
  updatedAt?: any;
  profile?: {
    type?: ProfileType;
    id?: string;
  };

  sellerId?: string;
  distributorId?: string;
  mercaderistaId?: string;
};

type AssignableProfile = {
  id: string;
  type: Exclude<ProfileType, null>;
  label: string;
  document: string;
  email: string;
  secondary: string;
  userId: string;
  photoURL: string;
};

const ROLE_OPTIONS: { value: AppRole; label: string; profileType: ProfileType }[] =
  [
    { value: "administrador", label: "Administrador", profileType: "admin" },
    { value: "vendedor", label: "Vendedor", profileType: "seller" },
    {
      value: "distribuidor",
      label: "Distribuidor",
      profileType: "distributor",
    },
    {
      value: "mercaderista",
      label: "Mercaderista",
      profileType: "merchandiser",
    },
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
    };
    
  }
 
  return "";
}
 function getFullName(data: Record<string, any>) {
  const firstName = getTextValue(
    data.firstName,
    data.personal?.firstName,
    data.nombres,
    data.personal?.nombres
  );

  const lastName = getTextValue(
    data.lastName,
    data.personal?.lastName,
    data.apellidos,
    data.personal?.apellidos
  );

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "";
}

function toMillis(ts: any): number {
  try {
    return ts?.toMillis ? ts.toMillis() : 0;
  } catch {
    return 0;
  }
}

function normalizeRole(role?: string | null): AppRole {
  const cleanRole = String(role || "").toLowerCase().trim();

  if (cleanRole === "administrador" || cleanRole === "admin") {
    return "administrador";
  }

  if (cleanRole === "vendedor" || cleanRole === "seller") {
    return "vendedor";
  }

  if (cleanRole === "distribuidor" || cleanRole === "distributor") {
    return "distribuidor";
  }

  if (cleanRole === "mercaderista" || cleanRole === "merchandiser") {
    return "mercaderista";
  }

  return "pendiente";
}

function normalizeEstado(user: UserDoc): EstadoUsuario {
  const rawEstado = String(user.estado || user.status || "")
    .toLowerCase()
    .trim();

  if (rawEstado === "active" || rawEstado === "activo") return "activo";
  if (rawEstado === "inactive" || rawEstado === "inactivo") return "inactivo";
  if (rawEstado === "pending" || rawEstado === "pendiente") return "pendiente";
  if (user.activo === false) return "inactivo";

  return "activo";
}

function getProfileTypeByRole(role: AppRole): ProfileType {
  return ROLE_OPTIONS.find((item) => item.value === role)?.profileType ?? null;
}

function getRoleLabel(role: AppRole) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? "Pendiente";
}

function getProfileLabel(profileType: ProfileType) {
  if (profileType === "admin") return "Administrador";
  if (profileType === "seller") return "Vendedor";
  if (profileType === "distributor") return "Distribuidor";
  if (profileType === "merchandiser") return "Mercaderista";
  return "Sin perfil";
}

function getProfileId(user: UserDoc) {
  return (
    getTextValue(user.profile?.id) ||
    getTextValue(user.sellerId) ||
    getTextValue(user.distributorId) ||
    getTextValue(user.mercaderistaId)
  );
}

function getProfileType(user: UserDoc): ProfileType {
  return user.profile?.type || getProfileTypeByRole(normalizeRole(user.role));
}

function getCollectionByProfileType(profileType: ProfileType) {
  if (!profileType || profileType === "admin") return null;

  if (profileType === "seller") return PROFILE_COLLECTIONS.seller;
  if (profileType === "distributor") return PROFILE_COLLECTIONS.distributor;
  if (profileType === "merchandiser") return PROFILE_COLLECTIONS.merchandiser;

  return null;
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function buildAssignableProfile(
  id: string,
  type: Exclude<ProfileType, null>,
  data: Record<string, any>
): AssignableProfile {
  const fullNameFromParts = getFullName(data);

  const label =
    fullNameFromParts ||
    getTextValue(
      data.displayName,
      data.personal?.displayName,
      data.fullName,
      data.personal?.fullName,
      data.name,
      data.personal?.name,
      data.nombre,
      data.personal?.nombre,
      data.businessName,
      data.razonSocial,
      data.email,
      data.personal?.email
    ) ||
    `Registro ${id}`;

  const documentNumber = getTextValue(
    data.document,
    data.personal?.document,
    data.documento,
    data.personal?.documento,
    data.documentNumber,
    data.personal?.documentNumber,
    data.identification,
    data.personal?.identification,
    data.cedula,
    data.personal?.cedula,
    data.nit,
    data.personal?.nit,
    data.idNumber,
    data.personal?.idNumber
  );

  const email = getTextValue(
    data.email,
    data.personal?.email,
    data.correo,
    data.personal?.correo
  );

  const secondary = getTextValue(
    data.city,
    data.personal?.city,
    data.ciudad,
    data.personal?.ciudad,
    data.zone,
    data.personal?.zone,
    data.zona,
    data.personal?.zona,
    data.phone,
    data.personal?.phone,
    data.telefono,
    data.personal?.telefono,
    data.celular,
    data.personal?.celular
  );

  const photoURL = getTextValue(
    data.photo?.url,
    data.personal?.photo?.url,
    data.logo?.url,
    data.photoURL,
    data.personal?.photoURL,
    data.logoURL,
    data.avatarURL,
    data.imageURL
  );

  return {
    id,
    type,
    label,
    document: documentNumber,
    email,
    secondary,
    userId: getTextValue(data.userId),
    photoURL,
  };
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

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [sellers, setSellers] = useState<AssignableProfile[]>([]);
  const [distributors, setDistributors] = useState<AssignableProfile[]>([]);
  const [merchandisers, setMerchandisers] = useState<AssignableProfile[]>([]);

  const [query, setQuery] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [sendingResetFor, setSendingResetFor] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null>(null);

  const [assigningUser, setAssigningUser] = useState<UserDoc | null>(null);
  const [profileSearch, setProfileSearch] = useState("");

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
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          docId: item.id,
          ...(item.data() as any),
        })) as UserDoc[];

        data.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setUsers(data);
      },
      (error) => {
        console.error("Error cargando usuarios:", error);
        showToast("error", "Error", "No se pudieron cargar los usuarios.");
      }
    );

    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    const unsubscribeSellers = onSnapshot(
      collection(db, "sellers"),
      (snapshot) => {
        const data = snapshot.docs.map((item) =>
          buildAssignableProfile(item.id, "seller", item.data() as any)
        );

        data.sort((a, b) => a.label.localeCompare(b.label));
        setSellers(data);
      },
      (error) => {
        console.error("Error cargando vendedores:", error);
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
      },
      (error) => {
        console.error("Error cargando distribuidores:", error);
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
      (error) => {
        console.error("Error cargando mercaderistas:", error);
      }
    );

    return () => unsubscribeMerchandisers();
  }, []);

  const allProfiles = useMemo(() => {
    return [...sellers, ...distributors, ...merchandisers];
  }, [sellers, distributors, merchandisers]);

  const filteredUsers = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) return users;

    return users.filter((user) => {
      const role = normalizeRole(user.role);
      const estado = normalizeEstado(user);
      const profileId = getProfileId(user);
      const assigned = allProfiles.find(
        (profile) => profile.id === profileId && profile.type === getProfileType(user)
      );

      return [
        user.displayName,
        user.email,
        user.uid,
        user.docId,
        role,
        estado,
        profileId,
        assigned?.label,
        assigned?.document,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [users, query, allProfiles]);

  const assignableProfiles = useMemo(() => {
    if (!assigningUser) return [];

    const role = normalizeRole(assigningUser.role);
    const profileType = getProfileTypeByRole(role);
    const currentProfileId = getProfileId(assigningUser);
    const userId = assigningUser.uid || assigningUser.docId;

    let profiles: AssignableProfile[] = [];

    if (profileType === "seller") profiles = sellers;
    if (profileType === "distributor") profiles = distributors;
    if (profileType === "merchandiser") profiles = merchandisers;

    const text = profileSearch.trim().toLowerCase();

    return profiles.filter((profile) => {
      const isAvailable =
        !profile.userId || profile.userId === userId || profile.id === currentProfileId;

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
  }, [
    assigningUser,
    sellers,
    distributors,
    merchandisers,
    profileSearch,
  ]);

  function getAssignedProfile(user: UserDoc) {
    const profileId = getProfileId(user);
    const profileType = getProfileType(user);

    if (!profileId || !profileType) return null;

    return allProfiles.find(
      (profile) => profile.id === profileId && profile.type === profileType
    );
  }

  async function clearPreviousProfileAssignment(
    batch: ReturnType<typeof writeBatch>,
    user: UserDoc
  ) {
    const previousProfileType = getProfileType(user);
    const previousProfileId = getProfileId(user);
    const previousCollection = getCollectionByProfileType(previousProfileType);

    if (!previousCollection || !previousProfileId) return;

    batch.update(doc(db, previousCollection, previousProfileId), {
      userId: "",
      updatedAt: serverTimestamp(),
    });
  }

  async function handleRoleChange(user: UserDoc, nextRoleRaw: string) {
    const nextRole = normalizeRole(nextRoleRaw);
    const profileType = getProfileTypeByRole(nextRole);

    try {
      setSavingUserId(user.docId);

      const batch = writeBatch(db);

      await clearPreviousProfileAssignment(batch, user);

      const userRef = doc(db, "users", user.docId);

      batch.update(userRef, {
        role: nextRole,
        estado: nextRole === "pendiente" ? "pendiente" : normalizeEstado(user),
        activo:
          nextRole === "pendiente" ? false : normalizeEstado(user) === "activo",
        profile:
          nextRole === "administrador"
            ? {
                type: "admin",
                id: "",
              }
            : {
                type: profileType,
                id: "",
              },
        sellerId: "",
        distributorId: "",
        mercaderistaId: "",
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      showToast(
        "success",
        "Rol actualizado",
        nextRole === "administrador"
          ? "El administrador no requiere perfil externo."
          : "Ahora puedes asignar el perfil correspondiente."
      );
    } catch (error: any) {
      console.error("Error cambiando rol:", error);
      showToast("error", "Error", error?.message || "No se pudo cambiar el rol.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleEstadoChange(user: UserDoc, nextEstadoRaw: string) {
    const nextEstado = nextEstadoRaw as EstadoUsuario;

    try {
      setSavingUserId(user.docId);

      await updateDoc(doc(db, "users", user.docId), {
        estado: nextEstado,
        status: nextEstado,
        activo: nextEstado === "activo",
        updatedAt: serverTimestamp(),
      });

      showToast("success", "Estado actualizado");
    } catch (error: any) {
      console.error("Error actualizando estado:", error);
      showToast("error", "Error", error?.message || "No se pudo actualizar.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function assignProfileToUser(profile: AssignableProfile) {
    if (!assigningUser) return;

    const role = normalizeRole(assigningUser.role);
    const expectedProfileType = getProfileTypeByRole(role);

    if (!expectedProfileType || expectedProfileType === "admin") {
      showToast("info", "Sin asignación", "Este rol no requiere perfil externo.");
      return;
    }

    if (profile.type !== expectedProfileType) {
      showToast(
        "error",
        "Perfil incorrecto",
        "El perfil seleccionado no corresponde al rol del usuario."
      );
      return;
    }

    try {
      setSavingUserId(assigningUser.docId);

      const batch = writeBatch(db);

      await clearPreviousProfileAssignment(batch, assigningUser);

      const userRef = doc(db, "users", assigningUser.docId);
      const profileCollection = getCollectionByProfileType(profile.type);

      if (!profileCollection) {
        showToast("error", "Error", "No existe colección para este perfil.");
        return;
      }

      const userId = assigningUser.uid || assigningUser.docId;

      batch.update(userRef, {
        role,
        profile: {
          type: profile.type,
          id: profile.id,
        },
        sellerId: profile.type === "seller" ? profile.id : "",
        distributorId: profile.type === "distributor" ? profile.id : "",
        mercaderistaId: profile.type === "merchandiser" ? profile.id : "",
        updatedAt: serverTimestamp(),
      });

      batch.update(doc(db, profileCollection, profile.id), {
        userId,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      setAssigningUser(null);
      setProfileSearch("");

      showToast(
        "success",
        "Perfil asignado",
        `${profile.label} quedó asociado al usuario.`
      );
    } catch (error: any) {
      console.error("Error asignando perfil:", error);
      showToast(
        "error",
        "Error",
        error?.message || "No se pudo asignar el perfil."
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function unassignProfile(user: UserDoc) {
    const profileType = getProfileType(user);

    if (!profileType || profileType === "admin") return;

    try {
      setSavingUserId(user.docId);

      const batch = writeBatch(db);

      await clearPreviousProfileAssignment(batch, user);

      batch.update(doc(db, "users", user.docId), {
        profile: {
          type: profileType,
          id: "",
        },
        sellerId: "",
        distributorId: "",
        mercaderistaId: "",
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      showToast("success", "Perfil desasignado");
    } catch (error: any) {
      console.error("Error desasignando perfil:", error);
      showToast(
        "error",
        "Error",
        error?.message || "No se pudo desasignar el perfil."
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function resetPassword(email?: string) {
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      showToast("info", "Sin correo", "Este usuario no tiene correo registrado.");
      return;
    }

    try {
      setSendingResetFor(cleanEmail);
      await sendPasswordResetEmail(auth, cleanEmail);

      showToast(
        "success",
        "Correo enviado",
        "Se envió el enlace de restablecimiento de contraseña."
      );
    } catch (error: any) {
      console.error("Error enviando recuperación:", error);
      showToast(
        "error",
        "Error",
        error?.message || "No se pudo enviar el correo."
      );
    } finally {
      setSendingResetFor(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {toast ? (
        <ToastLite
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}

      {assigningUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0B3D91]">
                    Asignar perfil
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {assigningUser.displayName || "Usuario sin nombre"}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {assigningUser.email || "Sin correo"} ·{" "}
                    {getRoleLabel(normalizeRole(assigningUser.role))}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAssigningUser(null);
                    setProfileSearch("");
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                >
                  Cerrar
                </button>
              </div>

              <input
                value={profileSearch}
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder="Buscar por nombre, documento, correo, ciudad o ID..."
                className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
              />
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-4 sm:p-6">
              {assignableProfiles.length > 0 ? (
                <div className="grid gap-3">
                  {assignableProfiles.map((profile) => {
                    const isCurrent = getProfileId(assigningUser) === profile.id;
                    const isSaving = savingUserId === assigningUser.docId;

                    return (
                      <article
                        key={profile.id}
                        className={[
                          "rounded-3xl border p-4 transition",
                          isCurrent
                            ? "border-[#0B3D91] bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            {profile.photoURL ? (
                              <img
                                src={profile.photoURL}
                                alt={profile.label}
                                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D91] text-sm font-black text-white">
                                {getInitials(profile.label)}
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

                          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            <span
                              className={[
                                "rounded-full px-3 py-1 text-[11px] font-black uppercase",
                                isCurrent
                                  ? "bg-[#0B3D91] text-white"
                                  : "bg-emerald-50 text-emerald-700",
                              ].join(" ")}
                            >
                              {isCurrent ? "Asignado actualmente" : "Disponible"}
                            </span>

                            <button
                              type="button"
                              disabled={isSaving || isCurrent}
                              onClick={() => assignProfileToUser(profile)}
                              className="rounded-2xl bg-[#0B3D91] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#092f70] disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {isCurrent ? "Ya asignado" : "Asignar este perfil"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-lg font-black text-slate-800">
                    No hay perfiles disponibles
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Revisa si todos los perfiles de este rol ya tienen usuario
                    asignado o cambia el término de búsqueda.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0B3D91]">
              Administración
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Usuarios
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Gestiona roles, estado de acceso y asignación de perfiles para
              cada usuario de SIANA Vital.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/admin/configuracion"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Configuración
            </Link>

            <Link
              href="/admin/usuarios/nuevo"
              className="inline-flex items-center justify-center rounded-2xl bg-[#0B3D91] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-[#092f70]"
            >
              + Crear usuario
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, correo, rol, estado, documento o perfil..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10 md:max-w-md"
          />

          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-[#0B3D91]">
            {filteredUsers.length} usuario(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">Usuario</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3">Perfil asignado</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Identificador</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const role = normalizeRole(user.role);
                const estado = normalizeEstado(user);
                const profileType = getProfileTypeByRole(role);
                const assignedProfile = getAssignedProfile(user);
                const profileId = getProfileId(user);
                const isSaving = savingUserId === user.docId;
                const isResetting =
                  sendingResetFor ===
                  String(user.email || "").trim().toLowerCase();

                const canAssign =
                  role !== "administrador" &&
                  role !== "pendiente" &&
                  profileType !== null &&
                  profileType !== "admin";

                return (
                  <tr
                    key={user.docId}
                    className="border-b border-slate-100 align-top transition hover:bg-slate-50"
                  >
                    <td className="px-3 py-4">
                      <div className="font-black text-slate-900">
                        {user.displayName || "Sin nombre"}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {user.email || "Sin correo"}
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <select
                        value={role}
                        disabled={isSaving}
                        onChange={(event) =>
                          handleRoleChange(user, event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                      >
                        {ROLE_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-4">
                      <div className="space-y-2">
                        {role === "administrador" ? (
                          <>
                            <p className="text-sm font-black text-slate-900">
                              Administrador del sistema
                            </p>

                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-500">
                              No requiere asignación
                            </span>
                          </>
                        ) : assignedProfile ? (
                          <>
                            <p className="text-sm font-black text-slate-900">
                              {assignedProfile.label}
                            </p>

                            <p className="text-xs font-semibold text-slate-500">
                              Documento:{" "}
                              <span className="font-black">
                                {assignedProfile.document || "No registrado"}
                              </span>
                            </p>

                            <p className="text-[11px] font-semibold text-slate-400">
                              {getProfileLabel(profileType)} · {profileId}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-black text-slate-400">
                              Sin perfil asignado
                            </p>

                            <p className="text-xs font-semibold text-slate-400">
                              {getProfileLabel(profileType)}
                            </p>
                          </>
                        )}

                        {canAssign ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => {
                                setAssigningUser(user);
                                setProfileSearch("");
                              }}
                              className="rounded-2xl bg-[#0B3D91] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#092f70] disabled:bg-slate-300"
                            >
                              {assignedProfile ? "Cambiar perfil" : "Asignar perfil"}
                            </button>

                            {assignedProfile ? (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => unassignProfile(user)}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:bg-slate-100"
                              >
                                Desasignar
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {role === "mercaderista" &&
                        merchandisers.length === 0 ? (
                          <p className="text-[11px] font-bold text-amber-600">
                            Colección merchandisers vacía o pendiente.
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <select
                        value={estado}
                        disabled={isSaving}
                        onChange={(event) =>
                          handleEstadoChange(user, event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0B3D91]/50 focus:ring-4 focus:ring-[#0B3D91]/10"
                      >
                        {ESTADO_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <div className="mt-2">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-black uppercase",
                            estado === "activo"
                              ? "bg-emerald-50 text-emerald-700"
                              : estado === "inactivo"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {estado}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <p className="font-mono text-xs text-slate-500">
                        UID: {user.uid || "-"}
                      </p>

                      <p className="mt-1 font-mono text-xs text-slate-400">
                        Doc: {user.docId}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={!user.email || isResetting}
                          onClick={() => resetPassword(user.email)}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-[#0B3D91] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {isResetting ? "Enviando..." : "Restablecer clave"}
                        </button>

                        <Link
                          href={`/admin/usuarios/${user.docId}`}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-sm font-semibold text-slate-400"
                  >
                    No hay usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}