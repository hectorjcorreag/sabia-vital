"use client";

import { CalendarX } from "lucide-react";

import type { Appointment, CalendarViewMode } from "./agendaTypes";
import {
  WEEK_DAYS_LONG,
  WEEK_DAYS_SHORT,
  addDays,
  dateKey,
  endOfMonth,
  formatTime,
  getStatusClass,
  getStatusLabel,
  sameDay,
  sellerAccentClass,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDate,
} from "./agendaUtils";

export default function AdminAppointmentsCalendar({
  appointments,
  currentDate,
  viewMode,
  sellerOrderMap,
  onSelectAppointment,
}: {
  appointments: Appointment[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  sellerOrderMap: Map<string, number>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  if (viewMode === "day") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <DayView
          date={currentDate}
          appointments={appointments}
          sellerOrderMap={sellerOrderMap}
          onSelectAppointment={onSelectAppointment}
        />
      </section>
    );
  }

  if (viewMode === "week") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <WeekView
          currentDate={currentDate}
          appointments={appointments}
          sellerOrderMap={sellerOrderMap}
          onSelectAppointment={onSelectAppointment}
        />
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <MonthView
        currentDate={currentDate}
        appointments={appointments}
        sellerOrderMap={sellerOrderMap}
        onSelectAppointment={onSelectAppointment}
      />
    </section>
  );
}

function DayView({
  date,
  appointments,
  sellerOrderMap,
  onSelectAppointment,
}: {
  date: Date;
  appointments: Appointment[];
  sellerOrderMap: Map<string, number>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const dayAppointments = appointments
    .filter((item) => {
      const appointmentDate = toDate(item.appointmentAt);
      return appointmentDate ? sameDay(appointmentDate, date) : false;
    })
    .sort(sortByDateAsc);

  return (
    <div>
      <h3 className="mb-4 text-lg font-black capitalize text-slate-950">
        {date.toLocaleDateString("es-CO", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      </h3>

      {dayAppointments.length === 0 ? (
        <EmptyState message="No hay citas programadas para este día." />
      ) : (
        <div className="space-y-3">
          {dayAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              sellerOrderMap={sellerOrderMap}
              onSelectAppointment={onSelectAppointment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekView({
  currentDate,
  appointments,
  sellerOrderMap,
  onSelectAppointment,
}: {
  currentDate: Date;
  appointments: Appointment[];
  sellerOrderMap: Map<string, number>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = appointments
          .filter((item) => {
            const appointmentDate = toDate(item.appointmentAt);
            return appointmentDate ? sameDay(appointmentDate, day) : false;
          })
          .sort(sortByDateAsc);

        return (
          <article
            key={dateKey(day)}
            className="min-h-56 rounded-3xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {WEEK_DAYS_SHORT[day.getDay()]}
                </p>
                <p className="text-lg font-black text-slate-950">{day.getDate()}</p>
              </div>

              <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-500">
                {dayAppointments.length}
              </span>
            </div>

            <div className="space-y-2">
              {dayAppointments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-400">
                  Sin citas
                </p>
              ) : (
                dayAppointments.map((appointment) => (
                  <CompactAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    sellerOrderMap={sellerOrderMap}
                    onSelectAppointment={onSelectAppointment}
                  />
                ))
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MonthView({
  currentDate,
  appointments,
  sellerOrderMap,
  onSelectAppointment,
}: {
  currentDate: Date;
  appointments: Appointment[];
  sellerOrderMap: Map<string, number>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const monthEnd = endOfMonth(currentDate);
  const totalDays = 42;
  const days = Array.from({ length: totalDays }, (_, index) =>
    addDays(calendarStart, index)
  );

  return (
    <div>
      <div className="mb-2 hidden grid-cols-7 gap-2 lg:grid">
        {WEEK_DAYS_LONG.map((day) => (
          <div
            key={day}
            className="px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const isCurrentMonth = day >= startOfDay(monthStart) && day <= monthEnd;

          const dayAppointments = appointments
            .filter((item) => {
              const appointmentDate = toDate(item.appointmentAt);
              return appointmentDate ? sameDay(appointmentDate, day) : false;
            })
            .sort(sortByDateAsc);

          return (
            <article
              key={dateKey(day)}
              className={`min-h-44 rounded-3xl border p-3 ${
                isCurrentMonth
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-100 bg-slate-50/40 opacity-60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="block text-xs font-black uppercase tracking-wide text-slate-400 lg:hidden">
                    {WEEK_DAYS_SHORT[day.getDay()]}
                  </p>
                  <p className="text-lg font-black text-slate-950">{day.getDate()}</p>
                </div>

                {dayAppointments.length > 0 ? (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-emerald-700">
                    {dayAppointments.length}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <CompactAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    sellerOrderMap={sellerOrderMap}
                    onSelectAppointment={onSelectAppointment}
                  />
                ))}

                {dayAppointments.length > 3 ? (
                  <p className="text-center text-xs font-black text-slate-500">
                    +{dayAppointments.length - 3} citas más
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  sellerOrderMap,
  onSelectAppointment,
}: {
  appointment: Appointment;
  sellerOrderMap: Map<string, number>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const appointmentDate = toDate(appointment.appointmentAt);
  const sellerIndex = sellerOrderMap.get(appointment.sellerId || "") || 0;

  return (
    <button
      type="button"
      onClick={() => onSelectAppointment(appointment)}
      className={`w-full rounded-3xl border border-slate-200 border-l-8 bg-slate-50 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md ${sellerAccentClass(
        sellerIndex
      )}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-700">
            {formatTime(appointmentDate)}
          </p>

          <h4 className="mt-1 text-lg font-black text-slate-950">
            {appointment.customerName || "Sin cliente"}
          </h4>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {appointment.sellerName || "Sin vendedor"} ·{" "}
            {appointment.city || "Sin ciudad"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {appointment.address || "Sin dirección"}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
            appointment.status
          )}`}
        >
          {getStatusLabel(appointment.status)}
        </span>
      </div>
    </button>
  );
}

function CompactAppointmentCard({
  appointment,
  sellerOrderMap,
  onSelectAppointment,
}: {
  appointment: Appointment;
  sellerOrderMap: Map<string, number>;
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const appointmentDate = toDate(appointment.appointmentAt);
  const sellerIndex = sellerOrderMap.get(appointment.sellerId || "") || 0;

  return (
    <button
      type="button"
      onClick={() => onSelectAppointment(appointment)}
      className={`w-full rounded-2xl border border-slate-200 border-l-4 bg-white p-2 text-left transition hover:border-emerald-200 hover:shadow-sm ${sellerAccentClass(
        sellerIndex
      )}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-emerald-700">
          {formatTime(appointmentDate)}
        </p>

        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          {getStatusLabel(appointment.status)}
        </span>
      </div>

      <p className="mt-1 truncate text-sm font-black text-slate-950">
        {appointment.customerName || "Sin cliente"}
      </p>

      <p className="truncate text-xs font-semibold text-slate-500">
        {appointment.sellerName || "Sin vendedor"}
      </p>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <CalendarX className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-bold text-slate-400">{message}</p>
    </div>
  );
}

function sortByDateAsc(a: Appointment, b: Appointment) {
  const dateA = toDate(a.appointmentAt)?.getTime() || 0;
  const dateB = toDate(b.appointmentAt)?.getTime() || 0;
  return dateA - dateB;
}