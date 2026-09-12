"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "@/services/storage";
import { CatalogItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Package, Wrench, Search } from "lucide-react";

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<CatalogItem, "id">>({
    name: "",
    type: "material",
    unitPrice: 0,
    unit: "un",
  });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const data = await getCatalog();
    setItems(data);
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", type: "material", unitPrice: 0, unit: "un" });
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setForm({ name: item.name, type: item.type, unitPrice: item.unitPrice, unit: item.unit });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || form.unitPrice < 0 || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCatalogItem(editingId, form);
      } else {
        await createCatalogItem(form);
      }
      await refresh();
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir item do catálogo?")) {
      await deleteCatalogItem(id);
      await refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Preços</h1>
          <p className="text-graphite-400">Materiais e serviços frequentes para orçamentos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNew}>
              <Plus className="w-4 h-4" /> Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Item" : "Novo Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as "material" | "service" })}
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
                  <Label>Unidade</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Preço de Venda (R$)</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
          <Input
            placeholder="Buscar item..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-graphite-950 border border-graphite-800 rounded-xl p-4 flex items-start justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-graphite-900">
                  {item.type === "material" ? (
                    <Package className="w-5 h-5 text-info" />
                  ) : (
                    <Wrench className="w-5 h-5 text-warning" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-graphite-400 capitalize">{item.type} / {item.unit}</p>
                  <p className="text-emerald-450 font-semibold mt-1">{formatCurrency(item.unitPrice)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(item)} className="p-2 text-graphite-400 hover:text-emerald-450">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-graphite-400 hover:text-danger">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-graphite-500 py-8 col-span-full">Nenhum item encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
