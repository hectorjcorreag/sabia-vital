import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { User } from "firebase/auth";

import { db } from "@/lib/firebase";
import { CallQueueCustomer, CallResult, RegisterCallInput } from "./callTypes";

function todayBogotaKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${y}-${m}-${d}`;
}

function dateKeyFromDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${y}-${m}-${d}`;
}

function monthKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function timeKeyFromDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function toMillis(value: any) {
  if (!value) return 0;

  try {
    if (value.toMillis) return value.toMillis();
    if (value instanceof Date) return value.getTime();
    return 0;
  } catch {
    return 0;
  }
}

function isCallableStatus(status: string) {
  return ["nuevo", "pendiente_contacto", "llamar_despues"].includes(status);
}

function mapCustomer(docId: string, raw: any): CallQueueCustomer {
  return {
    id: docId,

    fullName: raw.fullName || "Sin nombre",
    phone: raw.phone || "",
    phoneNormalized: raw.phoneNormalized || "",
    secondaryPhone: raw.secondaryPhone || "",
    email: raw.email || "",
    city: raw.city || "",
    address: raw.address || "",

    customerType: raw.customerType || "referido",
    customerStatus: raw.customerStatus || "nuevo",

    assignedSellerId: raw.assignedSellerId || "",
    assignedSellerName: raw.assignedSellerName || "Sin vendedor",
    assignedSellerUid: raw.assignedSellerUid || "",

    assignedMerchandiserId: raw.assignedMerchandiserId || "",
    assignedMerchandiserName: raw.assignedMerchandiserName || "",
    assignedMerchandiserUid: raw.assignedMerchandiserUid || "",

    callAttempts: Number(raw.callAttempts || 0),
    lastCallAt: raw.lastCallAt || null,
    lastCallResult: raw.lastCallResult || "",
    lastObservation: raw.lastObservation || "",
    nextCallAt: raw.nextCallAt || null,
    nextActionAt: raw.nextActionAt || null,

    hasAppointment: Boolean(raw.hasAppointment),
    nextAppointmentId: raw.nextAppointmentId || "",
    nextAppointmentAt: raw.nextAppointmentAt || null,

    hasPurchase: Boolean(raw.hasPurchase),

    createdAt: raw.createdAt || null,
    createdDateKey: raw.createdDateKey || "",
    createdMonthKey: raw.createdMonthKey || "",
  };
}

export async function loadNextCallableCustomer(user: User) {
  const q = query(
    collection(db, "customers"),
    where("visibleToMerchandiserUids", "array-contains", user.uid),
    where("customerType", "==", "referido"),
    orderBy("nextActionAt", "asc"),
    limit(30)
  );

  const snap = await getDocs(q);

  const now = Date.now();

  const customers = snap.docs
    .map((docSnap) => mapCustomer(docSnap.id, docSnap.data()))
    .filter((customer) => isCallableStatus(customer.customerStatus))
    .filter((customer) => !customer.hasAppointment)
    .filter((customer) => !customer.hasPurchase)
    .filter((customer) => {
      if (!customer.nextActionAt) return true;
      return toMillis(customer.nextActionAt) <= now;
    })
    .sort((a, b) => {
      const aAction = toMillis(a.nextActionAt);
      const bAction = toMillis(b.nextActionAt);

      if (aAction !== bAction) return aAction - bAction;

      const aCreated = toMillis(a.createdAt);
      const bCreated = toMillis(b.createdAt);

      return bCreated - aCreated;
    });

  return customers[0] || null;
}

export async function loadCallableQueueCount(user: User) {
  const q = query(
    collection(db, "customers"),
    where("visibleToMerchandiserUids", "array-contains", user.uid),
    where("customerType", "==", "referido"),
    limit(100)
  );

  const snap = await getDocs(q);

  const now = Date.now();

  return snap.docs
    .map((docSnap) => mapCustomer(docSnap.id, docSnap.data()))
    .filter((customer) => isCallableStatus(customer.customerStatus))
    .filter((customer) => !customer.hasAppointment)
    .filter((customer) => !customer.hasPurchase)
    .filter((customer) => {
      if (!customer.nextActionAt) return true;
      return toMillis(customer.nextActionAt) <= now;
    }).length;
}

function getNextStateFromCallResult(args: {
  result: CallResult;
  nextCallAt?: Date | null;
  appointmentId?: string;
  appointmentAt?: Date | null;
}) {
  const { result, nextCallAt, appointmentId, appointmentAt } = args;

  if (result === "no_contesto") {
    const nextAction = addHours(new Date(), 4);

    return {
      customerStatus: "pendiente_contacto",
      customerType: "referido",
      hasAppointment: false,
      nextAppointmentId: "",
      nextAppointmentAt: null,
      hasPurchase: false,
      nextCallAt: Timestamp.fromDate(nextAction),
      nextActionAt: Timestamp.fromDate(nextAction),
    };
  }

  if (result === "llamar_despues") {
    const selectedDate = nextCallAt || addHours(new Date(), 24);

    return {
      customerStatus: "llamar_despues",
      customerType: "referido",
      hasAppointment: false,
      nextAppointmentId: "",
      nextAppointmentAt: null,
      hasPurchase: false,
      nextCallAt: Timestamp.fromDate(selectedDate),
      nextActionAt: Timestamp.fromDate(selectedDate),
    };
  }

  if (result === "acepta_cita") {
    return {
      customerStatus: "cita_agendada",
      customerType: "referido",
      hasAppointment: true,
      nextAppointmentId: appointmentId || "",
      nextAppointmentAt: appointmentAt ? Timestamp.fromDate(appointmentAt) : null,
      hasPurchase: false,
      nextCallAt: null,
      nextActionAt: null,
    };
  }

  if (result === "no_interesado") {
    return {
      customerStatus: "no_interesado",
      customerType: "referido",
      hasAppointment: false,
      nextAppointmentId: "",
      nextAppointmentAt: null,
      hasPurchase: false,
      nextCallAt: null,
      nextActionAt: null,
    };
  }

  if (result === "numero_equivocado") {
    return {
      customerStatus: "inactivo",
      customerType: "referido",
      hasAppointment: false,
      nextAppointmentId: "",
      nextAppointmentAt: null,
      hasPurchase: false,
      nextCallAt: null,
      nextActionAt: null,
    };
  }

  if (result === "ya_compro") {
    return {
      customerStatus: "cliente_activo",
      customerType: "cliente_activo",
      hasAppointment: false,
      nextAppointmentId: "",
      nextAppointmentAt: null,
      hasPurchase: true,
      nextCallAt: null,
      nextActionAt: null,
    };
  }

  return {
    customerStatus: "pendiente_contacto",
    customerType: "referido",
    hasAppointment: false,
    nextAppointmentId: "",
    nextAppointmentAt: null,
    hasPurchase: false,
    nextCallAt: null,
    nextActionAt: null,
  };
}

async function createAppointment(args: {
  user: User;
  customer: CallQueueCustomer;
  appointmentAt: Date;
  address: string;
  city: string;
  notes: string;
}) {
  const { user, customer, appointmentAt, address, city, notes } = args;

  const appointmentDateKey = dateKeyFromDate(appointmentAt);
  const appointmentMonthKey = monthKeyFromDateKey(appointmentDateKey);

  const docRef = await addDoc(collection(db, "appointments"), {
    customerId: customer.id,
    customerName: customer.fullName,
    customerPhone: customer.phone || "",
    customerSecondaryPhone: customer.secondaryPhone || "",

    sellerId: customer.assignedSellerId || "",
    sellerName: customer.assignedSellerName || "",
    sellerUid: customer.assignedSellerUid || "",

    merchandiserId: customer.assignedMerchandiserId || "",
    merchandiserName: customer.assignedMerchandiserName || "",
    merchandiserUid: user.uid,

    visibleToSellerIds: customer.assignedSellerId
      ? [customer.assignedSellerId]
      : [],
    visibleToSellerUids: customer.assignedSellerUid
      ? [customer.assignedSellerUid]
      : [],

    visibleToMerchandiserIds: customer.assignedMerchandiserId
      ? [customer.assignedMerchandiserId]
      : [],
    visibleToMerchandiserUids: [user.uid],

    appointmentAt: Timestamp.fromDate(appointmentAt),
    appointmentDateKey,
    appointmentMonthKey,
    appointmentTime: timeKeyFromDate(appointmentAt),

    status: "agendada",

    address: address.trim(),
    city: city.trim(),
    notes: notes.trim(),

    source: "telemercadeo",
    createdByRole: "merchandiser",
    createdByUid: user.uid,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function registerCustomerCall(args: {
  user: User;
  input: RegisterCallInput;
}) {
  const { user, input } = args;
  const { customer, result, observation, nextCallAt, appointment } = input;

  let appointmentId = "";
  let appointmentAt: Date | null = null;

  if (result === "acepta_cita") {
    if (!appointment?.appointmentAt) {
      throw new Error("Selecciona la fecha y hora de la cita.");
    }

    if (!appointment.address.trim()) {
      throw new Error("Ingresa la dirección o lugar de la cita.");
    }

    appointmentAt = appointment.appointmentAt;

    appointmentId = await createAppointment({
      user,
      customer,
      appointmentAt,
      address: appointment.address,
      city: appointment.city,
      notes: appointment.notes,
    });
  }

  const nextState = getNextStateFromCallResult({
    result,
    nextCallAt,
    appointmentId,
    appointmentAt,
  });

  const customerRef = doc(db, "customers", customer.id);

  await addDoc(collection(db, "customers", customer.id, "call_logs"), {
    customerId: customer.id,
    customerName: customer.fullName,

    merchandiserId: customer.assignedMerchandiserId || "",
    merchandiserName: customer.assignedMerchandiserName || "",
    merchandiserUid: user.uid,

    sellerId: customer.assignedSellerId || "",
    sellerName: customer.assignedSellerName || "",
    sellerUid: customer.assignedSellerUid || "",

    callAt: serverTimestamp(),
    callDateKey: todayBogotaKey(),

    result,
    observation: observation.trim(),

    previousStatus: customer.customerStatus,
    newStatus: nextState.customerStatus,

    nextCallAt: nextState.nextCallAt,
    nextActionAt: nextState.nextActionAt,

    appointmentCreated: result === "acepta_cita",
    appointmentId,

    createdByUid: user.uid,
    createdAt: serverTimestamp(),
  });

  await updateDoc(customerRef, {
    customerStatus: nextState.customerStatus,
    customerType: nextState.customerType,

    hasAppointment: nextState.hasAppointment,
    nextAppointmentId: nextState.nextAppointmentId,
    nextAppointmentAt: nextState.nextAppointmentAt,

    hasPurchase: nextState.hasPurchase,

    callAttempts: increment(1),
    lastCallAt: serverTimestamp(),
    lastCallResult: result,
    lastObservation: observation.trim(),

    nextCallAt: nextState.nextCallAt,
    nextActionAt: nextState.nextActionAt,

    updatedAt: serverTimestamp(),
  });

  return {
    appointmentId,
  };
}