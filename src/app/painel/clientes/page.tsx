"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClients, createClient, updateClient, deleteClient, getOrders } from "@/services/storage";
import { Client, OrderService } from "@/types";
import { formatPhone, formatPhoneInput, statusLabels, statusColors } from "@/lib/utils";
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
import { Search, Phone, MapPin, Plus, Trash2, AlertTriangle, User, Eye, Pencil, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
    const [c, o] = await Promise.all([getClients(), getOrders()]);
    setClients(c);
    setOrders(o);
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

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setForm({
      fullName: client.fullName,
      phone: formatPhone(client.phone),
      address: client.address,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !form.fullName || !form.phone || !form.address || submitting) return;
    setSubmitting(true);
    try {
      await updateClient(selectedClient.id, {
        fullName: form.fullName,
        phone: form.phone.replace(/\D/g, ""),
        address: form.address,
      });
      await refresh();
      setEditModalOpen(false);
      setSelectedClient(null);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const openView = (client: Client) => {
    setSelectedClient(client);
    setViewModalOpen(true);
  };

  const confirmDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    await deleteClient(selectedClient.id);
    await refresh();
    setDeleteModalOpen(false);
    setSelectedClient(null);
  };

  const clientOrders = selectedClient
    ? orders.filter((o) => o.clientId === selectedClient.id)
    : [];

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
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => openView(client)}
                    className="text-graphite-500 hover:text-emerald-450 transition"
                    title="Visualizar cliente"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(client)}
                    className="text-graphite-500 hover:text-info transition"
                    title="Editar cliente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(client)}
                    className="text-graphite-500 hover:text-danger transition"
                    title="Excluir cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-graphite-500 py-8 col-span-full">Nenhum cliente encontrado.</p>
          )}
        </div>
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
                <Input
                  id="edit-fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nome completo do cliente"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
                <Input
                  id="edit-phone"
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
              <Label htmlFor="edit-address">Endereço Completo</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
                <Input
                  id="edit-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua, número, bairro, cidade"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar Alterações"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-450" /> Detalhes do Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-5 mt-2">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-emerald-450/20 flex items-center justify-center text-emerald-450 font-bold text-xl">
                  {selectedClient.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold">{selectedClient.fullName}</p>
                  <p className="text-sm text-graphite-400">Cliente desde {new Date(selectedClient.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 text-graphite-300">
                  <Phone className="w-4 h-4 text-emerald-450" />
                  {formatPhone(selectedClient.phone)}
                </div>
                <div className="flex items-start gap-3 text-graphite-300">
                  <MapPin className="w-4 h-4 text-emerald-450 mt-0.5" />
                  <span>{selectedClient.address}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-450" /> Ordens de Serviço ({clientOrders.length})
                </h3>

                {clientOrders.length === 0 ? (
                  <p className="text-sm text-graphite-500">Nenhuma O.S. vinculada a este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {clientOrders.map((order) => (
                      <Link key={order.id} href={`/painel/os/${order.id}`}>
                        <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-3 hover:border-emerald-450/40 transition group"
                        onClick={() => setViewModalOpen(false)}
                        role="button"
                        tabIndex={0}
                      >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-emerald-450">#{order.number}</span>
                            <ArrowRight className="w-4 h-4 text-graphite-500 group-hover:text-emerald-450 transition" />
                          </div>
                          <p className="text-sm text-graphite-400 line-clamp-1">{order.description}</p>
                          <span
                            className={cn(
                              "inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border",
                              statusColors[order.status]
                            )}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Excluir Cliente
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{selectedClient?.fullName}</strong>? Esta ação não poderá ser desfeita.
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
