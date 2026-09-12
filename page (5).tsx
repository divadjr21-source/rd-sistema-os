"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCostProjectById,
  updateCostProjectValue,
  deleteCostProject,
  addCostPurchase,
  updateCostPurchase,
  deleteCostPurchase,
  addCostTechnicianDay,
  updateCostTechnicianDay,
  deleteCostTechnicianDay,
} from "@/services/storage";
import { CostProject, CostProjectPurchase, CostProjectTechnicianDay } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/hooks/use-toast";

type PurchaseDraft = { purchaseDate: string; supplier: string; description: string; cost: string };
type DayDraft = { workDate: string; technicianName: string; serviceDescription: string; dailyRate: string };

const emptyPurchase: PurchaseDraft = { purchaseDate: new Date().toISOString().slice(0, 10), supplier: "", description: "", cost: "" };
const emptyDay: DayDraft = { workDate: new Date().toISOString().slice(0, 10), technicianName: "", serviceDescription: "", dailyRate: "" };

export default function CostProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<CostProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [projectValueDraft, setProjectValueDraft] = useState("");
  const [savingValue, setSavingValue] = useState(false);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft>(emptyPurchase);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayDraft, setDayDraft] = useState<DayDraft>(emptyDay);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refresh();
  }, [id]);

  const refresh = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getCostProjectById(id);
      if (!data) {
        setLoadError("Projeto de custos não encontrado.");
        return;
      }
      setProject(data);
      setProjectValueDraft(String(data.projectValue));
    } catch (error) {
      setLoadError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!project) return { totalSuppliers: 0, totalDays: 0, totalCost: 0, net: 0 };
    const totalSuppliers = project.purchases.reduce((acc, i) => acc + i.cost, 0);
    const totalDays = project.technicianDays.reduce((acc, i) => acc + i.dailyRate, 0);
    const totalCost = totalSuppliers + totalDays;
    const net = project.projectValue - totalCost;
    return { totalSuppliers, totalDays, totalCost, net };
  }, [project]);

  const handleSaveValue = async () => {
    if (!project) return;
    const value = Number(projectValueDraft) || 0;
    if (value === project.projectValue) return;
    setSavingValue(true);
    try {
      await updateCostProjectValue(project.id, value);
      setProject({ ...project, projectValue: value });
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
      setProjectValueDraft(String(project.projectValue));
    } finally {
      setSavingValue(false);
    }
  };

  // --- Compras / Fornecedores ---

  const openNewPurchase = () => {
    setEditingPurchaseId(null);
    setPurchaseDraft(emptyPurchase);
    setPurchaseModalOpen(true);
  };

  const openEditPurchase = (p: CostProjectPurchase) => {
    setEditingPurchaseId(p.id);
    setPurchaseDraft({
      purchaseDate: p.purchaseDate,
      supplier: p.supplier,
      description: p.description,
      cost: String(p.cost),
    });
    setPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || submitting) return;
    if (!purchaseDraft.supplier.trim()) {
      alert("Informe o fornecedor.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        purchaseDate: purchaseDraft.purchaseDate,
        supplier: purchaseDraft.supplier,
        description: purchaseDraft.description,
        cost: Number(purchaseDraft.cost) || 0,
      };
      if (editingPurchaseId) {
        await updateCostPurchase(editingPurchaseId, payload);
      } else {
        await addCostPurchase(project.id, payload);
      }
      setPurchaseModalOpen(false);
      await refresh();
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm("Excluir esse lançamento de compra?")) return;
    try {
      await deleteCostPurchase(purchaseId);
      await refresh();
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  // --- Diárias de Técnicos ---

  const openNewDay = () => {
    setEditingDayId(null);
    setDayDraft(emptyDay);
    setDayModalOpen(true);
  };

  const openEditDay = (d: CostProjectTechnicianDay) => {
    setEditingDayId(d.id);
    setDayDraft({
      workDate: d.workDate,
      technicianName: d.technicianName,
      serviceDescription: d.serviceDescription,
      dailyRate: String(d.dailyRate),
    });
    setDayModalOpen(true);
  };

  const handleSubmitDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || submitting) return;
    if (!dayDraft.technicianName.trim()) {
      alert("Informe o nome do técnico.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        workDate: dayDraft.workDate,
        technicianName: dayDraft.technicianName,
        serviceDescription: dayDraft.serviceDescription,
        dailyRate: Number(dayDraft.dailyRate) || 0,
      };
      if (editingDayId) {
        await updateCostTechnicianDay(editingDayId, payload);
      } else {
        await addCostTechnicianDay(project.id, payload);
      }
      setDayModalOpen(false);
      await refresh();
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm("Excluir essa diária?")) return;
    try {
      await deleteCostTechnicianDay(dayId);
      await refresh();
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await deleteCostProject(project.id);
      router.push("/painel/custos");
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  if (loading) return <p className="text-graphite-400 text-sm">Carregando...</p>;
  if (loadError || !project)
    return <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-sm text-danger">{loadError}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/painel/custos">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
        <Button
          variant="outline"
          className="gap-2 text-danger border-danger/30 hover:bg-danger/10"
          onClick={() => setDeleteProjectModalOpen(true)}
        >
          <Trash2 className="w-4 h-4" /> Excluir Projeto de Custos
        </Button>
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5">
        <p className="text-xs text-graphite-500">O.S. vinculada</p>
        <h1 className="text-xl font-bold">
          #{project.order?.number} — {project.order?.client.fullName}
        </h1>
        <p className="text-sm text-graphite-400 mt-1">{project.order?.description}</p>

        <div className="mt-4 max-w-xs">
          <Label htmlFor="projectValue">Valor do Projeto (R$)</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="projectValue"
              type="text"
              inputMode="decimal"
              value={projectValueDraft}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*[.,]?\d*$/.test(v)) setProjectValueDraft(v.replace(",", "."));
              }}
              onBlur={handleSaveValue}
              placeholder="0,00"
            />
            {savingValue && <span className="text-xs text-graphite-500 self-center">salvando...</span>}
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label="Valor do Projeto" value={project.projectValue} />
        <SummaryCard label="Total Fornecedores" value={summary.totalSuppliers} negative />
        <SummaryCard label="Total Diárias" value={summary.totalDays} negative />
        <SummaryCard label="Custo Total" value={summary.totalCost} negative />
        <SummaryCard label="Valor Líquido" value={summary.net} highlight />
      </div>

      {/* Compras / Fornecedores */}
      <section className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Compras / Fornecedores</h2>
          <Button size="sm" className="gap-1.5" onClick={openNewPurchase}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
        {project.purchases.length === 0 ? (
          <p className="text-sm text-graphite-500">Nenhuma compra lançada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-graphite-500 border-b border-graphite-800">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Fornecedor</th>
                  <th className="py-2 pr-3 font-medium">Descrição</th>
                  <th className="py-2 pr-3 font-medium text-right">Custo</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {project.purchases.map((p) => (
                  <tr key={p.id} className="border-b border-graphite-800/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(p.purchaseDate + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{p.supplier}</td>
                    <td className="py-2 pr-3 text-graphite-400">{p.description}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCurrency(p.cost)}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      <button onClick={() => openEditPurchase(p)} className="text-graphite-400 hover:text-foreground mr-2">
                        <Pencil className="w-3.5 h-3.5 inline" />
                      </button>
                      <button onClick={() => handleDeletePurchase(p.id)} className="text-danger hover:text-danger/80">
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Diárias de Técnicos */}
      <section className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Diárias de Técnicos</h2>
          <Button size="sm" className="gap-1.5" onClick={openNewDay}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
        {project.technicianDays.length === 0 ? (
          <p className="text-sm text-graphite-500">Nenhuma diária lançada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-graphite-500 border-b border-graphite-800">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Técnico</th>
                  <th className="py-2 pr-3 font-medium">Serviço Realizado</th>
                  <th className="py-2 pr-3 font-medium text-right">Diária</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {project.technicianDays.map((d) => (
                  <tr key={d.id} className="border-b border-graphite-800/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(d.workDate + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{d.technicianName}</td>
                    <td className="py-2 pr-3 text-graphite-400">{d.serviceDescription}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCurrency(d.dailyRate)}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      <button onClick={() => openEditDay(d)} className="text-graphite-400 hover:text-foreground mr-2">
                        <Pencil className="w-3.5 h-3.5 inline" />
                      </button>
                      <button onClick={() => handleDeleteDay(d.id)} className="text-danger hover:text-danger/80">
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Compra */}
      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPurchaseId ? "Editar Compra" : "Nova Compra"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPurchase} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data da Compra</Label>
              <Input
                type="date"
                value={purchaseDraft.purchaseDate}
                onChange={(e) => setPurchaseDraft({ ...purchaseDraft, purchaseDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input
                value={purchaseDraft.supplier}
                onChange={(e) => setPurchaseDraft({ ...purchaseDraft, supplier: e.target.value })}
                placeholder="Nome do fornecedor"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (o que comprei)</Label>
              <Input
                value={purchaseDraft.description}
                onChange={(e) => setPurchaseDraft({ ...purchaseDraft, description: e.target.value })}
                placeholder="Ex: 3 câmeras dome, cabo de rede..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Custo (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={purchaseDraft.cost}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*[.,]?\d*$/.test(v)) setPurchaseDraft({ ...purchaseDraft, cost: v.replace(",", ".") });
                }}
                placeholder="0,00"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Salvando..." : editingPurchaseId ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Diária */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDayId ? "Editar Diária" : "Nova Diária"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitDay} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={dayDraft.workDate}
                onChange={(e) => setDayDraft({ ...dayDraft, workDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Técnico</Label>
              <Input
                value={dayDraft.technicianName}
                onChange={(e) => setDayDraft({ ...dayDraft, technicianName: e.target.value })}
                placeholder="Nome do técnico ou diarista"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Serviço Realizado</Label>
              <Input
                value={dayDraft.serviceDescription}
                onChange={(e) => setDayDraft({ ...dayDraft, serviceDescription: e.target.value })}
                placeholder="Ex: Instalação de câmeras, passagem de cabo..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor da Diária (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={dayDraft.dailyRate}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*[.,]?\d*$/.test(v)) setDayDraft({ ...dayDraft, dailyRate: v.replace(",", ".") });
                }}
                placeholder="0,00"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Salvando..." : editingDayId ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão do projeto */}
      <Dialog open={deleteProjectModalOpen} onOpenChange={setDeleteProjectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5" /> Excluir Projeto de Custos?
            </DialogTitle>
            <DialogDescription>
              Isso remove todos os lançamentos de compras e diárias desse projeto. A O.S. em si não é afetada — só
              o controle de custos vinculado a ela.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProjectModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Excluir Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, negative, highlight }: { label: string; value: number; negative?: boolean; highlight?: boolean }) {
  return (
    <div className="bg-graphite-900 border border-graphite-800 rounded-xl p-4">
      <p className="text-xs text-graphite-500">{label}</p>
      <p
        className={cn(
          "text-lg font-bold mt-1 flex items-center gap-1.5",
          highlight ? (value >= 0 ? "text-emerald-450" : "text-danger") : negative ? "text-graphite-200" : "text-foreground"
        )}
      >
        {highlight && (value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
        {negative && value > 0 ? "- " : ""}
        {formatCurrency(value)}
      </p>
    </div>
  );
}
