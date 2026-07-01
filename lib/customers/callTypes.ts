import { Timestamp } from "firebase/firestore";

export type CallResult =
  | "no_contesto"
  | "llamar_despues"
  | "acepta_cita"
  | "no_interesado"
  | "numero_equivocado"
  | "ya_compro";

export type CallableCustomerStatus =
  | "nuevo"
  | "pendiente_contacto"
  | "llamar_despues";

export type CustomerCallStatus =
  | "nuevo"
  | "pendiente_contacto"
  | "llamar_despues"
  | "cita_agendada"
  | "no_interesado"
  | "cliente_activo"
  | "inactivo"
  | "duplicado_revision";

export type CallQueueCustomer = {
  id: string;

  fullName: string;
  phone: string;
  phoneNormalized?: string;
  secondaryPhone?: string;
  email?: string;
  city?: string;
  address?: string;

  customerType: "referido" | "cliente_activo";
  customerStatus: CustomerCallStatus;

  assignedSellerId: string;
  assignedSellerName: string;
  assignedSellerUid?: string;

  assignedMerchandiserId: string;
  assignedMerchandiserName: string;
  assignedMerchandiserUid: string;

  callAttempts: number;
  lastCallAt?: Timestamp | null;
  lastCallResult?: string;
  lastObservation?: string;
  nextCallAt?: Timestamp | null;
  nextActionAt?: Timestamp | null;

  hasAppointment: boolean;
  nextAppointmentId?: string;
  nextAppointmentAt?: Timestamp | null;

  hasPurchase: boolean;

  createdAt?: Timestamp | null;
  createdDateKey?: string;
  createdMonthKey?: string;
};

export type AppointmentInput = {
  appointmentAt: Date;
  address: string;
  city: string;
  notes: string;
};

export type RegisterCallInput = {
  customer: CallQueueCustomer;
  result: CallResult;
  observation: string;
  nextCallAt?: Date | null;
  appointment?: AppointmentInput | null;
};