/**
 * Database Repository Layer (Hybrid Document Store)
 * ===================================================
 * Each entity is stored as a JSONB blob in the `data` column,
 * with indexed key columns for fast queries.
 * Loading returns the full entity from `data`, saving persists both.
 */

import { db } from "./index";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

// ══════════════════════════════════════════════
//  GENERIC HELPERS
// ══════════════════════════════════════════════

function extractData<T>(rows: { data: unknown }[]): T[] {
  return rows.map((r) => r.data as T);
}

// ══════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════

export async function loadUsers<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.users);
  return extractData<T>(rows);
}

export async function saveUser(item: any) {
  await db.insert(schema.users).values({
    id: item.id,
    email: item.email || "",
    role: item.role || "receptionist",
    isActive: String(item.active ?? true),
    data: item,
  }).onConflictDoUpdate({
    target: schema.users.id,
    set: { email: item.email || "", role: item.role, isActive: String(item.active ?? true), data: item },
  });
}

export async function deleteUser(id: string) {
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

// ══════════════════════════════════════════════
//  DOCTORS
// ══════════════════════════════════════════════

export async function loadDoctors<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.doctors);
  return extractData<T>(rows);
}

export async function saveDoctor(item: any) {
  await db.insert(schema.doctors).values({
    id: item.id,
    nameAr: item.nameAr || item.name || "",
    phone: item.phone || "",
    status: item.status || "active",
    data: item,
  }).onConflictDoUpdate({
    target: schema.doctors.id,
    set: { nameAr: item.nameAr || item.name || "", phone: item.phone, status: item.status || "active", data: item },
  });
}

export async function deleteDoctor(id: string) {
  await db.delete(schema.doctors).where(eq(schema.doctors.id, id));
}

// ══════════════════════════════════════════════
//  PATIENTS
// ══════════════════════════════════════════════

export async function loadPatients<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.patients);
  return extractData<T>(rows);
}

export async function savePatient(item: any) {
  await db.insert(schema.patients).values({
    id: item.id,
    doctorId: item.doctorId,
    data: item,
  }).onConflictDoUpdate({
    target: schema.patients.id,
    set: { doctorId: item.doctorId, data: item },
  });
}

// ══════════════════════════════════════════════
//  CASES
// ══════════════════════════════════════════════

export async function loadCases<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.cases);
  return extractData<T>(rows);
}

export async function saveCase(item: any) {
  await db.insert(schema.cases).values({
    id: item.id,
    caseNumber: item.caseNumber || "",
    currentStatus: item.currentStatus || "reception",
    doctorId: item.doctorId || "",
    workType: item.workType || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.cases.id,
    set: {
      caseNumber: item.caseNumber || "",
      currentStatus: item.currentStatus || "reception",
      doctorId: item.doctorId || "",
      workType: item.workType || "",
      data: item,
    },
  });
}

export async function deleteCase(id: string) {
  await db.delete(schema.cases).where(eq(schema.cases.id, id));
}

// ══════════════════════════════════════════════
//  INVENTORY ITEMS
// ══════════════════════════════════════════════

export async function loadInventoryItems<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.inventoryItems);
  return extractData<T>(rows);
}

export async function saveInventoryItem(item: any) {
  await db.insert(schema.inventoryItems).values({
    id: item.id,
    category: item.category || "",
    sku: item.sku || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.inventoryItems.id,
    set: { category: item.category || "", sku: item.sku || "", data: item },
  });
}

export async function deleteInventoryItem(id: string) {
  await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
}

// ══════════════════════════════════════════════
//  INVENTORY TRANSACTIONS
// ══════════════════════════════════════════════

export async function loadInventoryTransactions<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.inventoryTransactions);
  return extractData<T>(rows);
}

export async function saveInventoryTransaction(item: any) {
  await db.insert(schema.inventoryTransactions).values({
    id: item.id,
    itemId: item.itemId || "",
    type: item.type || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.inventoryTransactions.id,
    set: { itemId: item.itemId || "", type: item.type || "", data: item },
  });
}

// ══════════════════════════════════════════════
//  INVOICES
// ══════════════════════════════════════════════

export async function loadInvoices<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.invoices);
  return extractData<T>(rows);
}

export async function saveInvoice(item: any) {
  await db.insert(schema.invoices).values({
    id: item.id,
    invoiceNumber: item.invoiceNumber || "",
    doctorId: item.doctorId || "",
    status: item.status || "issued",
    paymentStatus: item.paymentStatus || "unpaid",
    data: item,
  }).onConflictDoUpdate({
    target: schema.invoices.id,
    set: {
      invoiceNumber: item.invoiceNumber || "",
      doctorId: item.doctorId || "",
      status: item.status || "issued",
      paymentStatus: item.paymentStatus || "unpaid",
      data: item,
    },
  });
}

// ══════════════════════════════════════════════
//  EXPENSES
// ══════════════════════════════════════════════

export async function loadExpenses<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.expenses);
  return extractData<T>(rows);
}

export async function saveExpense(item: any) {
  await db.insert(schema.expenses).values({
    id: item.id,
    category: item.category || "",
    date: item.date || item.createdAt || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.expenses.id,
    set: { category: item.category || "", date: item.date || item.createdAt || "", data: item },
  });
}

export async function deleteExpense(id: string) {
  await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
}

// ══════════════════════════════════════════════
//  SUPPLIERS
// ══════════════════════════════════════════════

export async function loadSuppliers<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.suppliers);
  return extractData<T>(rows);
}

export async function saveSupplier(item: any) {
  await db.insert(schema.suppliers).values({
    id: item.id,
    status: item.status || "active",
    data: item,
  }).onConflictDoUpdate({
    target: schema.suppliers.id,
    set: { status: item.status || "active", data: item },
  });
}

export async function deleteSupplierDB(id: string) {
  await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
}

// ══════════════════════════════════════════════
//  PURCHASE ORDERS
// ══════════════════════════════════════════════

export async function loadPurchaseOrders<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.purchaseOrders);
  return extractData<T>(rows);
}

export async function savePurchaseOrder(item: any) {
  await db.insert(schema.purchaseOrders).values({
    id: item.id,
    poNumber: item.poNumber || "",
    supplierId: item.supplierId || "",
    status: item.status || "draft",
    data: item,
  }).onConflictDoUpdate({
    target: schema.purchaseOrders.id,
    set: {
      poNumber: item.poNumber || "",
      supplierId: item.supplierId || "",
      status: item.status || "draft",
      data: item,
    },
  });
}

// ══════════════════════════════════════════════
//  PRICING RULES
// ══════════════════════════════════════════════

export async function loadPricingRules<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.pricingRules);
  return extractData<T>(rows);
}

export async function savePricingRule(item: any) {
  await db.insert(schema.pricingRules).values({
    id: item.id,
    workType: item.workType || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.pricingRules.id,
    set: { workType: item.workType || "", data: item },
  });
}

// ══════════════════════════════════════════════
//  AUDIT LOGS
// ══════════════════════════════════════════════

export async function loadAuditLogs<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.auditLogs);
  return extractData<T>(rows);
}

export async function saveAuditLog(item: any) {
  await db.insert(schema.auditLogs).values({
    id: item.id,
    action: item.action || "",
    timestamp: item.timestamp || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.auditLogs.id,
    set: { action: item.action || "", timestamp: item.timestamp || "", data: item },
  });
}

// ══════════════════════════════════════════════
//  DELIVERIES
// ══════════════════════════════════════════════

export async function loadDeliveries<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.deliveries);
  return extractData<T>(rows);
}

export async function saveDelivery(item: any) {
  await db.insert(schema.deliveries).values({
    id: item.id,
    caseId: item.caseId || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.deliveries.id,
    set: { caseId: item.caseId || "", data: item },
  });
}

// ══════════════════════════════════════════════
//  BARCODE LABELS
// ══════════════════════════════════════════════

export async function loadBarcodeLabels<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.barcodeLabels);
  return extractData<T>(rows);
}

export async function saveBarcodeLabel(item: any) {
  await db.insert(schema.barcodeLabels).values({
    id: item.id,
    barcodeValue: item.barcodeValue || "",
    caseId: item.caseId || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.barcodeLabels.id,
    set: { barcodeValue: item.barcodeValue || "", caseId: item.caseId || "", data: item },
  });
}

export async function deleteBarcodeLabel(id: string) {
  await db.delete(schema.barcodeLabels).where(eq(schema.barcodeLabels.id, id));
}

// ══════════════════════════════════════════════
//  BARCODE LOGS
// ══════════════════════════════════════════════

export async function loadBarcodeLogs<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.barcodeLogs);
  return extractData<T>(rows);
}

export async function saveBarcodeLog(item: any) {
  await db.insert(schema.barcodeLogs).values({
    id: item.id,
    action: item.action || "",
    barcodeValue: item.barcodeValue || "",
    data: item,
  });
}

// ══════════════════════════════════════════════
//  ATTENDANCE
// ══════════════════════════════════════════════

export async function loadAttendanceRecords<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.attendanceRecords);
  return extractData<T>(rows);
}

export async function saveAttendanceRecord(item: any) {
  await db.insert(schema.attendanceRecords).values({
    id: item.id,
    userId: item.userId || "",
    date: item.date || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.attendanceRecords.id,
    set: { userId: item.userId || "", date: item.date || "", data: item },
  });
}

export async function deleteAttendanceRecord(id: string) {
  await db.delete(schema.attendanceRecords).where(eq(schema.attendanceRecords.id, id));
}

// ══════════════════════════════════════════════
//  PAYROLL
// ══════════════════════════════════════════════

export async function loadPayrollPeriods<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.payrollPeriods);
  return extractData<T>(rows);
}

export async function savePayrollPeriod(item: any) {
  await db.insert(schema.payrollPeriods).values({
    id: item.id,
    year: item.year || 0,
    month: item.month || 0,
    data: item,
  }).onConflictDoUpdate({
    target: schema.payrollPeriods.id,
    set: { year: item.year || 0, month: item.month || 0, data: item },
  });
}

export async function loadPayrollEntries<T>(): Promise<T[]> {
  const rows = await db.select().from(schema.payrollEntries);
  return extractData<T>(rows);
}

export async function savePayrollEntry(item: any) {
  await db.insert(schema.payrollEntries).values({
    id: item.id,
    periodId: item.periodId || "",
    userId: item.userId || "",
    data: item,
  }).onConflictDoUpdate({
    target: schema.payrollEntries.id,
    set: { periodId: item.periodId || "", userId: item.userId || "", data: item },
  });
}

// ══════════════════════════════════════════════
//  COUNTERS
// ══════════════════════════════════════════════

export async function loadCounters(): Promise<Record<string, number>> {
  const rows = await db.select().from(schema.counters);
  const result: Record<string, number> = {};
  rows.forEach((r) => { result[r.name] = r.value; });
  return result;
}

export async function saveCounter(name: string, value: number) {
  await db.insert(schema.counters).values({ name, value })
    .onConflictDoUpdate({ target: schema.counters.name, set: { value } });
}
