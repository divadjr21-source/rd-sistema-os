"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createOrder, getCompany, uploadMediaFiles } from "@/services/storage";
import { formatPhone, stripPhone, whatsappLink } from "@/lib/utils";
import { Camera, Upload, CheckCircle, Phone, MapPin, User, FileText } from "lucide-react";
import Link from "next/link";

type MediaFile = {
  file: File;
  preview: string;
  type: "image" | "video";
  name: string;
};

export default function ChamadoPage() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    description: "",
  });
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [osNumber, setOsNumber] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "phone" ? formatPhone(value) : value }));
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const preview = URL.createObjectURL(file);
      const type = file.type.startsWith("video") ? "video" : "image";
      setFiles((prev) => [...prev, { file, preview, type, name: file.name }]);
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.address || !form.description || submitting) return;
    setSubmitting(true);
    try {
      // Cria a ordem primeiro para obter o ID
      const draftOrder = await createOrder({
        client: {
          fullName: form.fullName,
          phone: stripPhone(form.phone),
          address: form.address,
        },
        description: form.description,
        media: [],
      });

      // Faz upload das mídias para o Storage
      const media = files.length > 0 ? await uploadMediaFiles(draftOrder.id, files) : [];

      // Atualiza a ordem com as mídias
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (media.length > 0) {
        const { error } = await supabase
          .from("order_media")
          .insert(media.map((m) => ({ order_id: draftOrder.id, url: m.url, type: m.type, name: m.name })));
        if (error) throw error;
      }

      const order = { ...draftOrder, media };

      setOsNumber(order.number);
      const text = `*Novo Chamado - RD Solutions*\n\n*OS:* ${order.number}\n*Cliente:* ${form.fullName}\n*Telefone:* ${form.phone}\n*Endereço:* ${form.address}\n\n*Problema:*\n${form.description}\n\n${media.length > 0 ? `*Mídias:* ${media.map((f) => f.url).join("\n")}` : ""}\n\n_Acesse o painel: ${process.env.NEXT_PUBLIC_PANEL_URL || "https://app.meusistema.com/painel"}_`;
      const company = await getCompany();
      setWhatsappUrl(whatsappLink(company.whatsapp || "31999999999", text));
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-graphite-950 via-background to-graphite-900">
      <header className="bg-graphite-900/80 backdrop-blur border-b border-graphite-800 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-450 flex items-center justify-center">
              <span className="font-bold text-graphite-950 text-lg">RD</span>
            </div>
            <div className="leading-tight">
              <h1 className="font-semibold text-foreground">RD Solutions</h1>
              <p className="text-xs text-graphite-400">Segurança Eletrônica & CFTV</p>
            </div>
          </div>
          <Link href="/painel" className="text-xs text-emerald-450 hover:underline">
            Área do Técnico
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {submitted ? (
          <div className="bg-graphite-900 border border-emerald-450/30 rounded-2xl p-6 text-center shadow-card">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-450/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-450" />
            </div>
            <h2 className="text-xl font-bold mb-1">Chamado enviado!</h2>
            <p className="text-graphite-400 text-sm mb-4">Sua O.S. foi gerada com sucesso.</p>
            <div className="bg-graphite-950 rounded-xl p-4 mb-5">
              <p className="text-xs text-graphite-400 uppercase tracking-wide">Número da O.S.</p>
              <p className="text-2xl font-bold text-emerald-450">{osNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (whatsappUrl) {
                  window.location.assign(whatsappUrl);
                }
              }}
              className="inline-flex items-center justify-center w-full gap-2 h-12 rounded-xl bg-emerald-450 text-graphite-950 font-semibold hover:bg-emerald-550 transition"
            >
              <Phone className="w-5 h-5" />
              Enviar pelo WhatsApp
            </button>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => {
                setSubmitted(false);
                setForm({ fullName: "", phone: "", address: "", description: "" });
                setFiles([]);
              }}
            >
              Abrir novo chamado
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-graphite-900/60 rounded-2xl p-5 border border-graphite-800">
              <p className="text-sm text-graphite-300 mb-4 leading-relaxed">
                Descreva seu problema e anexe fotos ou vídeos. Nossa equipe técnica retornará em breve.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-graphite-200">
                    <User className="w-4 h-4 text-emerald-450" /> Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-graphite-200">
                    <Phone className="w-4 h-4 text-emerald-450" /> Telefone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(31) 99999-9999"
                    maxLength={15}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="flex items-center gap-2 text-graphite-200">
                    <MapPin className="w-4 h-4 text-emerald-450" /> Endereço Completo
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Rua, número, bairro, cidade"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="flex items-center gap-2 text-graphite-200">
                    <FileText className="w-4 h-4 text-emerald-450" /> Descrição do Problema
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Descreva detalhadamente o defeito, equipamento, local..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-graphite-200">
                    <Camera className="w-4 h-4 text-emerald-450" /> Fotos / Vídeos
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-graphite-700 bg-graphite-900/50 flex flex-col items-center justify-center gap-2 text-graphite-400 hover:border-emerald-450 hover:text-emerald-450 transition"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Toque para anexar fotos ou vídeos</span>
                  </button>

                  {files.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-graphite-950 border border-graphite-800">
                          {file.type === "video" ? (
                            <video src={file.preview} className="w-full h-full object-cover" />
                          ) : (
                            <img src={file.preview} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                          >
                            <span className="sr-only">Remover</span>✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full shadow-lg shadow-emerald-450/20" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar Chamado"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
