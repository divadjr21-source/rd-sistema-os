export type OrderStatus =
  | "pendente"
  | "em_orcamento"
  | "aprovado"
  | "recusado"
  | "em_execucao"
  | "finalizado";

export type OrderPriority = "baixa" | "media" | "alta";

export type PaymentStatus = "aguardando" | "paga";

export type BudgetStatus = "pendente" | "aprovado" | "recusado";

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface MediaFile {
  id: string;
  url: string;
  type: "image" | "video";
  name: string;
}

export interface OrderService {
  id: string;
  number: string;
  clientId: string;
  client: Client;
  description: string;
  status: OrderStatus;
  priority: OrderPriority;
  paymentStatus: PaymentStatus;
  media: MediaFile[];
  createdAt: string;
  budgetItems?: BudgetItem[];
  budgetStatus?: BudgetStatus;
  budgetApprovedAt?: string;
  budgetRejectedAt?: string;
  budgetRejectionReason?: string;
  assignedTechnicianId?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  type: "material" | "service";
  unitPrice: number;
  unit: string;
}

export interface BudgetItem {
  id: string;
  orderId: string;
  catalogItemId?: string;
  name: string;
  type: "material" | "service";
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CompanySettings {
  name: string;
  whatsapp: string;
  address: string;
  city: string;
  logo?: string;
  cnpj: string;
}

export interface Contract {
  id: string;
  clientId: string;
  client: Client;
  title: string;
  description?: string;
  monthlyValue: number;
  nfIssueDay: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractInvoice {
  id: string;
  contractId: string;
  referenceMonth: number;
  referenceYear: number;
  amount: number;
  sentAt?: string;
  createdAt: string;
}

export type AppointmentStatus = "agendado" | "em_andamento" | "concluido" | "cancelado";

export interface Appointment {
  id: string;
  orderId?: string;
  clientId?: string;
  order?: OrderService;
  client?: Client;
  title: string;
  scheduledAt: string;
  technician: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

// --- Custos / Projetos ---

export interface CostProjectPurchase {
  id: string;
  projectId: string;
  purchaseDate: string;
  supplier: string;
  description: string;
  cost: number;
  createdAt: string;
}

export interface CostProjectTechnicianDay {
  id: string;
  projectId: string;
  workDate: string;
  technicianName: string;
  serviceDescription: string;
  dailyRate: number;
  createdAt: string;
}

export interface CostProject {
  id: string;
  orderId: string;
  order?: OrderService;
  projectValue: number;
  purchases: CostProjectPurchase[];
  technicianDays: CostProjectTechnicianDay[];
  createdAt: string;
}

// --- Relatórios Técnicos ---

export type TechnicalReportStatus = "rascunho" | "finalizado";

export interface TechnicalReportPhoto {
  id: string;
  reportId: string;
  url: string;
  caption: string;
  createdAt: string;
}

export interface TechnicalReport {
  id: string;
  orderId: string;
  order?: OrderService;
  reportNumber: string;
  title: string;
  workPerformed: string;
  observations: string;
  technicianName: string;
  status: TechnicalReportStatus;
  photos: TechnicalReportPhoto[];
  createdAt: string;
  updatedAt: string;
}

