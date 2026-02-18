/**
 * Luster Dental Lab ERP - Express Server
 * ========================================
 * Enterprise-grade REST API with modular routing,
 * authentication, RBAC, and audit logging.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";

// Database initialization
import { initializeStore } from "./data/store";

// Middleware
import { authenticate } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

// Route handlers
import { handleDemo } from "./routes/demo";
import { login, getMe, getUsers, getUser, createUser, updateUser, toggleUserActive } from "./routes/auth";
import { getDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor, getPatients, createPatient, updatePatient } from "./routes/doctors";
import {
  getCases, getCase, createCase, updateCase, deleteCase,
  transferCase, updateCADData, updateCAMData, updateFinishingData, updateRemovableData, updateQCData,
} from "./routes/cases";
import {
  getInventory, getInventoryItem, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  deductStock, restockItem, getTransactions, getLowStockItems,
  getCategorySummary, getConsumptionReport, getSupplierSummary, getExpiringItems, getStockLevels,
} from "./routes/inventory";
import {
  getInvoices, getInvoice, createInvoice, previewInvoice, recordPayment, cancelInvoice,
  getPricingRules, updatePricingRule, getDoctorDebts,
  // Expenses
  getExpenses, createExpense, updateExpense, deleteExpense,
  // Financial analytics
  getDoctorStatement, getFinancialSummary, getAgingReport,
  getPaymentSummary, getExpenseSummary, getDailyRevenue,
} from "./routes/invoices";
import { getDeliveries, createDelivery } from "./routes/delivery";
import {
  getDashboardStats, getDepartmentPerformance, getRevenueReport,
  getTopDoctors, getWorkTypeStats, getAuditLogs,
} from "./routes/dashboard";
import {
  getBarcodeLabels, getBarcodeLabel, createBarcodeLabel, updateBarcodeLabel, deleteBarcodeLabel,
  getBarcodeLogs, logBarcodeAction,
} from "./routes/barcode";
import {
  getAttendance, getAttendanceReport, getAttendanceReports, createAttendance, importAttendanceCSV, punchAttendance, getTodayStatus, getKioskData,
  updateAttendance, deleteAttendance,
  getPayrollPeriods, getPayrollPeriod, createPayrollPeriod, updatePayrollStatus, updatePayrollEntry, getPayrollUserEntries,
} from "./routes/attendance";
import {
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
  getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePOStatus, recordPOPayment,
  createExpenseFromPO,
  getCostAnalysis, getMaterialProfitability, getPurchaseVsSales, getSupplierBalances,
} from "./routes/suppliers";
import {
  getHRNeeds, createHRNeed, updateHRNeed, deleteHRNeed,
  getHRPositions, createHRPosition, updateHRPosition, deleteHRPosition,
  getHRApplications, createHRApplication, updateHRApplication, deleteHRApplication,
} from "./routes/hr";

export { initializeStore };

export function createServer() {
  const app = express();

  // ── Core Middleware ──────────────────────────────
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health Check ─────────────────────────────────
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Luster Dental Lab ERP API - Running", timestamp: new Date().toISOString() });
  });
  app.get("/api/demo", handleDemo);

  // ── Auth Routes (Public) ─────────────────────────
  app.post("/api/auth/login", login);

  // ── Kiosk Routes (Public - بدون تسجيل دخول للاستخدام المباشر) ───
  app.get("/api/attendance/kiosk-data", getKioskData);
  app.post("/api/attendance/punch", punchAttendance);

  // ── Apply Authentication ─────────────────────────
  app.use("/api", authenticate);

  // ── Auth Routes (Protected) ──────────────────────
  app.get("/api/auth/me", getMe);
  app.get("/api/users", getUsers);
  app.get("/api/users/:id", getUser);
  app.post("/api/users", createUser);
  app.put("/api/users/:id", updateUser);
  app.post("/api/users/:id/toggle-active", toggleUserActive);

  // ── Doctor Routes ────────────────────────────────
  app.get("/api/doctors", getDoctors);
  app.get("/api/doctors/:id", getDoctor);
  app.post("/api/doctors", createDoctor);
  app.put("/api/doctors/:id", updateDoctor);
  app.delete("/api/doctors/:id", deleteDoctor);

  // ── Patient Routes ─────────────────────────────
  app.get("/api/patients", getPatients);
  app.post("/api/patients", createPatient);
  app.put("/api/patients/:id", updatePatient);

  // ── Case Routes (Core) ───────────────────────────
  app.get("/api/cases", getCases);
  app.get("/api/cases/:id", getCase);
  app.post("/api/cases", createCase);
  app.put("/api/cases/:id", updateCase);
  app.delete("/api/cases/:id", deleteCase);

  // ── Case Workflow Routes ─────────────────────────
  app.post("/api/cases/:id/transfer", transferCase);
  app.put("/api/cases/:id/cad", updateCADData);
  app.put("/api/cases/:id/cam", updateCAMData);
  app.put("/api/cases/:id/finishing", updateFinishingData);
  app.put("/api/cases/:id/removable", updateRemovableData);
  app.put("/api/cases/:id/qc", updateQCData);

  // ── Inventory Routes ─────────────────────────────
  app.get("/api/inventory", getInventory);
  app.get("/api/inventory/low-stock", getLowStockItems);
  app.get("/api/inventory/transactions", getTransactions);
  app.get("/api/inventory/analytics/category-summary", getCategorySummary);
  app.get("/api/inventory/analytics/consumption", getConsumptionReport);
  app.get("/api/inventory/analytics/supplier-summary", getSupplierSummary);
  app.get("/api/inventory/analytics/expiring", getExpiringItems);
  app.get("/api/inventory/analytics/stock-levels", getStockLevels);
  app.get("/api/inventory/:id", getInventoryItem);
  app.post("/api/inventory", createInventoryItem);
  app.put("/api/inventory/:id", updateInventoryItem);
  app.delete("/api/inventory/:id", deleteInventoryItem);
  app.post("/api/inventory/:id/deduct", deductStock);
  app.post("/api/inventory/:id/restock", restockItem);

  // ── Invoice & Accounting Routes ──────────────────
  app.get("/api/invoices", getInvoices);
  app.post("/api/invoices/preview", previewInvoice);
  app.get("/api/invoices/:id", getInvoice);
  app.post("/api/invoices", createInvoice);
  app.post("/api/invoices/:id/payment", recordPayment);
  app.post("/api/invoices/:id/cancel", cancelInvoice);
  app.get("/api/pricing", getPricingRules);
  app.put("/api/pricing/:id", updatePricingRule);
  app.get("/api/accounting/doctor-debts", getDoctorDebts);
  app.get("/api/accounting/doctor-statement/:id", getDoctorStatement);
  app.get("/api/accounting/financial-summary", getFinancialSummary);
  app.get("/api/accounting/aging", getAgingReport);
  app.get("/api/accounting/payment-summary", getPaymentSummary);
  app.get("/api/accounting/expense-summary", getExpenseSummary);
  app.get("/api/accounting/daily-revenue", getDailyRevenue);

  // ── Expense Routes ─────────────────────────────
  app.get("/api/expenses", getExpenses);
  app.post("/api/expenses", createExpense);
  app.put("/api/expenses/:id", updateExpense);
  app.delete("/api/expenses/:id", deleteExpense);

  // ── Delivery Routes ──────────────────────────────
  app.get("/api/deliveries", getDeliveries);
  app.post("/api/deliveries", createDelivery);

  // ── Supplier Routes ────────────────────────────────
  app.get("/api/suppliers", getSuppliers);
  app.get("/api/suppliers/:id", getSupplier);
  app.post("/api/suppliers", createSupplier);
  app.put("/api/suppliers/:id", updateSupplier);
  app.delete("/api/suppliers/:id", deleteSupplier);

  // ── Purchase Order Routes ─────────────────────────
  app.get("/api/purchase-orders", getPurchaseOrders);
  app.get("/api/purchase-orders/:id", getPurchaseOrder);
  app.post("/api/purchase-orders", createPurchaseOrder);
  app.put("/api/purchase-orders/:id/status", updatePOStatus);
  app.post("/api/purchase-orders/:id/payment", recordPOPayment);
  app.post("/api/purchase-orders/:id/create-expense", createExpenseFromPO);

  // ── Cost & Profit Analytics ───────────────────────
  app.get("/api/analytics/cost-analysis", getCostAnalysis);
  app.get("/api/analytics/material-profitability", getMaterialProfitability);
  app.get("/api/analytics/purchase-vs-sales", getPurchaseVsSales);
  app.get("/api/analytics/supplier-balance", getSupplierBalances);

  // ── Barcode & QR Module ──────────────────────────
  app.get("/api/barcode/labels", getBarcodeLabels);
  app.get("/api/barcode/labels/:id", getBarcodeLabel);
  app.post("/api/barcode/labels", createBarcodeLabel);
  app.put("/api/barcode/labels/:id", updateBarcodeLabel);
  app.delete("/api/barcode/labels/:id", deleteBarcodeLabel);
  app.get("/api/barcode/logs", getBarcodeLogs);
  app.post("/api/barcode/log", logBarcodeAction);

  // ── Attendance & Payroll ────────────────────────
  app.get("/api/attendance", getAttendance);
  app.get("/api/attendance/report", getAttendanceReport);
  app.get("/api/attendance/reports", getAttendanceReports);
  app.get("/api/attendance/today", getTodayStatus);
  app.post("/api/attendance", createAttendance);
  app.post("/api/attendance/import", importAttendanceCSV);
  app.put("/api/attendance/:id", updateAttendance);
  app.delete("/api/attendance/:id", deleteAttendance);
  app.get("/api/payroll/periods", getPayrollPeriods);
  app.get("/api/payroll/periods/:id", getPayrollPeriod);
  app.get("/api/payroll/user/:userId/entries", getPayrollUserEntries);
  app.post("/api/payroll/periods", createPayrollPeriod);
  app.put("/api/payroll/periods/:id/status", updatePayrollStatus);
  app.put("/api/payroll/entries/:id", updatePayrollEntry);

  // ── HR Module ────────────────────────────────────
  app.get("/api/hr/needs", getHRNeeds);
  app.post("/api/hr/needs", createHRNeed);
  app.put("/api/hr/needs/:id", updateHRNeed);
  app.delete("/api/hr/needs/:id", deleteHRNeed);
  app.get("/api/hr/positions", getHRPositions);
  app.post("/api/hr/positions", createHRPosition);
  app.put("/api/hr/positions/:id", updateHRPosition);
  app.delete("/api/hr/positions/:id", deleteHRPosition);
  app.get("/api/hr/applications", getHRApplications);
  app.post("/api/hr/applications", createHRApplication);
  app.put("/api/hr/applications/:id", updateHRApplication);
  app.delete("/api/hr/applications/:id", deleteHRApplication);

  // ── Dashboard & Reports ──────────────────────────
  app.get("/api/dashboard/stats", getDashboardStats);
  app.get("/api/dashboard/department-performance", getDepartmentPerformance);
  app.get("/api/dashboard/revenue", getRevenueReport);
  app.get("/api/dashboard/top-doctors", getTopDoctors);
  app.get("/api/dashboard/work-type-stats", getWorkTypeStats);
  app.get("/api/audit-logs", getAuditLogs);

  // ── Error Handler ────────────────────────────────
  app.use(errorHandler);

  return app;
}
