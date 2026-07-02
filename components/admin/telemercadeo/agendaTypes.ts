export type AppointmentStatus =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "no_asistio"
  | "reprogramada"
  | "venta_realizada";

export type Appointment = {
  id: string;

  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  sellerId?: string;
  sellerName?: string;

  merchandiserId?: string;
  merchandiserName?: string;

  appointmentAt?: any;
  appointmentDateKey?: string;
  appointmentMonthKey?: string;

  status: AppointmentStatus;

  city?: string;
  address?: string;
  notes?: string;
  observations?: string;

  createdAt?: any;
};

export type CalendarViewMode = "day" | "week" | "month";

export type SellerOption = {
  id: string;
  name: string;
};