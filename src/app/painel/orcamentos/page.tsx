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
  budgetStatusLabels,
  budgetStatusColors,
  whatsappLink,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import BudgetModal from "@/components/budget-modal";
import { Search, Eye, Send, FileText, Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const [o, c, cat] = await Promise.all([getOrders(), getClients(), getCatalog()]);
      setOrders(o);
      setClients(c);
      setCatalog(cat);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao carregar orçamentos.");
    }
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

  const resetEditing = () => {
    setEditingOrder(null);
  };

  const openEdit = (order: OrderService) => {
    setEditingOrder(order);
    setEditModalOpen(true);
  };

  const handleCreate = async (data: {
    source: "os_existente" | "cliente_direto";
    orderId: string;
    clientId: string;
    fullName: string;
    phone: string;
    address: string;
    notes: string;
    validity: string;
    status: BudgetStatus;
    items: Omit<BudgetItem, "id" | "orderId" | "total">[];
  }) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let clientData: { fullName: string; phone: string; address: string };

      if (data.source === "os_existente") {
        const targetOrder = orders.find((o) => o.id === data.orderId);
        if (!targetOrder) return;
        clientData = {
          fullName: targetOrder.client.fullName,
          phone: targetOrder.client.phone,
          address: targetOrder.client.address,
        };
      } else {
        if (data.clientId === "new") {
          if (!data.fullName || !data.phone || !data.address) return;
          clientData = {
            fullName: data.fullName,
            phone: data.phone.replace(/\D/g, ""),
            address: data.address,
          };
        } else {
          const client = clients.find((c) => c.id === data.clientId);
          if (!client) return;
          clientData = {
            fullName: client.fullName,
            phone: client.phone,
            address: client.address,
          };
        }
      }

      if (data.source === "os_existente") {
        const targetOrder = orders.find((o) => o.id === data.orderId);
        if (!targetOrder) return;
        await setBudgetItems(targetOrder.id, data.items);
        await updateOrderBudgetStatus(targetOrder.id, data.status);
        const description = buildDescription(targetOrder.description, data.notes, data.validity);
        if (description !== targetOrder.description) {
          await updateOrderDescription(targetOrder.id, description);
        }
      } else {
        const newOrder = await createOrderManual({
          client: clientData,
          description: buildDescription("", data.notes, data.validity),
          status:
            data.status === "aprovado"
              ? "em_execucao"
              : data.status === "recusado"
              ? "recusado"
              : "em_orcamento",
          media: [],
        });
        await setBudgetItems(newOrder.id, data.items);
        await updateOrderBudgetStatus(newOrder.id, data.status);
      }

      await refresh();
      setCreateModalOpen(false);
      toast({ title: "Orçamento salvo com sucesso", variant: "success" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível salvar o orçamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: {
    source: "os_existente" | "cliente_direto";
    orderId: string;
    clientId: string;
    fullName: string;
    phone: string;
    address: string;
    notes: string;
    validity: string;
    status: BudgetStatus;
    items: Omit<BudgetItem, "id" | "orderId" | "total">[];
  }) => {
    if (!editingOrder || submitting) return;
    setSubmitting(true);
    try {
      await setBudgetItems(editingOrder.id, data.items);
      await updateOrderBudgetStatus(editingOrder.id, data.status);

      const description = buildDescription(editingOrder.description, data.notes, data.validity);
      if (description !== editingOrder.description) {
        await updateOrderDescription(editingOrder.id, description);
      }

      await refresh();
      setEditModalOpen(false);
      resetEditing();
      toast({ title: "Orçamento atualizado com sucesso", variant: "success" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível atualizar o orçamento.");
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
    try {
      await deleteOrder(orderToDelete.id);
      await refresh();
      setDeleteModalOpen(false);
      setOrderToDelete(null);
      toast({ title: "Orçamento excluído", variant: "success" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível excluir o orçamento.");
    }
  };

  const handleSendWhatsApp = async (order: OrderService) => {
    const company = await getCompany().catch(() => ({ name: "RD Solutions" }) as Awaited<ReturnType<typeof getCompany>>);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-graphite-400">Gerencie orçamentos e aprovações dos clientes</p>
        </div>
        <Button
          onClick={() => {
            setEditingOrder(null);
            setCreateModalOpen(true);
          }}
          className="gap-2"
        >
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
        submitLabel="Criar Orçamento"
        editingOrder={null}
        orders={orders}
        clients={clients}
        catalog={catalog}
        submitting={submitting}
        onSubmit={handleCreate}
      />

      <BudgetModal
        open={editModalOpen}
        onOpenChange={(v) => {
          setEditModalOpen(v);
          if (!v) resetEditing();
        }}
        title={`Editar Orçamento - #${editingOrder?.number || ""}`}
        submitLabel="Salvar Alterações"
        editingOrder={editingOrder}
        orders={orders}
        clients={clients}
        catalog={catalog}
        submitting={submitting}
        onSubmit={handleEdit}
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

function buildDescription(base: string, notes: string, validity: string) {
  return [base, notes && `Obs: ${notes}`, validity && `Validade: ${validity}`]
    .filter(Boolean)
    .join("\n");
}

async function updateOrderDescription(id: string, description: string) {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("orders").update({ description }).eq("id", id);
  if (error) throw error;
}
