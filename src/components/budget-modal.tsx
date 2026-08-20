"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrderService, Client, CatalogItem, BudgetStatus, BudgetItem } from "@/types";
import { formatCurrency, formatPhone, formatPhoneInput, budgetStatusLabels } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DraftItem = {
  id?: string;
  name: string;
  type: "material" | "service";
  // Mantidos como string durante a edição para permitir apagar o campo
  // completamente (inclusive o "0" inicial) sem o React forçar de volta
  // um "0" no meio da digitação. São convertidos para número só na hora
  // de calcular o total e no envio final ao Supabase.
  quantity: string;
  unitPrice: string;
};

type FormState = {
  origem: "os_existente" | "cliente_direto";
  orderId: string;
  clientId: string;
  fullName: string;
  phone: string;
  address: string;
  observacoes: string;
  validade: string;
  status: BudgetStatus;
  items: DraftItem[];
};

interface BudgetModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  submitLabel: string;
  editingOrder: OrderService | null;
  orders: OrderService[];
  clients: Client[];
  catalog: CatalogItem[];
  submitting: boolean;
  onSubmit: (data: {
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
  }) => void;
}

export default function BudgetModal({
  open,
  onOpenChange,
  title,
  submitLabel,
  editingOrder,
  orders,
  clients,
  catalog,
  submitting,
  onSubmit,
}: BudgetModalProps) {
  const [form, setForm] = useState<FormState>({
    origem: "os_existente",
    orderId: "",
    clientId: "",
    fullName: "",
    phone: "",
    address: "",
    observacoes: "",
    validade: "",
    status: "pendente",
    items: [],
  });

  useEffect(() => {
    if (!open) return;
    if (editingOrder) {
      setForm({
        origem: "os_existente",
        orderId: editingOrder.id,
        clientId: editingOrder.clientId,
        fullName: editingOrder.client.fullName,
        phone: editingOrder.client.phone,
        address: editingOrder.client.address,
        observacoes: "",
        validade: "",
        status: editingOrder.budgetStatus || "pendente",
        items: (editingOrder.budgetItems || []).map((b) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          quantity: String(b.quantity),
          unitPrice: String(b.unitPrice),
        })),
      });
    } else {
      setForm({
        origem: "os_existente",
        orderId: "",
        clientId: "",
        fullName: "",
        phone: "",
        address: "",
        observacoes: "",
        validade: "",
        status: "pendente",
        items: [],
      });
    }
  }, [open, editingOrder]);

  const total = form.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const items = form.items
      .filter((i) => i.name.trim() !== "" && Number(i.quantity) > 0)
      .map((i) => ({
        catalogItemId: undefined as string | undefined,
        name: i.name,
        type: i.type,
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
      }));

    onSubmit({
      source: form.origem,
      orderId: form.orderId,
      clientId: form.clientId,
      fullName: form.fullName,
      phone: form.phone,
      address: form.address,
      notes: form.observacoes,
      validity: form.validade,
      status: form.status,
      items,
    });
  };

  const addCatalogItem = (catalogItem: CatalogItem) => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name: catalogItem.name,
          type: catalogItem.type,
          quantity: "1",
          unitPrice: String(catalogItem.unitPrice),
        },
      ],
    }));
  };

  const addFreeItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", type: "material", quantity: "1", unitPrice: "" }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, data: Partial<DraftItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...data } : item)),
    }));
  };

  const budgetStatusOptions: BudgetStatus[] = ["pendente", "aprovado", "recusado"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {!editingOrder && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Origem do Orçamento</label>
                <select
                  value={form.origem}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      origem: e.target.value as "os_existente" | "cliente_direto",
                      orderId: "",
                      clientId: "",
                    }))
                  }
                  className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                >
                  <option value="os_existente">Vincular a O.S. existente</option>
                  <option value="cliente_direto">Cliente direto (sem O.S.)</option>
                </select>
              </div>

              {form.origem === "os_existente" ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Selecionar O.S.</label>
                  <select
                    value={form.orderId}
                    onChange={(e) => {
                      const order = orders.find((o) => o.id === e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        orderId: e.target.value,
                        clientId: order?.clientId || "",
                        fullName: order?.client.fullName || "",
                        phone: order?.client.phone || "",
                        address: order?.client.address || "",
                      }));
                    }}
                    required
                    className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                  >
                    <option value="">Escolha uma O.S.</option>
                    {orders
                      .filter((o) => (o.budgetItems || []).length === 0)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.number} - {o.client.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cliente</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "new") {
                        setForm((prev) => ({
                          ...prev,
                          clientId: v,
                          fullName: "",
                          phone: "",
                          address: "",
                        }));
                      } else {
                        const client = clients.find((c) => c.id === v);
                        setForm((prev) => ({
                          ...prev,
                          clientId: v,
                          fullName: client?.fullName || "",
                          phone: client?.phone || "",
                          address: client?.address || "",
                        }));
                      }
                    }}
                    required
                    className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                  >
                    <option value="">Escolha um cliente</option>
                    <option value="new">+ Novo cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {formatPhone(c.phone)}
                      </option>
                    ))}
                  </select>

                  {form.clientId === "new" && (
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      <input
                        placeholder="Nome completo"
                        value={form.fullName}
                        onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        required
                        className="h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                      />
                      <input
                        placeholder="Telefone"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            phone: formatPhoneInput(e.target.value),
                          }))
                        }
                        maxLength={15}
                        required
                        className="h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                      />
                      <input
                        placeholder="Endereço"
                        value={form.address}
                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                        required
                        className="h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-emerald-450"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {editingOrder && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status do Orçamento</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BudgetStatus }))}
                className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
              >
                {budgetStatusOptions.map((s) => (
                  <option key={s} value={s}>{budgetStatusLabels[s]}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Adicionar Item do Catálogo</label>
            <select
              value=""
              onChange={(e) => {
                const item = catalog.find((c) => c.id === e.target.value);
                if (item) addCatalogItem(item);
                e.target.value = "";
              }}
              className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
            >
              <option value="">Escolha um material/serviço</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "material" ? "Material" : "Serviço"}) - {formatCurrency(c.unitPrice)}/{c.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Itens do Orçamento</label>
              <Button type="button" variant="outline" size="sm" onClick={addFreeItem} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Item avulso
              </Button>
            </div>

            {form.items.length === 0 && (
              <p className="text-sm text-graphite-500">Nenhum item adicionado.</p>
            )}

            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-graphite-950 p-3 rounded-xl border border-graphite-800">
                <div className="col-span-12 sm:col-span-5">
                  <label className="text-xs text-graphite-400 block mb-1">Item</label>
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Nome do item"
                    className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="text-xs text-graphite-400 block mb-1">Qtd</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      // Aceita vazio, dígitos e um separador decimal enquanto digita.
                      if (v === "" || /^\d*[.,]?\d*$/.test(v)) {
                        updateItem(idx, { quantity: v.replace(",", ".") });
                      }
                    }}
                    onBlur={() => {
                      if (item.quantity === "" || Number(item.quantity) <= 0) {
                        updateItem(idx, { quantity: "1" });
                      }
                    }}
                    placeholder="1"
                    className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="text-xs text-graphite-400 block mb-1">Valor Unit.</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*[.,]?\d*$/.test(v)) {
                        updateItem(idx, { unitPrice: v.replace(",", ".") });
                      }
                    }}
                    onBlur={() => {
                      if (item.unitPrice === "") updateItem(idx, { unitPrice: "0" });
                    }}
                    placeholder="0,00"
                    className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
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
              <label htmlFor="validade" className="text-sm font-medium">Validade do Orçamento</label>
              <input
                id="validade"
                value={form.validade}
                onChange={(e) => setForm((prev) => ({ ...prev, validade: e.target.value }))}
                placeholder="Ex: 7 dias"
                className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="status-inicial" className="text-sm font-medium">Status Inicial</label>
              <select
                id="status-inicial"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BudgetStatus }))}
                className="w-full h-10 rounded-xl border border-graphite-700 bg-graphite-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450"
              >
                {budgetStatusOptions.map((s) => (
                  <option key={s} value={s}>{budgetStatusLabels[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="observacoes" className="text-sm font-medium">Observações</label>
            <textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Condições de pagamento, prazos, garantias..."
              rows={4}
              className="w-full rounded-xl border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-450 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-graphite-800">
            <span className="text-graphite-400">Total do Orçamento</span>
            <span className={cn("text-xl font-bold", total > 0 ? "text-emerald-450" : "text-graphite-500")}>
              {formatCurrency(total)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
