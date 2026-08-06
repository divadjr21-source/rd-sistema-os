"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getOrders,
  getClients,
  getCatalog,
  getCompany,
  createOrderManual,
  setBudgetItems,
  updateOrderBudgetStatus,
  deleteOrder,
} from "@/services/storage";
import { OrderService, Client, CatalogItem, BudgetItem, BudgetStatus } from "@/types";
import {
  formatCurrency,
  formatPhone,
  formatPhoneInput,
  budgetStatusLabels,
  budgetStatusColors,
  whatsappLink,
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
import { Search, Eye, Send, FileText, Plus, Trash2, Pencil, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type DraftItem = {
  id?: string;
  name: string;
  type: "material" | "service";
  quantity: number;
  unitPrice: number;
};

const budgetStatusOptions: BudgetStatus[] = ["pendente", "aprovado", "recusado"];

export default function OrcamentosPage() {
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderService | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderService | null>(null);

  const [form, setForm] = useState({
    source: "order" as "order" | "client",
    orderId: "",
    clientId: "",
    fullName: "",
    phone: "",
    address: "",
    notes: "",
    validity: "",
    status: "pendente" as BudgetStatus,
  });
  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const [o, c, cat] = await Promise.all([getOrders(), getClients(), getCatalog()]);
    setOrders(o);
    setClients(c);
    setCatalog(cat);
  };

  const resetForm = () => {
    setForm({
      source: "order",
      orderId: "",
      clientId: "",
      fullName: "",
      phone: "",
      address: "",
      notes: "",
      validity: "",
      status: "pendente",
    });
    setItems([]);
    setEditingOrder(null);
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const hasBudget = (o.budgetItems || []).length > 0;
      if (!hasBudget) return false;
      return (
        o.client.fullName.toLowerCase().includes(search.toLowerCase()) ||
        o.client.phone.includes(search) ||
        o.number.includes(search)
      );
    });
  }, [orders, search]);

  const totalItems = (list: DraftItem[]) =>
    list.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  const addCatalogItem = (catalogItem: CatalogItem) => {
    setItems((prev) => [
      ...prev,
      {
        name: catalogItem.name,
        type: catalogItem.type,
        quantity: 1,
        unitPrice: catalogItem.unitPrice,
      },
    ]);
  };

  const addFreeItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "", type: "material", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, data: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...data } : item))
    );
  };

  const buildBudgetItems = (): Omit<BudgetItem, "id" | "orderId" | "total">[] => {
    return items
      .filter((i) => i.name.trim() !== "" && i.quantity > 0)
      .map((i) => ({
        catalogItemId: undefined,
        name: i.name,
        type: i.type,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      }));
  };

  const buildDescription = (base: string) => {
    return [base, form.notes && `Obs: ${form.notes}`, form.validity && `Validade: ${form.validity}`]
      .filter(Boolean)
      .join("\n");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      let targetOrder: OrderService | undefined;
      let clientData: { fullName: string; phone: string; address: string };

      if (form.source === "order") {
        targetOrder = orders.find((o) => o.id === form.orderId);
        if (!targetOrder) return;
        clientData = {
          fullName: targetOrder.client.fullName,
          phone: targetOrder.client.phone,
          address: targetOrder.client.address,
        };
      } else {
        if (form.clientId === "new") {
          if (!form.fullName || !form.phone || !form.address) return;
          clientData = {
            fullName: form.fullName,
            phone: form.phone.replace(/\D/g, ""),
            address: form.address,
          };
        } else {
          const client = clients.find((c) => c.id === form.clientId);
          if (!client) return;
          clientData = {
            fullName: client.fullName,
            phone: client.phone,
            address: client.address,
          };
        }
      }

      if (form.source === "order" && targetOrder) {
        await setBudgetItems(targetOrder.id, buildBudgetItems());
        await updateOrderBudgetStatus(targetOrder.id, form.status);
        const description = buildDescription(targetOrder.description);
        if (description !== targetOrder.description) {
          // Mantemos a atualização de descrição via storage
          await updateOrderDescription(targetOrder.id, description);
        }
      } else {
        const newOrder = await createOrderManual({
          client: clientData,
          description: buildDescription(""),
          status: form.status === "aprovado" ? "em_execucao" : form.status === "recusado" ? "recusado" : "em_orcamento",
          media: [],
        });
        await setBudgetItems(newOrder.id, buildBudgetItems());
        await updateOrderBudgetStatus(newOrder.id, form.status);
      }

      await refresh();
      setCreateModalOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (order: OrderService) => {
    setEditingOrder(order);
    setForm({
      source: "order",
      orderId: order.id,
      clientId: order.clientId,
      fullName: order.client.fullName,
      phone: order.client.phone,
      address: order.client.address,
      notes: "",
      validity: "",
      status: order.budgetStatus || "pendente",
    });
    setItems(
      (order.budgetItems || []).map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        quantity: b.quantity,
        unitPrice: b.unitPrice,
      }))
    );
    setEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || submitting) return;

    setSubmitting(true);
    try {
      await setBudgetItems(editingOrder.id, buildBudgetItems());
      await updateOrderBudgetStatus(editingOrder.id, form.status);

      const description = buildDescription(editingOrder.description);
      if (description !== editingOrder.description) {
        await updateOrderDescription(editingOrder.id, description);
      }

      await refresh();
      setEditModalOpen(false);
      resetForm();
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

  const handleSendWhatsApp = async (order: OrderService) => {
    const company = await getCompany();
    const total = (order.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/orcamento/${order.id}`;
    const text = `*Orçamento ${company.name || "RD Solutions"} - O.S. ${order.number}*

Olá ${order.client.fullName},

Seu orçamento está pronto para análise.

*Valor Total:* ${formatCurrency(total)}
*Itens:* ${order.budgetItems?.length || 0}

Acesse o link para aprovar ou solicitar ajustes:
${link}`;

    const url = whatsappLink(order.client.phone, text);
    window.location.assign(url);
  };

  const BudgetModal = ({
    open,
    onOpenChange,
    title,
    onSubmit,
    submitLabel,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
  }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5 mt-2">
          {!editingOrder && (
            <>
              <div className="space-y-1.5">
                <Label>Origem do Orçamento</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v as "order" | "client", orderId: "", clientId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Vincular a O.S. existente</SelectItem>
                    <SelectItem value="client">Cliente direto (sem O.S.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.source === "order" ? (
                <div className="space-y-1.5">
                  <Label>Selecionar O.S.</Label>
                  <Select
                    value={form.orderId}
                    onValueChange={(v) => {
                      const order = orders.find((o) => o.id === v);
                      setForm({
                        ...form,
                        orderId: v,
                        clientId: order?.clientId || "",
                        fullName: order?.client.fullName || "",
                        phone: order?.client.phone || "",
                        address: order?.client.address || "",
                      });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma O.S." />
                    </SelectTrigger>
                    <SelectContent>
                      {orders
                        .filter((o) => (o.budgetItems || []).length === 0)
                        .map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            #{o.number} - {o.client.fullName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(v) => {
                      if (v === "new") {
                        setForm({ ...form, clientId: v, fullName: "", phone: "", address: "" });
                      } else {
                        const client = clients.find((c) => c.id === v);
                        setForm({
                          ...form,
                          clientId: v,
                          fullName: client?.fullName || "",
                          phone: client?.phone || "",
                          address: client?.address || "",
                        });
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Novo cliente</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fullName} - {formatPhone(c.phone)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.clientId === "new" && (
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      <Input
                        placeholder="Nome completo"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        required
                      />
                      <Input
                        placeholder="Telefone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                        maxLength={15}
                        required
                      />
                      <Input
                        placeholder="Endereço"
                        className="sm:col-span-2"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {editingOrder && (
            <div className="space-y-1.5">
              <Label>Status do Orçamento</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as BudgetStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgetStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{budgetStatusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Adicionar Item do Catálogo</Label>
            <Select
              onValueChange={(v) => {
                const item = catalog.find((c) => c.id === v);
                if (item) addCatalogItem(item);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um material/serviço" />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.type === "material" ? "Material" : "Serviço"}) - {formatCurrency(c.unitPrice)}/{c.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Itens do Orçamento</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFreeItem} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Item avulso
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-graphite-500">Nenhum item adicionado.</p>
            )}

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-graphite-950 p-3 rounded-xl border border-graphite-800">
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Label className="text-xs">Item</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Nome do item"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 space-y-1">
                  <Label className="text-xs">Valor Unit.</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 flex justify-end pb-2">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-graphite-500 hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="validity">Validade do Orçamento</Label>
              <Input
                id="validity"
                value={form.validity}
                onChange={(e) => setForm({ ...form, validity: e.target.value })}
                placeholder="Ex: 7 dias"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status Inicial</Label>
              {!editingOrder ? (
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as BudgetStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetStatusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{budgetStatusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={budgetStatusLabels[form.status]} disabled />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Condições de pagamento, prazos, garantias..."
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-graphite-800">
            <span className="text-graphite-400">Total do Orçamento</span>
            <span className="text-xl font-bold text-emerald-450">{formatCurrency(totalItems(items))}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-graphite-400">Gerencie orçamentos e aprovações dos clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </Button>
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
                <th className="py-3 px-3 font-medium">Telefone</th>
                <th className="py-3 px-3 font-medium">Itens</th>
                <th className="py-3 px-3 font-medium">Total</th>
                <th className="py-3 px-3 font-medium">Status Orçamento</th>
                <th className="py-3 px-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-800">
              {filtered.map((order) => {
                const total = (order.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
                return (
                  <tr key={order.id} className="hover:bg-graphite-800/50 transition">
                    <td className="py-3 px-3 font-semibold text-emerald-450">#{order.number}</td>
                    <td className="py-3 px-3">{order.client.fullName}</td>
                    <td className="py-3 px-3 text-graphite-400">{formatPhone(order.client.phone)}</td>
                    <td className="py-3 px-3 text-graphite-400">{order.budgetItems?.length || 0}</td>
                    <td className="py-3 px-3 font-medium">{formatCurrency(total)}</td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          budgetStatusColors[order.budgetStatus || "pendente"]
                        )}
                      >
                        {budgetStatusLabels[order.budgetStatus || "pendente"]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/painel/os/${order.id}`}>
                          <button className="inline-flex items-center gap-1 text-emerald-450 hover:underline">
                            <Eye className="w-4 h-4" /> Ver
                          </button>
                        </Link>
                        <button
                          onClick={() => handleSendWhatsApp(order)}
                          className="inline-flex items-center gap-1 text-emerald-450 hover:underline"
                          title="Enviar WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(order)}
                          className="inline-flex items-center gap-1 text-info hover:text-info/80 transition"
                          title="Editar orçamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(order)}
                          className="inline-flex items-center gap-1 text-danger hover:text-danger/80 transition"
                          title="Excluir orçamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-graphite-500">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-graphite-600" />
                      <p>Nenhum orçamento encontrado.</p>
                      <p className="text-xs">Clique em &quot;Novo Orçamento&quot; para criar.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BudgetModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="Novo Orçamento"
        onSubmit={handleCreate}
        submitLabel="Criar Orçamento"
      />

      <BudgetModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title={`Editar Orçamento - #${editingOrder?.number}`}
        onSubmit={handleEdit}
        submitLabel="Salvar Alterações"
      />

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Excluir Orçamento
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o orçamento da O.S. <strong>#{orderToDelete?.number}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function updateOrderDescription(id: string, description: string) {
  // Atualiza a descrição da ordem no Supabase
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("orders").update({ description }).eq("id", id);
  if (error) throw error;
}
