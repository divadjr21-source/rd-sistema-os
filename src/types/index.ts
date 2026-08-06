export type OrderStatus =
  | "pendente"
  | "em_orcamento"
  | "aprovado"
  | "recusado"
  | "em_execucao"
  | "finalizado";

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
  media: MediaFile[];
  createdAt: string;
  budgetItems?: BudgetItem[];
  budgetStatus?: BudgetStatus;
  budgetApprovedAt?: string;
  budgetRejectedAt?: string;
  budgetRejectionReason?: string;
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
}
