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
  | "removable"
  | "quality_control"
  | "accounting"
  | "ready_for_delivery"
  | "delivered"
  | "returned"
  | "cancelled";

/** أنواع التركيبات المتحركة */
export type RemovableProstheticType =
  | "denture_soft"
  | "denture_hard"
  | "denture_repair"
  | "add_teeth"
  | "soft_relining"
  | "base_change"
  | "temp_acrylic_crown"
  | "other";

/** أنواع التقويم (مع التركيبات المتحركة) */
export type OrthoRemovableType =
  | "twin_block"
  | "expansion_appliance"
  | "hawley_retainer"
  | "space_maintainer";

/** مراحل قسم التركيبات المتحركة */
export type RemovableStageName =
  | "tooth_arrangement"
  | "acrylic_cooking"
  | "ready";

/** الحالة النهائية للتركيبات المتحركة */
export type RemovableFinalStatus = "try_in" | "delivery";

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
// BARCODE & QR MODULE
// ========================================

export type BarcodeLogAction = "scan" | "generate" | "print" | "create" | "edit" | "delete";

export type BarcodeLabelType = "case" | "warehouse";

export type WarehouseQuantityUnit = "شيكارة" | "عينة" | "علبة" | "كيلو" | "جرام" | "قطعة" | "لتر" | "أخرى";

export interface BarcodeLabel {
  id: string;
  labelType?: BarcodeLabelType;  // case | warehouse
  barcodeValue: string;       // النص المُرمَّز (رقم الحالة، SKU، أو نص مخصص)
  labelName?: string;         // الاسم / الوصف للملصق
  caseId?: string;
  caseNumber?: string;
  patientName?: string;
  doctorName?: string;
  receivedDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  // حقول المخازن
  productName?: string;
  weightKg?: number;
  weightGrams?: number;
  quantity?: number;
  quantityUnit?: WarehouseQuantityUnit;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface BarcodeLog {
  id: string;
  action: BarcodeLogAction;
  labelId?: string;
  barcodeValue: string;
  labelName?: string;
  caseId?: string;
  caseNumber?: string;
  metadata?: Record<string, unknown>;  // scanMethod, etc.
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

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
  fingerprintId?: string;   // رقم البصمة في جهاز الحضور للمطابقة
  faceDescriptor?: number[]; // واصف الوجه للتعرف بالوجه (128 رقم)
  baseSalary?: number;      // الراتب الأساسي
  hireDate?: string;
  /** وقت بداية العمل الرسمي HH:mm - للربط مع البصمة */
  workStartTime?: string;
  /** وقت نهاية العمل الرسمي HH:mm */
  workEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// ATTENDANCE & PAYROLL (حضور وإنصراف - رواتب - خصومات)
// ========================================

export type AttendancePunch = "in" | "out";

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  fingerprintId?: string;   // من جهاز البصمة للمطابقة
  date: string;             // YYYY-MM-DD
  checkIn?: string;         // ISO time
  checkOut?: string;
  punchType?: AttendancePunch;
  source: "manual" | "import" | "fingerprint";
  deviceId?: string;
  notes?: string;
  createdAt: string;
}

export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: "draft" | "approved" | "paid";
  createdAt: string;
}

export interface PayrollEntry {
  id: string;
  periodId: string;
  userId: string;
  userName: string;
  baseSalary: number;
  overtime: number;
  allowances: number;
  // خصومات
  absenceDays: number;
  absenceDeduction: number;
  lateMinutes: number;
  lateDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  notes?: string;
  createdAt: string;
}

/** تقرير حضور موظف - مرتبط بوقت العمل */
export interface EmployeeAttendanceReport {
  userId: string;
  userName: string;
  from: string;
  to: string;
  workStartTime: string;
  workEndTime: string;
  days: EmployeeAttendanceDay[];
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  avgLateMinutes: number;
  avgOvertimeMinutes: number;
}

export interface EmployeeAttendanceDay {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  workMinutes: number;
  present: boolean;
}

// ========================================
// HR MODULE - الموارد البشرية
// ========================================

export type HRDepartment = "reception" | "cad" | "cam" | "finishing" | "removable" | "quality_control" | "accounting" | "delivery" | "management";

export type HRNeedStatus = "open" | "filled" | "cancelled";
export type HRApplicationStatus = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

export interface HRDepartmentNeed {
  id: string;
  department: HRDepartment;
  departmentNameAr: string;
  positionTitle: string;
  positionTitleAr: string;
  requiredCount: number;
  filledCount: number;
  description?: string;
  skills?: string[];
  minExperience?: string;
  salaryRange?: string;
  status: HRNeedStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HRJobPosition {
  id: string;
  needId?: string;
  department: HRDepartment;
  title: string;
  titleAr: string;
  description?: string;
  requirements?: string[];
  status: "open" | "filled" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface HRApplication {
  id: string;
  positionId: string;
  positionTitle: string;
  department: string;
  applicantName: string;
  applicantNameAr: string;
  phone: string;
  email?: string;
  resumeNotes?: string;
  experience?: string;
  education?: string;
  status: HRApplicationStatus;
  appliedAt: string;
  notes?: string;
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
  removableData?: RemovableData;
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

export interface CADDesignStage {
  id: string;
  name: string;
  nameAr: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  startTime?: string;
  endTime?: string;
  notes?: string;
  assignedTo?: string;
}

export interface CADAnnotation {
  id: string;
  type: "measurement" | "margin_line" | "contact_point" | "occlusion" | "note" | "thickness";
  label: string;
  value?: string; // e.g. "1.2mm"
  position?: { x: number; y: number; z: number };
  color?: string;
  createdAt: string;
  createdBy: string;
}

export interface CADDesignVersion {
  id: string;
  version: number;
  label: string;
  files: CaseAttachment[];
  annotations: CADAnnotation[];
  thumbnail?: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export interface CADData {
  designerId: string;
  designerName: string;
  status: DepartmentStageStatus;
  startTime?: string;
  endTime?: string;
  designFiles: CaseAttachment[];
  software?: string;
  notes?: string;
  // Enhanced CAD fields
  designStages?: CADDesignStage[];
  currentStage?: string;
  annotations?: CADAnnotation[];
  versions?: CADDesignVersion[];
  currentVersion?: number;
  marginType?: string; // chamfer, shoulder, knife-edge, feather-edge
  occlusionType?: string; // centric, lateral, protrusive
  insertDirection?: string; // occlusal, buccal, lingual, mesial, distal
  dieTrimHeight?: number; // mm
  cementGap?: number; // microns
  spacerThickness?: number; // microns
  wallThickness?: number; // mm
  connectorSize?: number; // mm²
  designParameters?: Record<string, any>;
  reviewNotes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CAMStage {
  id: string;
  name: string;
  nameAr: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  startTime?: string;
  endTime?: string;
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
  blockName?: string;
  blockSku?: string;
  machineId?: string;
  machineName?: string;
  millingDuration?: number; // minutes
  materialDeducted: boolean;
  inventoryTransactionId?: string;
  errors?: string[];
  notes?: string;
  // Full workflow
  stages?: CAMStage[];
  currentStage?: string;
  millingStrategy?: string; // wet/dry
  spindleSpeed?: number;
  feedRate?: number;
  burType?: string;
  // Stage-specific
  camStlFiles?: { id: string; fileName: string }[];
  blockMounted?: boolean;
  millingStartTime?: string | null;
  partRemoved?: boolean;
  cleanDone?: boolean;
  inspectionPassed?: boolean | null;
  inspectionNotes?: string;
}

export interface FinishingStage {
  id: string;
  name: string;
  nameAr: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  startTime?: string;
  endTime?: string;
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
  // Full workflow stages
  stages?: FinishingStage[];
  currentStage?: string;
  // Stage-specific
  pieceReceived?: boolean;
  initialCleanDone?: boolean;
  baseColoringDone?: boolean;
  extraColoringDone?: boolean;
  furnaceReady?: boolean;
  firstFiringDone?: boolean;
  polishingDone?: boolean;
  visualCheckPassed?: boolean | null;
  visualCheckNotes?: string;
}

export interface ColoringStage {
  id: string;
  stageName: string;
  startTime: string;
  endTime?: string;
  technicianId: string;
  notes?: string;
}

export interface RemovableStage {
  id: string;
  name: string;
  nameAr: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface PauseRecord {
  id: string;
  reason: string;
  reasonAr?: string;
  pausedAt: string;
  pausedBy: string;
  pausedByName: string;
  resumedAt?: string;
  resumedBy?: string;
  resumedByName?: string;
}

export interface RemovableData {
  technicianId?: string;
  technicianName?: string;
  status: DepartmentStageStatus;
  startTime?: string;
  endTime?: string;
  stages?: RemovableStage[];
  currentStage?: string;

  /** نوع التركيبة المتحركة */
  prostheticType?: RemovableProstheticType;
  prostheticTypeAr?: string;
  /** سوفت أو هارد */
  materialVariant?: "soft" | "hard";
  /** المقاس بالمم */
  sizeMm?: number;

  /** تصليح طقم */
  isRepair?: boolean;
  /** إضافة أسنان - عدد الأسنان المضافة */
  teethAddedCount?: number;

  /** نوع التقويم (إن وجد) */
  orthoType?: OrthoRemovableType;
  orthoTypeAr?: string;

  /** الإيقاف المؤقت */
  isPaused?: boolean;
  pauseRecords?: PauseRecord[];
  currentPauseReason?: string;
  currentPauseDate?: string;
  currentPauseBy?: string;

  /** الحالة النهائية */
  finalStatus?: RemovableFinalStatus;

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
  rushCases?: number;
  overdueCases?: number;
  totalActiveCases: number;
  casesInReception: number;
  casesInCAD: number;
  casesInCAM: number;
  casesInFinishing: number;
  casesInRemovable: number;
  casesInQC: number;
  casesInAccounting?: number;
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
  /** ربط بأمر شراء - للمشتريات التلقائية */
  purchaseOrderId?: string;
  /** مصدر المصروف: manual | purchase_order */
  source?: "manual" | "purchase_order";
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
