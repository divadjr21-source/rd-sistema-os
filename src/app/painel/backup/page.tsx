"use client";

import { useState } from "react";
import {
  getClients,
  getCatalog,
  getOrders,
  getContracts,
  getAppointments,
  getCostProjects,
  getTechnicalReports,
  getCompany,
} from "@/services/storage";
import { Button } from "@/components/ui/button";
import { DatabaseBackup, Download, FileSpreadsheet, ShieldCheck, AlertTriangle } from "lucide-react";
import { extractErrorMessage } from "@/hooks/use-toast";
import { formatCurrency, formatPhone } from "@/lib/utils";

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Monta um CSV simples (compatível com Excel), escapando vírgulas, aspas
// e quebras de linha conforme necessário.
function toCsv<T>(rows: T[], columns: { key: string; label: string; value: (row: T) => string | number }[]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(";");
  const lines = rows.map((row) => columns.map((c) => escape(c.value(row))).join(";"));
  // BOM no início ajuda o Excel a reconhecer acentuação (UTF-8) corretamente.
  return "\uFEFF" + [header, ...lines].join("\n");
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function BackupPage() {
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("rd_last_backup") : null
  );

  const handleFullBackup = async () => {
    setLoadingFull(true);
    try {
      const [clients, catalog, orders, contracts, appointments, costProjects, technicalReports, company] =
        await Promise.all([
          getClients(),
          getCatalog(),
          getOrders(),
          getContracts(),
          getAppointments(),
          getCostProjects(),
          getTechnicalReports(),
          getCompany(),
        ]);

      const backup = {
        geradoEm: new Date().toISOString(),
        empresa: company,
        clientes: clients,
        catalogo: catalog,
        ordensDeServico: orders,
        contratos: contracts,
        agendamentos: appointments,
        custosProjetos: costProjects,
        relatoriosTecnicos: technicalReports,
      };

      downloadFile(JSON.stringify(backup, null, 2), `backup-rd-solutions-${todayStr()}.json`, "application/json");
      localStorage.setItem("rd_last_backup", new Date().toISOString());
      setLastBackup(new Date().toISOString());
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setLoadingFull(false);
    }
  };

  const handleExportClients = async () => {
    setLoadingCsv("clientes");
    try {
      const clients = await getClients();
      const csv = toCsv(clients, [
        { key: "fullName", label: "Nome", value: (c) => c.fullName },
        { key: "phone", label: "Telefone", value: (c) => formatPhone(c.phone) },
        { key: "address", label: "Endereço", value: (c) => c.address },
        { key: "createdAt", label: "Cadastrado em", value: (c) => new Date(c.createdAt).toLocaleDateString("pt-BR") },
      ]);
      downloadFile(csv, `clientes-${todayStr()}.csv`, "text/csv;charset=utf-8");
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setLoadingCsv(null);
    }
  };

  const handleExportOrders = async () => {
    setLoadingCsv("os");
    try {
      const orders = await getOrders();
      const csv = toCsv(orders, [
        { key: "number", label: "O.S.", value: (o) => o.number },
        { key: "client", label: "Cliente", value: (o) => o.client.fullName },
        { key: "phone", label: "Telefone", value: (o) => formatPhone(o.client.phone) },
        { key: "description", label: "Descrição", value: (o) => o.description },
        { key: "status", label: "Status", value: (o) => o.status },
        { key: "priority", label: "Prioridade", value: (o) => o.priority },
        { key: "paymentStatus", label: "Pagamento", value: (o) => o.paymentStatus },
        {
          key: "total",
          label: "Valor Total",
          value: (o) => formatCurrency((o.budgetItems || []).reduce((acc, i) => acc + i.total, 0)),
        },
        { key: "createdAt", label: "Abertura", value: (o) => new Date(o.createdAt).toLocaleDateString("pt-BR") },
      ]);
      downloadFile(csv, `ordens-de-servico-${todayStr()}.csv`, "text/csv;charset=utf-8");
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setLoadingCsv(null);
    }
  };

  const handleExportContracts = async () => {
    setLoadingCsv("contratos");
    try {
      const contracts = await getContracts();
      const csv = toCsv(contracts, [
        { key: "title", label: "Contrato", value: (c) => c.title },
        { key: "client", label: "Cliente", value: (c) => c.client.fullName },
        { key: "phone", label: "Telefone", value: (c) => formatPhone(c.client.phone) },
        { key: "monthlyValue", label: "Valor Mensal", value: (c) => formatCurrency(c.monthlyValue) },
        { key: "nfIssueDay", label: "Dia de Emissão da NF", value: (c) => c.nfIssueDay },
        { key: "active", label: "Ativo", value: (c) => (c.active ? "Sim" : "Não") },
      ]);
      downloadFile(csv, `contratos-${todayStr()}.csv`, "text/csv;charset=utf-8");
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setLoadingCsv(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Backup</h1>
        <p className="text-sm text-graphite-400 mt-1">
          Baixe uma cópia de segurança dos dados do sistema periodicamente.
        </p>
      </div>

      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-sm text-warning flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        O plano gratuito do Supabase não faz backup automático dos seus dados. Recomendamos baixar o backup
        completo pelo menos uma vez por mês (ou sempre que fizer uma mudança importante) e guardar num lugar
        seguro (Google Drive, e-mail para você mesmo, etc.).
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-450/20 text-emerald-450">
            <DatabaseBackup className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">Backup Completo</h2>
        </div>
        <p className="text-sm text-graphite-400 mb-4">
          Baixa um arquivo com todos os dados do sistema: clientes, O.S., catálogo, contratos, agenda, custos de
          projetos, relatórios técnicos e dados da empresa. Guarde esse arquivo em um lugar seguro.
        </p>
        {lastBackup && (
          <p className="text-xs text-graphite-500 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-450" />
            Último backup baixado: {new Date(lastBackup).toLocaleString("pt-BR")}
          </p>
        )}
        <Button onClick={handleFullBackup} disabled={loadingFull} className="gap-2">
          <Download className="w-4 h-4" /> {loadingFull ? "Gerando..." : "Baixar Backup Completo"}
        </Button>
      </div>

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-info/20 text-info">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">Exportar em Excel / CSV</h2>
        </div>
        <p className="text-sm text-graphite-400 mb-4">
          Planilhas simples, prontas para abrir no Excel ou enviar para o contador.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportClients} disabled={loadingCsv === "clientes"} className="gap-2">
            <Download className="w-4 h-4" /> {loadingCsv === "clientes" ? "Gerando..." : "Clientes"}
          </Button>
          <Button variant="outline" onClick={handleExportOrders} disabled={loadingCsv === "os"} className="gap-2">
            <Download className="w-4 h-4" /> {loadingCsv === "os" ? "Gerando..." : "Ordens de Serviço"}
          </Button>
          <Button variant="outline" onClick={handleExportContracts} disabled={loadingCsv === "contratos"} className="gap-2">
            <Download className="w-4 h-4" /> {loadingCsv === "contratos" ? "Gerando..." : "Contratos"}
          </Button>
        </div>
      </div>
    </div>
  );
}
