"use client";

import { useEffect, useState } from "react";
import { getClients, createClient, deleteClient } from "@/services/storage";
import { Client } from "@/types";
import { formatPhone, formatPhoneInput } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Phone, MapPin, Plus, Trash2, AlertTriangle, User } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const data = await getClients();
    setClients(data);
  };

  const resetForm = () => {
    setForm({ fullName: "", phone: "", address: "" });
  };

  const filtered = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.address || submitting) return;
    setSubmitting(true);
    try {
      await createClient({
        fullName: form.fullName,
        phone: form.phone.replace(/\D/g, ""),
        address: form.address,
      });
      await refresh();
      setModalOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    await deleteClient(clientToDelete.id);
    await refresh();
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-graphite-400">Base de clientes cadastrados no sistema</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Nome completo do cliente"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                    placeholder="(31) 99999-9999"
                    className="pl-10"
                    maxLength={15}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Endereço Completo</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar Cliente"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
          <Input
            placeholder="Buscar por nome ou telefone"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-graphite-950 border border-graphite-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-450/20 flex items-center justify-center text-emerald-450 font-semibold">
                  {client.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.fullName}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-graphite-400">
                      <Phone className="w-3.5 h-3.5" />
                      {formatPhone(client.phone)}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-graphite-400">
                      <MapPin className="w-3.5 h-3.5 mt-0.5" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => confirmDelete(client)}
                  className="text-graphite-500 hover:text-danger transition"
                  title="Excluir cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-graphite-500 py-8 col-span-full">Nenhum cliente encontrado.</p>
          )}
        </div>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Excluir Cliente
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clientToDelete?.fullName}</strong>? Esta ação não poderá ser desfeita.
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
