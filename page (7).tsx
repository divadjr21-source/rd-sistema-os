"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getTechnicalReportById,
  updateTechnicalReport,
  finalizeTechnicalReport,
  reopenTechnicalReport,
  deleteTechnicalReport,
  uploadReportPhotos,
  updateReportPhotoCaption,
  deleteReportPhoto,
} from "@/services/storage";
import { TechnicalReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Trash2,
  Camera,
  CheckCircle2,
  RotateCcw,
  Printer,
  Send,
  AlertTriangle,
} from "lucide-react";
import { extractErrorMessage, toast } from "@/hooks/use-toast";

export default function TechnicalReportEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<TechnicalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [observations, setObservations] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, [id]);

  const refresh = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getTechnicalReportById(id);
      if (!data) {
        setLoadError("Relatório não encontrado.");
        return;
      }
      setReport(data);
      setTitle(data.title || `Relatório Técnico — ${data.order?.description || ""}`);
      setWorkPerformed(data.workPerformed);
      setObservations(data.observations);
      setTechnicianName(data.technicianName);
    } catch (error) {
      setLoadError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!report || saving) return;
    setSaving(true);
    try {
      await updateTechnicalReport(report.id, { title, workPerformed, observations, technicianName });
      toast({ title: "Rascunho salvo", variant: "success" });
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!report || !e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      await uploadReportPhotos(report.id, Array.from(e.target.files));
      await refresh();
      toast({ title: "Fotos adicionadas", variant: "success" });
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Excluir essa foto?")) return;
    try {
      await deleteReportPhoto(photoId);
      await refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  const handleCaptionBlur = async (photoId: string, caption: string) => {
    try {
      await updateReportPhotoCaption(photoId, caption);
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  const handleFinalize = async () => {
    if (!report) return;
    // Garante que o texto mais recente é salvo antes de finalizar.
    await handleSaveDraft();
    setFinalizing(true);
    try {
      await finalizeTechnicalReport(report.id);
      await refresh();
      toast({ title: "Relatório finalizado! Agora pode gerar o PDF ou enviar por WhatsApp.", variant: "success" });
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    if (!report) return;
    try {
      await reopenTechnicalReport(report.id);
      await refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    try {
      await deleteTechnicalReport(report.id);
      router.push("/painel/relatorios-tecnicos");
      router.refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = report ? `${siteOrigin}/relatorio-tecnico/${report.id}` : "";
  const whatsappUrl = report
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `Olá ${report.order?.client.fullName}! Segue o relatório técnico (${report.reportNumber}) do atendimento na O.S. ${report.order?.number}:\n\n${publicUrl}`
      )}`
    : "";

  if (loading) return <p className="text-graphite-400 text-sm">Carregando...</p>;
  if (loadError || !report)
    return <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-sm text-danger">{loadError}</div>;

  const isDraft = report.status === "rascunho";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/painel/relatorios-tecnicos">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {!isDraft && (
            <>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" /> Ver / Gerar PDF
                </Button>
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  <Send className="w-4 h-4" /> Enviar por WhatsApp
                </Button>
              </a>
              <Button variant="outline" className="gap-2" onClick={handleReopen}>
                <RotateCcw className="w-4 h-4" /> Reabrir Rascunho
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="gap-2 text-danger border-danger/30 hover:bg-danger/10"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </Button>
        </div>
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-graphite-500">{report.reportNumber}</p>
          <h1 className="text-xl font-bold">
            O.S. #{report.order?.number} — {report.order?.client.fullName}
          </h1>
        </div>
        <span
          className={
            isDraft
              ? "text-xs px-3 py-1.5 rounded-full font-medium bg-graphite-800 text-graphite-300"
              : "text-xs px-3 py-1.5 rounded-full font-medium bg-emerald-450/15 text-emerald-450"
          }
        >
          {isDraft ? "Rascunho" : "Finalizado"}
        </span>
      </div>

      {!isDraft && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-sm text-warning flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este relatório já foi finalizado e pode estar sendo visualizado pelo cliente. Clique em &quot;Reabrir
          Rascunho&quot; se precisar editar novamente.
        </div>
      )}

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card space-y-4">
        <div className="space-y-1.5">
          <Label>Título do Relatório</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isDraft} />
        </div>
        <div className="space-y-1.5">
          <Label>Serviço Realizado</Label>
          <Textarea
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            disabled={!isDraft}
            className="min-h-[120px]"
            placeholder="Descreva detalhadamente o que foi feito no atendimento..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações (opcional)</Label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            disabled={!isDraft}
            placeholder="Recomendações, pendências, próximos passos..."
          />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <Label>Técnico Responsável</Label>
          <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} disabled={!isDraft} />
        </div>
        {isDraft && (
          <Button onClick={handleSaveDraft} disabled={saving} variant="outline">
            {saving ? "Salvando..." : "Salvar Rascunho"}
          </Button>
        )}
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Fotos do Atendimento</h2>
          {isDraft && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleUploadPhotos}
                className="hidden"
              />
              <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera className="w-4 h-4" /> {uploading ? "Enviando..." : "Adicionar Fotos"}
              </Button>
            </>
          )}
        </div>
        {report.photos.length === 0 ? (
          <p className="text-sm text-graphite-500">Nenhuma foto adicionada ainda.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {report.photos.map((photo) => (
              <div key={photo.id} className="bg-graphite-950 border border-graphite-800 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption || "Foto do atendimento"} className="w-full h-40 object-cover" />
                <div className="p-2 flex items-center gap-2">
                  <Input
                    defaultValue={photo.caption}
                    onBlur={(e) => handleCaptionBlur(photo.id, e.target.value)}
                    placeholder="Legenda (ex: Antes, Depois...)"
                    disabled={!isDraft}
                    className="h-8 text-xs"
                  />
                  {isDraft && (
                    <button onClick={() => handleDeletePhoto(photo.id)} className="text-danger flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDraft && (
        <Button onClick={handleFinalize} disabled={finalizing} className="gap-2 w-full sm:w-auto">
          <CheckCircle2 className="w-4 h-4" /> {finalizing ? "Finalizando..." : "Finalizar Relatório"}
        </Button>
      )}

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5" /> Excluir Relatório Técnico?
            </DialogTitle>
            <DialogDescription>
              Isso apaga o relatório e todas as fotos anexadas. A O.S. em si não é afetada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
