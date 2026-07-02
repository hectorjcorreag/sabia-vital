"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  RefreshCw,
  UsersRound,
  PhoneCall,
  CalendarCheck,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

import { db } from "@/lib/firebase";

import CustomerDetailsModal from "@/components/admin/telemercadeo/customers/CustomerDetailsModal";
import CustomerFilters from "@/components/admin/telemercadeo/customers/CustomerFilters";
import CustomerTable from "@/components/admin/telemercadeo/customers/CustomerTable";

import type {
  Customer,
  CustomerCallLog,
  CustomerDistributorOption,
  CustomerFiltersState,
  CustomerSellerOption,
  SellerRecord,
} from "@/components/admin/telemercadeo/customers/customerTypes";

import {
  CUSTOMER_CALL_LOGS_COLLECTION,
} from "@/components/admin/telemercadeo/customers/customerTypes";

import {
  customerMatchesSearch,
  sortCallLogsDesc,
  sortCustomersByLastActivity,
} from "@/components/admin/telemercadeo/customers/customerUtils";

const EMPTY_FILTERS: CustomerFiltersState = {
  search: "",
  sellerId: "all",
  distributorId: "all",
  merchandiserId: "all",
  status: "all",
  type: "all",
  hasAppointment: "all",
  hasPurchase: "all",
  city: "all",
};

type CurrentDistributorProfile = {
  uid: string;
  role: string;
  profileId: string;
  profileType: string;
  name: string;
};

export default function DistributorTelemarketingCustomersPage() {
  const [currentUser, setCurrentUser] =
    useState<CurrentDistributorProfile | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>([]);
  const [filters, setFilters] = useState<CustomerFiltersState>(EMPTY_FILTERS);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<CustomerCallLog[]>([]);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingUser(true);
      setError("");

      try {
        if (!firebaseUser) {
          setCurrentUser(null);
          setCustomers([]);
          setSellers([]);
          setError("No hay usuario autenticado.");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userSnap.exists()) {
          setCurrentUser(null);
          setCustomers([]);
          setSellers([]);
          setError(
            "El usuario tiene inicio de sesión, pero no tiene perfil en la plataforma."
          );
          return;
        }

        const raw = userSnap.data() as any;

        const profileId =
          raw.profileId ||
          raw.profile?.id ||
          raw.distributorId ||
          raw.assignedDistributorId ||
          "";

        const profileType =
          raw.profile?.type ||
          raw.type ||
          raw.role ||
          "distributor";

        const role = raw.role || raw.type || profileType;

        const name =
          raw.displayName ||
          raw.name ||
          raw.fullName ||
          raw.profile?.name ||
          "Distribuidor";

        const profile: CurrentDistributorProfile = {
          uid: firebaseUser.uid,
          role,
          profileId,
          profileType,
          name,
        };

        setCurrentUser(profile);
      } catch (e: any) {
        console.error("Error cargando usuario distribuidor:", e);
        setError(
          e?.message ||
            "No fue posible validar el usuario distribuidor en la plataforma."
        );
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    loadDistributorCustomers(currentUser);
  }, [currentUser]);

  async function loadDistributorCustomers(profile = currentUser) {
    if (!profile) return;

    setLoading(true);
    setError("");

    try {
      if (!profile.profileId) {
        setCustomers([]);
        setSellers([]);
        setError(
          "El distribuidor autenticado no tiene profileId o profile.id asignado."
        );
        return;
      }

      const sellersSnap = await getDocs(
        query(
          collection(db, "sellers"),
          where("distributorId", "==", profile.profileId)
        )
      );

      let sellersData: SellerRecord[] = sellersSnap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        const fullName =
          raw.fullName ||
          raw.name ||
          [raw.firstName, raw.lastName].filter(Boolean).join(" ") ||
          "Sin nombre";

        return {
          id: docSnap.id,
          uid: raw.uid || raw.userUid || raw.authUid || "",

          firstName: raw.firstName || "",
          lastName: raw.lastName || "",
          fullName,
          name: raw.name || fullName,

          distributorId:
            raw.distributorId ||
            raw.assignedDistributorId ||
            raw.distributor?.id ||
            profile.profileId,

          distributorName:
            raw.distributorName ||
            raw.assignedDistributorName ||
            raw.distributor?.name ||
            profile.name ||
            "Distribuidor",

          distributorUid:
            raw.distributorUid ||
            raw.assignedDistributorUid ||
            raw.distributor?.uid ||
            profile.uid,
        };
      });

      /**
       * Respaldo:
       * Si en algunos vendedores aún no quedó distributorId,
       * intentamos por distributorUid.
       */
      if (sellersData.length === 0) {
        const sellersByUidSnap = await getDocs(
          query(
            collection(db, "sellers"),
            where("distributorUid", "==", profile.uid)
          )
        );

        sellersData = sellersByUidSnap.docs.map((docSnap) => {
          const raw = docSnap.data() as any;

          const fullName =
            raw.fullName ||
            raw.name ||
            [raw.firstName, raw.lastName].filter(Boolean).join(" ") ||
            "Sin nombre";

          return {
            id: docSnap.id,
            uid: raw.uid || raw.userUid || raw.authUid || "",

            firstName: raw.firstName || "",
            lastName: raw.lastName || "",
            fullName,
            name: raw.name || fullName,

            distributorId:
              raw.distributorId ||
              raw.assignedDistributorId ||
              raw.distributor?.id ||
              profile.profileId,

            distributorName:
              raw.distributorName ||
              raw.assignedDistributorName ||
              raw.distributor?.name ||
              profile.name ||
              "Distribuidor",

            distributorUid:
              raw.distributorUid ||
              raw.assignedDistributorUid ||
              raw.distributor?.uid ||
              profile.uid,
          };
        });
      }

      setSellers(sellersData);

      if (sellersData.length === 0) {
        setCustomers([]);
        setError(
          "Este distribuidor no tiene vendedores asociados en la colección sellers."
        );
        return;
      }

      const sellerIds = sellersData.map((seller) => seller.id).filter(Boolean);
      const sellerUids = sellersData.map((seller) => seller.uid).filter(Boolean);

      const customersMap = new Map<string, Customer>();

      const sellerById = new Map<string, SellerRecord>();
      const sellerByUid = new Map<string, SellerRecord>();

      sellersData.forEach((seller) => {
        sellerById.set(seller.id, seller);

        if (seller.uid) {
          sellerByUid.set(seller.uid, seller);
        }
      });

      const customersRef = collection(db, "customers");

      const idChunks = chunkArray(sellerIds, 10);
      const uidChunks = chunkArray(sellerUids, 10);

      for (const chunk of idChunks) {
        const snap = await getDocs(
          query(customersRef, where("assignedSellerId", "in", chunk))
        );

        snap.docs.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          const customer = mapCustomer(docSnap.id, raw, sellerById, sellerByUid, profile);
          customersMap.set(customer.id, customer);
        });
      }

      for (const chunk of uidChunks) {
        const snap = await getDocs(
          query(customersRef, where("assignedSellerUid", "in", chunk))
        );

        snap.docs.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          const customer = mapCustomer(docSnap.id, raw, sellerById, sellerByUid, profile);
          customersMap.set(customer.id, customer);
        });
      }

      /**
       * Consulta adicional:
       * Por si algunos customers ya guardan distributorId directamente.
       * No dependemos de esto, pero ayuda si algunos registros sí lo tienen.
       */
      const directDistributorSnap = await getDocs(
        query(customersRef, where("distributorId", "==", profile.profileId))
      );

      directDistributorSnap.docs.forEach((docSnap) => {
        const raw = docSnap.data() as any;
        const customer = mapCustomer(docSnap.id, raw, sellerById, sellerByUid, profile);
        customersMap.set(customer.id, customer);
      });

      setCustomers(Array.from(customersMap.values()).sort(sortCustomersByLastActivity));
    } catch (e: any) {
      console.error("Error cargando customers del distribuidor:", e);
      setError(
        e?.message ||
          "No fue posible cargar los clientes y referidos del distribuidor."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setSelectedLogs([]);
    setLoadingLogs(true);

    try {
      const logsSnap = await getDocs(
        query(
          collection(
            db,
            "customers",
            customer.id,
            CUSTOMER_CALL_LOGS_COLLECTION
          ),
          orderBy("createdAt", "desc")
        )
      );

      const logs: CustomerCallLog[] = logsSnap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        return {
          id: docSnap.id,

          customerId: raw.customerId || customer.id,

          callAt: raw.callAt || null,
          callDateKey: raw.callDateKey || "",
          createdAt: raw.createdAt || null,

          newStatus: raw.newStatus || "",
          result: raw.result || raw.callResult || "",
          observation: raw.observation || raw.notes || raw.lastObservation || "",
          notes: raw.notes || "",

          appointmentCreated: raw.appointmentCreated || false,
          appointmentId: raw.appointmentId || "",

          nextActionAt: raw.nextActionAt || null,
          nextCallAt: raw.nextCallAt || null,

          sellerId: raw.sellerId || raw.assignedSellerId || "",
          sellerName: raw.sellerName || raw.assignedSellerName || "",

          merchandiserId: raw.merchandiserId || "",
          merchandiserName: raw.merchandiserName || "",

          createdById: raw.createdById || "",
          createdByName: raw.createdByName || "",
          createdByRole: raw.createdByRole || "",
          createdByUid: raw.createdByUid || "",
        };
      });

      setSelectedLogs(logs.sort(sortCallLogsDesc));
    } catch (e) {
      console.error("Error cargando historial del customer:", e);
      setSelectedLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  const sellerOptions = useMemo<CustomerSellerOption[]>(() => {
    return sellers
      .map((seller) => ({
        id: seller.id,
        name: seller.fullName || seller.name || "Sin vendedor",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sellers]);

  const distributorOptions = useMemo<CustomerDistributorOption[]>(() => {
    if (!currentUser) return [];

    return [
      {
        id: currentUser.profileId,
        name: currentUser.name || "Distribuidor",
      },
    ];
  }, [currentUser]);

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(
        customers
          .map((customer) => customer.city?.trim())
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (!customerMatchesSearch(customer, filters.search)) return false;

      if (
        filters.sellerId !== "all" &&
        customer.assignedSellerId !== filters.sellerId
      ) {
        return false;
      }

      if (
        filters.status !== "all" &&
        customer.customerStatus !== filters.status
      ) {
        return false;
      }

      if (filters.type !== "all" && customer.customerType !== filters.type) {
        return false;
      }

      if (
        filters.hasAppointment === "yes" &&
        customer.hasAppointment !== true
      ) {
        return false;
      }

      if (
        filters.hasAppointment === "no" &&
        customer.hasAppointment === true
      ) {
        return false;
      }

      if (filters.hasPurchase === "yes" && customer.hasPurchase !== true) {
        return false;
      }

      if (filters.hasPurchase === "no" && customer.hasPurchase === true) {
        return false;
      }

      if (filters.city !== "all" && customer.city !== filters.city) {
        return false;
      }

      return true;
    });
  }, [customers, filters]);

  const metrics = useMemo(() => {
    return {
      total: filteredCustomers.length,
      pendingCall: filteredCustomers.filter(
        (item) =>
          !item.lastCallAt ||
          ["new", "pending", "not_answered", ""].includes(
            String(item.customerStatus || "").toLowerCase()
          )
      ).length,
      withAppointment: filteredCustomers.filter((item) => item.hasAppointment)
        .length,
      withPurchase: filteredCustomers.filter((item) => item.hasPurchase).length,
    };
  }, [filteredCustomers]);

  const sellerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        total: number;
        pendingCall: number;
        withAppointment: number;
        withPurchase: number;
      }
    >();

    filteredCustomers.forEach((customer) => {
      const sellerId = customer.assignedSellerId || "sin-vendedor";
      const sellerName = customer.assignedSellerName || "Sin vendedor";

      if (!map.has(sellerId)) {
        map.set(sellerId, {
          sellerId,
          sellerName,
          total: 0,
          pendingCall: 0,
          withAppointment: 0,
          withPurchase: 0,
        });
      }

      const record = map.get(sellerId)!;

      record.total += 1;

      if (
        !customer.lastCallAt ||
        ["new", "pending", "not_answered", ""].includes(
          String(customer.customerStatus || "").toLowerCase()
        )
      ) {
        record.pendingCall += 1;
      }

      if (customer.hasAppointment) record.withAppointment += 1;
      if (customer.hasPurchase) record.withPurchase += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredCustomers]);

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
        <section className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Validando perfil del distribuidor...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
                <UsersRound className="h-4 w-4" />
                Gestión de distribuidor
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Clientes y referidos de la distribuidora
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
                Consulta la gestión comercial de tu equipo, revisa clientes y referidos por vendedor, estado e historial de llamadas.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/distribuidor"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>

              <button
                type="button"
                onClick={() => loadDistributorCustomers()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Registros visibles"
            value={metrics.total}
            helper="Clientes y referidos del equipo"
          />

          <MetricCard
            icon={<PhoneCall className="h-5 w-5" />}
            label="Pendientes por gestión"
            value={metrics.pendingCall}
            helper="Sin llamada o en seguimiento"
          />

          <MetricCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Con cita"
            value={metrics.withAppointment}
            helper="Tienen cita programada"
          />

          <MetricCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Con compra"
            value={metrics.withPurchase}
            helper="Clientes convertidos"
          />
        </section>

        <SellerStatsTable stats={sellerStats} />

        <CustomerFilters
          filters={filters}
          sellers={sellerOptions}
          distributors={distributorOptions}
          cities={cityOptions}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              Cargando clientes y referidos de la distribuidora...
            </p>
          </section>
        ) : (
          <CustomerTable
            customers={filteredCustomers}
            onSelect={openCustomer}
          />
        )}
      </section>

      <CustomerDetailsModal
        customer={selectedCustomer}
        logs={selectedLogs}
        loadingLogs={loadingLogs}
        onClose={() => {
          setSelectedCustomer(null);
          setSelectedLogs([]);
        }}
      />
    </main>
  );
}

function mapCustomer(
  id: string,
  raw: any,
  sellerById: Map<string, SellerRecord>,
  sellerByUid: Map<string, SellerRecord>,
  distributorProfile: CurrentDistributorProfile
): Customer {
  const seller =
    sellerById.get(raw.assignedSellerId || "") ||
    sellerByUid.get(raw.assignedSellerUid || "");

  return {
    id,

    fullName: raw.fullName || "",
    phone: raw.phone || "",
    phoneNormalized: raw.phoneNormalized || "",
    secondaryPhone: raw.secondaryPhone || "",
    secondaryPhoneNormalized: raw.secondaryPhoneNormalized || "",
    email: raw.email || "",
    city: raw.city || "",
    address: raw.address || "",

    assignedSellerId: raw.assignedSellerId || seller?.id || "",
    assignedSellerName:
      raw.assignedSellerName ||
      seller?.fullName ||
      seller?.name ||
      "Sin vendedor",
    assignedSellerUid: raw.assignedSellerUid || seller?.uid || "",

    assignedMerchandiserId: raw.assignedMerchandiserId || "",
    assignedMerchandiserName:
      raw.assignedMerchandiserName || "Sin mercaderista",
    assignedMerchandiserUid: raw.assignedMerchandiserUid || "",

    distributorId:
      raw.distributorId ||
      raw.assignedDistributorId ||
      seller?.distributorId ||
      distributorProfile.profileId ||
      "",

    distributorName:
      raw.distributorName ||
      raw.assignedDistributorName ||
      seller?.distributorName ||
      distributorProfile.name ||
      "Distribuidor",

    distributorUid:
      raw.distributorUid ||
      raw.assignedDistributorUid ||
      seller?.distributorUid ||
      distributorProfile.uid ||
      "",

    customerStatus: raw.customerStatus || "",
    customerType: raw.customerType || "",

    origin: raw.origin || "",
    source: raw.source || "",
    priority: Number(raw.priority || 0),

    callAttempts: Number(raw.callAttempts || 0),
    lastCallAt: raw.lastCallAt || null,
    lastCallResult: raw.lastCallResult || "",
    lastObservation: raw.lastObservation || "",
    nextCallAt: raw.nextCallAt || null,
    nextActionAt: raw.nextActionAt || null,

    hasAppointment: Boolean(raw.hasAppointment),
    nextAppointmentAt: raw.nextAppointmentAt || null,
    nextAppointmentId: raw.nextAppointmentId || "",

    hasPurchase: Boolean(raw.hasPurchase),
    firstPurchaseAt: raw.firstPurchaseAt || null,
    totalPurchases: Number(raw.totalPurchases || 0),
    totalPurchasedAmount: Number(raw.totalPurchasedAmount || 0),

    duplicateOfCustomerId: raw.duplicateOfCustomerId || "",
    duplicateReason: raw.duplicateReason || "",

    createdAt: raw.createdAt || null,
    createdById: raw.createdById || "",
    createdByName: raw.createdByName || "",
    createdByRole: raw.createdByRole || "",
    createdByUid: raw.createdByUid || "",
    createdDateKey: raw.createdDateKey || "",
    createdMonthKey: raw.createdMonthKey || "",
    updatedAt: raw.updatedAt || null,

    visibleToSellerIds: raw.visibleToSellerIds || [],
    visibleToSellerUids: raw.visibleToSellerUids || [],

    visibleToMerchandiserIds: raw.visibleToMerchandiserIds || [],
    visibleToMerchandiserUids: raw.visibleToMerchandiserUids || [],
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>

      <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
    </article>
  );
}

function SellerStatsTable({
  stats,
}: {
  stats: {
    sellerId: string;
    sellerName: string;
    total: number;
    pendingCall: number;
    withAppointment: number;
    withPurchase: number;
  }[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 p-5">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
          <BarChart3 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">
            Resumen por vendedor
          </h2>
          <p className="text-sm text-slate-500">
            Visión rápida de la gestión comercial del equipo.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-black">Vendedor</th>
              <th className="px-4 py-3 font-black">Clientes / referidos</th>
              <th className="px-4 py-3 font-black">Pendientes</th>
              <th className="px-4 py-3 font-black">Con cita</th>
              <th className="px-4 py-3 font-black">Con compra</th>
              <th className="px-4 py-3 font-black">Conversión</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {stats.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center font-bold text-slate-400"
                >
                  No hay vendedores con registros visibles.
                </td>
              </tr>
            ) : (
              stats.map((item) => {
                const conversion =
                  item.total > 0
                    ? Math.round((item.withPurchase / item.total) * 100)
                    : 0;

                return (
                  <tr key={item.sellerId} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 font-black text-slate-950">
                      {item.sellerName}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-700">
                      {item.total}
                    </td>
                    <td className="px-4 py-4 font-bold text-amber-700">
                      {item.pendingCall}
                    </td>
                    <td className="px-4 py-4 font-bold text-lime-700">
                      {item.withAppointment}
                    </td>
                    <td className="px-4 py-4 font-bold text-emerald-700">
                      {item.withPurchase}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {conversion}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}