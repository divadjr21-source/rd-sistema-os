"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAppointments, getOrders, createAppointment, updateAppointment, deleteAppointment } from "@/services/storage";
import { Appointment, OrderService, AppointmentStatus } from "@/types";
import { formatPhone } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Plus,
  Pencil,
  Trash2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const appointmentStatusColors: Record<AppointmentStatus, string> = {
  agendado: "bg-info/10 text-info border-info/30",
  em_andamento: "bg-warning/10 text-warning border-warning/30",
  concluido: "bg-emerald-450/10 text-emerald-450 border-emerald-450/30",
  cancelado: "bg-danger/10 text-danger border-danger/30",
};

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const [form, setForm] = useState({
    orderId: "",
    title: "",
    scheduledDate: "",
    scheduledTime: "",
    technician: "",
    notes: "",
    status: "agendado" as AppointmentStatus,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    refresh();
  }, [currentDate]);

  const refresh = async () => {
    const start = format(monthStart, "yyyy-MM-dd");
    const end = format(monthEnd, "yyyy-MM-dd");
    const [a, o] = await Promise.all([getAppointments(start, end), getOrders()]);
    setAppointments(a);
    setOrders(o);
  };

  const resetForm = () => {
    setForm({
      orderId: "",
      title: "",
      scheduledDate: "",
      scheduledTime: "",
      technician: "",
      notes: "",
      status: "agendado",
    });
    setEditingId(null);
  };

  const openNew = (date?: Date) => {
    resetForm();
    if (date) {
      setForm((prev) => ({ ...prev, scheduledDate: format(date, "yyyy-MM-dd") }));
      setSelectedDate(date);
    }
    setModalOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setForm({
      orderId: appointment.orderId || "",
      title: appointment.title,
      scheduledDate: appointment.scheduledDate,
      scheduledTime: appointment.scheduledTime || "",
      technician: appointment.technician,
      notes: appointment.notes || "",
      status: appointment.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.scheduledDate || !form.technician || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        orderId: form.orderId || undefined,
        title: form.title,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime || undefined,
        technician: form.technician,
        notes: form.notes || undefined,
      };

      if (editingId) {
        await updateAppointment(editingId, { ...payload, status: form.status });
      } else {
        await createAppointment(payload);
      }
      await refresh();
      setModalOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!appointmentToDelete) return;
    await deleteAppointment(appointmentToDelete.id);
    await refresh();
    setDeleteModalOpen(false);
    setAppointmentToDelete(null);
  };

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.scheduledDate), day));

  const selectedDateAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda de Visitas Técnicas</h1>
          <p className="text-graphite-400">Calendário de agendamentos e visitas técnicas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")}>Calendário</Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>Lista</Button>
          <Button className="gap-2" size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4" /> Agendar
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm text-graphite-400 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day);
                    if (dayAppointments.length === 0) openNew(day);
                  }}
                  className={cn(
                    "min-h-[80px] p-2 rounded-xl border text-left transition flex flex-col gap-1",
                    !isSameMonth(day, currentDate) && "opacity-40",
                    isSelected
                      ? "border-emerald-450 bg-emerald-450/10"
                      : "border-graphite-800 bg-graphite-950 hover:border-graphite-700"
                  )}
                >
                  <span className={cn("text-sm font-medium", isSelected && "text-emerald-450")}>
                    {format(day, "d")}
                  </span>
                  {dayAppointments.slice(0, 2).map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate",
                        appointmentStatusColors[a.status]
                      )}
                    >
                      {format(parseISO(a.scheduledDate), "HH:mm")} {a.title}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <span className="text-[10px] text-graphite-500">+{dayAppointments.length - 2} mais</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && selectedDateAppointments.length > 0 && (
            <div className="mt-6 border-t border-graphite-800 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  Visitas do dia {format(selectedDate, "dd/MM/yyyy")}
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={() => openNew(selectedDate)}>
                  + Agendar
                </Button>
              </div>
              <div className="space-y-2">
                {selectedDateAppointments.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} onEdit={openEdit} onDelete={confirmDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
          <div className="space-y-2">
            {appointments.length === 0 && (
              <p className="text-center text-graphite-500 py-8">Nenhum agendamento encontrado.</p>
            )}
            {appointments.map((a) => (
              <AppointmentRow key={a.id} appointment={a} onEdit={openEdit} onDelete={confirmDelete} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Vincular a O.S. (opcional)</Label>
              <Select value={form.orderId} onValueChange={(v) => setForm({ ...form, orderId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma O.S." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      #{o.number} - {o.client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Título da Visita</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Instalação de câmeras"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledDate">Data</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scheduledTime">Horário</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="technician">Técnico Responsável</Label>
              <Input
                id="technician"
                value={form.technician}
                onChange={(e) => setForm({ ...form, technician: e.target.value })}
                placeholder="Nome do técnico"
                required
              />
            </div>

            {editingId && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as AppointmentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(appointmentStatusLabels) as AppointmentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{appointmentStatusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Instruções ou detalhes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar Agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Excluir Agendamento
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-graphite-400">
            Tem certeza que deseja excluir o agendamento <strong>{appointmentToDelete?.title}</strong>?
          </p>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AppointmentRow({
  appointment,
  onEdit,
  onDelete,
}: {
  appointment: Appointment;
  onEdit: (a: Appointment) => void;
  onDelete: (a: Appointment) => void;
}) {
  return (
    <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-4 flex items-start justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full border",
              appointmentStatusColors[appointment.status]
            )}
          >
            {appointmentStatusLabels[appointment.status]}
          </span>
          <p className="font-medium">{appointment.title}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-graphite-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-450" />
            {format(parseISO(appointment.scheduledDate), "dd/MM/yyyy")}
          </span>
          {appointment.scheduledTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-450" /> {appointment.scheduledTime}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-emerald-450" /> {appointment.technician}
          </span>
        </div>
        {appointment.order && (
          <div className="mt-2 pt-2 border-t border-graphite-800 text-sm">
            <Link href={`/painel/os/${appointment.order.id}`} className="text-emerald-450 hover:underline">
              O.S. #{appointment.order.number} - {appointment.order.client.fullName}
            </Link>
            <div className="flex flex-wrap gap-2 text-graphite-400 mt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {formatPhone(appointment.order.client.phone)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {appointment.order.client.address}
              </span>
            </div>
          </div>
        )}
        {appointment.notes && (
          <p className="text-xs text-graphite-500 mt-2 flex items-start gap-1">
            <FileText className="w-3.5 h-3.5 mt-0.5" /> {appointment.notes}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <button onClick={() => onEdit(appointment)} className="p-2 text-graphite-400 hover:text-emerald-450">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(appointment)} className="p-2 text-graphite-400 hover:text-danger">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
