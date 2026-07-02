export const CUSTOMER_CALL_LOGS_COLLECTION = "call_logs";

export type CustomerStatus =
  | "new"
  | "pending"
  | "contacted"
  | "not_answered"
  | "interested"
  | "not_interested"
  | "appointment_scheduled"
  | "converted"
  | "active"
  | "inactive"
  | "discarded"
  | "duplicate"
  | string;

export type CustomerType =
  | "referral"
  | "customer"
  | "client"
  | "prospect"
  | "active_customer"
  | string;

export type SellerRecord = {
  id: string;
  uid?: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;

  distributorId?: string;
  distributorName?: string;
  distributorUid?: string;
};

export type Customer = {
  id: string;

  fullName?: string;
  phone?: string;
  phoneNormalized?: string;
  secondaryPhone?: string;
  secondaryPhoneNormalized?: string;
  email?: string;
  city?: string;
  address?: string;

  assignedSellerId?: string;
  assignedSellerName?: string;
  assignedSellerUid?: string;

  assignedMerchandiserId?: string;
  assignedMerchandiserName?: string;
  assignedMerchandiserUid?: string;

  distributorId?: string;
  distributorName?: string;
  distributorUid?: string;

  customerStatus?: CustomerStatus;
  customerType?: CustomerType;

  origin?: string;
  source?: string;
  priority?: number;

  callAttempts?: number;
  lastCallAt?: any;
  lastCallResult?: string;
  lastObservation?: string;
  nextCallAt?: any;
  nextActionAt?: any;

  hasAppointment?: boolean;
  nextAppointmentAt?: any;
  nextAppointmentId?: string;

  hasPurchase?: boolean;
  firstPurchaseAt?: any;
  totalPurchases?: number;
  totalPurchasedAmount?: number;

  duplicateOfCustomerId?: string;
  duplicateReason?: string;

  createdAt?: any;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  createdByUid?: string;
  createdDateKey?: string;
  createdMonthKey?: string;
  updatedAt?: any;

  visibleToSellerIds?: string[];
  visibleToSellerUids?: string | string[];

  visibleToMerchandiserIds?: string[];
  visibleToMerchandiserUids?: string | string[];
};

export type CustomerCallLog = {
  id: string;

  customerId?: string;

  callAt?: any;
  callDateKey?: string;
  createdAt?: any;

  newStatus?: string;
  result?: string;
  observation?: string;
  notes?: string;

  appointmentCreated?: boolean | string;
  appointmentId?: string;

  nextActionAt?: any;
  nextCallAt?: any;

  sellerId?: string;
  sellerName?: string;

  merchandiserId?: string;
  merchandiserName?: string;

  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  createdByUid?: string;
};

export type CustomerSellerOption = {
  id: string;
  name: string;
};

export type CustomerDistributorOption = {
  id: string;
  name: string;
};

export type CustomerFiltersState = {
  search: string;
  sellerId: string;
  distributorId: string;
  merchandiserId: string;
  status: string;
  type: string;
  hasAppointment: string;
  hasPurchase: string;
  city: string;
};