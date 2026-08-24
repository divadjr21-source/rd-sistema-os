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

export const paymentStatusLabels: Record<string, string> = {
  aguardando: "Aguardando Pagamento",
  paga: "Paga",
};

export const paymentStatusColors: Record<string, string> = {
  aguardando: "bg-warning/15 text-warning border-warning/30",
  paga: "bg-emerald-450/15 text-emerald-450 border-emerald-450/30",
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

// --- Utilidades de data/hora com fuso fixo (Bahia/Brasil, UTC-3, sem horário de verão) ---
//
// Problema que essas funções resolvem: o campo `scheduled_at` é gravado como
// texto sem informar o fuso horário (ex: "2026-08-17T09:00:00"). O Postgres
// interpreta esse texto usando o fuso horário configurado NA SESSÃO do
// banco, que pode variar conforme a configuração do projeto Supabase. Isso
// fazia o dia de um agendamento "andar" um dia para frente/trás dependendo
// do ambiente. As funções abaixo eliminam essa ambiguidade: ao gravar,
// sempre anexamos o offset "-03:00" explicitamente; ao ler, sempre
// convertemos o timestamp (que pode vir em UTC do banco) para o fuso de
// Brasil antes de extrair o dia/hora exibidos na tela.

export const BRAZIL_TIMEZONE = "America/Bahia";

/** Extrai {year, month, day, hour, minute} de um ISO timestamp, já convertido para o fuso do Brasil. */
function getBrazilParts(isoString: string) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

/** Retorna a chave "YYYY-MM-DD" de um timestamp, já no fuso horário do Brasil. */
export function toBrazilDateKey(isoString: string): string {
  const { year, month, day } = getBrazilParts(isoString);
  return `${year}-${month}-${day}`;
}

/** Retorna o horário "HH:mm" de um timestamp, já no fuso horário do Brasil. */
export function toBrazilTimeHM(isoString: string): string {
  const { hour, minute } = getBrazilParts(isoString);
  return `${hour}:${minute}`;
}

/**
 * Monta um timestamp ISO com offset explícito -03:00 a partir de uma data
 * "YYYY-MM-DD" e hora "HH:mm" (ou vazio, assume meio-dia). Sempre usar esta
 * função ao gravar `scheduled_at` no Supabase, para não depender do fuso
 * horário configurado na sessão do banco.
 */
export function buildBrazilTimestamp(dateStr: string, timeStr?: string): string {
  const time = timeStr && timeStr.length >= 4 ? `${timeStr}:00` : "12:00:00";
  return `${dateStr}T${time}-03:00`;
}

export function whatsappLink(phone: string, text: string) {
  const cleaned = phone.replace(/\D/g, "");
  const fullNumber = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
}

// --- Valor por extenso (usado no Recibo de Pagamento) ---

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function tripletToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (c > 0) parts.push(CENTENAS[c]);
  if (rest > 0) {
    if (rest < 10) parts.push(UNIDADES[rest]);
    else if (rest < 20) parts.push(DEZ_A_DEZENOVE[rest - 10]);
    else {
      const d = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const centenas = n % 1000;
  const parts: string[] = [];

  if (milhoes > 0) parts.push(`${milhoes === 1 ? "um milhão" : `${tripletToWords(milhoes)} milhões`}`);
  if (milhares > 0) parts.push(`${milhares === 1 ? "mil" : `${tripletToWords(milhares)} mil`}`);
  if (centenas > 0) parts.push(tripletToWords(centenas));

  return parts.join(" e ");
}

/** Converte um valor em reais (ex: 1234.5) para texto por extenso em português. */
export function valorPorExtenso(value: number): string {
  const safe = Math.max(0, Math.round(value * 100) / 100);
  const reais = Math.floor(safe);
  const centavos = Math.round((safe - reais) * 100);

  const reaisWords = integerToWords(reais);
  const reaisLabel = reais === 1 ? "real" : "reais";
  let result = `${reaisWords} ${reaisLabel}`;

  if (centavos > 0) {
    const centavosWords = integerToWords(centavos);
    const centavosLabel = centavos === 1 ? "centavo" : "centavos";
    result += ` e ${centavosWords} ${centavosLabel}`;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}
