/**
 * Luster Dental Lab ERP - Shared Types & API Interfaces
 * =====================================================
 * Enterprise-grade type system for the complete dental lab workflow.
 * Every case is tracked by a unique Case ID from reception to delivery.
 */

// ========================================
// ENUMS & CONSTANTS
// ========================================

export type UserRole =
  | "admin"
  | "receptionist"
  | "designer"
  | "technician"
  | "qc_manager"
  | "accountant"
  | "delivery_staff";

export type CaseWorkType =
  | "zirconia"
  | "pfm"
  | "emax"
  | "implant"
  | "ortho"
  | "removable"
  | "composite"
  | "metal_framework"
  | "denture"
  | "other";

export type CaseStatus =
  | "reception"
  | "cad_design"
  | "cam_milling"
  | "finishing"
  | "quality_control"
  | "accounting"
  | "ready_for_delivery"
  | "delivered"
  | "returned"
  | "cancelled";

export type DepartmentStageStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected"
  | "on_hold";

export type QCCheckResult = "pass" | "fail" | "conditional";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

export type InventoryCategory =
  | "blocks"
  | "raw_materials"
  | "consumables"
  | "tools"
  | "equipment";

export type TransactionType = "deduction" | "addition" | "adjustment" | "purchase";

// ========================================
// USER & AUTH
// ========================================

export interface User {
  id: string;
  username: string;
  password?: string; // Never sent to client
  fullName: string;
  fullNameAr: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthLoginResponse {
  token: string;
  user: Omit<User, "password">;
}

// ========================================
// DOCTOR & PATIENT
// ========================================

export interface Doctor {
  id: string;
  name: string;
  nameAr: string;
  clinic: string;
  clinicAr: string;
  phone: string;
  email?: string;
  address?: string;
  specialization?: string;
  totalCases: number;
  totalDebt: number;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  nameAr: string;
  phone?: string;
  age?: number;
  gender?: "male" | "female";
  doctorId?: string;
  doctorName?: string;
  notes?: string;
}

// ========================================
// CASE (Core Entity - tracked by Case ID)
// ========================================

export interface DentalCase {
  id: string;
  caseNumber: string; // Auto-generated sequential: L-2026-00001
  
  // Doctor & Patient
  doctorId: string;
  doctorName: string;
  patientId?: string;
  patientName: string;
  
  // Work Details
  workType: CaseWorkType;
  teethNumbers: string; // e.g. "11,12,13" or "upper full"
  shadeColor: string;
  material?: string;
  
  // Dates
  receivedDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  
  // Status & Workflow
  currentStatus: CaseStatus;
  currentDepartment: string;
  priority: "normal" | "urgent" | "rush";
  
  // Notes & Attachments
  doctorNotes?: string;
  internalNotes?: string;
  attachments: CaseAttachment[];
  
  // Workflow History
  workflowHistory: WorkflowStep[];
  
  // Department-specific data
  cadData?: CADData;
  camData?: CAMData;
  finishingData?: FinishingData;
  qcData?: QCData;
  
  // Financial
  invoiceId?: string;
  totalCost: number;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CaseAttachment {
  id: string;
  fileName: string;
  fileType: string; // stl, png, jpg, pdf
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface WorkflowStep {
  id: string;
  caseId: string;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  department: string;
  assignedTo?: string;
  assignedToName?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  notes?: string;
  rejectionReason?: string;
  createdBy: string;
}

// ========================================
// DEPARTMENT-SPECIFIC DATA
// ========================================

export interface CADData {
  designerId: string;
  designerName: string;
  status: DepartmentStageStatus;
  startTime?: string;
  endTime?: string;
  designFiles: CaseAttachment[];
  software?: string;
  notes?: string;
}

export interface CAMData {
  operatorId?: string;
  operatorName?: string;
  status: DepartmentStageStatus;
  startTime?: string;
  endTime?: string;
  blockType: string;
  blockId?: string; // Inventory reference
  machineId?: string;
  machineName?: string;
  millingDuration?: number; // minutes
  materialDeducted: boolean;
  inventoryTransactionId?: string;
  errors?: string[];
  notes?: string;
}

export interface FinishingData {
  technicianId: string;
  technicianName: string;
  status: DepartmentStageStatus;
  startTime?: string;
  endTime?: string;
  coloringStages: ColoringStage[];
  furnaceId?: string;
  furnaceName?: string;
  firingCycles: number;
  qualityScore?: number; // 1-10
  notes?: string;
}

export interface ColoringStage {
  id: string;
  stageName: string;
  startTime: string;
  endTime?: string;
  technicianId: string;
  notes?: string;
}

export interface QCData {
  inspectorId: string;
  inspectorName: string;
  status: DepartmentStageStatus;
  inspectionDate: string;
  dimensionCheck: QCCheckResult;
  colorCheck: QCCheckResult;
  occlusionCheck: QCCheckResult;
  marginCheck: QCCheckResult;
  overallResult: QCCheckResult;
  rejectionReason?: string;
  returnToDepartment?: CaseStatus;
  notes?: string;
}

// ========================================
// INVENTORY
// ========================================

export interface InventoryItem {
  id: string;
  name: string;
  nameAr: string;
  category: InventoryCategory;
  sku: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint?: number;
  costPerUnit: number;
  supplier?: string;
  supplierAr?: string;
  supplierPhone?: string;
  location?: string;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  caseId?: string;
  caseNumber?: string;
  reason: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

// ========================================
// ACCOUNTING & INVOICES
// ========================================

export interface PricingRule {
  id: string;
  workType: CaseWorkType;
  basePricePerUnit: number;
  materialCostMultiplier: number;
  laborCostPerHour: number;
  profitMarginPercent: number;
  rushSurchargePercent: number;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-00001
  caseId: string;
  caseNumber: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  
  // Line items
  items: InvoiceItem[];
  
  // Totals
  subtotal: number;
  materialsCost: number;
  laborCost: number;
  rushSurcharge: number;
  discount: number;
  tax: number;
  totalAmount: number;
  
  // Payment
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  payments: Payment[];
  
  issuedDate: string;
  dueDate: string;
  createdBy: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  descriptionAr: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: "cash" | "bank_transfer" | "check" | "card";
  reference?: string;
  paidDate: string;
  receivedBy: string;
  notes?: string;
}

// ========================================
// DELIVERY
// ========================================

export interface Delivery {
  id: string;
  caseId: string;
  caseNumber: string;
  doctorId: string;
  doctorName: string;
  deliveryDate: string;
  receivedBy?: string;
  signature?: string;
  paymentStatus: PaymentStatus;
  invoiceId?: string;
  notes?: string;
  archived: boolean;
  createdBy: string;
}

// ========================================
// AUDIT LOG
// ========================================

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

// ========================================
// DASHBOARD & REPORTS
// ========================================

export interface DashboardStats {
  totalActiveCases: number;
  casesInReception: number;
  casesInCAD: number;
  casesInCAM: number;
  casesInFinishing: number;
  casesInQC: number;
  casesReadyForDelivery: number;
  casesDeliveredToday: number;
  totalDoctors: number;
  lowStockItems: number;
  overduePayments: number;
  todayRevenue: number;
  monthRevenue: number;
  rejectionRate: number;
  avgCompletionDays: number;
}

export interface DepartmentPerformance {
  department: string;
  totalCasesProcessed: number;
  avgProcessingTime: number; // hours
  rejectionRate: number; // %
  currentBacklog: number;
}

export interface TechnicianPerformance {
  userId: string;
  name: string;
  department: string;
  casesCompleted: number;
  avgTime: number; // hours
  qualityScore: number; // %
}

export interface RevenueReport {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
  casesCount: number;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCaseRequest {
  doctorId: string;
  patientName: string;
  workType: CaseWorkType;
  teethNumbers: string;
  shadeColor: string;
  material?: string;
  expectedDeliveryDate: string;
  priority: "normal" | "urgent" | "rush";
  doctorNotes?: string;
}

export interface TransferCaseRequest {
  caseId: string;
  toStatus: CaseStatus;
  assignedTo?: string;
  notes?: string;
}

export interface QCInspectionRequest {
  caseId: string;
  dimensionCheck: QCCheckResult;
  colorCheck: QCCheckResult;
  occlusionCheck: QCCheckResult;
  marginCheck: QCCheckResult;
  overallResult: QCCheckResult;
  rejectionReason?: string;
  returnToDepartment?: CaseStatus;
  notes?: string;
}

export interface CreateInvoiceRequest {
  caseId: string;
  discount?: number;
  tax?: number;
  dueDate: string;
  items?: InvoiceItem[];
}

export interface RecordPaymentRequest {
  invoiceId: string;
  amount: number;
  method: "cash" | "bank_transfer" | "check" | "card";
  reference?: string;
  notes?: string;
}

// ========================================
// EXPENSES
// ========================================

export type ExpenseCategory =
  | "materials" | "equipment" | "maintenance" | "rent"
  | "utilities" | "salaries" | "marketing" | "transport" | "other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

// ========================================
// FINANCIAL REPORTS
// ========================================

export interface DoctorStatement {
  doctorId: string;
  doctorName: string;
  clinic: string;
  totalCases: number;
  totalInvoiced: number;
  totalPaid: number;
  totalRemaining: number;
  invoices: Invoice[];
}

export interface FinancialSummary {
  period: string;
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpenses: number;
  netProfit: number;
  collectionRate: number; // %
  invoiceCount: number;
  paidInvoiceCount: number;
  partialInvoiceCount: number;
  unpaidInvoiceCount: number;
  cancelledInvoiceCount: number;
  topWorkType: string;
  topDoctor: string;
  avgInvoiceValue: number;
}

export interface AgingBucket {
  label: string;
  range: string;
  count: number;
  total: number;
  invoices: { invoiceNumber: string; doctorName: string; amount: number; daysOverdue: number }[];
}

export interface PaymentSummary {
  method: string;
  methodAr: string;
  count: number;
  total: number;
}

// ========================================
// SUPPLIERS
// ========================================

export type SupplierStatus = "active" | "inactive" | "blocked";

export interface Supplier {
  id: string;
  name: string;
  nameAr: string;
  contactPerson?: string;
  contactPersonAr?: string;
  phone: string;
  phone2?: string;
  email?: string;
  website?: string;
  address?: string;
  addressAr?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  paymentTerms?: string; // e.g. "Net 30", "COD"
  notes?: string;
  status: SupplierStatus;
  categories: string[]; // blocks, raw_materials, etc.
  totalPurchases: number;
  totalPaid: number;
  balance: number; // owed
  rating?: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

// ========================================
// PURCHASE ORDERS
// ========================================

export type PurchaseOrderStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  poNumber: string; // PO-2026-00001
  supplierId: string;
  supplierName: string;
  supplierNameAr: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PurchaseOrderStatus;
  payments: SupplierPayment[];
  orderDate: string;
  expectedDelivery?: string;
  receivedDate?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  inventoryItemId?: string;
  description: string;
  descriptionAr: string;
  sku?: string;
  quantity: number;
  unitPrice: number; // buy price
  total: number;
  receivedQty?: number;
}

export interface SupplierPayment {
  id: string;
  purchaseOrderId: string;
  amount: number;
  method: "cash" | "bank_transfer" | "check" | "card";
  reference?: string;
  paidDate: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
}

// ========================================
// COST & PROFIT ANALYSIS
// ========================================

export interface CostAnalysis {
  period: string;
  totalSalesRevenue: number;
  totalMaterialsCost: number;
  totalPurchasesCost: number;
  totalLaborCost: number;
  totalOverhead: number;
  grossProfit: number;
  grossMargin: number; // %
  netProfit: number;
  netMargin: number; // %
  avgCostPerCase: number;
  avgRevenuePerCase: number;
  caseCount: number;
}

export interface MaterialProfitability {
  workType: string;
  workTypeAr: string;
  caseCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number; // %
  avgBuyPrice: number;
  avgSellPrice: number;
}

// Demo Response (keep for template compatibility)
export interface DemoResponse {
  message: string;
}
