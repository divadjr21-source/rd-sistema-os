import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export function stripPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export const priorityLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const priorityColors: Record<string, string> = {
  baixa: "bg-info/15 text-info border-info/30",
  media: "bg-warning/15 text-warning border-warning/30",
  alta: "bg-danger/15 text-danger border-danger/30",
};

export function generateOSNumber() {
  const prefix = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${suffix}`;
}

export const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_orcamento: "Em Orçamento",
  aprovado: "Aprovado",
  recusado: "Recusado",
  em_execucao: "Em Execução",
  finalizado: "Finalizado",
};

export const statusColors: Record<string, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  em_orcamento: "bg-info/20 text-info border-info/30",
  aprovado: "bg-success/20 text-success border-success/30",
  recusado: "bg-danger/20 text-danger border-danger/30",
  em_execucao: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  finalizado: "bg-graphite-700 text-graphite-200 border-graphite-600",
};

export const budgetStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const budgetStatusColors: Record<string, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  aprovado: "bg-success/20 text-success border-success/30",
  recusado: "bg-danger/20 text-danger border-danger/30",
};

export function whatsappLink(phone: string, text: string) {
  const cleaned = phone.replace(/\D/g, "");
  const fullNumber = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
}
