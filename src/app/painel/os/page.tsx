"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getOrders, getClients, createOrderManual, deleteOrder, uploadMediaFiles, getMyProfile, MyProfile } from "@/services/storage";
import { OrderService, Client, OrderStatus, OrderPriority, PaymentStatus } from "@/types";
import {
  formatPhone,
  formatPhoneInput,
  formatCurrency,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  paymentStatusLabels,
  paymentStatusColors,
  whatsappLink,
  buildBrazilTimestamp,
} from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Trash2, Plus, Upload, X, AlertTriangle, Pencil, Send, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/hooks/use-toast";

const statusOptions: OrderStatus[] = [
  "pendente",
  "em_orcamento",
  "aprovado",
  "recusado",
  "em_execucao",
  "finalizado",
];

const priorityOptions: OrderPriority[] = ["baixa", "media", "alta"];
const paymentStatusOptions: PaymentStatus[] = ["aguardando", "paga"];

// Monta uma mensagem de WhatsApp adequada ao momento atual da O.S.
function buildWhatsappMessage(order: OrderService): string {
  const total = (order.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
  const greeting = `Olá ${order.client.fullName}! Aqui é da RD Solutions, sobre a O.S. nº ${order.number}.`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const trackingLine = `\n\nVocê pode acompanhar o andamento do seu chamado a qualquer momento em ${siteUrl}, na opção "Acompanhar Chamados", usando o número da O.S. (${order.number}).`;

  switch (order.status) {
    case "pendente":
      return `${greeting} Recebemos sua solicitação (${order.description}) e em breve entraremos em contato para agendar o atendimento.${trackingLine}`;
    case "em_orcamento":
      return `${greeting} Estamos preparando o orçamento do seu atendimento. Em breve enviaremos os valores para aprovação.${trackingLine}`;
    case "aprovado":
      return `${greeting} Seu orçamento foi aprovado! Em breve entraremos em contato para agendar a execução do serviço.${trackingLine}`;
    case "recusado":
      return `${greeting} Vimos que o orçamento não foi aprovado. Ficamos à disposição para ajustar valores ou tirar dúvidas.${trackingLine}`;
    case "em_execucao":
      return `${greeting} Seu serviço está em execução. Qualquer dúvida durante o atendimento, estamos à disposição.${trackingLine}`;
    case "finalizado":
      if (order.paymentStatus === "aguardando") {
        return `${greeting} O serviço foi finalizado. Passando para lembrar sobre o pagamento pendente${
          total > 0 ? ` no valor de ${formatCurrency(total)}` : ""
        }. Qualquer dúvida, estou à disposição!${trackingLine}`;
      }
      return `${greeting} O serviço foi finalizado com sucesso. Agradecemos a confiança!${trackingLine}`;
    default:
      return greeting;
  }
}

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const isAdmin = profile?.role === "admin";
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderService | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    clientMode: "existing" as "existing" | "new",
    clientId: "",
    fullName: "",
    phone: "",
    address: "",
    description: "",
    status: "pendente" as OrderStatus,
    priority: "media" as OrderPriority,
  });
  const [files, setFiles] = useState<{ file: File; preview: string; type: "image" | "video"; name: string }[]>([]);
  const [scheduleOnCreate, setScheduleOnCreate] = useState(false);
  const [createScheduleDate, setCreateScheduleDate] = useState("");
  const [createScheduleTime, setCreateScheduleTime] = useState("09:00");
  const [createScheduleTechnician, setCreateScheduleTechnician] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderService | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    status: "pendente" as OrderStatus,
    priority: "media" as OrderPriority,
    paymentStatus: "aguardando" as PaymentStatus,
  });
  const [scheduleOnEdit, setScheduleOnEdit] = useState(false);
  const [editScheduleDate, setEditScheduleDate] = useState("");
  const [editScheduleTime, setEditScheduleTime] = useState("09:00");
  const [editScheduleTechnician, setEditScheduleTechnician] = useState("");

  useEffect(() => {
    refresh();
    getMyProfile().then(setProfile);
  }, []);

  const refresh = async () => {
    const [o, c] = await Promise.all([getOrders(), getClients()]);
    setOrders(o);
    setClients(c);
  };

  const resetForm = () => {
    setForm({
      clientMode: "existing",
      clientId: "",
      fullName: "",
      phone: "",
      address: "",
      description: "",
      status: "pendente",
      priority: "media",
    });
    setFiles([]);
    setScheduleOnCreate(false);
    setCreateScheduleDate("");
    setCreateScheduleTime("09:00");
    setCreateScheduleTechnician("");
  };

  const openEdit = (order: OrderService) => {
    setEditingOrder(order);
    setEditForm({
      description: order.description,
      status: order.status,
      priority: order.priority,
      paymentStatus: order.paymentStatus,
    });
    setScheduleOnEdit(false);
    setEditScheduleDate("");
    setEditScheduleTime("09:00");
    setEditScheduleTechnician("");
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || submitting) return;
    if (scheduleOnEdit && !editScheduleDate) {
      alert("Escolha a data do agendamento.");
      return;
    }
    setSubmitting(true);
    try {
      const { updateOrderStatus, updateOrderPriority, updateOrderDescription, updateOrderPaymentStatus, createAppointment } =
        await import("@/services/storage");
      await Promise.all([
        updateOrderDescription(editingOrder.id, editForm.description),
        updateOrderStatus(editingOrder.id, editForm.status),
        updateOrderPriority(editingOrder.id, editForm.priority),
        updateOrderPaymentStatus(editingOrder.id, editForm.paymentStatus),
      ]);
      if (scheduleOnEdit) {
        await createAppointment({
          orderId: editingOrder.id,
          clientId: editingOrder.clientId,
          title: `${editingOrder.description} — ${editingOrder.client.fullName}`,
          scheduledAt: buildBrazilTimestamp(editScheduleDate, editScheduleTime),
          technician: editScheduleTechnician,
          notes: `Agendado a partir da O.S. #${editingOrder.number}.`,
        });
      }
      await refresh();
      setEditModalOpen(false);
      setEditingOrder(null);
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = orders.filter((o) =>
    o.client.fullName.toLowerCase().includes(search.toLowerCase()) ||
    o.client.phone.includes(search) ||
    o.number.includes(search)
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const preview = URL.createObjectURL(file);
      const type = file.type.startsWith("video") ? "video" : "image";
      setFiles((prev) => [...prev, { file, preview, type, name: file.name }]);
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (scheduleOnCreate && !createScheduleDate) {
      alert("Escolha a data do agendamento.");
      return;
    }
    let clientData: { fullName: string; phone: string; address: string };
    if (form.clientMode === "existing") {
      const selected = clients.find((c) => c.id === form.clientId);
      if (!selected) return;
      clientData = {
        fullName: selected.fullName,
        phone: selected.phone,
        address: selected.address,
      };
    } else {
      if (!form.fullName || !form.phone || !form.address) return;
      clientData = {
        fullName: form.fullName,
        phone: form.phone.replace(/\D/g, ""),
        address: form.address,
      };
    }

    setSubmitting(true);
    try {
      const order = await createOrderManual({
        client: clientData,
        description: form.description,
        status: form.status,
        priority: form.priority,
        media: [],
      });

      const media = files.length > 0 ? await uploadMediaFiles(order.id, files) : [];
      if (media.length > 0) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase
          .from("order_media")
          .insert(media.map((m) => ({ order_id: order.id, url: m.url, type: m.type, name: m.name })));
        if (error) throw error;
      }

      if (scheduleOnCreate) {
        const { createAppointment } = await import("@/services/storage");
        await createAppointment({
          orderId: order.id,
          clientId: order.clientId,
          title: `${form.description} — ${clientData.fullName}`,
          scheduledAt: buildBrazilTimestamp(createScheduleDate, createScheduleTime),
          technician: createScheduleTechnician,
          notes: `Agendado a partir da O.S. #${order.number}.`,
        });
      }

      await refresh();
      setModalOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (order: OrderService) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    await deleteOrder(orderToDelete.id);
    await refresh();
    setDeleteModalOpen(false);
    setOrderToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-graphite-400">Gerencie todas as O.S. abertas</p>
        </div>
        {isAdmin && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Nova O.S. Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova O.S. Manual</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={form.clientMode}
                  onValueChange={(v) => setForm({ ...form, clientMode: v as "existing" | "new", clientId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Cliente existente</SelectItem>
                    <SelectItem value="new">Novo cliente rápido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.clientMode === "existing" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="clientId">Selecionar Cliente</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(v) => setForm({ ...form, clientId: v })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fullName} - {formatPhone(c.phone)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="Nome do cliente"
                      required={form.clientMode === "new"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                      placeholder="(31) 99999-9999"
                      maxLength={15}
                      required={form.clientMode === "new"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Rua, número, bairro, cidade"
                      required={form.clientMode === "new"}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição do Problema / Serviço</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva o serviço a ser realizado"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status Inicial</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as OrderStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as OrderPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mídia (opcional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-graphite-700 bg-graphite-900/50 flex flex-col items-center justify-center gap-1 text-graphite-400 hover:border-emerald-450 hover:text-emerald-450 transition"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Anexar fotos ou vídeos</span>
                </button>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden bg-graphite-950 border border-graphite-800">
                        {f.type === "video" ? (
                          <video src={f.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={f.preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-graphite-800 rounded-xl p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleOnCreate}
                    onChange={(e) => setScheduleOnCreate(e.target.checked)}
                    className="rounded border-graphite-700"
                  />
                  <CalendarPlus className="w-4 h-4 text-emerald-450" /> Também agendar na Agenda
                </label>
                {scheduleOnCreate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <Label htmlFor="createScheduleDate">Data</Label>
                      <Input
                        id="createScheduleDate"
                        type="date"
                        value={createScheduleDate}
                        onChange={(e) => setCreateScheduleDate(e.target.value)}
                        required={scheduleOnCreate}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <Label htmlFor="createScheduleTime">Horário</Label>
                      <Input
                        id="createScheduleTime"
                        type="time"
                        value={createScheduleTime}
                        onChange={(e) => setCreateScheduleTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="createScheduleTechnician">Técnico (opcional)</Label>
                      <Input
                        id="createScheduleTechnician"
                        value={createScheduleTechnician}
                        onChange={(e) => setCreateScheduleTechnician(e.target.value)}
                        placeholder="Nome do técnico responsável"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar O.S."}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
          <Input
            placeholder="Buscar por cliente, telefone ou O.S."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-graphite-800 text-graphite-400">
                <th className="py-3 px-3 font-medium">OS</th>
                <th className="py-3 px-3 font-medium">Cliente</th>
                {isAdmin && <th className="py-3 px-3 font-medium">Telefone</th>}
                <th className="py-3 px-3 font-medium">Status</th>
                <th className="py-3 px-3 font-medium">Prioridade</th>
                {isAdmin && <th className="py-3 px-3 font-medium">Pagamento</th>}
                <th className="py-3 px-3 font-medium">Abertura</th>
                <th className="py-3 px-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-800">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-graphite-800/50 transition">
                  <td className="py-3 px-3 font-semibold text-emerald-450">#{order.number}</td>
                  <td className="py-3 px-3">{order.client.fullName}</td>
                  {isAdmin && (
                    <td className="py-3 px-3 text-graphite-400">{formatPhone(order.client.phone)}</td>
                  )}
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        statusColors[order.status]
                      )}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        priorityColors[order.priority]
                      )}
                    >
                      {priorityLabels[order.priority]}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
                          paymentStatusColors[order.paymentStatus]
                        )}
                      >
                        {paymentStatusLabels[order.paymentStatus]}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-3 text-graphite-400">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/painel/os/${order.id}`}>
                        <button className="inline-flex items-center gap-1 text-emerald-450 hover:underline">
                          <Eye className="w-4 h-4" /> Ver
                        </button>
                      </Link>
                      {isAdmin && (
                        <>
                          <a
                            href={whatsappLink(order.client.phone, buildWhatsappMessage(order))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-450 hover:underline"
                            title="Enviar WhatsApp"
                          >
                            <Send className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => openEdit(order)}
                            className="inline-flex items-center gap-1 text-graphite-400 hover:text-emerald-450 transition"
                            title="Editar O.S."
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(order)}
                            className="inline-flex items-center gap-1 text-danger hover:text-danger/80 transition"
                            title="Excluir O.S."
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-graphite-500">
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={deleteModalOpen && isAdmin} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Excluir O.S.
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a O.S. <strong>#{orderToDelete?.number}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar O.S. #{editingOrder?.number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Descrição do Problema / Serviço</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descreva o serviço a ser realizado"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v as OrderStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-priority">Prioridade</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v as OrderPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-payment">Pagamento</Label>
              <Select
                value={editForm.paymentStatus}
                onValueChange={(v) => setEditForm({ ...editForm, paymentStatus: v as PaymentStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map((p) => (
                    <SelectItem key={p} value={p}>{paymentStatusLabels[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-graphite-800 rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleOnEdit}
                  onChange={(e) => setScheduleOnEdit(e.target.checked)}
                  className="rounded border-graphite-700"
                />
                <CalendarPlus className="w-4 h-4 text-emerald-450" /> Também agendar na Agenda
              </label>
              {scheduleOnEdit && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="editScheduleDate">Data</Label>
                    <Input
                      id="editScheduleDate"
                      type="date"
                      value={editScheduleDate}
                      onChange={(e) => setEditScheduleDate(e.target.value)}
                      required={scheduleOnEdit}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="editScheduleTime">Horário</Label>
                    <Input
                      id="editScheduleTime"
                      type="time"
                      value={editScheduleTime}
                      onChange={(e) => setEditScheduleTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="editScheduleTechnician">Técnico (opcional)</Label>
                    <Input
                      id="editScheduleTechnician"
                      value={editScheduleTechnician}
                      onChange={(e) => setEditScheduleTechnician(e.target.value)}
                      placeholder="Nome do técnico responsável"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditModalOpen(false); setEditingOrder(null); }}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar Alterações"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
