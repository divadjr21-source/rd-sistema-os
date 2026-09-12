"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicTechnicalReport, getCompany } from "@/services/storage";
import { TechnicalReport, CompanySettings } from "@/types";
import { formatPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, User, Calendar, Hash, AlertTriangle } from "lucide-react";

export default function PublicTechnicalReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<TechnicalReport | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPublicTechnicalReport(id), getCompany()]).then(([r, c]) => {
      setReport(r || null);
      setCompany(c);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-450 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4 px-4">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
        <h1 className="text-xl font-bold">Relatório não disponível</h1>
        <p className="text-graphite-400">
          Este relatório não existe ou ainda não foi finalizado pela equipe técnica.
        </p>
      </div>
    );
  }

  const dateStr = new Date(report.createdAt).toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen bg-background py-6 px-4 print:bg-white print:text-black print:p-0 print:text-[13px]">
      <div className="max-w-3xl mx-auto space-y-6 print:space-y-0">
        <div className="flex gap-3 print:hidden">
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / Baixar PDF
          </Button>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-8 shadow-card print:shadow-none print:border-none print:bg-white print:p-0">
          {/* Cabeçalho */}
          <div className="flex items-center gap-4 mb-6 print:mb-3">
            <div className="h-16 w-16 print:h-12 print:w-12 rounded-xl bg-emerald-450 flex items-center justify-center print:bg-emerald-700 flex-shrink-0">
              <ShieldCheck className="w-9 h-9 print:w-7 print:h-7 text-graphite-950 print:text-white" />
            </div>
            <div>
              <h1 className="text-2xl print:text-xl font-bold">{company?.name || "RD Solutions"}</h1>
              <p className="text-xs text-graphite-400 print:text-gray-600">CNPJ: {company?.cnpj}</p>
              <p className="text-xs text-graphite-400 print:text-gray-600">
                {company?.address}
                {company?.city ? `, ${company.city}` : ""}
                {company?.whatsapp ? ` — ${formatPhone(company.whatsapp)}` : ""}
              </p>
            </div>
          </div>

          <div className="text-center border-y border-graphite-800 print:border-gray-300 py-3 print:py-1.5 mb-6 print:mb-3">
            <h2 className="text-lg print:text-base font-bold uppercase tracking-wide">Relatório Técnico</h2>
          </div>

          {/* Dados */}
          <div className="grid sm:grid-cols-2 gap-4 print:gap-2 text-sm mb-6 print:mb-3">
            <Info icon={Hash} label="Relatório Nº" value={report.reportNumber} />
            <Info icon={Hash} label="O.S. Nº" value={report.order?.number || ""} />
            <Info icon={User} label="Cliente" value={report.order?.client.fullName || ""} />
            <Info icon={Calendar} label="Data" value={dateStr} />
          </div>

          <h3 className="text-base font-bold mb-2">{report.title}</h3>

          <div className="mb-6 print:mb-3">
            <h4 className="text-sm font-semibold mb-1 text-graphite-300 print:text-black">Descrição do Problema</h4>
            <p className="text-sm text-graphite-300 print:text-gray-800 whitespace-pre-line">
              {report.order?.description}
            </p>
          </div>

          <div className="mb-6 print:mb-3">
            <h4 className="text-sm font-semibold mb-1 text-graphite-300 print:text-black">Serviço Realizado</h4>
            <p className="text-sm text-graphite-300 print:text-gray-800 whitespace-pre-line">
              {report.workPerformed}
            </p>
          </div>

          {report.photos.length > 0 && (
            <div className="mb-6 print:mb-3 print:break-inside-avoid">
              <h4 className="text-sm font-semibold mb-2 text-graphite-300 print:text-black">
                Registro Fotográfico
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {report.photos.map((photo) => (
                  <div key={photo.id} className="print:break-inside-avoid">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || "Foto do atendimento"}
                      className="w-full h-40 object-cover rounded-lg border border-graphite-800 print:border-gray-300"
                    />
                    {photo.caption && (
                      <p className="text-xs text-graphite-400 print:text-gray-600 text-center mt-1">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.observations && (
            <div className="mb-6 print:mb-3">
              <h4 className="text-sm font-semibold mb-1 text-graphite-300 print:text-black">Observações</h4>
              <p className="text-sm text-graphite-300 print:text-gray-800 whitespace-pre-line">
                {report.observations}
              </p>
            </div>
          )}

          {report.technicianName && (
            <div className="grid sm:grid-cols-2 gap-8 print:gap-6 print:break-inside-avoid mt-8">
              <div className="text-center">
                <div className="border-t border-graphite-700 print:border-black pt-3 print:pt-2">
                  <p className="font-semibold">{report.technicianName}</p>
                  <p className="text-xs text-graphite-500 print:text-gray-600">Técnico Responsável</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-graphite-700 print:border-black pt-3 print:pt-2">
                  <p className="font-semibold">{company?.name || "RD Solutions"}</p>
                  <p className="text-xs text-graphite-500 print:text-gray-600">CNPJ: {company?.cnpj}</p>
                </div>
              </div>
            </div>
          )}
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
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-emerald-450 print:text-emerald-700 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-graphite-400 print:text-gray-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
