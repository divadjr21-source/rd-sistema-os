import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  Client,
  OrderService,
  OrderStatus,
  CatalogItem,
  BudgetItem,
  CompanySettings,
  BudgetStatus,
  Contract,
  ContractInvoice,
  Appointment,
  AppointmentStatus,
} from "@/types";

const supabase = createSupabaseClient();

// --- Types do banco ---

type DbClient = {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
};

type DbOrder = {
  id: string;
  number: string;
  client_id: string;
  description: string;
  status: OrderStatus;
  budget_status: BudgetStatus | null;
  budget_approved_at: string | null;
  budget_rejected_at: string | null;
  budget_rejection_reason: string | null;
  created_at: string;
  clients: DbClient | null;
  order_media: { id: string; url: string; type: "image" | "video"; name: string }[] | null;
  budget_items: DbBudgetItem[] | null;
};

type DbCatalogItem = {
  id: string;
  name: string;
  type: "material" | "service";
  unit_price: number;
  unit: string;
  created_at: string;
};

type DbBudgetItem = {
  id: string;
  order_id: string;
  catalog_item_id: string | null;
  name: string;
  type: "material" | "service";
  quantity: number;
  unit_price: number;
  total: number;
};

type DbCompanySettings = {
  id: number;
  name: string;
  whatsapp: string;
  address: string;
  city: string;
  logo: string | null;
};

type DbContract = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  monthly_value: number;
  invoice_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  clients: DbClient | null;
};

type DbContractInvoice = {
  id: string;
  contract_id: string;
  reference_month: number;
  reference_year: number;
  amount: number;
  sent_at: string | null;
  created_at: string;
};

type DbAppointment = {
  id: string;
  order_id: string | null;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  technician: string;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  orders: DbOrder | null;
};

// --- Mappers ---

function mapClient(row: DbClient): Client {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at,
  };
}

function mapCatalogItem(row: DbCatalogItem): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    unitPrice: row.unit_price,
    unit: row.unit,
  };
}

function mapBudgetItem(row: DbBudgetItem): BudgetItem {
  return {
    id: row.id,
    orderId: row.order_id,
    catalogItemId: row.catalog_item_id || undefined,
    name: row.name,
    type: row.type,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    total: row.total,
  };
}

function mapOrder(row: DbOrder): OrderService {
  const client = row.clients ? mapClient(row.clients) : ({} as Client);
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id,
    client,
    description: row.description,
    status: row.status,
    media: (row.order_media || []).map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      name: m.name,
    })),
    createdAt: row.created_at,
    budgetItems: (row.budget_items || []).map(mapBudgetItem),
    budgetStatus: row.budget_status || "pendente",
    budgetApprovedAt: row.budget_approved_at || undefined,
    budgetRejectedAt: row.budget_rejected_at || undefined,
    budgetRejectionReason: row.budget_rejection_reason || undefined,
  };
}

function mapCompany(row: DbCompanySettings): CompanySettings {
  return {
    name: row.name,
    whatsapp: row.whatsapp,
    address: row.address,
    city: row.city,
    logo: row.logo || undefined,
  };
}

function mapContract(row: DbContract): Contract {
  return {
    id: row.id,
    clientId: row.client_id,
    client: row.clients ? mapClient(row.clients) : ({} as Client),
    title: row.title,
    description: row.description || undefined,
    monthlyValue: row.monthly_value,
    invoiceDay: row.invoice_day,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContractInvoice(row: DbContractInvoice): ContractInvoice {
  return {
    id: row.id,
    contractId: row.contract_id,
    referenceMonth: row.reference_month,
    referenceYear: row.reference_year,
    amount: row.amount,
    sentAt: row.sent_at || undefined,
    createdAt: row.created_at,
  };
}

function mapAppointment(row: DbAppointment): Appointment {
  return {
    id: row.id,
    orderId: row.order_id || undefined,
    order: row.orders ? mapOrder(row.orders) : undefined,
    title: row.title,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time || undefined,
    technician: row.technician,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

// --- Auth ---

export async function login(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function isAuthenticated(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

// --- Clients ---

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapClient);
}

export async function findClientByPhone(phone: string): Promise<Client | undefined> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("phone", phone.replace(/\D/g, ""))
    .maybeSingle();
  if (error) throw error;
  return data ? mapClient(data) : undefined;
}

export async function createClient(data: Omit<Client, "id" | "createdAt">): Promise<Client> {
  const phone = data.phone.replace(/\D/g, "");
  const existing = await findClientByPhone(phone);
  if (existing) return existing;

  const { data: row, error } = await supabase
    .from("clients")
    .insert({
      full_name: data.fullName,
      phone,
      address: data.address,
    })
    .select()
    .single();
  if (error) throw error;
  return mapClient(row);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt">>
): Promise<Client> {
  const { data: row, error } = await supabase
    .from("clients")
    .update({
      full_name: data.fullName,
      phone: data.phone ? data.phone.replace(/\D/g, "") : undefined,
      address: data.address,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapClient(row);
}

// --- Catalog ---

export async function getCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from("catalog").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCatalogItem);
}

export async function createCatalogItem(data: Omit<CatalogItem, "id">): Promise<CatalogItem> {
  const { data: row, error } = await supabase
    .from("catalog")
    .insert({
      name: data.name,
      type: data.type,
      unit_price: data.unitPrice,
      unit: data.unit,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCatalogItem(row);
}

export async function updateCatalogItem(id: string, data: Partial<Omit<CatalogItem, "id">>): Promise<CatalogItem> {
  const { data: row, error } = await supabase
    .from("catalog")
    .update({
      name: data.name,
      type: data.type,
      unit_price: data.unitPrice,
      unit: data.unit,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapCatalogItem(row);
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.from("catalog").delete().eq("id", id);
  if (error) throw error;
}

// --- Orders ---

export async function getOrders(): Promise<OrderService[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      clients(*),
      order_media(*),
      budget_items(*)
    `
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrder);
}

export async function getOrderById(id: string): Promise<OrderService | undefined> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      clients(*),
      order_media(*),
      budget_items(*)
    `
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : undefined;
}

export async function trackOrder(query: string): Promise<{
  order: OrderService | null;
  history: { id: string; status: string; note: string | null; createdAt: string }[];
}> {
  const trimmed = query.trim();
  if (!trimmed) return { order: null, history: [] };

  let orderQuery = supabase
    .from("orders")
    .select(
      `
      *,
      clients(*),
      order_media(*),
      budget_items(*)
    `
    );

  if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) {
    orderQuery = orderQuery.eq("id", trimmed);
  } else {
    orderQuery = orderQuery.eq("number", trimmed);
  }

  const { data, error } = await orderQuery.maybeSingle();
  if (error) throw error;
  if (!data) return { order: null, history: [] };

  const order = mapOrder(data);

  const { data: historyRows, error: historyError } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  if (historyError) throw historyError;

  const history = (historyRows || []).map((h) => ({
    id: h.id,
    status: h.status,
    note: h.note,
    createdAt: h.created_at,
  }));

  return { order, history };
}

export async function uploadMediaFiles(
  orderId: string,
  files: { file: File; type: "image" | "video"; name: string }[]
): Promise<{ url: string; type: "image" | "video"; name: string }[]> {
  if (files.length === 0) return [];

  const uploaded: { url: string; type: "image" | "video"; name: string }[] = [];

  for (const { file, type, name } of files) {
    const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const { error } = await supabase.storage.from("order-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("order-media").getPublicUrl(path);

    uploaded.push({ url: publicUrl, type, name });
  }

  return uploaded;
}

export async function createOrder(data: {
  client: Omit<Client, "id" | "createdAt">;
  description: string;
  media: { url: string; type: "image" | "video"; name: string }[];
}): Promise<OrderService> {
  const client = await createClient(data.client);
  const { data: orderRow, error } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      description: data.description,
      status: "pendente",
      budget_status: "pendente",
    })
    .select(
      `
      *,
      clients(*),
      order_media(*),
      budget_items(*)
    `
    )
    .single();
  if (error) throw error;

  if (data.media.length > 0) {
    await supabase
      .from("order_media")
      .insert(data.media.map((m) => ({ order_id: orderRow.id, url: m.url, type: m.type, name: m.name })));
  }

  return mapOrder({ ...orderRow, order_media: data.media.map((m, i) => ({ ...m, id: String(i) })), budget_items: [] });
}

export async function createOrderManual(data: {
  client: Omit<Client, "id" | "createdAt">;
  description: string;
  status: OrderStatus;
  media: { url: string; type: "image" | "video"; name: string }[];
}): Promise<OrderService> {
  const client = await createClient(data.client);
  const { data: orderRow, error } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      description: data.description,
      status: data.status,
      budget_status: "pendente",
    })
    .select(
      `
      *,
      clients(*),
      order_media(*),
      budget_items(*)
    `
    )
    .single();
  if (error) throw error;

  if (data.media.length > 0) {
    await supabase
      .from("order_media")
      .insert(data.media.map((m) => ({ order_id: orderRow.id, url: m.url, type: m.type, name: m.name })));
  }

  return mapOrder({
    ...orderRow,
    order_media: data.media.map((m, i) => ({ ...m, id: String(i) })),
    budget_items: [],
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderService | undefined> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
  return getOrderById(id);
}

export async function updateOrderBudgetStatus(
  id: string,
  status: BudgetStatus,
  reason?: string
): Promise<OrderService | undefined> {
  const update: Record<string, unknown> = {
    budget_status: status,
    budget_rejection_reason: status === "recusado" ? reason : null,
  };
  if (status === "aprovado") {
    update.budget_approved_at = new Date().toISOString();
    update.budget_rejected_at = null;
  } else if (status === "recusado") {
    update.budget_rejected_at = new Date().toISOString();
    update.budget_approved_at = null;
  }
  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) throw error;
  return getOrderById(id);
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

// --- Budget Items ---

export async function getBudgetItemsByOrder(orderId: string): Promise<BudgetItem[]> {
  const { data, error } = await supabase.from("budget_items").select("*").eq("order_id", orderId);
  if (error) throw error;
  return (data || []).map(mapBudgetItem);
}

export async function addBudgetItem(
  orderId: string,
  data: Omit<BudgetItem, "id" | "orderId" | "total">
): Promise<BudgetItem> {
  const { data: row, error } = await supabase
    .from("budget_items")
    .insert({
      order_id: orderId,
      catalog_item_id: data.catalogItemId,
      name: data.name,
      type: data.type,
      quantity: data.quantity,
      unit_price: data.unitPrice,
    })
    .select()
    .single();
  if (error) throw error;

  await ensureOrderStatus(orderId, "em_orcamento");

  return mapBudgetItem(row);
}

export async function removeBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from("budget_items").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBudgetItem(
  id: string,
  data: Partial<Omit<BudgetItem, "id" | "orderId" | "total">>
): Promise<BudgetItem | undefined> {
  const { data: row, error } = await supabase
    .from("budget_items")
    .update({
      name: data.name,
      type: data.type,
      quantity: data.quantity,
      unit_price: data.unitPrice,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapBudgetItem(row);
}

export async function setBudgetItems(
  orderId: string,
  items: Omit<BudgetItem, "id" | "orderId" | "total">[]
): Promise<void> {
  await supabase.from("budget_items").delete().eq("order_id", orderId);

  if (items.length > 0) {
    const { error } = await supabase.from("budget_items").insert(
      items.map((i) => ({
        order_id: orderId,
        catalog_item_id: i.catalogItemId,
        name: i.name,
        type: i.type,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      }))
    );
    if (error) throw error;
  }

  await ensureOrderStatus(orderId, "em_orcamento");
}

async function ensureOrderStatus(orderId: string, status: OrderStatus) {
  const order = await getOrderById(orderId);
  if (order && order.status === "pendente") {
    await updateOrderStatus(orderId, status);
  }
}

// --- Company Settings ---

export async function getCompany(): Promise<CompanySettings> {
  const { data, error } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return mapCompany(data || { id: 1, name: "RD Solutions", whatsapp: "", address: "", city: "", logo: null });
}

export async function updateCompany(data: Partial<CompanySettings>): Promise<CompanySettings> {
  const { data: row, error } = await supabase
    .from("company_settings")
    .update({
      name: data.name,
      whatsapp: data.whatsapp,
      address: data.address,
      city: data.city,
      logo: data.logo,
    })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return mapCompany(row);
}

// --- Contracts ---

export async function getContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*, clients(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapContract);
}

export async function getContractById(id: string): Promise<Contract | undefined> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*, clients(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapContract(data) : undefined;
}

export async function createContract(data: {
  clientId: string;
  title: string;
  description?: string;
  monthlyValue: number;
  invoiceDay: number;
}): Promise<Contract> {
  const { data: row, error } = await supabase
    .from("contracts")
    .insert({
      client_id: data.clientId,
      title: data.title,
      description: data.description,
      monthly_value: data.monthlyValue,
      invoice_day: data.invoiceDay,
    })
    .select("*, clients(*)")
    .single();
  if (error) throw error;
  return mapContract(row);
}

export async function updateContract(
  id: string,
  data: Partial<{
    clientId: string;
    title: string;
    description?: string;
    monthlyValue: number;
    invoiceDay: number;
    isActive: boolean;
  }>
): Promise<Contract> {
  const { data: row, error } = await supabase
    .from("contracts")
    .update({
      client_id: data.clientId,
      title: data.title,
      description: data.description,
      monthly_value: data.monthlyValue,
      invoice_day: data.invoiceDay,
      is_active: data.isActive,
    })
    .eq("id", id)
    .select("*, clients(*)")
    .single();
  if (error) throw error;
  return mapContract(row);
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}

// --- Contract Invoices ---

export async function getPendingInvoices(month: number, year: number): Promise<
  { contract: Contract; invoice: ContractInvoice | null }[]
> {
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*, clients(*)")
    .eq("is_active", true);
  if (error) throw error;

  if (!contracts || contracts.length === 0) return [];

  const { data: invoices, error: invoiceError } = await supabase
    .from("contract_invoices")
    .select("*")
    .eq("reference_month", month)
    .eq("reference_year", year)
    .in(
      "contract_id",
      contracts.map((c) => c.id)
    );
  if (invoiceError) throw invoiceError;

  const invoiceMap = new Map((invoices || []).map((i) => [i.contract_id, mapContractInvoice(i)]));

  return contracts.map((c) => ({
    contract: mapContract(c),
    invoice: invoiceMap.get(c.id) || null,
  }));
}

export async function markInvoiceAsSent(
  contractId: string,
  month: number,
  year: number,
  amount: number
): Promise<ContractInvoice> {
  const { data: existing, error: findError } = await supabase
    .from("contract_invoices")
    .select("*")
    .eq("contract_id", contractId)
    .eq("reference_month", month)
    .eq("reference_year", year)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { data: row, error } = await supabase
      .from("contract_invoices")
      .update({ sent_at: new Date().toISOString(), amount })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return mapContractInvoice(row);
  }

  const { data: row, error } = await supabase
    .from("contract_invoices")
    .insert({
      contract_id: contractId,
      reference_month: month,
      reference_year: year,
      amount,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapContractInvoice(row);
}

// --- Appointments ---

export async function getAppointments(
  startDate?: string,
  endDate?: string
): Promise<Appointment[]> {
  let query = supabase.from("appointments").select("*, orders(*, clients(*), order_media(*), budget_items(*))");

  if (startDate) query = query.gte("scheduled_date", startDate);
  if (endDate) query = query.lte("scheduled_date", endDate);

  const { data, error } = await query.order("scheduled_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapAppointment);
}

export async function createAppointment(data: {
  orderId?: string;
  title: string;
  scheduledDate: string;
  scheduledTime?: string;
  technician: string;
  notes?: string;
}): Promise<Appointment> {
  const { data: row, error } = await supabase
    .from("appointments")
    .insert({
      order_id: data.orderId,
      title: data.title,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      technician: data.technician,
      notes: data.notes,
    })
    .select("*, orders(*, clients(*), order_media(*), budget_items(*))")
    .single();
  if (error) throw error;
  return mapAppointment(row);
}

export async function updateAppointment(
  id: string,
  data: Partial<{
    orderId?: string;
    title: string;
    scheduledDate: string;
    scheduledTime?: string;
    technician: string;
    notes?: string;
    status: AppointmentStatus;
  }>
): Promise<Appointment> {
  const { data: row, error } = await supabase
    .from("appointments")
    .update({
      order_id: data.orderId,
      title: data.title,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      technician: data.technician,
      notes: data.notes,
      status: data.status,
    })
    .eq("id", id)
    .select("*, orders(*, clients(*), order_media(*), budget_items(*))")
    .single();
  if (error) throw error;
  return mapAppointment(row);
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}
