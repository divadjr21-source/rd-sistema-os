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
  updateOrderPriority,
  updateOrderDescription,
  addOrderUpdate,
  getOrderUpdates,
  addBudgetItem,
  removeBudgetItem,
} from "@/services/storage";
import { OrderService, OrderStatus, OrderPriority, CatalogItem } from "@/types";
import { formatCurrency, formatPhone, statusLabels, priorityLabels, priorityColors } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
  Clock,
  MessageSquare,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast, toastError } from "@/hooks/use-toast";
import { getCompany } from "@/services/storage";

const statusOptions: OrderStatus[] = [
  "pendente",
  "em_orcamento",
  "aprovado",
  "recusado",
  "em_execucao",
  "finalizado",
];

const priorityOptions: OrderPriority[] = ["baixa", "media", "alta"];

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
  const [updates, setUpdates] = useState<{ id: string; note: string; createdAt: string }[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    refresh();
  }, [id]);

  const refresh = async () => {
    try {
      const [o, c] = await Promise.all([getOrderById(id), getCatalog()]);
      if (o) {
        setOrder(o);
        setDescriptionDraft(o.description);
        const history = await getOrderUpdates(id);
        setUpdates(history);
      }
      setCatalog(c);
    } catch (error) {
      toastError(error, "Erro ao carregar a O.S.");
    }
  };

  const total = useMemo(() => {
    return (order?.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
  }, [order]);

  const handleStatusChange = async (status: OrderStatus) => {
    const previous = order;
    if (order) setOrder({ ...order, status });
    try {
      await updateOrderStatus(id, status);
      const updated = await getOrderById(id);
      if (updated) setOrder(updated);
      toast({ title: "Status atualizado", variant: "success" });
    } catch (error) {
      if (previous) setOrder(previous);
      toastError(error, "Não foi possível salvar o status");
    }
  };

  const handlePriorityChange = async (priority: OrderPriority) => {
    const previous = order;
    if (order) setOrder({ ...order, priority });
    try {
      await updateOrderPriority(id, priority);
      const updated = await getOrderById(id);
      if (updated) setOrder(updated);
      toast({ title: "Prioridade atualizada", variant: "success" });
    } catch (error) {
      if (previous) setOrder(previous);
      toastError(error, "Não foi possível salvar a prioridade");
    }
  };

  // Só grava a descrição quando o técnico sai do campo (onBlur), nunca a cada
  // tecla digitada. Isso evita o "come letra": salvar a cada tecla disparava
  // uma requisição ao Supabase e uma busca completa da O.S. a cada caractere,
  // e respostas fora de ordem sobrescreviam o texto que já tinha sido digitado.
  const handleDescriptionBlur = async () => {
    if (!order || descriptionDraft === order.description) return;
    setSavingDescription(true);
    try {
      await updateOrderDescription(id, descriptionDraft);
      setOrder({ ...order, description: descriptionDraft });
      toast({ title: "Descrição salva", variant: "success" });
    } catch (error) {
      setDescriptionDraft(order.description);
      toastError(error, "Não foi possível salvar a descrição");
    } finally {
      setSavingDescription(false);
    }
  };

  const handleAddUpdate = async () => {
    const note = newUpdate.trim();
    if (!note || sendingUpdate) return;
    setSendingUpdate(true);
    try {
      const history = await addOrderUpdate(id, note);
      setUpdates(history);
      setNewUpdate("");
    } catch (error) {
      toastError(error, "Não foi possível salvar a tratativa");
    } finally {
      setSendingUpdate(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || newItem.quantity <= 0 || newItem.unitPrice < 0) {
      toast({ title: "Preencha nome, quantidade e valor do item", variant: "error" });
      return;
    }
    if (savingItem) return;
    setSavingItem(true);
    try {
      await addBudgetItem(id, newItem);
      const updated = await getOrderById(id);
      if (updated) setOrder(updated);
      setNewItem({ name: "", type: "material", quantity: 1, unitPrice: 0 });
      setItemDialogOpen(false);
      toast({ title: "Item adicionado ao orçamento", variant: "success" });
    } catch (error) {
      toastError(error, "Não foi possível adicionar o item");
    } finally {
      setSavingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeBudgetItem(itemId);
      const updated = await getOrderById(id);
      if (updated) setOrder(updated);
    } catch (error) {
      toastError(error, "Não foi possível remover o item");
    }
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

  const generatePDF = async () => {
    if (!order) return;
    try {
      const company = await getCompany();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;

      // --- Cabeçalho / letterhead ---
      doc.setFillColor(16, 24, 21);
      doc.rect(0, 0, pageWidth, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(company.name || "RD Solutions", marginX, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const contactLine = [company.address, company.city].filter(Boolean).join(" - ");
      if (contactLine) doc.text(contactLine, marginX, 21);
      if (company.whatsapp) doc.text(`WhatsApp: ${formatPhone(company.whatsapp)}`, marginX, 27);

      doc.setFontSize(13);
      doc.text("ORÇAMENTO", pageWidth - marginX, 15, { align: "right" });
      doc.setFontSize(9);
      doc.text(`O.S. Nº ${order.number}`, pageWidth - marginX, 21, { align: "right" });
      doc.text(new Date().toLocaleDateString("pt-BR"), pageWidth - marginX, 27, { align: "right" });

      doc.setTextColor(20, 20, 20);

      // --- Dados do cliente ---
      let y = 44;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Dados do Cliente", marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 7;
      doc.text(`Cliente: ${order.client.fullName}`, marginX, y);
      y += 6;
      doc.text(`Telefone: ${formatPhone(order.client.phone)}`, marginX, y);
      y += 6;
      doc.text(`Endereço: ${order.client.address}`, marginX, y);
      y += 6;
      doc.text(`Descrição do problema: ${order.description}`, marginX, y, {
        maxWidth: pageWidth - marginX * 2,
      });
      y += 12;

      const items = order.budgetItems || [];
      const products = items.filter((i) => i.type === "material");
      const services = items.filter((i) => i.type === "service");

      // --- Tabela de Produtos ---
      if (products.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Produtos / Materiais", marginX, y);
        autoTable(doc, {
          startY: y + 3,
          margin: { left: marginX, right: marginX },
          head: [["Item", "Qtd", "Valor Unit.", "Total"]],
          body: products.map((item) => [
            item.name,
            String(item.quantity),
            formatCurrency(item.unitPrice),
            formatCurrency(item.total),
          ]),
          theme: "grid",
          headStyles: { fillColor: [16, 24, 21] },
          styles: { fontSize: 9 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Tabela de Serviços ---
      if (services.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Serviços", marginX, y);
        autoTable(doc, {
          startY: y + 3,
          margin: { left: marginX, right: marginX },
          head: [["Item", "Qtd", "Valor Unit.", "Total"]],
          body: services.map((item) => [
            item.name,
            String(item.quantity),
            formatCurrency(item.unitPrice),
            formatCurrency(item.total),
          ]),
          theme: "grid",
          headStyles: { fillColor: [16, 24, 21] },
          styles: { fontSize: 9 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (items.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Nenhum item de orçamento cadastrado.", marginX, y);
        y += 10;
      }

      // --- Total geral ---
      doc.setFillColor(230, 245, 238);
      doc.rect(marginX, y, pageWidth - marginX * 2, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL GERAL", marginX + 4, y + 8);
      doc.text(formatCurrency(total), pageWidth - marginX - 4, y + 8, { align: "right" });
      y += 22;

      // --- Termos e condições ---
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Termos e Condições", marginX, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const terms = [
        "1. Este orçamento tem validade de 15 (quinze) dias corridos a partir da data de emissão.",
        "2. Os valores acima incluem mão de obra e materiais listados; itens não previstos serão orçados à parte.",
        "3. O início dos serviços está condicionado à aprovação formal deste orçamento pelo cliente.",
        "4. Eventuais alterações de escopo solicitadas pelo cliente durante a execução poderão gerar aditivo de valor.",
        "5. A garantia dos serviços executados é de 90 (noventa) dias, contados a partir da data de conclusão.",
      ];
      terms.forEach((line) => {
        doc.text(line, marginX, y, { maxWidth: pageWidth - marginX * 2 });
        y += 5;
      });

      // --- Assinatura ---
      y += 18;
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      doc.setDrawColor(120, 120, 120);
      doc.line(marginX, y, marginX + 80, y);
      doc.line(pageWidth - marginX - 80, y, pageWidth - marginX, y);
      doc.setFontSize(9);
      doc.text("Assinatura do Cliente", marginX, y + 5);
      doc.text("Assinatura do Responsável Técnico", pageWidth - marginX - 80, y + 5);

      doc.save(`orcamento-${order.number}.pdf`);
      toast({ title: "PDF gerado com sucesso", variant: "success" });
    } catch (error) {
      toastError(error, "Não foi possível gerar o PDF");
    }
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
          <Select value={order.priority} onValueChange={(v) => handlePriorityChange(v as OrderPriority)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
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
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-graphite-800 text-graphite-200 border-graphite-700">
                  {statusLabels[order.status]}
                </span>
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border font-medium",
                    priorityColors[order.priority]
                  )}
                >
                  {priorityLabels[order.priority]}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Info icon={FileText} label="Cliente" value={order.client.fullName} />
              <Info icon={Phone} label="Telefone" value={formatPhone(order.client.phone)} />
              <Info icon={MapPin} label="Endereço" value={order.client.address} />
              <Info icon={Calendar} label="Abertura" value={new Date(order.createdAt).toLocaleString("pt-BR")} />
            </div>

            <div className="mt-5">
              <Label className="text-graphite-300 mb-1.5 block flex items-center gap-2">
                Descrição do Problema
                {savingDescription && <span className="text-xs text-graphite-500">salvando...</span>}
              </Label>
              <Textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={handleDescriptionBlur}
                className="bg-graphite-950 min-h-[100px]"
              />
            </div>
          </section>

          <section className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-450" /> Trativa / Andamento do Atendimento
            </h2>
            <div className="space-y-3 mb-5">
              <Textarea
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Digite uma atualização de andamento do atendimento..."
                className="bg-graphite-950 min-h-[80px]"
              />
              <Button onClick={handleAddUpdate} disabled={sendingUpdate || !newUpdate.trim()} className="gap-2">
                <Clock className="w-4 h-4" /> {sendingUpdate ? "Salvando..." : "Adicionar Tratativa"}
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {updates.length === 0 ? (
                <p className="text-sm text-graphite-500 text-center py-4">Nenhuma tratativa registrada ainda.</p>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="bg-graphite-950 border border-graphite-800 rounded-xl p-4">
                    <p className="text-sm whitespace-pre-line">{u.note}</p>
                    <p className="text-xs text-graphite-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(u.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
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
