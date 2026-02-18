/**
 * DB-Backed Data Store
 * =====================
 * Write-through cache: data loaded from PostgreSQL on startup,
 * kept in memory for fast reads, persisted back on every mutation.
 * If DB is empty on first boot, seeds with default data.
 */

import type {
  User, Doctor, Patient, DentalCase, InventoryItem, InventoryTransaction,
  Invoice, Payment, Delivery, AuditLog, PricingRule, WorkflowStep,
  Supplier, PurchaseOrder, BarcodeLabel, BarcodeLog,
  AttendanceRecord, PayrollPeriod, PayrollEntry,
} from "@shared/api";
import type { Expense } from "@shared/api";
import * as repo from "../db/repository";

// ========================================
// IN-MEMORY COLLECTIONS (loaded from DB)
// ========================================

export let users: User[] = [];
export let doctors: Doctor[] = [];
export let patients: Patient[] = [];
export let cases: DentalCase[] = [];
export let inventoryItems: InventoryItem[] = [];
export let inventoryTransactions: InventoryTransaction[] = [];
export let invoices: Invoice[] = [];
export let expenses: Expense[] = [];
export let suppliers: Supplier[] = [];
export let purchaseOrders: PurchaseOrder[] = [];
export let pricingRules: PricingRule[] = [];
export let auditLogs: AuditLog[] = [];
export let deliveries: Delivery[] = [];
export let barcodeLabels: BarcodeLabel[] = [];
export let barcodeLogs: BarcodeLog[] = [];
export let attendanceRecords: AttendanceRecord[] = [];
export let payrollPeriods: PayrollPeriod[] = [];
export let payrollEntries: PayrollEntry[] = [];

// ========================================
// ID GENERATORS (persisted to DB counters)
// ========================================

let counters: Record<string, number> = {
  user: 10, doctor: 10, patient: 10, case: 5,
  inventory: 20, inventoryTx: 10, invoice: 5,
  payment: 5, delivery: 2, audit: 50,
  workflow: 20, pricing: 8,
};

export function generateId(prefix: string): string {
  const key = prefix as keyof typeof counters;
  if (counters[key] !== undefined) counters[key]++;
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  // Persist counter asynchronously
  repo.saveCounter(key, counters[key] ?? 0).catch(() => {});
  return id;
}

let caseSequence = 5;
export function generateCaseNumber(): string {
  caseSequence++;
  const year = new Date().getFullYear();
  repo.saveCounter("caseSequence", caseSequence).catch(() => {});
  return `L-${year}-${String(caseSequence).padStart(5, "0")}`;
}

let invoiceSequence = 5;
export function generateInvoiceNumber(): string {
  invoiceSequence++;
  const year = new Date().getFullYear();
  repo.saveCounter("invoiceSequence", invoiceSequence).catch(() => {});
  return `INV-${year}-${String(invoiceSequence).padStart(5, "0")}`;
}

export let poCounter = 6;
export function generatePONumber() {
  const num = `PO-2026-${String(poCounter++).padStart(5, "0")}`;
  repo.saveCounter("poCounter", poCounter).catch(() => {});
  return num;
}

// ========================================
// DB PERSISTENCE HELPERS
// (call these after every mutation)
// ========================================

export const persistUser = (item: User) => repo.saveUser(item).catch(e => console.error("[DB] saveUser error:", e));
export const persistDoctor = (item: Doctor) => repo.saveDoctor(item).catch(e => console.error("[DB] saveDoctor error:", e));
export const persistPatient = (item: Patient) => repo.savePatient(item).catch(e => console.error("[DB] savePatient error:", e));
export const persistCase = (item: DentalCase) => repo.saveCase(item).catch(e => console.error("[DB] saveCase error:", e));
export const persistInventoryItem = (item: InventoryItem) => repo.saveInventoryItem(item).catch(e => console.error("[DB] saveInventoryItem error:", e));
export const persistInventoryTransaction = (item: InventoryTransaction) => repo.saveInventoryTransaction(item).catch(e => console.error("[DB] saveInventoryTx error:", e));
export const persistInvoice = (item: Invoice) => repo.saveInvoice(item).catch(e => console.error("[DB] saveInvoice error:", e));
export const persistExpense = (item: Expense) => repo.saveExpense(item).catch(e => console.error("[DB] saveExpense error:", e));
export const persistSupplier = (item: Supplier) => repo.saveSupplier(item).catch(e => console.error("[DB] saveSupplier error:", e));
export const persistPurchaseOrder = (item: PurchaseOrder) => repo.savePurchaseOrder(item).catch(e => console.error("[DB] savePO error:", e));
export const persistPricingRule = (item: PricingRule) => repo.savePricingRule(item).catch(e => console.error("[DB] savePricingRule error:", e));
export const persistAuditLog = (item: AuditLog) => repo.saveAuditLog(item).catch(e => console.error("[DB] saveAuditLog error:", e));
export const persistDelivery = (item: Delivery) => repo.saveDelivery(item).catch(e => console.error("[DB] saveDelivery error:", e));
export const persistBarcodeLabel = (item: BarcodeLabel) => repo.saveBarcodeLabel(item).catch(e => console.error("[DB] saveBarcodeLabel error:", e));
export const persistBarcodeLog = (item: BarcodeLog) => repo.saveBarcodeLog(item).catch(e => console.error("[DB] saveBarcodeLog error:", e));
export const persistAttendanceRecord = (item: AttendanceRecord) => repo.saveAttendanceRecord(item).catch(e => console.error("[DB] saveAttendance error:", e));
export const persistPayrollPeriod = (item: PayrollPeriod) => repo.savePayrollPeriod(item).catch(e => console.error("[DB] savePayrollPeriod error:", e));
export const persistPayrollEntry = (item: PayrollEntry) => repo.savePayrollEntry(item).catch(e => console.error("[DB] savePayrollEntry error:", e));

// Delete helpers
export const removeUserFromDB = (id: string) => repo.deleteUser(id).catch(e => console.error("[DB] deleteUser error:", e));
export const removeDoctorFromDB = (id: string) => repo.deleteDoctor(id).catch(e => console.error("[DB] deleteDoctor error:", e));
export const removeCaseFromDB = (id: string) => repo.deleteCase(id).catch(e => console.error("[DB] deleteCase error:", e));
export const removeInventoryItemFromDB = (id: string) => repo.deleteInventoryItem(id).catch(e => console.error("[DB] deleteInvItem error:", e));
export const removeExpenseFromDB = (id: string) => repo.deleteExpense(id).catch(e => console.error("[DB] deleteExpense error:", e));
export const removeSupplierFromDB = (id: string) => repo.deleteSupplierDB(id).catch(e => console.error("[DB] deleteSupplier error:", e));
export const removeBarcodeLabelFromDB = (id: string) => repo.deleteBarcodeLabel(id).catch(e => console.error("[DB] deleteBarcodeLabel error:", e));
export const removeAttendanceRecordFromDB = (id: string) => repo.deleteAttendanceRecord(id).catch(e => console.error("[DB] deleteAttendance error:", e));

// ========================================
// SEED DATA (used on first boot when DB empty)
// ========================================

const SEED_USERS: User[] = [
  { id: "user_1", username: "admin", password: "admin123", fullName: "System Admin", fullNameAr: "مدير النظام", email: "admin@luster.com", role: "admin", department: "management", phone: "+20123456789", active: true, baseSalary: 8000, fingerprintId: "1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_2", username: "reception1", password: "pass123", fullName: "Sara Ahmed", fullNameAr: "سارة أحمد", email: "sara@luster.com", role: "receptionist", department: "reception", phone: "+20111111111", active: true, baseSalary: 4500, fingerprintId: "2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_3", username: "designer1", password: "pass123", fullName: "Mohamed Ali", fullNameAr: "محمد علي", email: "mohamed@luster.com", role: "designer", department: "cad", phone: "+20222222222", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_4", username: "tech1", password: "pass123", fullName: "Ahmed Hassan", fullNameAr: "أحمد حسن", email: "ahmed.h@luster.com", role: "technician", department: "cam", phone: "+20333333333", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_5", username: "tech2", password: "pass123", fullName: "Fatma Nour", fullNameAr: "فاطمة نور", email: "fatma@luster.com", role: "technician", department: "finishing", phone: "+20444444444", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_6", username: "qc1", password: "pass123", fullName: "Dr. Khaled Youssef", fullNameAr: "د. خالد يوسف", email: "khaled@luster.com", role: "qc_manager", department: "quality_control", phone: "+20555555555", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_7", username: "accountant1", password: "pass123", fullName: "Nadia Ibrahim", fullNameAr: "نادية إبراهيم", email: "nadia@luster.com", role: "accountant", department: "accounting", phone: "+20666666666", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_8", username: "delivery1", password: "pass123", fullName: "Omar Saeed", fullNameAr: "عمر سعيد", email: "omar@luster.com", role: "delivery_staff", department: "delivery", phone: "+20777777777", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "user_kiosk", username: "biosma", password: "biosma123", fullName: "Kiosk", fullNameAr: "محطة البصمة", email: "kiosk@luster.com", role: "receptionist", department: "reception", phone: "", active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
];

const SEED_DOCTORS: Doctor[] = [
  { id: "doc_1", name: "Dr. Sherif Mansour", nameAr: "د. شريف منصور", clinic: "Smile Dental Center", clinicAr: "مركز سمايل لطب الأسنان", phone: "+20101234567", email: "sherif@smile.com", address: "6 October City", specialization: "Prosthodontics", totalCases: 45, totalDebt: 2500, createdAt: "2025-06-01T00:00:00Z" },
  { id: "doc_2", name: "Dr. Mona El-Sayed", nameAr: "د. منى السيد", clinic: "Cairo Dental Clinic", clinicAr: "عيادة القاهرة للأسنان", phone: "+20109876543", email: "mona@cairo-dental.com", address: "Nasr City, Cairo", specialization: "Orthodontics", totalCases: 32, totalDebt: 0, createdAt: "2025-07-15T00:00:00Z" },
  { id: "doc_3", name: "Dr. Tarek Adel", nameAr: "د. طارق عادل", clinic: "Nile Dental Studio", clinicAr: "استوديو النيل للأسنان", phone: "+20112233445", email: "tarek@niledental.com", address: "Maadi, Cairo", specialization: "Implantology", totalCases: 28, totalDebt: 5200, createdAt: "2025-08-20T00:00:00Z" },
  { id: "doc_4", name: "Dr. Laila Hamdi", nameAr: "د. ليلى حمدي", clinic: "Pearl Dental Care", clinicAr: "بيرل لرعاية الأسنان", phone: "+20115566778", email: "laila@pearl.com", address: "Heliopolis, Cairo", specialization: "Cosmetic Dentistry", totalCases: 18, totalDebt: 1200, createdAt: "2025-09-10T00:00:00Z" },
];

const SEED_PATIENTS: Patient[] = [
  { id: "pat_1", name: "Ahmad Mahmoud", nameAr: "أحمد محمود", phone: "+20100000001", age: 45, gender: "male", doctorId: "doc_1" },
  { id: "pat_2", name: "Fatma Ali", nameAr: "فاطمة علي", phone: "+20100000002", age: 32, gender: "female", doctorId: "doc_1" },
  { id: "pat_3", name: "Hassan Omar", nameAr: "حسن عمر", phone: "+20100000003", age: 55, gender: "male", doctorId: "doc_2" },
  { id: "pat_4", name: "Nora Samir", nameAr: "نورة سمير", phone: "+20100000004", age: 28, gender: "female", doctorId: "doc_3" },
  { id: "pat_5", name: "Youssef Khaled", nameAr: "يوسف خالد", phone: "+20100000005", age: 60, gender: "male", doctorId: "doc_4" },
];

const SEED_CASES: DentalCase[] = [
  {
    id: "case_1", caseNumber: "L-2026-00001",
    doctorId: "doc_1", doctorName: "د. شريف منصور", patientId: "pat_1", patientName: "أحمد محمود",
    workType: "zirconia", teethNumbers: "11,12,13", shadeColor: "A2", material: "Zirconia Multilayer",
    receivedDate: "2026-02-10T09:00:00Z", expectedDeliveryDate: "2026-02-17T09:00:00Z",
    currentStatus: "finishing", currentDepartment: "finishing", priority: "normal",
    doctorNotes: "يرجى الاهتمام بالحواف", internalNotes: "", attachments: [], workflowHistory: [],
    cadData: { designerId: "user_3", designerName: "محمد علي", status: "completed", startTime: "2026-02-10T10:00:00Z", endTime: "2026-02-11T14:00:00Z", designFiles: [], software: "Exocad", notes: "" },
    camData: { operatorId: "user_4", operatorName: "أحمد حسن", status: "completed", startTime: "2026-02-11T15:00:00Z", endTime: "2026-02-12T11:00:00Z", blockType: "Zirconia Multilayer A2", machineId: "mill_1", machineName: "Roland DWX-52D", millingDuration: 180, materialDeducted: true, errors: [], notes: "" },
    finishingData: { technicianId: "user_5", technicianName: "فاطمة نور", status: "in_progress", startTime: "2026-02-12T13:00:00Z", coloringStages: [{ id: "cs_1", stageName: "Base Layer", startTime: "2026-02-12T13:00:00Z", endTime: "2026-02-12T15:00:00Z", technicianId: "user_5", notes: "" }], furnaceId: "furnace_1", furnaceName: "Programat P710", firingCycles: 2, qualityScore: 8, notes: "" },
    totalCost: 1800, createdAt: "2026-02-10T09:00:00Z", updatedAt: "2026-02-12T13:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_2", caseNumber: "L-2026-00002",
    doctorId: "doc_2", doctorName: "د. منى السيد", patientId: "pat_3", patientName: "حسن عمر",
    workType: "pfm", teethNumbers: "36,37", shadeColor: "B1", material: "PFM (Metal Ceramic)",
    receivedDate: "2026-02-11T10:00:00Z", expectedDeliveryDate: "2026-02-18T10:00:00Z",
    currentStatus: "cad_design", currentDepartment: "cad", priority: "urgent",
    doctorNotes: "حالة مستعجلة - المريض يسافر", attachments: [], workflowHistory: [],
    cadData: { designerId: "user_3", designerName: "محمد علي", status: "in_progress", startTime: "2026-02-12T09:00:00Z", designFiles: [], software: "3Shape", notes: "Working on margin line" },
    totalCost: 0, createdAt: "2026-02-11T10:00:00Z", updatedAt: "2026-02-12T09:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_3", caseNumber: "L-2026-00003",
    doctorId: "doc_3", doctorName: "د. طارق عادل", patientId: "pat_4", patientName: "نورة سمير",
    workType: "implant", teethNumbers: "46", shadeColor: "A3.5", material: "Zirconia on Ti-Base",
    receivedDate: "2026-02-08T11:00:00Z", expectedDeliveryDate: "2026-02-15T11:00:00Z",
    currentStatus: "quality_control", currentDepartment: "quality_control", priority: "normal",
    doctorNotes: "Implant abutment included", attachments: [], workflowHistory: [],
    cadData: { designerId: "user_3", designerName: "محمد علي", status: "completed", startTime: "2026-02-08T14:00:00Z", endTime: "2026-02-09T10:00:00Z", designFiles: [], software: "Exocad" },
    camData: { operatorId: "user_4", operatorName: "أحمد حسن", status: "completed", startTime: "2026-02-09T11:00:00Z", endTime: "2026-02-10T09:00:00Z", blockType: "Zirconia HT A3.5", machineId: "mill_1", machineName: "Roland DWX-52D", millingDuration: 120, materialDeducted: true, errors: [] },
    finishingData: { technicianId: "user_5", technicianName: "فاطمة نور", status: "completed", startTime: "2026-02-10T10:00:00Z", endTime: "2026-02-11T16:00:00Z", coloringStages: [], furnaceId: "furnace_1", furnaceName: "Programat P710", firingCycles: 3, qualityScore: 9 },
    qcData: { inspectorId: "user_6", inspectorName: "د. خالد يوسف", status: "pending", inspectionDate: "2026-02-12T00:00:00Z", dimensionCheck: "pass", colorCheck: "pass", occlusionCheck: "pass", marginCheck: "pass", overallResult: "pass" },
    totalCost: 2200, createdAt: "2026-02-08T11:00:00Z", updatedAt: "2026-02-12T00:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_4", caseNumber: "L-2026-00004",
    doctorId: "doc_1", doctorName: "د. شريف منصور", patientId: "pat_2", patientName: "فاطمة علي",
    workType: "emax", teethNumbers: "21,22", shadeColor: "A1", material: "IPS e.max Press",
    receivedDate: "2026-02-12T08:00:00Z", expectedDeliveryDate: "2026-02-19T08:00:00Z",
    currentStatus: "reception", currentDepartment: "reception", priority: "normal",
    doctorNotes: "Veneer preparation", attachments: [], workflowHistory: [],
    totalCost: 0, createdAt: "2026-02-12T08:00:00Z", updatedAt: "2026-02-12T08:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_5", caseNumber: "L-2026-00005",
    doctorId: "doc_4", doctorName: "د. ليلى حمدي", patientId: "pat_5", patientName: "يوسف خالد",
    workType: "removable", teethNumbers: "upper full", shadeColor: "A3", material: "Acrylic Denture",
    receivedDate: "2026-02-09T09:00:00Z", expectedDeliveryDate: "2026-02-20T09:00:00Z",
    currentStatus: "ready_for_delivery", currentDepartment: "delivery", priority: "normal",
    doctorNotes: "", attachments: [], workflowHistory: [],
    cadData: { designerId: "user_3", designerName: "محمد علي", status: "completed", designFiles: [] },
    camData: { status: "completed", blockType: "N/A", materialDeducted: true, errors: [] },
    finishingData: { technicianId: "user_5", technicianName: "فاطمة نور", status: "completed", coloringStages: [], firingCycles: 0, qualityScore: 8 },
    qcData: { inspectorId: "user_6", inspectorName: "د. خالد يوسف", status: "completed", inspectionDate: "2026-02-13T00:00:00Z", dimensionCheck: "pass", colorCheck: "pass", occlusionCheck: "pass", marginCheck: "pass", overallResult: "pass" },
    invoiceId: "inv_1", totalCost: 3500,
    createdAt: "2026-02-09T09:00:00Z", updatedAt: "2026-02-13T00:00:00Z", createdBy: "user_2",
  },
];

const SEED_INVENTORY: InventoryItem[] = [
  { id: "inv_item_1", name: "Zirconia Multilayer Block 98mm", nameAr: "بلوك زركونيا متعدد الطبقات 98مم", category: "blocks", sku: "ZRC-ML-98", unit: "piece", currentStock: 25, minimumStock: 10, costPerUnit: 350, supplier: "Ivoclar", supplierAr: "إيفوكلار", location: "Shelf A1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_2", name: "Zirconia HT Block 98mm", nameAr: "بلوك زركونيا شفاف 98مم", category: "blocks", sku: "ZRC-HT-98", unit: "piece", currentStock: 18, minimumStock: 8, costPerUnit: 400, supplier: "Ivoclar", supplierAr: "إيفوكلار", location: "Shelf A2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_3", name: "IPS e.max Press Ingots LT", nameAr: "قوالب IPS e.max ضغط شفاف", category: "blocks", sku: "EMAX-LT", unit: "pack", currentStock: 12, minimumStock: 5, costPerUnit: 280, supplier: "Ivoclar Vivadent", supplierAr: "إيفوكلار فيفادنت", location: "Shelf A3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_4", name: "PFM Alloy (Ni-Cr)", nameAr: "سبيكة PFM نيكل-كروم", category: "raw_materials", sku: "PFM-NCR", unit: "gram", currentStock: 500, minimumStock: 200, costPerUnit: 2.5, supplier: "BEGO", supplierAr: "بيجو", location: "Shelf B1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_5", name: "Ceramic Powder A2", nameAr: "بودرة سيراميك A2", category: "raw_materials", sku: "CER-A2", unit: "gram", currentStock: 150, minimumStock: 50, costPerUnit: 1.8, supplier: "VITA", supplierAr: "فيتا", location: "Shelf B2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_6", name: "Diamond Burs Set", nameAr: "طقم فريزات ألماس", category: "tools", sku: "DB-SET-01", unit: "set", currentStock: 8, minimumStock: 3, costPerUnit: 120, supplier: "Komet", supplierAr: "كوميت", location: "Shelf C1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_7", name: "Milling Burs CAM", nameAr: "فريزات تفريز CAM", category: "tools", sku: "MB-CAM-01", unit: "piece", currentStock: 15, minimumStock: 5, costPerUnit: 85, supplier: "Roland", supplierAr: "رولاند", location: "Shelf C2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_8", name: "Impression Material", nameAr: "مادة الطبعة", category: "consumables", sku: "IMP-MAT-01", unit: "cartridge", currentStock: 3, minimumStock: 5, costPerUnit: 45, supplier: "3M", supplierAr: "ثري إم", location: "Shelf D1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_9", name: "Acrylic Resin (Pink)", nameAr: "ريزن أكريليك وردي", category: "raw_materials", sku: "ACR-PINK", unit: "kg", currentStock: 4, minimumStock: 2, costPerUnit: 95, supplier: "Vertex", supplierAr: "فيرتكس", location: "Shelf B3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_10", name: "Ti-Base Abutment", nameAr: "قاعدة تيتانيوم", category: "raw_materials", sku: "TI-BASE-01", unit: "piece", currentStock: 20, minimumStock: 10, costPerUnit: 180, supplier: "Straumann", supplierAr: "ستروماون", location: "Shelf A4", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "inv_item_11", name: "PMMA Block 98mm (Temp)", nameAr: "بلوك PMMA مؤقت 98مم", category: "blocks", sku: "PMMA-98-TMP", unit: "piece", currentStock: 30, minimumStock: 10, costPerUnit: 65, supplier: "Yamahachi", supplierAr: "ياماهاشي", location: "Shelf A5", batchNumber: "PM-2026-B12", expiryDate: "2027-06-01", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_12", name: "Wax Block (CAD/CAM)", nameAr: "بلوك واكس للتفريز", category: "blocks", sku: "WAX-BLK-98", unit: "piece", currentStock: 40, minimumStock: 15, costPerUnit: 25, supplier: "Roland", supplierAr: "رولاند", location: "Shelf A6", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_13", name: "Vita VM13 Ceramic Powder B1", nameAr: "بودرة سيراميك فيتا B1", category: "raw_materials", sku: "VITA-VM13-B1", unit: "gram", currentStock: 80, minimumStock: 30, costPerUnit: 2.2, supplier: "VITA", supplierAr: "فيتا", location: "Shelf B4", batchNumber: "VT-2025-987", expiryDate: "2027-12-01", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_14", name: "Glazing Paste", nameAr: "معجون تلميع (جليز)", category: "raw_materials", sku: "GLZ-PST-01", unit: "tube", currentStock: 6, minimumStock: 3, costPerUnit: 75, supplier: "Ivoclar", supplierAr: "إيفوكلار", location: "Shelf B5", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_15", name: "Dental Stone Type IV", nameAr: "جبس أسنان نوع IV", category: "raw_materials", sku: "STONE-IV", unit: "kg", currentStock: 15, minimumStock: 5, costPerUnit: 35, supplier: "Zhermack", supplierAr: "زيرماك", location: "Shelf B6", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_16", name: "Polishing Kit (Zirconia)", nameAr: "طقم تلميع زركونيا", category: "tools", sku: "POL-ZRC-KIT", unit: "set", currentStock: 5, minimumStock: 2, costPerUnit: 200, supplier: "EVE", supplierAr: "إيف", location: "Shelf C3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_17", name: "Articular Paper", nameAr: "ورق تحديد الإطباق", category: "consumables", sku: "ART-PPR-01", unit: "box", currentStock: 10, minimumStock: 3, costPerUnit: 15, supplier: "Bausch", supplierAr: "باوش", location: "Shelf D2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_18", name: "Resin Cement Dual Cure", nameAr: "أسمنت ريزن ثنائي التصلب", category: "consumables", sku: "RES-CEM-DC", unit: "syringe", currentStock: 8, minimumStock: 3, costPerUnit: 120, supplier: "3M", supplierAr: "ثري إم", location: "Shelf D3", batchNumber: "3M-2025-DC55", expiryDate: "2026-04-15", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_19", name: "Sintering Furnace Beads", nameAr: "كرات فرن التلبيد", category: "consumables", sku: "SINT-BEADS", unit: "kg", currentStock: 2, minimumStock: 1, costPerUnit: 55, supplier: "Dekema", supplierAr: "ديكيما", location: "Shelf D4", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "inv_item_20", name: "Model Resin (3D Print)", nameAr: "ريزن طباعة نماذج", category: "raw_materials", sku: "RES-3D-MDL", unit: "liter", currentStock: 3, minimumStock: 2, costPerUnit: 280, supplier: "Formlabs", supplierAr: "فورملابز", location: "Shelf B7", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
];

const SEED_INV_TX: InventoryTransaction[] = [
  { id: "itx_1", itemId: "inv_item_1", itemName: "بلوك زركونيا متعدد الطبقات 98مم", type: "deduction", quantity: 1, previousStock: 26, newStock: 25, caseId: "case_1", caseNumber: "L-2026-00001", reason: "استخدام للحالة L-2026-00001", performedBy: "user_4", performedByName: "أحمد حسن", createdAt: "2026-02-11T15:00:00Z" },
  { id: "itx_2", itemId: "inv_item_2", itemName: "بلوك زركونيا شفاف 98مم", type: "deduction", quantity: 1, previousStock: 19, newStock: 18, caseId: "case_3", caseNumber: "L-2026-00003", reason: "استخدام للحالة L-2026-00003", performedBy: "user_4", performedByName: "أحمد حسن", createdAt: "2026-02-09T11:00:00Z" },
  { id: "itx_3", itemId: "inv_item_5", itemName: "بودرة سيراميك A2", type: "deduction", quantity: 15, previousStock: 165, newStock: 150, caseId: "case_1", caseNumber: "L-2026-00001", reason: "استخدام للتلوين - حالة L-2026-00001", performedBy: "user_5", performedByName: "فاطمة نور", createdAt: "2026-02-12T14:00:00Z" },
  { id: "itx_4", itemId: "inv_item_7", itemName: "فريزات تفريز CAM", type: "deduction", quantity: 1, previousStock: 16, newStock: 15, reason: "استهلاك فريزة أثناء تفريز بلوك زركونيا", performedBy: "user_4", performedByName: "أحمد حسن", createdAt: "2026-02-10T09:30:00Z" },
  { id: "itx_5", itemId: "inv_item_1", itemName: "بلوك زركونيا متعدد الطبقات 98مم", type: "addition", quantity: 20, previousStock: 6, newStock: 26, reason: "توريد من شركة إيفوكلار - فاتورة شراء PO-2026-015", performedBy: "user_1", performedByName: "مدير النظام", createdAt: "2026-02-05T10:00:00Z" },
];

const SEED_PRICING: PricingRule[] = [
  { id: "pr_1", workType: "zirconia", basePricePerUnit: 600, materialCostMultiplier: 1.2, laborCostPerHour: 50, profitMarginPercent: 30, rushSurchargePercent: 25, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_2", workType: "pfm", basePricePerUnit: 400, materialCostMultiplier: 1.1, laborCostPerHour: 45, profitMarginPercent: 25, rushSurchargePercent: 20, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_3", workType: "emax", basePricePerUnit: 700, materialCostMultiplier: 1.3, laborCostPerHour: 55, profitMarginPercent: 35, rushSurchargePercent: 30, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_4", workType: "implant", basePricePerUnit: 900, materialCostMultiplier: 1.4, laborCostPerHour: 60, profitMarginPercent: 35, rushSurchargePercent: 25, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_5", workType: "ortho", basePricePerUnit: 500, materialCostMultiplier: 1.0, laborCostPerHour: 40, profitMarginPercent: 20, rushSurchargePercent: 15, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_6", workType: "removable", basePricePerUnit: 800, materialCostMultiplier: 1.1, laborCostPerHour: 50, profitMarginPercent: 25, rushSurchargePercent: 20, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_7", workType: "composite", basePricePerUnit: 350, materialCostMultiplier: 1.0, laborCostPerHour: 35, profitMarginPercent: 20, rushSurchargePercent: 15, updatedAt: "2026-01-01T00:00:00Z" },
];

const SEED_INVOICES: Invoice[] = [
  { id: "inv_1", invoiceNumber: "INV-2026-00001", caseId: "case_5", caseNumber: "L-2026-00005", doctorId: "doc_4", doctorName: "د. ليلى حمدي", patientName: "يوسف خالد", items: [{ id: "ii_1", description: "Full Upper Denture - Acrylic", descriptionAr: "طقم علوي كامل - أكريليك", quantity: 1, unitPrice: 3500, total: 3500 }], subtotal: 3500, materialsCost: 450, laborCost: 800, rushSurcharge: 0, discount: 0, tax: 0, totalAmount: 3500, status: "issued", paymentStatus: "partial", paidAmount: 2000, remainingAmount: 1500, payments: [{ id: "pay_1", invoiceId: "inv_1", amount: 2000, method: "cash", paidDate: "2026-02-13T00:00:00Z", receivedBy: "user_7", notes: "دفعة أولى" }], issuedDate: "2026-02-13T00:00:00Z", dueDate: "2026-02-28T00:00:00Z", createdBy: "user_7" },
  { id: "inv_2", invoiceNumber: "INV-2026-00002", caseId: "case_4", caseNumber: "L-2026-00004", doctorId: "doc_1", doctorName: "د. أحمد السيد", patientName: "خالد مصطفى", items: [{ id: "ii_2", description: "ZIRCONIA - Teeth: 14,15,16", descriptionAr: "زركونيا - أسنان: 14,15,16", quantity: 3, unitPrice: 750, total: 2250 }], subtotal: 3200, materialsCost: 400, laborCost: 550, rushSurcharge: 0, discount: 200, tax: 0, totalAmount: 3000, status: "paid", paymentStatus: "paid", paidAmount: 3000, remainingAmount: 0, payments: [{ id: "pay_2", invoiceId: "inv_2", amount: 3000, method: "bank_transfer", reference: "TRF-20260210", paidDate: "2026-02-10T00:00:00Z", receivedBy: "user_7" }], issuedDate: "2026-02-08T00:00:00Z", dueDate: "2026-03-08T00:00:00Z", createdBy: "user_7" },
  { id: "inv_3", invoiceNumber: "INV-2026-00003", caseId: "case_3", caseNumber: "L-2026-00003", doctorId: "doc_2", doctorName: "د. منى خليل", patientName: "حسن عمر", items: [{ id: "ii_3", description: "EMAX - Teeth: 21,22", descriptionAr: "إي ماكس - أسنان: 21,22", quantity: 2, unitPrice: 900, total: 1800 }], subtotal: 2800, materialsCost: 500, laborCost: 500, rushSurcharge: 360, discount: 0, tax: 0, totalAmount: 2800, status: "issued", paymentStatus: "unpaid", paidAmount: 0, remainingAmount: 2800, payments: [], issuedDate: "2026-01-25T00:00:00Z", dueDate: "2026-02-10T00:00:00Z", createdBy: "user_7" },
];

const SEED_EXPENSES: Expense[] = [
  { id: "exp_1", category: "materials", description: "شراء بلوكات زركونيا - Ivoclar", amount: 12500, date: "2026-02-01T00:00:00Z", vendor: "شركة إيفوكلار", reference: "PO-2026-001", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-01T00:00:00Z" },
  { id: "exp_2", category: "equipment", description: "صيانة ماكينة Roland DWX-52D", amount: 3500, date: "2026-02-03T00:00:00Z", vendor: "رولاند للصيانة", reference: "SVC-2026-011", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-03T00:00:00Z" },
  { id: "exp_3", category: "rent", description: "إيجار المعمل - فبراير 2026", amount: 8000, date: "2026-02-01T00:00:00Z", vendor: "شركة الإسكان", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-01T00:00:00Z" },
  { id: "exp_4", category: "utilities", description: "فاتورة كهرباء - يناير", amount: 2200, date: "2026-02-05T00:00:00Z", vendor: "شركة الكهرباء", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-05T00:00:00Z" },
  { id: "exp_5", category: "salaries", description: "رواتب الفنيين - يناير 2026", amount: 35000, date: "2026-01-31T00:00:00Z", vendor: "", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-01-31T00:00:00Z" },
];

const SEED_SUPPLIERS: Supplier[] = [
  { id: "sup_1", name: "Ivoclar Vivadent", nameAr: "إيفوكلار فيفادنت", contactPerson: "Mohamed Hassan", contactPersonAr: "محمد حسن", phone: "01001234567", phone2: "0222334455", email: "orders@ivoclar-eg.com", website: "www.ivoclar.com", address: "10 El-Thawra St, Heliopolis", addressAr: "10 شارع الثورة، مصر الجديدة", city: "القاهرة", country: "مصر", taxNumber: "TAX-IVC-2025", paymentTerms: "Net 30", notes: "المورد الرئيسي لبلوكات الزركونيا وقوالب e.max", status: "active", categories: ["blocks", "raw_materials"], totalPurchases: 85000, totalPaid: 72500, balance: 12500, rating: 5, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
  { id: "sup_2", name: "VITA Zahnfabrik", nameAr: "فيتا لصناعة الأسنان", contactPerson: "Sara Ali", contactPersonAr: "سارة علي", phone: "01112345678", email: "egypt@vita-zahnfabrik.com", website: "www.vita-zahnfabrik.com", addressAr: "المعادي، القاهرة", city: "القاهرة", country: "مصر", paymentTerms: "Net 15", notes: "مورد السيراميك والألوان", status: "active", categories: ["raw_materials"], totalPurchases: 32000, totalPaid: 32000, balance: 0, rating: 4, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-02-08T00:00:00Z" },
  { id: "sup_3", name: "Roland DG", nameAr: "رولاند للتقنية", contactPerson: "Ahmed Farid", contactPersonAr: "أحمد فريد", phone: "01223456789", email: "support@roland-eg.com", website: "www.dgshape.com", addressAr: "المهندسين، الجيزة", city: "الجيزة", country: "مصر", taxNumber: "TAX-RLD-2025", paymentTerms: "COD", notes: "مورد فريزات التفريز وقطع غيار الماكينات", status: "active", categories: ["tools", "consumables"], totalPurchases: 18500, totalPaid: 18500, balance: 0, rating: 4, createdAt: "2025-07-01T00:00:00Z", updatedAt: "2026-02-03T00:00:00Z" },
  { id: "sup_4", name: "3M Dental", nameAr: "ثري إم للأسنان", contactPerson: "Laila Mahmoud", contactPersonAr: "ليلى محمود", phone: "01098765432", email: "dental@3m-eg.com", website: "www.3m.com", addressAr: "مدينة نصر، القاهرة", city: "القاهرة", country: "مصر", paymentTerms: "Net 30", status: "active", categories: ["consumables", "raw_materials"], totalPurchases: 15200, totalPaid: 12000, balance: 3200, rating: 5, createdAt: "2025-08-01T00:00:00Z", updatedAt: "2026-02-05T00:00:00Z" },
  { id: "sup_5", name: "Straumann", nameAr: "ستروماون", contactPerson: "Khaled Yousef", contactPersonAr: "خالد يوسف", phone: "01156789012", email: "eg-orders@straumann.com", website: "www.straumann.com", addressAr: "الدقي، الجيزة", city: "الجيزة", country: "سويسرا", paymentTerms: "Net 45", notes: "مورد قواعد التيتانيوم ومستلزمات الزراعة", status: "active", categories: ["raw_materials"], totalPurchases: 42000, totalPaid: 35000, balance: 7000, rating: 5, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-02-09T00:00:00Z" },
];

const SEED_POS: PurchaseOrder[] = [
  { id: "po_1", poNumber: "PO-2026-00001", supplierId: "sup_1", supplierName: "Ivoclar Vivadent", supplierNameAr: "إيفوكلار فيفادنت", items: [{ id: "poi_1", inventoryItemId: "inv_item_1", description: "Zirconia Multilayer Block 98mm", descriptionAr: "بلوك زركونيا متعدد الطبقات 98مم", sku: "ZRC-ML-98", quantity: 20, unitPrice: 320, total: 6400 }, { id: "poi_2", inventoryItemId: "inv_item_2", description: "Zirconia HT Block 98mm", descriptionAr: "بلوك زركونيا شفاف 98مم", sku: "ZRC-HT-98", quantity: 10, unitPrice: 370, total: 3700 }], subtotal: 10100, tax: 0, discount: 500, totalAmount: 9600, paidAmount: 9600, remainingAmount: 0, status: "received", payments: [{ id: "spp_1", purchaseOrderId: "po_1", amount: 5000, method: "bank_transfer", reference: "TRF-SUP-001", paidDate: "2026-01-15T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" }, { id: "spp_2", purchaseOrderId: "po_1", amount: 4600, method: "bank_transfer", reference: "TRF-SUP-002", paidDate: "2026-02-01T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" }], orderDate: "2026-01-10T00:00:00Z", expectedDelivery: "2026-01-20T00:00:00Z", receivedDate: "2026-01-18T00:00:00Z", notes: "طلب شهري دوري", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-01-10T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: "po_2", poNumber: "PO-2026-00002", supplierId: "sup_1", supplierName: "Ivoclar Vivadent", supplierNameAr: "إيفوكلار فيفادنت", items: [{ id: "poi_3", inventoryItemId: "inv_item_3", description: "IPS e.max Press Ingots LT", descriptionAr: "قوالب IPS e.max ضغط شفاف", sku: "EMAX-LT", quantity: 10, unitPrice: 250, total: 2500 }], subtotal: 2500, tax: 0, discount: 0, totalAmount: 2500, paidAmount: 2500, remainingAmount: 0, status: "received", payments: [{ id: "spp_3", purchaseOrderId: "po_2", amount: 2500, method: "cash", paidDate: "2026-02-07T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" }], orderDate: "2026-02-05T00:00:00Z", expectedDelivery: "2026-02-10T00:00:00Z", receivedDate: "2026-02-07T00:00:00Z", notes: "طلب طوارئ - نفاد المخزون", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-05T00:00:00Z", updatedAt: "2026-02-07T00:00:00Z" },
];

const SEED_AUDIT: AuditLog[] = [
  { id: "log_1", userId: "user_2", userName: "سارة أحمد", action: "CREATE_CASE", entity: "case", entityId: "case_1", details: "Created case L-2026-00001", timestamp: "2026-02-10T09:00:00Z" },
  { id: "log_2", userId: "user_2", userName: "سارة أحمد", action: "CREATE_CASE", entity: "case", entityId: "case_2", details: "Created case L-2026-00002", timestamp: "2026-02-11T10:00:00Z" },
  { id: "log_3", userId: "user_3", userName: "محمد علي", action: "TRANSFER_CASE", entity: "case", entityId: "case_1", details: "Transferred to CAM", timestamp: "2026-02-11T14:00:00Z" },
];

// ========================================
// INITIALIZATION
// ========================================

async function seedCollection<T>(
  loadFn: () => Promise<T[]>,
  saveFn: (item: any) => Promise<void>,
  seedData: T[],
  name: string,
): Promise<T[]> {
  const existing = await loadFn();
  if (existing.length > 0) {
    console.log(`  ✓ ${name}: loaded ${existing.length} from DB`);
    return existing;
  }
  console.log(`  ◌ ${name}: seeding ${seedData.length} items...`);
  for (const item of seedData) {
    await saveFn(item);
  }
  return [...seedData];
}

let initialized = false;

export async function initializeStore(): Promise<void> {
  if (initialized) return;
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  Loading data from PostgreSQL (Neon) ║");
  console.log("╚══════════════════════════════════════╝\n");

  try {
    // Load counters first
    const dbCounters = await repo.loadCounters();
    if (Object.keys(dbCounters).length > 0) {
      Object.assign(counters, dbCounters);
      caseSequence = dbCounters.caseSequence ?? caseSequence;
      invoiceSequence = dbCounters.invoiceSequence ?? invoiceSequence;
      poCounter = dbCounters.poCounter ?? poCounter;
      console.log("  ✓ Counters: restored from DB");
    } else {
      console.log("  ◌ Counters: using defaults (first boot)");
    }

    // Load all collections (seed if empty)
    users = await seedCollection(repo.loadUsers<User>, repo.saveUser, SEED_USERS, "Users");
    // Ensure kiosk user (biosma) always exists for fingerprint station
    if (!users.find((u) => u.username === "biosma")) {
      const kioskUser = SEED_USERS.find((u) => u.username === "biosma") || {
        id: "user_kiosk",
        username: "biosma",
        password: "biosma123",
        fullName: "Kiosk",
        fullNameAr: "محطة البصمة",
        email: "kiosk@luster.com",
        role: "receptionist" as const,
        department: "reception",
        phone: "",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(kioskUser);
      await repo.saveUser(kioskUser);
      console.log("  ✓ Kiosk user (biosma / biosma123) ensured");
    }
    doctors = await seedCollection(repo.loadDoctors<Doctor>, repo.saveDoctor, SEED_DOCTORS, "Doctors");
    patients = await seedCollection(repo.loadPatients<Patient>, repo.savePatient, SEED_PATIENTS, "Patients");
    cases = await seedCollection(repo.loadCases<DentalCase>, repo.saveCase, SEED_CASES, "Cases");
    inventoryItems = await seedCollection(repo.loadInventoryItems<InventoryItem>, repo.saveInventoryItem, SEED_INVENTORY, "Inventory");
    inventoryTransactions = await seedCollection(repo.loadInventoryTransactions<InventoryTransaction>, repo.saveInventoryTransaction, SEED_INV_TX, "Inv Transactions");
    pricingRules = await seedCollection(repo.loadPricingRules<PricingRule>, repo.savePricingRule, SEED_PRICING, "Pricing Rules");
    invoices = await seedCollection(repo.loadInvoices<Invoice>, repo.saveInvoice, SEED_INVOICES, "Invoices");
    expenses = await seedCollection(repo.loadExpenses<Expense>, repo.saveExpense, SEED_EXPENSES, "Expenses");
    suppliers = await seedCollection(repo.loadSuppliers<Supplier>, repo.saveSupplier, SEED_SUPPLIERS, "Suppliers");
    purchaseOrders = await seedCollection(repo.loadPurchaseOrders<PurchaseOrder>, repo.savePurchaseOrder, SEED_POS, "Purchase Orders");
    auditLogs = await seedCollection(repo.loadAuditLogs<AuditLog>, repo.saveAuditLog, SEED_AUDIT, "Audit Logs");
    deliveries = await seedCollection(repo.loadDeliveries<Delivery>, repo.saveDelivery, [], "Deliveries");

    try {
      barcodeLabels = await repo.loadBarcodeLabels<BarcodeLabel>();
      barcodeLogs = await repo.loadBarcodeLogs<BarcodeLog>();
      console.log(`  ✓ Barcode: ${barcodeLabels.length} labels, ${barcodeLogs.length} logs`);
    } catch (e) {
      console.log("  ◌ Barcode: tables may not exist yet (run migrations), using empty");
      barcodeLabels = [];
      barcodeLogs = [];
    }
    try {
      attendanceRecords = await repo.loadAttendanceRecords<AttendanceRecord>();
      payrollPeriods = await repo.loadPayrollPeriods<PayrollPeriod>();
      payrollEntries = await repo.loadPayrollEntries<PayrollEntry>();
      console.log(`  ✓ Attendance: ${attendanceRecords.length} records, Payroll: ${payrollPeriods.length} periods`);
    } catch (e) {
      attendanceRecords = [];
      payrollPeriods = [];
      payrollEntries = [];
    }

    // Save initial counters
    if (Object.keys(dbCounters).length === 0) {
      for (const [k, v] of Object.entries(counters)) {
        await repo.saveCounter(k, v);
      }
      await repo.saveCounter("caseSequence", caseSequence);
      await repo.saveCounter("invoiceSequence", invoiceSequence);
      await repo.saveCounter("poCounter", poCounter);
    }

    initialized = true;
    console.log("\n  ✅ Database initialization complete!\n");
  } catch (error) {
    console.error("\n  ❌ DB initialization failed:", error);
    console.log("  ⚠️ Falling back to seed data (no persistence)\n");
    // Fallback: use seed data in memory (no persistence)
    users = [...SEED_USERS];
    doctors = [...SEED_DOCTORS];
    patients = [...SEED_PATIENTS];
    cases = [...SEED_CASES];
    inventoryItems = [...SEED_INVENTORY];
    inventoryTransactions = [...SEED_INV_TX];
    pricingRules = [...SEED_PRICING];
    invoices = [...SEED_INVOICES];
    expenses = [...SEED_EXPENSES];
    suppliers = [...SEED_SUPPLIERS];
    purchaseOrders = [...SEED_POS];
    auditLogs = [...SEED_AUDIT];
    deliveries = [];
    barcodeLabels = [];
    barcodeLogs = [];
    attendanceRecords = [];
    payrollPeriods = [];
    payrollEntries = [];
    initialized = true;
  }
}
