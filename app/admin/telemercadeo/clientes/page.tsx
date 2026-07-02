"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
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

export default function AdminTelemarketingCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>([]);

  const [filters, setFilters] = useState<CustomerFiltersState>(EMPTY_FILTERS);

  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<CustomerCallLog[]>([]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customersSnap, sellersSnap] = await Promise.all([
        getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "sellers")),
      ]);

      const sellersData: SellerRecord[] = sellersSnap.docs.map((docSnap) => {
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
            "",

          distributorName:
            raw.distributorName ||
            raw.assignedDistributorName ||
            raw.distributor?.name ||
            "Sin distribuidor",

          distributorUid:
            raw.distributorUid ||
            raw.assignedDistributorUid ||
            raw.distributor?.uid ||
            "",
        };
      });

      const sellerById = new Map<string, SellerRecord>();
      const sellerByUid = new Map<string, SellerRecord>();

      sellersData.forEach((seller) => {
        sellerById.set(seller.id, seller);

        if (seller.uid) {
          sellerByUid.set(seller.uid, seller);
        }
      });

      const customersData: Customer[] = customersSnap.docs.map((docSnap) => {
        const raw = docSnap.data() as any;

        const seller =
          sellerById.get(raw.assignedSellerId || "") ||
          sellerByUid.get(raw.assignedSellerUid || "");

        return {
          id: docSnap.id,

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
            "",

          distributorName:
            raw.distributorName ||
            raw.assignedDistributorName ||
            seller?.distributorName ||
            "Sin distribuidor",

          distributorUid:
            raw.distributorUid ||
            raw.assignedDistributorUid ||
            seller?.distributorUid ||
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
          visibleToSellerUids: raw.visibleToSellerUids || "",

          visibleToMerchandiserIds: raw.visibleToMerchandiserIds || [],
          visibleToMerchandiserUids: raw.visibleToMerchandiserUids || "",
        };
      });

      setSellers(sellersData);
      setCustomers(customersData.sort(sortCustomersByLastActivity));
    } catch (e: any) {
      console.error("Error cargando customers:", e);
      setError(
        e?.message ||
          "No fue posible cargar los clientes y referidos desde Firebase."
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
      console.error("Error cargando historial:", e);
      setSelectedLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const sellerOptions = useMemo<CustomerSellerOption[]>(() => {
    const map = new Map<string, string>();

    customers.forEach((customer) => {
      if (customer.assignedSellerId) {
        map.set(
          customer.assignedSellerId,
          customer.assignedSellerName || "Sin vendedor"
        );
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

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

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
        filters.sellerId !== "all" &&
        customer.assignedSellerId !== filters.sellerId
      ) {
        return false;
      }

      if (
        filters.distributorId !== "all" &&
        customer.distributorId !== filters.distributorId
      ) {
        return false;
      }

      if (
        filters.merchandiserId !== "all" &&
        customer.assignedMerchandiserId !== filters.merchandiserId
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
      referrals: filteredCustomers.filter((item) =>
        ["referral", "referido", "prospect", "prospecto"].includes(
          String(item.customerType || "").toLowerCase()
        )
      ).length,
      withAppointment: filteredCustomers.filter((item) => item.hasAppointment)
        .length,
      withPurchase: filteredCustomers.filter((item) => item.hasPurchase).length,
    };
  }, [filteredCustomers]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-800 to-lime-500 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
                <UsersRound className="h-4 w-4" />
                CRM de telemercadeo
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Clientes y referidos
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-emerald-50 md:text-base">
                Consulta la colección customers, revisa responsables, estado de
                gestión, distribuidor derivado del vendedor e historial de llamadas.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/admin/telemercadeo"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al tablero
              </Link>

              <button
                type="button"
                onClick={loadData}
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
            helper="Según filtros activos"
          />

          <MetricCard
            icon={<PhoneCall className="h-5 w-5" />}
            label="Referidos / prospectos"
            value={metrics.referrals}
            helper="En gestión comercial"
          />

          <MetricCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Con cita"
            value={metrics.withAppointment}
            helper="Tienen cita relacionada"
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
              Cargando clientes y referidos...
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