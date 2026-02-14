/**
 * In-Memory Data Store
 * ====================
 * Enterprise-grade in-memory store with auto-incrementing IDs,
 * sequential case numbers, and seed data for all collections.
 */

import type {
  User, Doctor, Patient, DentalCase, InventoryItem, InventoryTransaction,
  Invoice, Payment, Delivery, AuditLog, PricingRule, WorkflowStep,
  Supplier, PurchaseOrder,
} from "@shared/api";

// ========================================
// ID GENERATORS
// ========================================

let counters = {
  user: 10,
  doctor: 10,
  patient: 10,
  case: 5,
  inventory: 20,
  inventoryTx: 5,
  invoice: 3,
  payment: 3,
  delivery: 2,
  audit: 50,
  workflow: 20,
  pricing: 8,
};

export function generateId(prefix: string): string {
  const key = prefix as keyof typeof counters;
  if (counters[key] !== undefined) counters[key]++;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

let caseSequence = 5;
export function generateCaseNumber(): string {
  caseSequence++;
  const year = new Date().getFullYear();
  return `L-${year}-${String(caseSequence).padStart(5, "0")}`;
}

let invoiceSequence = 3;
export function generateInvoiceNumber(): string {
  invoiceSequence++;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(invoiceSequence).padStart(5, "0")}`;
}

// ========================================
// DATA COLLECTIONS
// ========================================

export const users: User[] = [
  {
    id: "user_1", username: "admin", password: "admin123",
    fullName: "System Admin", fullNameAr: "مدير النظام",
    email: "admin@luster.com", role: "admin", department: "management",
    phone: "+20123456789", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_2", username: "reception1", password: "pass123",
    fullName: "Sara Ahmed", fullNameAr: "سارة أحمد",
    email: "sara@luster.com", role: "receptionist", department: "reception",
    phone: "+20111111111", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_3", username: "designer1", password: "pass123",
    fullName: "Mohamed Ali", fullNameAr: "محمد علي",
    email: "mohamed@luster.com", role: "designer", department: "cad",
    phone: "+20222222222", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_4", username: "tech1", password: "pass123",
    fullName: "Ahmed Hassan", fullNameAr: "أحمد حسن",
    email: "ahmed.h@luster.com", role: "technician", department: "cam",
    phone: "+20333333333", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_5", username: "tech2", password: "pass123",
    fullName: "Fatma Nour", fullNameAr: "فاطمة نور",
    email: "fatma@luster.com", role: "technician", department: "finishing",
    phone: "+20444444444", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_6", username: "qc1", password: "pass123",
    fullName: "Dr. Khaled Youssef", fullNameAr: "د. خالد يوسف",
    email: "khaled@luster.com", role: "qc_manager", department: "quality_control",
    phone: "+20555555555", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_7", username: "accountant1", password: "pass123",
    fullName: "Nadia Ibrahim", fullNameAr: "نادية إبراهيم",
    email: "nadia@luster.com", role: "accountant", department: "accounting",
    phone: "+20666666666", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user_8", username: "delivery1", password: "pass123",
    fullName: "Omar Saeed", fullNameAr: "عمر سعيد",
    email: "omar@luster.com", role: "delivery_staff", department: "delivery",
    phone: "+20777777777", active: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
];

export const doctors: Doctor[] = [
  {
    id: "doc_1", name: "Dr. Sherif Mansour", nameAr: "د. شريف منصور",
    clinic: "Smile Dental Center", clinicAr: "مركز سمايل لطب الأسنان",
    phone: "+20101234567", email: "sherif@smile.com",
    address: "6 October City", specialization: "Prosthodontics",
    totalCases: 45, totalDebt: 2500, createdAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "doc_2", name: "Dr. Mona El-Sayed", nameAr: "د. منى السيد",
    clinic: "Cairo Dental Clinic", clinicAr: "عيادة القاهرة للأسنان",
    phone: "+20109876543", email: "mona@cairo-dental.com",
    address: "Nasr City, Cairo", specialization: "Orthodontics",
    totalCases: 32, totalDebt: 0, createdAt: "2025-07-15T00:00:00Z",
  },
  {
    id: "doc_3", name: "Dr. Tarek Adel", nameAr: "د. طارق عادل",
    clinic: "Nile Dental Studio", clinicAr: "استوديو النيل للأسنان",
    phone: "+20112233445", email: "tarek@niledental.com",
    address: "Maadi, Cairo", specialization: "Implantology",
    totalCases: 28, totalDebt: 5200, createdAt: "2025-08-20T00:00:00Z",
  },
  {
    id: "doc_4", name: "Dr. Laila Hamdi", nameAr: "د. ليلى حمدي",
    clinic: "Pearl Dental Care", clinicAr: "بيرل لرعاية الأسنان",
    phone: "+20115566778", email: "laila@pearl.com",
    address: "Heliopolis, Cairo", specialization: "Cosmetic Dentistry",
    totalCases: 18, totalDebt: 1200, createdAt: "2025-09-10T00:00:00Z",
  },
];

export const patients: Patient[] = [
  { id: "pat_1", name: "Ahmad Mahmoud", nameAr: "أحمد محمود", phone: "+20100000001", age: 45, gender: "male", doctorId: "doc_1" },
  { id: "pat_2", name: "Fatma Ali", nameAr: "فاطمة علي", phone: "+20100000002", age: 32, gender: "female", doctorId: "doc_1" },
  { id: "pat_3", name: "Hassan Omar", nameAr: "حسن عمر", phone: "+20100000003", age: 55, gender: "male", doctorId: "doc_2" },
  { id: "pat_4", name: "Nora Samir", nameAr: "نورة سمير", phone: "+20100000004", age: 28, gender: "female", doctorId: "doc_3" },
  { id: "pat_5", name: "Youssef Khaled", nameAr: "يوسف خالد", phone: "+20100000005", age: 60, gender: "male", doctorId: "doc_4" },
];

export const cases: DentalCase[] = [
  {
    id: "case_1", caseNumber: "L-2026-00001",
    doctorId: "doc_1", doctorName: "د. شريف منصور",
    patientId: "pat_1", patientName: "أحمد محمود",
    workType: "zirconia", teethNumbers: "11,12,13", shadeColor: "A2",
    material: "Zirconia Multilayer",
    receivedDate: "2026-02-10T09:00:00Z", expectedDeliveryDate: "2026-02-17T09:00:00Z",
    currentStatus: "finishing", currentDepartment: "finishing",
    priority: "normal",
    doctorNotes: "يرجى الاهتمام بالحواف", internalNotes: "",
    attachments: [], workflowHistory: [],
    cadData: {
      designerId: "user_3", designerName: "محمد علي",
      status: "completed", startTime: "2026-02-10T10:00:00Z", endTime: "2026-02-11T14:00:00Z",
      designFiles: [], software: "Exocad", notes: "",
    },
    camData: {
      operatorId: "user_4", operatorName: "أحمد حسن",
      status: "completed", startTime: "2026-02-11T15:00:00Z", endTime: "2026-02-12T11:00:00Z",
      blockType: "Zirconia Multilayer A2", machineId: "mill_1", machineName: "Roland DWX-52D",
      millingDuration: 180, materialDeducted: true, errors: [], notes: "",
    },
    finishingData: {
      technicianId: "user_5", technicianName: "فاطمة نور",
      status: "in_progress", startTime: "2026-02-12T13:00:00Z",
      coloringStages: [
        { id: "cs_1", stageName: "Base Layer", startTime: "2026-02-12T13:00:00Z", endTime: "2026-02-12T15:00:00Z", technicianId: "user_5", notes: "" },
      ],
      furnaceId: "furnace_1", furnaceName: "Programat P710",
      firingCycles: 2, qualityScore: 8, notes: "",
    },
    totalCost: 1800, createdAt: "2026-02-10T09:00:00Z", updatedAt: "2026-02-12T13:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_2", caseNumber: "L-2026-00002",
    doctorId: "doc_2", doctorName: "د. منى السيد",
    patientId: "pat_3", patientName: "حسن عمر",
    workType: "pfm", teethNumbers: "36,37", shadeColor: "B1",
    material: "PFM (Metal Ceramic)",
    receivedDate: "2026-02-11T10:00:00Z", expectedDeliveryDate: "2026-02-18T10:00:00Z",
    currentStatus: "cad_design", currentDepartment: "cad",
    priority: "urgent",
    doctorNotes: "حالة مستعجلة - المريض يسافر", attachments: [], workflowHistory: [],
    cadData: {
      designerId: "user_3", designerName: "محمد علي",
      status: "in_progress", startTime: "2026-02-12T09:00:00Z",
      designFiles: [], software: "3Shape", notes: "Working on margin line",
    },
    totalCost: 0, createdAt: "2026-02-11T10:00:00Z", updatedAt: "2026-02-12T09:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_3", caseNumber: "L-2026-00003",
    doctorId: "doc_3", doctorName: "د. طارق عادل",
    patientId: "pat_4", patientName: "نورة سمير",
    workType: "implant", teethNumbers: "46", shadeColor: "A3.5",
    material: "Zirconia on Ti-Base",
    receivedDate: "2026-02-08T11:00:00Z", expectedDeliveryDate: "2026-02-15T11:00:00Z",
    currentStatus: "quality_control", currentDepartment: "quality_control",
    priority: "normal",
    doctorNotes: "Implant abutment included", attachments: [], workflowHistory: [],
    cadData: {
      designerId: "user_3", designerName: "محمد علي",
      status: "completed", startTime: "2026-02-08T14:00:00Z", endTime: "2026-02-09T10:00:00Z",
      designFiles: [], software: "Exocad",
    },
    camData: {
      operatorId: "user_4", operatorName: "أحمد حسن",
      status: "completed", startTime: "2026-02-09T11:00:00Z", endTime: "2026-02-10T09:00:00Z",
      blockType: "Zirconia HT A3.5", machineId: "mill_1", machineName: "Roland DWX-52D",
      millingDuration: 120, materialDeducted: true, errors: [],
    },
    finishingData: {
      technicianId: "user_5", technicianName: "فاطمة نور",
      status: "completed", startTime: "2026-02-10T10:00:00Z", endTime: "2026-02-11T16:00:00Z",
      coloringStages: [],
      furnaceId: "furnace_1", furnaceName: "Programat P710",
      firingCycles: 3, qualityScore: 9,
    },
    qcData: {
      inspectorId: "user_6", inspectorName: "د. خالد يوسف",
      status: "pending", inspectionDate: "2026-02-12T00:00:00Z",
      dimensionCheck: "pass", colorCheck: "pass", occlusionCheck: "pass", marginCheck: "pass",
      overallResult: "pass",
    },
    totalCost: 2200, createdAt: "2026-02-08T11:00:00Z", updatedAt: "2026-02-12T00:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_4", caseNumber: "L-2026-00004",
    doctorId: "doc_1", doctorName: "د. شريف منصور",
    patientId: "pat_2", patientName: "فاطمة علي",
    workType: "emax", teethNumbers: "21,22", shadeColor: "A1",
    material: "IPS e.max Press",
    receivedDate: "2026-02-12T08:00:00Z", expectedDeliveryDate: "2026-02-19T08:00:00Z",
    currentStatus: "reception", currentDepartment: "reception",
    priority: "normal",
    doctorNotes: "Veneer preparation", attachments: [], workflowHistory: [],
    totalCost: 0, createdAt: "2026-02-12T08:00:00Z", updatedAt: "2026-02-12T08:00:00Z", createdBy: "user_2",
  },
  {
    id: "case_5", caseNumber: "L-2026-00005",
    doctorId: "doc_4", doctorName: "د. ليلى حمدي",
    patientId: "pat_5", patientName: "يوسف خالد",
    workType: "removable", teethNumbers: "upper full", shadeColor: "A3",
    material: "Acrylic Denture",
    receivedDate: "2026-02-09T09:00:00Z", expectedDeliveryDate: "2026-02-20T09:00:00Z",
    currentStatus: "ready_for_delivery", currentDepartment: "delivery",
    priority: "normal",
    doctorNotes: "", attachments: [], workflowHistory: [],
    cadData: { designerId: "user_3", designerName: "محمد علي", status: "completed", designFiles: [] },
    camData: { status: "completed", blockType: "N/A", materialDeducted: true, errors: [] },
    finishingData: {
      technicianId: "user_5", technicianName: "فاطمة نور", status: "completed",
      coloringStages: [], firingCycles: 0, qualityScore: 8,
    },
    qcData: {
      inspectorId: "user_6", inspectorName: "د. خالد يوسف", status: "completed",
      inspectionDate: "2026-02-13T00:00:00Z",
      dimensionCheck: "pass", colorCheck: "pass", occlusionCheck: "pass", marginCheck: "pass",
      overallResult: "pass",
    },
    invoiceId: "inv_1", totalCost: 3500,
    createdAt: "2026-02-09T09:00:00Z", updatedAt: "2026-02-13T00:00:00Z", createdBy: "user_2",
  },
];

export const inventoryItems: InventoryItem[] = [
  {
    id: "inv_item_1", name: "Zirconia Multilayer Block 98mm", nameAr: "بلوك زركونيا متعدد الطبقات 98مم",
    category: "blocks", sku: "ZRC-ML-98", unit: "piece",
    currentStock: 25, minimumStock: 10, costPerUnit: 350,
    supplier: "Ivoclar", supplierAr: "إيفوكلار", location: "Shelf A1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_2", name: "Zirconia HT Block 98mm", nameAr: "بلوك زركونيا شفاف 98مم",
    category: "blocks", sku: "ZRC-HT-98", unit: "piece",
    currentStock: 18, minimumStock: 8, costPerUnit: 400,
    supplier: "Ivoclar", supplierAr: "إيفوكلار", location: "Shelf A2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_3", name: "IPS e.max Press Ingots LT", nameAr: "قوالب IPS e.max ضغط شفاف",
    category: "blocks", sku: "EMAX-LT", unit: "pack",
    currentStock: 12, minimumStock: 5, costPerUnit: 280,
    supplier: "Ivoclar Vivadent", supplierAr: "إيفوكلار فيفادنت", location: "Shelf A3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_4", name: "PFM Alloy (Ni-Cr)", nameAr: "سبيكة PFM نيكل-كروم",
    category: "raw_materials", sku: "PFM-NCR", unit: "gram",
    currentStock: 500, minimumStock: 200, costPerUnit: 2.5,
    supplier: "BEGO", supplierAr: "بيجو", location: "Shelf B1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_5", name: "Ceramic Powder A2", nameAr: "بودرة سيراميك A2",
    category: "raw_materials", sku: "CER-A2", unit: "gram",
    currentStock: 150, minimumStock: 50, costPerUnit: 1.8,
    supplier: "VITA", supplierAr: "فيتا", location: "Shelf B2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_6", name: "Diamond Burs Set", nameAr: "طقم فريزات ألماس",
    category: "tools", sku: "DB-SET-01", unit: "set",
    currentStock: 8, minimumStock: 3, costPerUnit: 120,
    supplier: "Komet", supplierAr: "كوميت", location: "Shelf C1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_7", name: "Milling Burs CAM", nameAr: "فريزات تفريز CAM",
    category: "tools", sku: "MB-CAM-01", unit: "piece",
    currentStock: 15, minimumStock: 5, costPerUnit: 85,
    supplier: "Roland", supplierAr: "رولاند", location: "Shelf C2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_8", name: "Impression Material", nameAr: "مادة الطبعة",
    category: "consumables", sku: "IMP-MAT-01", unit: "cartridge",
    currentStock: 3, minimumStock: 5, costPerUnit: 45,
    supplier: "3M", supplierAr: "ثري إم", location: "Shelf D1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_9", name: "Acrylic Resin (Pink)", nameAr: "ريزن أكريليك وردي",
    category: "raw_materials", sku: "ACR-PINK", unit: "kg",
    currentStock: 4, minimumStock: 2, costPerUnit: 95,
    supplier: "Vertex", supplierAr: "فيرتكس", location: "Shelf B3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "inv_item_10", name: "Ti-Base Abutment", nameAr: "قاعدة تيتانيوم",
    category: "raw_materials", sku: "TI-BASE-01", unit: "piece",
    currentStock: 20, minimumStock: 10, costPerUnit: 180,
    supplier: "Straumann", supplierAr: "ستروماون", location: "Shelf A4", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  // --- Additional dental-specific items ---
  {
    id: "inv_item_11", name: "PMMA Block 98mm (Temp)", nameAr: "بلوك PMMA مؤقت 98مم",
    category: "blocks", sku: "PMMA-98-TMP", unit: "piece",
    currentStock: 30, minimumStock: 10, costPerUnit: 65,
    supplier: "Yamahachi", supplierAr: "ياماهاشي", location: "Shelf A5",
    batchNumber: "PM-2026-B12", expiryDate: "2027-06-01", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_12", name: "Wax Block (CAD/CAM)", nameAr: "بلوك واكس للتفريز",
    category: "blocks", sku: "WAX-BLK-98", unit: "piece",
    currentStock: 40, minimumStock: 15, costPerUnit: 25,
    supplier: "Roland", supplierAr: "رولاند", location: "Shelf A6", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_13", name: "Vita VM13 Ceramic Powder B1", nameAr: "بودرة سيراميك فيتا B1",
    category: "raw_materials", sku: "VITA-VM13-B1", unit: "gram",
    currentStock: 80, minimumStock: 30, costPerUnit: 2.2,
    supplier: "VITA", supplierAr: "فيتا", location: "Shelf B4",
    batchNumber: "VT-2025-987", expiryDate: "2027-12-01", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_14", name: "Glazing Paste", nameAr: "معجون تلميع (جليز)",
    category: "raw_materials", sku: "GLZ-PST-01", unit: "tube",
    currentStock: 6, minimumStock: 3, costPerUnit: 75,
    supplier: "Ivoclar", supplierAr: "إيفوكلار", location: "Shelf B5", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_15", name: "Dental Stone Type IV", nameAr: "جبس أسنان نوع IV",
    category: "raw_materials", sku: "STONE-IV", unit: "kg",
    currentStock: 15, minimumStock: 5, costPerUnit: 35,
    supplier: "Zhermack", supplierAr: "زيرماك", location: "Shelf B6", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_16", name: "Polishing Kit (Zirconia)", nameAr: "طقم تلميع زركونيا",
    category: "tools", sku: "POL-ZRC-KIT", unit: "set",
    currentStock: 5, minimumStock: 2, costPerUnit: 200,
    supplier: "EVE", supplierAr: "إيف", location: "Shelf C3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_17", name: "Articular Paper", nameAr: "ورق تحديد الإطباق",
    category: "consumables", sku: "ART-PPR-01", unit: "box",
    currentStock: 10, minimumStock: 3, costPerUnit: 15,
    supplier: "Bausch", supplierAr: "باوش", location: "Shelf D2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_18", name: "Resin Cement Dual Cure", nameAr: "أسمنت ريزن ثنائي التصلب",
    category: "consumables", sku: "RES-CEM-DC", unit: "syringe",
    currentStock: 8, minimumStock: 3, costPerUnit: 120,
    supplier: "3M", supplierAr: "ثري إم", location: "Shelf D3",
    batchNumber: "3M-2025-DC55", expiryDate: "2026-04-15", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_19", name: "Sintering Furnace Beads", nameAr: "كرات فرن التلبيد",
    category: "consumables", sku: "SINT-BEADS", unit: "kg",
    currentStock: 2, minimumStock: 1, costPerUnit: 55,
    supplier: "Dekema", supplierAr: "ديكيما", location: "Shelf D4", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "inv_item_20", name: "Model Resin (3D Print)", nameAr: "ريزن طباعة نماذج",
    category: "raw_materials", sku: "RES-3D-MDL", unit: "liter",
    currentStock: 3, minimumStock: 2, costPerUnit: 280,
    supplier: "Formlabs", supplierAr: "فورملابز", location: "Shelf B7", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
];

export const inventoryTransactions: InventoryTransaction[] = [
  {
    id: "itx_1", itemId: "inv_item_1", itemName: "بلوك زركونيا متعدد الطبقات 98مم",
    type: "deduction", quantity: 1, previousStock: 26, newStock: 25,
    caseId: "case_1", caseNumber: "L-2026-00001",
    reason: "استخدام للحالة L-2026-00001", performedBy: "user_4", performedByName: "أحمد حسن",
    createdAt: "2026-02-11T15:00:00Z",
  },
  {
    id: "itx_2", itemId: "inv_item_2", itemName: "بلوك زركونيا شفاف 98مم",
    type: "deduction", quantity: 1, previousStock: 19, newStock: 18,
    caseId: "case_3", caseNumber: "L-2026-00003",
    reason: "استخدام للحالة L-2026-00003", performedBy: "user_4", performedByName: "أحمد حسن",
    createdAt: "2026-02-09T11:00:00Z",
  },
  {
    id: "itx_3", itemId: "inv_item_5", itemName: "بودرة سيراميك A2",
    type: "deduction", quantity: 15, previousStock: 165, newStock: 150,
    caseId: "case_1", caseNumber: "L-2026-00001",
    reason: "استخدام للتلوين - حالة L-2026-00001", performedBy: "user_5", performedByName: "فاطمة نور",
    createdAt: "2026-02-12T14:00:00Z",
  },
  {
    id: "itx_4", itemId: "inv_item_7", itemName: "فريزات تفريز CAM",
    type: "deduction", quantity: 1, previousStock: 16, newStock: 15,
    reason: "استهلاك فريزة أثناء تفريز بلوك زركونيا", performedBy: "user_4", performedByName: "أحمد حسن",
    createdAt: "2026-02-10T09:30:00Z",
  },
  {
    id: "itx_5", itemId: "inv_item_1", itemName: "بلوك زركونيا متعدد الطبقات 98مم",
    type: "addition", quantity: 20, previousStock: 6, newStock: 26,
    reason: "توريد من شركة إيفوكلار - فاتورة شراء PO-2026-015", performedBy: "user_1", performedByName: "مدير النظام",
    createdAt: "2026-02-05T10:00:00Z",
  },
  {
    id: "itx_6", itemId: "inv_item_8", itemName: "مادة الطبعة",
    type: "deduction", quantity: 2, previousStock: 5, newStock: 3,
    reason: "استخدام يومي - قسم الاستقبال", performedBy: "user_2", performedByName: "سارة أحمد",
    createdAt: "2026-02-13T08:30:00Z",
  },
  {
    id: "itx_7", itemId: "inv_item_10", itemName: "قاعدة تيتانيوم",
    type: "deduction", quantity: 1, previousStock: 21, newStock: 20,
    caseId: "case_3", caseNumber: "L-2026-00003",
    reason: "استخدام قاعدة تيتانيوم للزرعة - حالة L-2026-00003", performedBy: "user_4", performedByName: "أحمد حسن",
    createdAt: "2026-02-09T12:00:00Z",
  },
  {
    id: "itx_8", itemId: "inv_item_15", itemName: "جبس أسنان نوع IV",
    type: "deduction", quantity: 2, previousStock: 17, newStock: 15,
    reason: "صب نماذج عمل - 4 حالات", performedBy: "user_2", performedByName: "سارة أحمد",
    createdAt: "2026-02-12T09:00:00Z",
  },
  {
    id: "itx_9", itemId: "inv_item_14", itemName: "معجون تلميع (جليز)",
    type: "deduction", quantity: 1, previousStock: 7, newStock: 6,
    reason: "تلميع نهائي - حالات زركونيا", performedBy: "user_5", performedByName: "فاطمة نور",
    createdAt: "2026-02-13T16:00:00Z",
  },
  {
    id: "itx_10", itemId: "inv_item_3", itemName: "قوالب IPS e.max ضغط شفاف",
    type: "addition", quantity: 10, previousStock: 2, newStock: 12,
    reason: "توريد من Ivoclar Vivadent - طلب طوارئ", performedBy: "user_1", performedByName: "مدير النظام",
    createdAt: "2026-02-07T11:00:00Z",
  },
];

export const pricingRules: PricingRule[] = [
  { id: "pr_1", workType: "zirconia", basePricePerUnit: 600, materialCostMultiplier: 1.2, laborCostPerHour: 50, profitMarginPercent: 30, rushSurchargePercent: 25, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_2", workType: "pfm", basePricePerUnit: 400, materialCostMultiplier: 1.1, laborCostPerHour: 45, profitMarginPercent: 25, rushSurchargePercent: 20, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_3", workType: "emax", basePricePerUnit: 700, materialCostMultiplier: 1.3, laborCostPerHour: 55, profitMarginPercent: 35, rushSurchargePercent: 30, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_4", workType: "implant", basePricePerUnit: 900, materialCostMultiplier: 1.4, laborCostPerHour: 60, profitMarginPercent: 35, rushSurchargePercent: 25, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_5", workType: "ortho", basePricePerUnit: 500, materialCostMultiplier: 1.0, laborCostPerHour: 40, profitMarginPercent: 20, rushSurchargePercent: 15, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_6", workType: "removable", basePricePerUnit: 800, materialCostMultiplier: 1.1, laborCostPerHour: 50, profitMarginPercent: 25, rushSurchargePercent: 20, updatedAt: "2026-01-01T00:00:00Z" },
  { id: "pr_7", workType: "composite", basePricePerUnit: 350, materialCostMultiplier: 1.0, laborCostPerHour: 35, profitMarginPercent: 20, rushSurchargePercent: 15, updatedAt: "2026-01-01T00:00:00Z" },
];

export const invoices: Invoice[] = [
  {
    id: "inv_1", invoiceNumber: "INV-2026-00001",
    caseId: "case_5", caseNumber: "L-2026-00005",
    doctorId: "doc_4", doctorName: "د. ليلى حمدي", patientName: "يوسف خالد",
    items: [
      { id: "ii_1", description: "Full Upper Denture - Acrylic", descriptionAr: "طقم علوي كامل - أكريليك", quantity: 1, unitPrice: 3500, total: 3500 },
    ],
    subtotal: 3500, materialsCost: 450, laborCost: 800, rushSurcharge: 0,
    discount: 0, tax: 0, totalAmount: 3500,
    status: "issued", paymentStatus: "partial", paidAmount: 2000, remainingAmount: 1500,
    payments: [
      { id: "pay_1", invoiceId: "inv_1", amount: 2000, method: "cash", paidDate: "2026-02-13T00:00:00Z", receivedBy: "user_7", notes: "دفعة أولى" },
    ],
    issuedDate: "2026-02-13T00:00:00Z", dueDate: "2026-02-28T00:00:00Z", createdBy: "user_7",
  },
  {
    id: "inv_2", invoiceNumber: "INV-2026-00002",
    caseId: "case_4", caseNumber: "L-2026-00004",
    doctorId: "doc_1", doctorName: "د. أحمد السيد", patientName: "خالد مصطفى",
    items: [
      { id: "ii_2", description: "ZIRCONIA - Teeth: 14,15,16", descriptionAr: "زركونيا - أسنان: 14,15,16", quantity: 3, unitPrice: 750, total: 2250 },
    ],
    subtotal: 3200, materialsCost: 400, laborCost: 550, rushSurcharge: 0,
    discount: 200, tax: 0, totalAmount: 3000,
    status: "paid", paymentStatus: "paid", paidAmount: 3000, remainingAmount: 0,
    payments: [
      { id: "pay_2", invoiceId: "inv_2", amount: 3000, method: "bank_transfer", reference: "TRF-20260210", paidDate: "2026-02-10T00:00:00Z", receivedBy: "user_7" },
    ],
    issuedDate: "2026-02-08T00:00:00Z", dueDate: "2026-03-08T00:00:00Z", createdBy: "user_7",
  },
  {
    id: "inv_3", invoiceNumber: "INV-2026-00003",
    caseId: "case_3", caseNumber: "L-2026-00003",
    doctorId: "doc_2", doctorName: "د. منى خليل", patientName: "حسن عمر",
    items: [
      { id: "ii_3", description: "EMAX - Teeth: 21,22", descriptionAr: "إي ماكس - أسنان: 21,22", quantity: 2, unitPrice: 900, total: 1800 },
    ],
    subtotal: 2800, materialsCost: 500, laborCost: 500, rushSurcharge: 360,
    discount: 0, tax: 0, totalAmount: 2800,
    status: "issued", paymentStatus: "unpaid", paidAmount: 0, remainingAmount: 2800,
    payments: [],
    issuedDate: "2026-01-25T00:00:00Z", dueDate: "2026-02-10T00:00:00Z", createdBy: "user_7",
  },
  {
    id: "inv_4", invoiceNumber: "INV-2026-00004",
    caseId: "case_2", caseNumber: "L-2026-00002",
    doctorId: "doc_1", doctorName: "د. أحمد السيد", patientName: "فاطمة علي",
    items: [
      { id: "ii_4", description: "PFM - Teeth: 36,37", descriptionAr: "PFM - أسنان: 36,37", quantity: 2, unitPrice: 600, total: 1200 },
    ],
    subtotal: 1800, materialsCost: 300, laborCost: 300, rushSurcharge: 0,
    discount: 100, tax: 0, totalAmount: 1700,
    status: "paid", paymentStatus: "paid", paidAmount: 1700, remainingAmount: 0,
    payments: [
      { id: "pay_3", invoiceId: "inv_4", amount: 1000, method: "cash", paidDate: "2026-01-20T00:00:00Z", receivedBy: "user_7", notes: "دفعة أولى" },
      { id: "pay_4", invoiceId: "inv_4", amount: 700, method: "cash", paidDate: "2026-02-01T00:00:00Z", receivedBy: "user_7", notes: "دفعة أخيرة" },
    ],
    issuedDate: "2026-01-18T00:00:00Z", dueDate: "2026-02-18T00:00:00Z", createdBy: "user_7",
  },
  {
    id: "inv_5", invoiceNumber: "INV-2026-00005",
    caseId: "case_1", caseNumber: "L-2026-00001",
    doctorId: "doc_3", doctorName: "د. خالد يوسف", patientName: "أحمد محمود",
    items: [
      { id: "ii_5", description: "IMPLANT - Teeth: 46", descriptionAr: "زراعة - أسنان: 46", quantity: 1, unitPrice: 2500, total: 2500 },
    ],
    subtotal: 3800, materialsCost: 700, laborCost: 600, rushSurcharge: 500,
    discount: 0, tax: 0, totalAmount: 3800,
    status: "issued", paymentStatus: "partial", paidAmount: 1500, remainingAmount: 2300,
    payments: [
      { id: "pay_5", invoiceId: "inv_5", amount: 1500, method: "check", reference: "CHK-5544", paidDate: "2026-02-05T00:00:00Z", receivedBy: "user_7" },
    ],
    issuedDate: "2026-02-03T00:00:00Z", dueDate: "2026-03-03T00:00:00Z", createdBy: "user_7",
  },
];

export const deliveries: Delivery[] = [];

// ── Expenses ──────────────────────────────────────
import type { Expense } from "@shared/api";

export const expenses: Expense[] = [
  { id: "exp_1", category: "materials", description: "شراء بلوكات زركونيا - Ivoclar", amount: 12500, date: "2026-02-01T00:00:00Z", vendor: "شركة إيفوكلار", reference: "PO-2026-001", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-01T00:00:00Z" },
  { id: "exp_2", category: "equipment", description: "صيانة ماكينة Roland DWX-52D", amount: 3500, date: "2026-02-03T00:00:00Z", vendor: "رولاند للصيانة", reference: "SVC-2026-011", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-03T00:00:00Z" },
  { id: "exp_3", category: "rent", description: "إيجار المعمل - فبراير 2026", amount: 8000, date: "2026-02-01T00:00:00Z", vendor: "شركة الإسكان", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-01T00:00:00Z" },
  { id: "exp_4", category: "utilities", description: "فاتورة كهرباء - يناير", amount: 2200, date: "2026-02-05T00:00:00Z", vendor: "شركة الكهرباء", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-05T00:00:00Z" },
  { id: "exp_5", category: "salaries", description: "رواتب الفنيين - يناير 2026", amount: 35000, date: "2026-01-31T00:00:00Z", vendor: "", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-01-31T00:00:00Z" },
  { id: "exp_6", category: "materials", description: "مواد طبعة + سيراميك Vita", amount: 4800, date: "2026-02-08T00:00:00Z", vendor: "شركة فيتا", reference: "PO-2026-005", createdBy: "user_7", createdByName: "أيمن مصطفى", createdAt: "2026-02-08T00:00:00Z" },
  { id: "exp_7", category: "transport", description: "مصاريف نقل وتوصيل - أسبوع 1", amount: 750, date: "2026-02-07T00:00:00Z", createdBy: "user_8", createdByName: "كريم سعيد", createdAt: "2026-02-07T00:00:00Z" },
  { id: "exp_8", category: "maintenance", description: "صيانة فرن Programat P710", amount: 1800, date: "2026-02-10T00:00:00Z", vendor: "شركة إيفوكلار", createdBy: "user_1", createdByName: "مدير النظام", createdAt: "2026-02-10T00:00:00Z" },
];

// ── Suppliers ──────────────────────────────────────

export const suppliers: Supplier[] = [
  {
    id: "sup_1", name: "Ivoclar Vivadent", nameAr: "إيفوكلار فيفادنت",
    contactPerson: "Mohamed Hassan", contactPersonAr: "محمد حسن",
    phone: "01001234567", phone2: "0222334455", email: "orders@ivoclar-eg.com",
    website: "www.ivoclar.com", address: "10 El-Thawra St, Heliopolis", addressAr: "10 شارع الثورة، مصر الجديدة",
    city: "القاهرة", country: "مصر", taxNumber: "TAX-IVC-2025",
    paymentTerms: "Net 30", notes: "المورد الرئيسي لبلوكات الزركونيا وقوالب e.max",
    status: "active", categories: ["blocks", "raw_materials"],
    totalPurchases: 85000, totalPaid: 72500, balance: 12500,
    rating: 5, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "sup_2", name: "VITA Zahnfabrik", nameAr: "فيتا لصناعة الأسنان",
    contactPerson: "Sara Ali", contactPersonAr: "سارة علي",
    phone: "01112345678", email: "egypt@vita-zahnfabrik.com",
    website: "www.vita-zahnfabrik.com", addressAr: "المعادي، القاهرة",
    city: "القاهرة", country: "مصر",
    paymentTerms: "Net 15", notes: "مورد السيراميك والألوان",
    status: "active", categories: ["raw_materials"],
    totalPurchases: 32000, totalPaid: 32000, balance: 0,
    rating: 4, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-02-08T00:00:00Z",
  },
  {
    id: "sup_3", name: "Roland DG", nameAr: "رولاند للتقنية",
    contactPerson: "Ahmed Farid", contactPersonAr: "أحمد فريد",
    phone: "01223456789", email: "support@roland-eg.com",
    website: "www.dgshape.com", addressAr: "المهندسين، الجيزة",
    city: "الجيزة", country: "مصر", taxNumber: "TAX-RLD-2025",
    paymentTerms: "COD", notes: "مورد فريزات التفريز وقطع غيار الماكينات",
    status: "active", categories: ["tools", "consumables"],
    totalPurchases: 18500, totalPaid: 18500, balance: 0,
    rating: 4, createdAt: "2025-07-01T00:00:00Z", updatedAt: "2026-02-03T00:00:00Z",
  },
  {
    id: "sup_4", name: "3M Dental", nameAr: "ثري إم للأسنان",
    contactPerson: "Laila Mahmoud", contactPersonAr: "ليلى محمود",
    phone: "01098765432", email: "dental@3m-eg.com",
    website: "www.3m.com", addressAr: "مدينة نصر، القاهرة",
    city: "القاهرة", country: "مصر",
    paymentTerms: "Net 30",
    status: "active", categories: ["consumables", "raw_materials"],
    totalPurchases: 15200, totalPaid: 12000, balance: 3200,
    rating: 5, createdAt: "2025-08-01T00:00:00Z", updatedAt: "2026-02-05T00:00:00Z",
  },
  {
    id: "sup_5", name: "Straumann", nameAr: "ستروماون",
    contactPerson: "Khaled Yousef", contactPersonAr: "خالد يوسف",
    phone: "01156789012", email: "eg-orders@straumann.com",
    website: "www.straumann.com", addressAr: "الدقي، الجيزة",
    city: "الجيزة", country: "سويسرا",
    paymentTerms: "Net 45", notes: "مورد قواعد التيتانيوم ومستلزمات الزراعة",
    status: "active", categories: ["raw_materials"],
    totalPurchases: 42000, totalPaid: 35000, balance: 7000,
    rating: 5, createdAt: "2025-06-01T00:00:00Z", updatedAt: "2026-02-09T00:00:00Z",
  },
  {
    id: "sup_6", name: "BEGO", nameAr: "بيجو",
    contactPerson: "Hany Adel", contactPersonAr: "هاني عادل",
    phone: "01087654321", email: "info@bego-eg.com",
    addressAr: "شبرا، القاهرة", city: "القاهرة", country: "ألمانيا",
    paymentTerms: "Net 30",
    status: "active", categories: ["raw_materials"],
    totalPurchases: 22000, totalPaid: 22000, balance: 0,
    rating: 3, createdAt: "2025-09-01T00:00:00Z", updatedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "sup_7", name: "Zhermack", nameAr: "زيرماك",
    contactPerson: "Omar Samir", contactPersonAr: "عمر سمير",
    phone: "01234567890",
    addressAr: "التجمع الخامس، القاهرة", city: "القاهرة", country: "إيطاليا",
    paymentTerms: "COD",
    status: "active", categories: ["raw_materials", "consumables"],
    totalPurchases: 8500, totalPaid: 8500, balance: 0,
    rating: 4, createdAt: "2025-10-01T00:00:00Z", updatedAt: "2026-01-20T00:00:00Z",
  },
];

export let poCounter = 6;
export function generatePONumber() { return `PO-2026-${String(poCounter++).padStart(5, "0")}`; }

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "po_1", poNumber: "PO-2026-00001",
    supplierId: "sup_1", supplierName: "Ivoclar Vivadent", supplierNameAr: "إيفوكلار فيفادنت",
    items: [
      { id: "poi_1", inventoryItemId: "inv_item_1", description: "Zirconia Multilayer Block 98mm", descriptionAr: "بلوك زركونيا متعدد الطبقات 98مم", sku: "ZRC-ML-98", quantity: 20, unitPrice: 320, total: 6400 },
      { id: "poi_2", inventoryItemId: "inv_item_2", description: "Zirconia HT Block 98mm", descriptionAr: "بلوك زركونيا شفاف 98مم", sku: "ZRC-HT-98", quantity: 10, unitPrice: 370, total: 3700 },
    ],
    subtotal: 10100, tax: 0, discount: 500, totalAmount: 9600,
    paidAmount: 9600, remainingAmount: 0,
    status: "received",
    payments: [
      { id: "spp_1", purchaseOrderId: "po_1", amount: 5000, method: "bank_transfer", reference: "TRF-SUP-001", paidDate: "2026-01-15T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" },
      { id: "spp_2", purchaseOrderId: "po_1", amount: 4600, method: "bank_transfer", reference: "TRF-SUP-002", paidDate: "2026-02-01T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" },
    ],
    orderDate: "2026-01-10T00:00:00Z", expectedDelivery: "2026-01-20T00:00:00Z", receivedDate: "2026-01-18T00:00:00Z",
    notes: "طلب شهري دوري", createdBy: "user_1", createdByName: "مدير النظام",
    createdAt: "2026-01-10T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "po_2", poNumber: "PO-2026-00002",
    supplierId: "sup_1", supplierName: "Ivoclar Vivadent", supplierNameAr: "إيفوكلار فيفادنت",
    items: [
      { id: "poi_3", inventoryItemId: "inv_item_3", description: "IPS e.max Press Ingots LT", descriptionAr: "قوالب IPS e.max ضغط شفاف", sku: "EMAX-LT", quantity: 10, unitPrice: 250, total: 2500 },
    ],
    subtotal: 2500, tax: 0, discount: 0, totalAmount: 2500,
    paidAmount: 2500, remainingAmount: 0,
    status: "received",
    payments: [
      { id: "spp_3", purchaseOrderId: "po_2", amount: 2500, method: "cash", paidDate: "2026-02-07T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" },
    ],
    orderDate: "2026-02-05T00:00:00Z", expectedDelivery: "2026-02-10T00:00:00Z", receivedDate: "2026-02-07T00:00:00Z",
    notes: "طلب طوارئ - نفاد المخزون", createdBy: "user_1", createdByName: "مدير النظام",
    createdAt: "2026-02-05T00:00:00Z", updatedAt: "2026-02-07T00:00:00Z",
  },
  {
    id: "po_3", poNumber: "PO-2026-00003",
    supplierId: "sup_5", supplierName: "Straumann", supplierNameAr: "ستروماون",
    items: [
      { id: "poi_4", inventoryItemId: "inv_item_10", description: "Ti-Base Abutment", descriptionAr: "قاعدة تيتانيوم", sku: "TI-BASE-01", quantity: 15, unitPrice: 160, total: 2400 },
    ],
    subtotal: 2400, tax: 0, discount: 0, totalAmount: 2400,
    paidAmount: 0, remainingAmount: 2400,
    status: "sent",
    payments: [],
    orderDate: "2026-02-10T00:00:00Z", expectedDelivery: "2026-02-25T00:00:00Z",
    createdBy: "user_1", createdByName: "مدير النظام",
    createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "po_4", poNumber: "PO-2026-00004",
    supplierId: "sup_4", supplierName: "3M Dental", supplierNameAr: "ثري إم للأسنان",
    items: [
      { id: "poi_5", description: "Impression Material Cartridges", descriptionAr: "كارتريدجات مادة الطبعة", sku: "IMP-MAT-01", quantity: 20, unitPrice: 38, total: 760 },
      { id: "poi_6", description: "Resin Cement Dual Cure Syringes", descriptionAr: "حقن أسمنت ريزن ثنائي التصلب", sku: "RES-CEM-DC", quantity: 10, unitPrice: 100, total: 1000 },
    ],
    subtotal: 1760, tax: 0, discount: 160, totalAmount: 1600,
    paidAmount: 1600, remainingAmount: 0,
    status: "received",
    payments: [
      { id: "spp_4", purchaseOrderId: "po_4", amount: 1600, method: "cash", paidDate: "2026-02-08T00:00:00Z", createdBy: "user_7", createdByName: "أيمن مصطفى" },
    ],
    orderDate: "2026-02-06T00:00:00Z", receivedDate: "2026-02-08T00:00:00Z",
    createdBy: "user_7", createdByName: "أيمن مصطفى",
    createdAt: "2026-02-06T00:00:00Z", updatedAt: "2026-02-08T00:00:00Z",
  },
  {
    id: "po_5", poNumber: "PO-2026-00005",
    supplierId: "sup_2", supplierName: "VITA Zahnfabrik", supplierNameAr: "فيتا لصناعة الأسنان",
    items: [
      { id: "poi_7", inventoryItemId: "inv_item_5", description: "Ceramic Powder A2", descriptionAr: "بودرة سيراميك A2", sku: "CER-A2", quantity: 200, unitPrice: 1.5, total: 300 },
      { id: "poi_8", inventoryItemId: "inv_item_13", description: "Vita VM13 Ceramic Powder B1", descriptionAr: "بودرة سيراميك فيتا B1", sku: "VITA-VM13-B1", quantity: 100, unitPrice: 1.8, total: 180 },
    ],
    subtotal: 480, tax: 0, discount: 0, totalAmount: 480,
    paidAmount: 480, remainingAmount: 0,
    status: "received",
    payments: [
      { id: "spp_5", purchaseOrderId: "po_5", amount: 480, method: "cash", paidDate: "2026-02-08T00:00:00Z", createdBy: "user_1", createdByName: "مدير النظام" },
    ],
    orderDate: "2026-02-07T00:00:00Z", receivedDate: "2026-02-08T00:00:00Z",
    createdBy: "user_1", createdByName: "مدير النظام",
    createdAt: "2026-02-07T00:00:00Z", updatedAt: "2026-02-08T00:00:00Z",
  },
];

export const auditLogs: AuditLog[] = [
  { id: "log_1", userId: "user_2", userName: "سارة أحمد", action: "CREATE_CASE", entity: "case", entityId: "case_1", details: "Created case L-2026-00001", timestamp: "2026-02-10T09:00:00Z" },
  { id: "log_2", userId: "user_2", userName: "سارة أحمد", action: "CREATE_CASE", entity: "case", entityId: "case_2", details: "Created case L-2026-00002", timestamp: "2026-02-11T10:00:00Z" },
  { id: "log_3", userId: "user_3", userName: "محمد علي", action: "TRANSFER_CASE", entity: "case", entityId: "case_1", details: "Transferred to CAM", timestamp: "2026-02-11T14:00:00Z" },
];
