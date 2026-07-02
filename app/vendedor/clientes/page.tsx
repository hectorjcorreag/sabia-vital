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

type CurrentUserProfile = {
  uid: string;
  role: string;
  profileId: string;
  profileType: string;
  name: string;
};

export default function SellerTelemarketingCustomersPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(
    null
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<CustomerFiltersState>(EMPTY_FILTERS);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
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
          setError("No hay usuario autenticado.");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userSnap.exists()) {
          setCurrentUser(null);
          setCustomers([]);
          setError(
            "El usuario tiene inicio de sesión, pero no tiene perfil en la plataforma."
          );
          return;
        }

        const raw = userSnap.data() as any;

        const profileId =
          raw.profileId ||
          raw.profile?.id ||
          raw.sellerId ||
          raw.assignedSellerId ||
          "";

        const profileType =
          raw.profile?.type ||
          raw.type ||
          raw.role ||
          "seller";

        const role = raw.role || raw.type || profileType;

        const name =
          raw.displayName ||
          raw.name ||
          raw.fullName ||
          raw.profile?.name ||
          "Vendedor";

        const profile: CurrentUserProfile = {
          uid: firebaseUser.uid,
          role,
          profileId,
          profileType,
          name,
        };

        setCurrentUser(profile);
      } catch (e: any) {
        console.error("Error cargando usuario vendedor:", e);
        setError(
          e?.message ||
            "No fue posible validar el usuario vendedor en la plataforma."
        );
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    loadSellerCustomers(currentUser);
  }, [currentUser]);

  async function loadSellerCustomers(profile = currentUser) {
    if (!profile) return;

    setLoading(true);
    setError("");

    try {
      const customersRef = collection(db, "customers");

      const queries = [
        query(customersRef, where("assignedSellerUid", "==", profile.uid)),
      ];

      if (profile.profileId) {
        queries.push(
          query(customersRef, where("assignedSellerId", "==", profile.profileId)),
          query(
            customersRef,
            where("visibleToSellerIds", "array-contains", profile.profileId)
          )
        );
      }

      queries.push(
        query(
          customersRef,
          where("visibleToSellerUids", "array-contains", profile.uid)
        )
      );

      const snaps = await Promise.all(
        queries.map(async (customerQuery) => {
          try {
            return await getDocs(customerQuery);
          } catch (e) {
            console.warn("Consulta de customers omitida:", e);
            return null;
          }
        })
      );

      const map = new Map<string, Customer>();

      snaps.forEach((snap) => {
        if (!snap) return;

        snap.docs.forEach((docSnap) => {
          const raw = docSnap.data() as any;

          const customer: Customer = {
            id: docSnap.id,

            fullName: raw.fullName || "",
            phone: raw.phone || "",
            phoneNormalized: raw.phoneNormalized || "",
            secondaryPhone: raw.secondaryPhone || "",
            secondaryPhoneNormalized: raw.secondaryPhoneNormalized || "",
            email: raw.email || "",
            city: raw.city || "",
            address: raw.address || "",

            assignedSellerId: raw.assignedSellerId || profile.profileId || "",
            assignedSellerName:
              raw.assignedSellerName || profile.name || "Vendedor",
            assignedSellerUid: raw.assignedSellerUid || profile.uid || "",

            assignedMerchandiserId: raw.assignedMerchandiserId || "",
            assignedMerchandiserName:
              raw.assignedMerchandiserName || "Sin mercaderista",
            assignedMerchandiserUid: raw.assignedMerchandiserUid || "",

            distributorId: raw.distributorId || raw.assignedDistributorId || "",
            distributorName:
              raw.distributorName ||
              raw.assignedDistributorName ||
              "Sin distribuidor",
            distributorUid: raw.distributorUid || raw.assignedDistributorUid || "",

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

          map.set(customer.id, customer);
        });
      });

      setCustomers(Array.from(map.values()).sort(sortCustomersByLastActivity));
    } catch (e: any) {
      console.error("Error cargando customers del vendedor:", e);
      setError(
        e?.message ||
          "No fue posible cargar los clientes y referidos asignados al vendedor."
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
      console.error("Error cargando historial del cliente:", e);
      setSelectedLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  const sellerOptions = useMemo<CustomerSellerOption[]>(() => {
    if (!currentUser) return [];

    return [
      {
        id: currentUser.profileId || currentUser.uid,
        name: currentUser.name || "Vendedor",
      },
    ];
  }, [currentUser]);

  const distributorOptions = useMemo<CustomerDistributorOption[]>(() => {
    const map = new Map<string, string>();

    customers.forEach((customer) => {
      if (customer.distributorId) {
        map.set(
          customer.distributorId,
          customer.distributorName || "Sin distribuidor"
        );
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [customers]);

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

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
        <section className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Validando perfil del vendedor...
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
                Mi gestión comercial
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Mis clientes y referidos
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
                Consulta los clientes y referidos asignados a tu usuario, revisa su estado y abre el historial de llamadas.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/vendedor"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>

              <button
                type="button"
                onClick={() => loadSellerCustomers()}
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
            helper="Clientes y referidos asignados"
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
              Cargando tus clientes y referidos...
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