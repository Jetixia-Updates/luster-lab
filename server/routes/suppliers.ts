/**
 * Supplier & Purchase Order Routes
 * Full CRUD for suppliers, PO management, supplier payments, cost analytics
 */

import { RequestHandler } from "express";
import {
  suppliers,
  purchaseOrders,
  inventoryItems,
  invoices,
  cases,
  expenses,
  pricingRules,
  generateId,
  generatePONumber,
  persistSupplier,
  removeSupplierFromDB,
  persistPurchaseOrder,
  persistExpense,
  persistAuditLog,
} from "../data/store";
import { logAudit } from "../middleware/audit";
import type { Supplier, PurchaseOrder, SupplierPayment, CostAnalysis, MaterialProfitability, Expense } from "@shared/api";

// ══════════════════════════════════════════
// SUPPLIERS CRUD
// ══════════════════════════════════════════

// GET /api/suppliers
export const getSuppliers: RequestHandler = (req, res) => {
  let items = [...suppliers];
  if (req.query.status) items = items.filter((s) => s.status === req.query.status);
  if (req.query.category) items = items.filter((s) => s.categories.includes(req.query.category as string));
  if (req.query.search) {
    const s = (req.query.search as string).toLowerCase();
    items = items.filter((sup) =>
      sup.name.toLowerCase().includes(s) || sup.nameAr.includes(s) || (sup.contactPersonAr || "").includes(s)
    );
  }
  items.sort((a, b) => b.totalPurchases - a.totalPurchases);
  res.json({ success: true, data: items });
};

// GET /api/suppliers/:id
export const getSupplier: RequestHandler = (req, res) => {
  const sup = suppliers.find((s) => s.id === req.params.id);
  if (!sup) return res.status(404).json({ success: false, error: "Supplier not found" });
  // Get supplier purchase orders
  const pos = purchaseOrders.filter((po) => po.supplierId === sup.id).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  // Get inventory items from this supplier
  const items = inventoryItems.filter((i) => i.supplier === sup.name || (i as any).supplierAr === sup.nameAr);
  res.json({ success: true, data: { supplier: sup, purchaseOrders: pos, inventoryItems: items } });
};

// POST /api/suppliers
export const createSupplier: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const sup: Supplier = {
    id: generateId("sup"),
    ...req.body,
    totalPurchases: 0, totalPaid: 0, balance: 0,
    status: req.body.status || "active",
    categories: req.body.categories || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  suppliers.push(sup);
  persistSupplier(sup);
  const log = logAudit(user.id, user.fullNameAr, "CREATE_SUPPLIER", "supplier", sup.id, `Added supplier: ${sup.nameAr}`);
  persistAuditLog(log);
  res.status(201).json({ success: true, data: sup });
};

// PUT /api/suppliers/:id
export const updateSupplier: RequestHandler = (req, res) => {
  const idx = suppliers.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Supplier not found" });
  const user = (req as any).user;
  suppliers[idx] = { ...suppliers[idx], ...req.body, updatedAt: new Date().toISOString() };
  persistSupplier(suppliers[idx]);
  const log = logAudit(user.id, user.fullNameAr, "UPDATE_SUPPLIER", "supplier", suppliers[idx].id, `Updated supplier: ${suppliers[idx].nameAr}`);
  persistAuditLog(log);
  res.json({ success: true, data: suppliers[idx] });
};

// DELETE /api/suppliers/:id
export const deleteSupplier: RequestHandler = (req, res) => {
  const idx = suppliers.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Supplier not found" });
  const user = (req as any).user;
  // Check for linked POs
  const linked = purchaseOrders.filter((po) => po.supplierId === suppliers[idx].id && po.status !== "cancelled");
  if (linked.length > 0) return res.status(400).json({ success: false, error: `Cannot delete: ${linked.length} active purchase orders linked` });
  const removed = suppliers.splice(idx, 1)[0];
  removeSupplierFromDB(removed.id);
  const log = logAudit(user.id, user.fullNameAr, "DELETE_SUPPLIER", "supplier", removed.id, `Deleted supplier: ${removed.nameAr}`);
  persistAuditLog(log);
  res.json({ success: true, message: "Supplier deleted" });
};

// ══════════════════════════════════════════
// PURCHASE ORDERS
// ══════════════════════════════════════════

// GET /api/purchase-orders
export const getPurchaseOrders: RequestHandler = (req, res) => {
  let pos = [...purchaseOrders];
  if (req.query.supplierId) pos = pos.filter((p) => p.supplierId === req.query.supplierId);
  if (req.query.status) pos = pos.filter((p) => p.status === req.query.status);
  pos.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  res.json({ success: true, data: pos });
};

// GET /api/purchase-orders/:id
export const getPurchaseOrder: RequestHandler = (req, res) => {
  const po = purchaseOrders.find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ success: false, error: "PO not found" });
  res.json({ success: true, data: po });
};

// POST /api/purchase-orders
export const createPurchaseOrder: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const { supplierId, items, tax = 0, discount = 0, expectedDelivery, notes } = req.body;

  const sup = suppliers.find((s) => s.id === supplierId);
  if (!sup) return res.status(404).json({ success: false, error: "Supplier not found" });

  const poItems = (items || []).map((item: any) => ({
    id: generateId("poi"),
    ...item,
    total: item.quantity * item.unitPrice,
    receivedQty: 0,
  }));

  const subtotal = poItems.reduce((s: number, i: any) => s + i.total, 0);
  const totalAmount = subtotal + tax - discount;

  const po: PurchaseOrder = {
    id: generateId("po"),
    poNumber: generatePONumber(),
    supplierId: sup.id,
    supplierName: sup.name,
    supplierNameAr: sup.nameAr,
    items: poItems,
    subtotal, tax, discount, totalAmount,
    paidAmount: 0, remainingAmount: totalAmount,
    status: "draft",
    payments: [],
    orderDate: new Date().toISOString(),
    expectedDelivery,
    notes,
    createdBy: user.id,
    createdByName: user.fullNameAr,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  purchaseOrders.unshift(po);
  persistPurchaseOrder(po);
  sup.totalPurchases += totalAmount;
  sup.balance += totalAmount;
  sup.updatedAt = new Date().toISOString();
  persistSupplier(sup);

  const log = logAudit(user.id, user.fullNameAr, "CREATE_PO", "purchase_order", po.id,
    `Created PO ${po.poNumber} for ${sup.nameAr} - Amount: ${totalAmount}`);
  persistAuditLog(log);

  res.status(201).json({ success: true, data: po });
};

// PUT /api/purchase-orders/:id/status
export const updatePOStatus: RequestHandler = (req, res) => {
  const po = purchaseOrders.find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ success: false, error: "PO not found" });
  const user = (req as any).user;
  const { status } = req.body;
  const prevStatus = po.status;

  po.status = status;
  if (status === "received") po.receivedDate = new Date().toISOString();
  po.updatedAt = new Date().toISOString();
  persistPurchaseOrder(po);

  // عند استلام الأمر: إنشاء مصروف تلقائي ليظهر في المصروفات واللوحة المالية
  if (status === "received" && prevStatus !== "received" && po.totalAmount > 0) {
    const expenseExists = expenses.some((e: any) => e.purchaseOrderId === po.id);
    if (!expenseExists) {
      const expense: Expense = {
        id: generateId("exp"),
        category: "materials",
        description: `أمر شراء ${po.poNumber} - ${po.supplierNameAr}`,
        amount: po.totalAmount,
        date: (po.receivedDate || new Date().toISOString()).split("T")[0] + "T00:00:00.000Z",
        vendor: po.supplierNameAr,
        reference: po.poNumber,
        notes: `مشتريات مرتبطة بأمر الشراء ${po.poNumber}`,
        createdBy: user.id,
        createdByName: user.fullNameAr || user.fullName || "",
        createdAt: new Date().toISOString(),
        purchaseOrderId: po.id,
        source: "purchase_order",
      };
      expenses.unshift(expense);
      persistExpense(expense);
      persistAuditLog(logAudit(user.id, user.fullNameAr, "PO_TO_EXPENSE", "expense", expense.id,
        `Auto-created expense from PO ${po.poNumber}: ${po.totalAmount} EGP`));
    }
  }

  const log = logAudit(user.id, user.fullNameAr, "UPDATE_PO_STATUS", "purchase_order", po.id,
    `Updated PO ${po.poNumber} status to ${status}`);
  persistAuditLog(log);

  res.json({ success: true, data: po });
};

// POST /api/purchase-orders/:id/payment
export const recordPOPayment: RequestHandler = (req, res) => {
  const po = purchaseOrders.find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ success: false, error: "PO not found" });
  const user = (req as any).user;
  const { amount, method, reference, notes } = req.body;

  if (amount > po.remainingAmount) {
    return res.status(400).json({ success: false, error: `Payment ${amount} exceeds remaining ${po.remainingAmount}` });
  }

  const payment: SupplierPayment = {
    id: generateId("spp"),
    purchaseOrderId: po.id,
    amount, method, reference, notes,
    paidDate: new Date().toISOString(),
    createdBy: user.id,
    createdByName: user.fullNameAr,
  };

  po.payments.push(payment);
  po.paidAmount += amount;
  po.remainingAmount -= amount;
  po.updatedAt = new Date().toISOString();
  persistPurchaseOrder(po);

  // Update supplier balance
  const sup = suppliers.find((s) => s.id === po.supplierId);
  if (sup) {
    sup.totalPaid += amount;
    sup.balance -= amount;
    sup.updatedAt = new Date().toISOString();
    persistSupplier(sup);
  }

  const log = logAudit(user.id, user.fullNameAr, "PO_PAYMENT", "purchase_order", po.id,
    `Recorded payment ${amount} for PO ${po.poNumber}`);
  persistAuditLog(log);

  res.json({ success: true, data: po });
};

// POST /api/purchase-orders/:id/create-expense — إنشاء مصروف يدوي من أمر شراء مستلم
export const createExpenseFromPO: RequestHandler = (req, res) => {
  const po = purchaseOrders.find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ success: false, error: "PO not found" });
  const user = (req as any).user;
  if (po.status !== "received") {
    return res.status(400).json({ success: false, error: "يجب استلام الأمر أولاً لتسجيله كمصروف" });
  }
  const expenseExists = expenses.some((e: any) => e.purchaseOrderId === po.id);
  if (expenseExists) return res.status(400).json({ success: false, error: "تم تسجيل هذا الأمر كمصروف مسبقاً" });

  const expense: Expense = {
    id: generateId("exp"),
    category: "materials",
    description: `أمر شراء ${po.poNumber} - ${po.supplierNameAr}`,
    amount: po.totalAmount,
    date: (po.receivedDate || new Date().toISOString()).split("T")[0] + "T00:00:00.000Z",
    vendor: po.supplierNameAr,
    reference: po.poNumber,
    notes: `مشتريات مرتبطة بأمر الشراء ${po.poNumber}`,
    createdBy: user.id,
    createdByName: user.fullNameAr || user.fullName || "",
    createdAt: new Date().toISOString(),
    purchaseOrderId: po.id,
    source: "purchase_order",
  };
  expenses.unshift(expense);
  persistExpense(expense);
  persistAuditLog(logAudit(user.id, user.fullNameAr, "PO_TO_EXPENSE", "expense", expense.id,
    `Created expense from PO ${po.poNumber}: ${po.totalAmount} EGP`));

  res.status(201).json({ success: true, data: expense, message: "تم تسجيل المصروف بنجاح" });
};

// ══════════════════════════════════════════
// COST & PROFIT ANALYTICS
// ══════════════════════════════════════════

// GET /api/analytics/cost-analysis?period=2026-02
export const getCostAnalysis: RequestHandler = (req, res) => {
  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);

  // Sales revenue from invoices
  const periodInvoices = invoices.filter((i) => i.issuedDate.startsWith(period) && i.status !== "cancelled");
  const totalSalesRevenue = periodInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalMaterialsCost = periodInvoices.reduce((s, i) => s + i.materialsCost, 0);
  const totalLaborCost = periodInvoices.reduce((s, i) => s + i.laborCost, 0);

  // Purchase costs
  const periodPOs = purchaseOrders.filter((po) => po.orderDate.startsWith(period) && po.status !== "cancelled");
  const totalPurchasesCost = periodPOs.reduce((s, po) => s + po.totalAmount, 0);

  // Overhead from expenses (rent, utilities, maintenance, etc.)
  const periodExpenses = expenses.filter((e: any) => e.date.startsWith(period));
  const totalOverhead = periodExpenses
    .filter((e: any) => ["rent", "utilities", "maintenance", "salaries", "marketing", "transport"].includes(e.category))
    .reduce((s: number, e: any) => s + e.amount, 0);

  const totalCosts = totalPurchasesCost + totalOverhead;
  const grossProfit = totalSalesRevenue - totalMaterialsCost - totalLaborCost;
  const netProfit = totalSalesRevenue - totalCosts;
  const caseCount = periodInvoices.length;

  const analysis: CostAnalysis = {
    period,
    totalSalesRevenue,
    totalMaterialsCost,
    totalPurchasesCost,
    totalLaborCost,
    totalOverhead,
    grossProfit,
    grossMargin: totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 100) : 0,
    netProfit,
    netMargin: totalSalesRevenue > 0 ? Math.round((netProfit / totalSalesRevenue) * 100) : 0,
    avgCostPerCase: caseCount > 0 ? Math.round(totalCosts / caseCount) : 0,
    avgRevenuePerCase: caseCount > 0 ? Math.round(totalSalesRevenue / caseCount) : 0,
    caseCount,
  };

  res.json({ success: true, data: analysis });
};

// GET /api/analytics/material-profitability
export const getMaterialProfitability: RequestHandler = (_req, res) => {
  const WORK_TYPE_AR: Record<string, string> = {
    zirconia: "زركونيا", pfm: "PFM", emax: "إي ماكس", implant: "زراعة",
    ortho: "تقويم", removable: "متحركة", composite: "كمبوزيت", other: "أخرى",
  };

  const byType: Record<string, { caseCount: number; totalRevenue: number; totalMaterialsCost: number; totalLaborCost: number }> = {};

  invoices.filter((i) => i.status !== "cancelled").forEach((inv) => {
    const c = cases.find((cs) => cs.id === inv.caseId);
    if (!c) return;
    const wt = c.workType;
    if (!byType[wt]) byType[wt] = { caseCount: 0, totalRevenue: 0, totalMaterialsCost: 0, totalLaborCost: 0 };
    byType[wt].caseCount++;
    byType[wt].totalRevenue += inv.totalAmount;
    byType[wt].totalMaterialsCost += inv.materialsCost;
    byType[wt].totalLaborCost += inv.laborCost;
  });

  const data: MaterialProfitability[] = Object.entries(byType).map(([wt, d]) => {
    const totalCost = d.totalMaterialsCost + d.totalLaborCost;
    const profit = d.totalRevenue - totalCost;
    const pricing = pricingRules.find((p) => p.workType === wt);
    return {
      workType: wt,
      workTypeAr: WORK_TYPE_AR[wt] || wt,
      caseCount: d.caseCount,
      totalRevenue: d.totalRevenue,
      totalCost,
      profit,
      margin: d.totalRevenue > 0 ? Math.round((profit / d.totalRevenue) * 100) : 0,
      avgBuyPrice: d.caseCount > 0 ? Math.round(totalCost / d.caseCount) : 0,
      avgSellPrice: d.caseCount > 0 ? Math.round(d.totalRevenue / d.caseCount) : 0,
    };
  }).sort((a, b) => b.profit - a.profit);

  res.json({ success: true, data });
};

// GET /api/analytics/purchase-vs-sales
export const getPurchaseVsSales: RequestHandler = (_req, res) => {
  // Last 6 months comparison
  const months: { period: string; purchases: number; sales: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const period = d.toISOString().substring(0, 7);
    const monthLabel = d.toLocaleDateString("ar-EG", { month: "short", year: "numeric" });

    const sales = invoices
      .filter((inv) => inv.issuedDate.startsWith(period) && inv.status !== "cancelled")
      .reduce((s, inv) => s + inv.totalAmount, 0);

    const purchases = purchaseOrders
      .filter((po) => po.orderDate.startsWith(period) && po.status !== "cancelled")
      .reduce((s, po) => s + po.totalAmount, 0);

    months.push({ period: monthLabel, purchases, sales, profit: sales - purchases });
  }

  res.json({ success: true, data: months });
};

// GET /api/analytics/supplier-balance
export const getSupplierBalances: RequestHandler = (_req, res) => {
  const data = suppliers
    .filter((s) => s.status === "active")
    .map((s) => ({
      id: s.id,
      nameAr: s.nameAr,
      name: s.name,
      totalPurchases: s.totalPurchases,
      totalPaid: s.totalPaid,
      balance: s.balance,
      pendingPOs: purchaseOrders.filter((po) => po.supplierId === s.id && po.remainingAmount > 0).length,
      paymentTerms: s.paymentTerms,
    }))
    .sort((a, b) => b.balance - a.balance);

  const totalOwed = data.reduce((s, d) => s + d.balance, 0);
  const totalPurchased = data.reduce((s, d) => s + d.totalPurchases, 0);

  res.json({ success: true, data: { suppliers: data, totalOwed, totalPurchased } });
};
