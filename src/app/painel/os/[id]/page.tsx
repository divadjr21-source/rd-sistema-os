"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getOrderById,
  getCatalog,
  updateOrderStatus,
  addBudgetItem,
  removeBudgetItem,
} from "@/services/storage";
import { OrderService, OrderStatus, CatalogItem } from "@/types";
import { formatCurrency, formatPhone, statusLabels } from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Trash2,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Wrench,
  Video,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const statusOptions: OrderStatus[] = [
  "pendente",
  "em_orcamento",
  "aprovado",
  "em_execucao",
  "finalizado",
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderService | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    type: "material" as "material" | "service",
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    refresh();
  }, [id]);

  const refresh = async () => {
    const [o, c] = await Promise.all([getOrderById(id), getCatalog()]);
    if (o) setOrder(o);
    setCatalog(c);
  };

  const total = useMemo(() => {
    return (order?.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
  }, [order]);

  const handleStatusChange = async (status: OrderStatus) => {
    await updateOrderStatus(id, status);
    const updated = await getOrderById(id);
    if (updated) setOrder(updated);
  };

  const handleAddItem = async () => {
    if (!newItem.name || newItem.quantity <= 0 || newItem.unitPrice < 0) return;
    await addBudgetItem(id, newItem);
    const updated = await getOrderById(id);
    if (updated) setOrder(updated);
    setNewItem({ name: "", type: "material", quantity: 1, unitPrice: 0 });
    setItemDialogOpen(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeBudgetItem(itemId);
    const updated = await getOrderById(id);
    if (updated) setOrder(updated);
  };

  const selectCatalogItem = (catalogId: string) => {
    const item = catalog.find((c) => c.id === catalogId);
    if (item) {
      setNewItem({
        name: item.name,
        type: item.type,
        quantity: 1,
        unitPrice: item.unitPrice,
      });
    }
  };

  const generatePDF = () => {
    if (!order) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Orçamento - RD Solutions", 14, 20);
    doc.setFontSize(11);
    doc.text(`O.S.: ${order.number}`, 14, 32);
    doc.text(`Cliente: ${order.client.fullName}`, 14, 39);
    doc.text(`Telefone: ${formatPhone(order.client.phone)}`, 14, 46);
    doc.text(`Endereço: ${order.client.address}`, 14, 53);

    autoTable(doc, {
      startY: 62,
      head: [["Item", "Tipo", "Qtd", "Valor Unit.", "Total"]],
      body: (order.budgetItems || []).map((item) => [
        item.name,
        item.type === "material" ? "Material" : "Serviço",
        item.quantity,
        formatCurrency(item.unitPrice),
        formatCurrency(item.total),
      ]),
      foot: [["", "", "", "TOTAL", formatCurrency(total)]],
    });

    doc.save(`orcamento-${order.number}.pdf`);
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64 text-graphite-400">
        Carregando O.S...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="outline" onClick={() => router.back()} className="w-fit gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex items-center gap-3">
          <Select value={order.status} onValueChange={(v) => handleStatusChange(v as OrderStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={generatePDF} className="gap-2">
            <FileDown className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-graphite-400">Ordem de Serviço</p>
                <h1 className="text-2xl font-bold text-emerald-450">#{order.number}</h1>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-graphite-800 text-graphite-200 border-graphite-700">
                {statusLabels[order.status]}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Info icon={FileText} label="Cliente" value={order.client.fullName} />
              <Info icon={Phone} label="Telefone" value={formatPhone(order.client.phone)} />
              <Info icon={MapPin} label="Endereço" value={order.client.address} />
              <Info icon={Calendar} label="Abertura" value={new Date(order.createdAt).toLocaleString("pt-BR")} />
            </div>

            <div className="mt-5">
              <Label className="text-graphite-300 mb-1.5 block">Descrição do Problema</Label>
              <Textarea value={order.description} readOnly className="bg-graphite-950" />
            </div>
          </section>

          {order.media.length > 0 && (
            <section className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
              <h2 className="text-lg font-semibold mb-4">Mídias do Cliente</h2>
              <div className="relative aspect-video bg-graphite-950 rounded-xl overflow-hidden">
                {order.media[selectedMedia].type === "video" ? (
                  <video src={order.media[selectedMedia].url} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={order.media[selectedMedia].url} alt="" className="w-full h-full object-contain" />
                )}
                {order.media.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedMedia((i) => (i > 0 ? i - 1 : order.media.length - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedMedia((i) => (i < order.media.length - 1 ? i + 1 : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
                {order.media.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMedia(idx)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                      selectedMedia === idx ? "border-emerald-450" : "border-transparent"
                    }`}
                  >
                    {m.type === "video" ? (
                      <Video className="w-full h-full object-cover p-4 text-graphite-400" />
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Orçamento</h2>
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label>Adicionar do catálogo (opcional)</Label>
                      <Select onValueChange={selectCatalogItem}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um item" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} - {formatCurrency(item.unitPrice)}/{item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Nome do item</Label>
                      <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <Select
                          value={newItem.type}
                          onValueChange={(v) => setNewItem({ ...newItem, type: v as "material" | "service" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="material">Material</SelectItem>
                            <SelectItem value="service">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Valor Unitário (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                      />
                    </div>

                    <Button onClick={handleAddItem} className="w-full">Adicionar ao Orçamento</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {(order.budgetItems || []).length === 0 ? (
                <p className="text-sm text-graphite-500 py-4 text-center">Nenhum item adicionado.</p>
              ) : (
                (order.budgetItems || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-graphite-950 rounded-xl border border-graphite-800"
                  >
                    <div className="flex items-center gap-3">
                      {item.type === "material" ? (
                        <Package className="w-4 h-4 text-info" />
                      ) : (
                        <Wrench className="w-4 h-4 text-warning" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-graphite-400">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(item.total)}</span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-graphite-500 hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-graphite-800 flex items-center justify-between">
              <span className="text-graphite-400">Total Geral</span>
              <span className="text-xl font-bold text-emerald-450">{formatCurrency(total)}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-emerald-450 mt-0.5" />
      <div>
        <p className="text-xs text-graphite-400">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
