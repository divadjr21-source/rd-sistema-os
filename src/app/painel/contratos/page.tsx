"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getContracts,
  getClients,
  createContract,
  updateContract,
  deleteContract,
} from "@/services/storage";
import { Contract, Client } from "@/types";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { Search, Plus, Pencil, Trash2, FileText, User, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    title: "",
    description: "",
    monthlyValue: "",
    nfIssueDay: "5",
    active: true,
  });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const [c, cl] = await Promise.all([getContracts(), getClients()]);
    setContracts(c);
    setClients(cl);
  };

  const resetForm = () => {
    setForm({
      clientId: "",
      title: "",
      description: "",
      monthlyValue: "",
      nfIssueDay: "5",
      active: true,
    });
    setEditingId(null);
  };

  const filtered = contracts.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.client.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingId(contract.id);
    setForm({
      clientId: contract.clientId,
      title: contract.title,
      description: contract.description || "",
      monthlyValue: contract.monthlyValue.toString(),
      nfIssueDay: contract.nfIssueDay.toString(),
      active: contract.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.title || !form.monthlyValue || !form.nfIssueDay || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        clientId: form.clientId,
        title: form.title,
        description: form.description,
        monthlyValue: Number(form.monthlyValue),
        nfIssueDay: Number(form.nfIssueDay),
      };

      if (editingId) {
        await updateContract(editingId, { ...payload, active: form.active });
      } else {
        await createContract(payload);
      }
      await refresh();
      setModalOpen(false);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar contrato";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (contract: Contract) => {
    setContractToDelete(contract);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    await deleteContract(contractToDelete.id);
    await refresh();
    setDeleteModalOpen(false);
    setContractToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contratos Mensais</h1>
          <p className="text-graphite-400">Gerencie clientes mensalistas e emissão de notas fiscais</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNew}>
              <Plus className="w-4 h-4" /> Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm({ ...form, clientId: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
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

              <div className="space-y-1.5">
                <Label htmlFor="title">Título do Contrato</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Manutenção Mensal de CFTV"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição do Serviço</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes do contrato"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyValue">Valor Mensal (R$)</Label>
                  <Input
                    id="monthlyValue"
                    type="number"
                    step={0.01}
                    min={0}
                    value={form.monthlyValue}
                    onChange={(e) => setForm({ ...form, monthlyValue: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nfIssueDay">Dia de Emissão da NF</Label>
                  <Input
                    id="nfIssueDay"
                    type="number"
                    min={1}
                    max={31}
                    value={form.nfIssueDay}
                    onChange={(e) => setForm({ ...form, nfIssueDay: e.target.value })}
                    required
                  />
                </div>
              </div>

              {editingId && (
                <div className="flex items-center gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-graphite-700 bg-graphite-900 text-emerald-450"
                  />
                  <Label htmlFor="active" className="text-sm">Contrato ativo</Label>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar Contrato"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
          <Input
            placeholder="Buscar contrato ou cliente"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contract) => (
            <div
              key={contract.id}
              className={cn(
                "bg-graphite-950 border border-graphite-800 rounded-xl p-4",
                !contract.active && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-450/15">
                    <FileText className="w-5 h-5 text-emerald-450" />
                  </div>
                  <div>
                    <p className="font-medium">{contract.title}</p>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        contract.active
                          ? "bg-emerald-450/10 text-emerald-450 border-emerald-450/30"
                          : "bg-graphite-800 text-graphite-400 border-graphite-700"
                      )}
                    >
                      {contract.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(contract)}
                    className="p-2 text-graphite-400 hover:text-emerald-450"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(contract)}
                    className="p-2 text-graphite-400 hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-graphite-300">
                  <User className="w-4 h-4 text-emerald-450" /> {contract.client.fullName}
                </div>
                <div className="flex items-center gap-2 text-graphite-300">
                  <DollarSign className="w-4 h-4 text-emerald-450" /> {formatCurrency(contract.monthlyValue)}
                </div>
                <div className="flex items-center gap-2 text-graphite-300">
                  <Calendar className="w-4 h-4 text-emerald-450" /> NF emitida todo dia {contract.nfIssueDay}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-graphite-500 py-8 col-span-full">Nenhum contrato encontrado.</p>
          )}
        </div>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Excluir Contrato
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-graphite-400">
            Tem certeza que deseja excluir o contrato <strong>{contractToDelete?.title}</strong>? Esta ação não poderá ser desfeita.
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
