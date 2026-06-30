export type CustomerType = "referido" | "cliente_activo";

export type CustomerStatus =
  | "nuevo"
  | "pendiente_contacto"
  | "llamar_despues"
  | "cita_agendada"
  | "no_interesado"
  | "cliente_activo"
  | "inactivo"
  | "duplicado_revision";

export type SellerOption = {
  id: string;
  name: string;
  distributorId?: string;
  distributorName?: string;
  uid?: string;
  active?: boolean;
  photoUrl?: string;
  documentNumber?: string;
};
export type MerchandiserProfile = {
  uid: string;
  displayName: string;
  role?: string;
  merchandiserId: string;
  merchandiserName: string;
  canManageAllSellers?: boolean;
};

export type ExistingCustomer = {
  id: string;
  fullName?: string;
  phone?: string;
  phoneNormalized?: string;
  customerType?: CustomerType;
  customerStatus?: CustomerStatus;
  assignedSellerId?: string;
  assignedSellerName?: string;
  assignedMerchandiserId?: string;
  assignedMerchandiserName?: string;
  createdAt?: unknown;
};

export type NewReferralFormData = {
  fullName: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  city: string;
  address: string;
  selectedSellerId: string;
  interestProduct: string;
  initialObservation: string;
};