/**
 * Database Schema - Drizzle ORM (Hybrid Document + Relational)
 * =============================================================
 * Each table stores the full entity as JSONB in `data` column
 * with key indexed columns for fast queries.
 * This preserves 100% of entity data while enabling SQL queries.
 */

import { pgTable, text, real, integer, jsonb, index } from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  isActive: text("is_active").default("true"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_users_email").on(t.email),
  index("idx_users_role").on(t.role),
]);

// ── Doctors ────────────────────────────────────
export const doctors = pgTable("doctors", {
  id: text("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  phone: text("phone"),
  status: text("status").default("active"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_doctors_status").on(t.status),
]);

// ── Patients ───────────────────────────────────
export const patients = pgTable("patients", {
  id: text("id").primaryKey(),
  doctorId: text("doctor_id"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_patients_doctor").on(t.doctorId),
]);

// ── Cases ──────────────────────────────────────
export const cases = pgTable("cases", {
  id: text("id").primaryKey(),
  caseNumber: text("case_number").notNull(),
  currentStatus: text("current_status").notNull(),
  doctorId: text("doctor_id").notNull(),
  workType: text("work_type").notNull(),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_cases_number").on(t.caseNumber),
  index("idx_cases_status").on(t.currentStatus),
  index("idx_cases_doctor").on(t.doctorId),
  index("idx_cases_work").on(t.workType),
]);

// ── Inventory Items ────────────────────────────
export const inventoryItems = pgTable("inventory_items", {
  id: text("id").primaryKey(),
  category: text("category"),
  sku: text("sku"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_inv_category").on(t.category),
  index("idx_inv_sku").on(t.sku),
]);

// ── Inventory Transactions ─────────────────────
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: text("id").primaryKey(),
  itemId: text("item_id"),
  type: text("type"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_invtx_item").on(t.itemId),
  index("idx_invtx_type").on(t.type),
]);

// ── Invoices ───────────────────────────────────
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  doctorId: text("doctor_id"),
  status: text("status"),
  paymentStatus: text("payment_status"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_inv_number").on(t.invoiceNumber),
  index("idx_inv_doctor").on(t.doctorId),
  index("idx_inv_status").on(t.status),
  index("idx_inv_pay").on(t.paymentStatus),
]);

// ── Expenses ───────────────────────────────────
export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  category: text("category"),
  date: text("date"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_exp_category").on(t.category),
  index("idx_exp_date").on(t.date),
]);

// ── Suppliers ──────────────────────────────────
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  status: text("status").default("active"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_sup_status").on(t.status),
]);

// ── Purchase Orders ────────────────────────────
export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  poNumber: text("po_number").notNull(),
  supplierId: text("supplier_id"),
  status: text("status"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_po_number").on(t.poNumber),
  index("idx_po_supplier").on(t.supplierId),
  index("idx_po_status").on(t.status),
]);

// ── Pricing Rules ──────────────────────────────
export const pricingRules = pgTable("pricing_rules", {
  id: text("id").primaryKey(),
  workType: text("work_type").notNull(),
  data: jsonb("data").notNull(),
});

// ── Audit Logs ─────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action"),
  timestamp: text("timestamp"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_audit_action").on(t.action),
  index("idx_audit_ts").on(t.timestamp),
]);

// ── Deliveries ─────────────────────────────────
export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),
  caseId: text("case_id"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_del_case").on(t.caseId),
]);

// ── Barcode Labels (ملصقات الباركود المحفوظة) ───────
export const barcodeLabels = pgTable("barcode_labels", {
  id: text("id").primaryKey(),
  barcodeValue: text("barcode_value").notNull(),
  caseId: text("case_id"),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_barcode_value").on(t.barcodeValue),
  index("idx_barcode_case").on(t.caseId),
]);

// ── Barcode Logs (سجل عمليات الباركود) ──────────────
export const barcodeLogs = pgTable("barcode_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  barcodeValue: text("barcode_value").notNull(),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_barcode_log_action").on(t.action),
  index("idx_barcode_log_value").on(t.barcodeValue),
]);

// ── Attendance Records ───────────────────────
export const attendanceRecords = pgTable("attendance_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_att_user").on(t.userId),
  index("idx_att_date").on(t.date),
]);

// ── Payroll Periods ──────────────────────────
export const payrollPeriods = pgTable("payroll_periods", {
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_payroll_ym").on(t.year, t.month),
]);

// ── Payroll Entries ──────────────────────────
export const payrollEntries = pgTable("payroll_entries", {
  id: text("id").primaryKey(),
  periodId: text("period_id").notNull(),
  userId: text("user_id").notNull(),
  data: jsonb("data").notNull(),
}, (t) => [
  index("idx_payentry_period").on(t.periodId),
  index("idx_payentry_user").on(t.userId),
]);

// ── App Counters ──────────────────────────────
export const counters = pgTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").default(0).notNull(),
});
