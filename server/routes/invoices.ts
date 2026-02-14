/**
 * Invoicing & Accounting Routes
 * Auto-pricing, invoice generation, payment tracking
 */

import { RequestHandler } from "express";
import { invoices, cases, pricingRules, doctors, expenses, generateId, generateInvoiceNumber } from "../data/store";
import { logAudit } from "../middleware/audit";
import type { Invoice, Payment, Expense, ApiResponse, PricingRule, FinancialSummary, AgingBucket, PaymentSummary, DoctorStatement } from "@shared/api";

// GET /api/invoices
export const getInvoices: RequestHandler = (req, res) => {
  let filtered = [...invoices];
  if (req.query.status) filtered = filtered.filter((i) => i.status === req.query.status);
  if (req.query.doctorId) filtered = filtered.filter((i) => i.doctorId === req.query.doctorId);
  if (req.query.paymentStatus) filtered = filtered.filter((i) => i.paymentStatus === req.query.paymentStatus);
  
  filtered.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  res.json({ success: true, data: filtered });
};

// GET /api/invoices/:id
export const getInvoice: RequestHandler = (req, res) => {
  const inv = invoices.find((i) => i.id === req.params.id);
  if (!inv) return res.status(404).json({ success: false, error: "Invoice not found" });
  res.json({ success: true, data: inv });
};

// Helper: calculate invoice costs from pricing rules
function calcInvoiceCosts(dentalCase: any, overrides?: { materialsCost?: number; laborCost?: number; customItems?: any[]; unitPrice?: number }) {
  const pricing = pricingRules.find((p) => p.workType === dentalCase.workType);
  const teethCount = dentalCase.teethNumbers.includes("full") ? 14 :
    dentalCase.teethNumbers.split(",").filter(Boolean).length;

  const unitPrice = overrides?.unitPrice ?? (pricing?.basePricePerUnit || 500);
  const basePrice = unitPrice * teethCount;
  const materialsCost = overrides?.materialsCost ?? (basePrice * (pricing?.materialCostMultiplier || 1.0) - basePrice);
  const laborCost = overrides?.laborCost ?? ((pricing?.laborCostPerHour || 50) * (teethCount * 2));
  const rushSurcharge = dentalCase.priority === "rush"
    ? basePrice * ((pricing?.rushSurchargePercent || 20) / 100)
    : dentalCase.priority === "urgent"
      ? basePrice * ((pricing?.rushSurchargePercent || 20) / 200)
      : 0;

  const items = overrides?.customItems?.length
    ? overrides.customItems.map((it: any) => ({
        id: generateId("ii"),
        description: it.description || "",
        descriptionAr: it.descriptionAr || it.description || "",
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        total: (it.quantity || 1) * (it.unitPrice || 0),
      }))
    : [{
        id: generateId("ii"),
        description: `${dentalCase.workType.toUpperCase()} - Teeth: ${dentalCase.teethNumbers}`,
        descriptionAr: `${dentalCase.workType} - أسنان: ${dentalCase.teethNumbers}`,
        quantity: teethCount,
        unitPrice,
        total: basePrice,
      }];

  const itemsTotal = items.reduce((s: number, i: any) => s + i.total, 0);

  return { pricing, teethCount, basePrice, unitPrice, materialsCost, laborCost, rushSurcharge, items, itemsTotal };
}

// POST /api/invoices/preview - Preview invoice before creation
export const previewInvoice: RequestHandler = (req, res) => {
  const { caseId, materialsCost: mcOverride, laborCost: lcOverride, customItems, unitPrice: upOverride, discount = 0, tax = 0 } = req.body;

  const dentalCase = cases.find((c) => c.id === caseId);
  if (!dentalCase) return res.status(404).json({ success: false, error: "Case not found" });

  const calc = calcInvoiceCosts(dentalCase, {
    materialsCost: mcOverride != null ? mcOverride : undefined,
    laborCost: lcOverride != null ? lcOverride : undefined,
    customItems,
    unitPrice: upOverride != null ? upOverride : undefined,
  });

  const subtotal = calc.itemsTotal + calc.materialsCost + calc.laborCost + calc.rushSurcharge;
  const totalAmount = subtotal - discount + tax;

  res.json({
    success: true,
    data: {
      caseNumber: dentalCase.caseNumber,
      doctorName: dentalCase.doctorName,
      patientName: dentalCase.patientName,
      workType: dentalCase.workType,
      teethCount: calc.teethCount,
      items: calc.items,
      itemsTotal: calc.itemsTotal,
      materialsCost: calc.materialsCost,
      laborCost: calc.laborCost,
      rushSurcharge: calc.rushSurcharge,
      subtotal,
      discount,
      tax,
      totalAmount,
      pricingRule: calc.pricing ? {
        basePricePerUnit: calc.pricing.basePricePerUnit,
        materialCostMultiplier: calc.pricing.materialCostMultiplier,
        laborCostPerHour: calc.pricing.laborCostPerHour,
        rushSurchargePercent: calc.pricing.rushSurchargePercent,
      } : null,
    },
  });
};

// POST /api/invoices - Generate invoice for a case
export const createInvoice: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const { caseId, discount = 0, tax = 0, dueDate,
    materialsCost: mcOverride, laborCost: lcOverride, customItems, unitPrice: upOverride,
  } = req.body;

  const dentalCase = cases.find((c) => c.id === caseId);
  if (!dentalCase) return res.status(404).json({ success: false, error: "Case not found" });

  // Enforce workflow: case must have passed QC
  if (!dentalCase.qcData || dentalCase.qcData.overallResult !== "pass") {
    return res.status(400).json({
      success: false,
      error: "Cannot create invoice - case must pass Quality Control first",
    });
  }

  // Already invoiced?
  if (dentalCase.invoiceId) {
    return res.status(400).json({ success: false, error: "Case already has an invoice" });
  }

  const calc = calcInvoiceCosts(dentalCase, {
    materialsCost: mcOverride != null ? mcOverride : undefined,
    laborCost: lcOverride != null ? lcOverride : undefined,
    customItems,
    unitPrice: upOverride != null ? upOverride : undefined,
  });

  const subtotal = calc.itemsTotal + calc.materialsCost + calc.laborCost + calc.rushSurcharge;
  const totalAmount = subtotal - discount + tax;

  const invoiceNumber = generateInvoiceNumber();
  const doctor = doctors.find((d) => d.id === dentalCase.doctorId);

  const invoice: Invoice = {
    id: generateId("inv"),
    invoiceNumber,
    caseId: dentalCase.id,
    caseNumber: dentalCase.caseNumber,
    doctorId: dentalCase.doctorId,
    doctorName: dentalCase.doctorName,
    patientName: dentalCase.patientName,
    items: calc.items,
    subtotal,
    materialsCost: calc.materialsCost,
    laborCost: calc.laborCost,
    rushSurcharge: calc.rushSurcharge,
    discount,
    tax,
    totalAmount,
    status: "issued",
    paymentStatus: "unpaid",
    paidAmount: 0,
    remainingAmount: totalAmount,
    payments: [],
    issuedDate: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    createdBy: user.id,
  };

  invoices.unshift(invoice);
  dentalCase.invoiceId = invoice.id;
  dentalCase.totalCost = totalAmount;

  // Update doctor debt
  if (doctor) doctor.totalDebt += totalAmount;

  logAudit(user.id, user.fullNameAr, "CREATE_INVOICE", "invoice", invoice.id,
    `Created invoice ${invoiceNumber} for case ${dentalCase.caseNumber} - Amount: ${totalAmount}`);

  res.status(201).json({ success: true, data: invoice });
};

// POST /api/invoices/:id/payment
export const recordPayment: RequestHandler = (req, res) => {
  const inv = invoices.find((i) => i.id === req.params.id);
  if (!inv) return res.status(404).json({ success: false, error: "Invoice not found" });

  const user = (req as any).user;
  const { amount, method, reference, notes } = req.body;

  if (amount > inv.remainingAmount) {
    return res.status(400).json({
      success: false,
      error: `Payment amount (${amount}) exceeds remaining (${inv.remainingAmount})`,
    });
  }

  const payment: Payment = {
    id: generateId("pay"),
    invoiceId: inv.id,
    amount,
    method,
    reference,
    paidDate: new Date().toISOString(),
    receivedBy: user.id,
    notes,
  };

  inv.payments.push(payment);
  inv.paidAmount += amount;
  inv.remainingAmount = inv.totalAmount - inv.paidAmount;
  inv.paymentStatus = inv.remainingAmount <= 0 ? "paid" : "partial";
  if (inv.paymentStatus === "paid") inv.status = "paid";

  // Update doctor debt
  const doctor = doctors.find((d) => d.id === inv.doctorId);
  if (doctor) doctor.totalDebt = Math.max(0, doctor.totalDebt - amount);

  logAudit(user.id, user.fullNameAr, "RECORD_PAYMENT", "invoice", inv.id,
    `Recorded payment ${amount} for invoice ${inv.invoiceNumber}`);

  res.json({ success: true, data: inv });
};

// GET /api/pricing
export const getPricingRules: RequestHandler = (_req, res) => {
  res.json({ success: true, data: pricingRules });
};

// PUT /api/pricing/:id
export const updatePricingRule: RequestHandler = (req, res) => {
  const idx = pricingRules.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Pricing rule not found" });

  pricingRules[idx] = { ...pricingRules[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: pricingRules[idx] });
};

// POST /api/invoices/:id/cancel
export const cancelInvoice: RequestHandler = (req, res) => {
  const inv = invoices.find((i) => i.id === req.params.id);
  if (!inv) return res.status(404).json({ success: false, error: "Invoice not found" });
  if (inv.status === "cancelled") return res.status(400).json({ success: false, error: "Invoice already cancelled" });
  if (inv.paidAmount > 0) {
    return res.status(400).json({ success: false, error: "لا يمكن إلغاء فاتورة تم دفع جزء منها" });
  }

  const user = (req as any).user;
  inv.status = "cancelled";
  inv.paymentStatus = "unpaid";

  // Remove invoice reference from case
  const dentalCase = cases.find((c) => c.id === inv.caseId);
  if (dentalCase) {
    dentalCase.invoiceId = undefined;
    dentalCase.totalCost = 0;
  }

  // Reduce doctor debt
  const doctor = doctors.find((d) => d.id === inv.doctorId);
  if (doctor) doctor.totalDebt = Math.max(0, doctor.totalDebt - inv.totalAmount);

  logAudit(user.id, user.fullNameAr, "CANCEL_INVOICE", "invoice", inv.id,
    `Cancelled invoice ${inv.invoiceNumber}`);

  res.json({ success: true, data: inv });
};

// GET /api/accounting/doctor-debts
export const getDoctorDebts: RequestHandler = (_req, res) => {
  const debts = doctors
    .filter((d) => d.totalDebt > 0)
    .map((d) => ({ doctorId: d.id, name: d.nameAr, clinic: d.clinicAr, totalDebt: d.totalDebt }));
  res.json({ success: true, data: debts });
};

// ══════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════

// GET /api/expenses
export const getExpenses: RequestHandler = (req, res) => {
  let filtered = [...expenses];
  if (req.query.category) filtered = filtered.filter((e) => e.category === req.query.category);
  if (req.query.from) filtered = filtered.filter((e) => e.date >= (req.query.from as string));
  if (req.query.to) filtered = filtered.filter((e) => e.date <= (req.query.to as string));
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ success: true, data: filtered });
};

// POST /api/expenses
export const createExpense: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const expense: Expense = {
    id: generateId("exp"),
    ...req.body,
    createdBy: user.id,
    createdByName: user.fullNameAr,
    createdAt: new Date().toISOString(),
  };
  expenses.unshift(expense);
  logAudit(user.id, user.fullNameAr, "CREATE_EXPENSE", "expense", expense.id,
    `Created expense: ${expense.description} - ${expense.amount} EGP`);
  res.status(201).json({ success: true, data: expense });
};

// PUT /api/expenses/:id
export const updateExpense: RequestHandler = (req, res) => {
  const idx = expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Expense not found" });
  const user = (req as any).user;
  expenses[idx] = { ...expenses[idx], ...req.body };
  logAudit(user.id, user.fullNameAr, "UPDATE_EXPENSE", "expense", expenses[idx].id,
    `Updated expense: ${expenses[idx].description}`);
  res.json({ success: true, data: expenses[idx] });
};

// DELETE /api/expenses/:id
export const deleteExpense: RequestHandler = (req, res) => {
  const idx = expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Expense not found" });
  const user = (req as any).user;
  const removed = expenses.splice(idx, 1)[0];
  logAudit(user.id, user.fullNameAr, "DELETE_EXPENSE", "expense", removed.id,
    `Deleted expense: ${removed.description}`);
  res.json({ success: true, message: "Expense deleted" });
};

// ══════════════════════════════════════════
// DOCTOR STATEMENT
// ══════════════════════════════════════════

// GET /api/accounting/doctor-statement/:id
export const getDoctorStatement: RequestHandler = (req, res) => {
  const doc = doctors.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Doctor not found" });

  const docInvoices = invoices.filter((i) => i.doctorId === doc.id && i.status !== "cancelled");
  const totalInvoiced = docInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = docInvoices.reduce((s, i) => s + i.paidAmount, 0);

  const statement: DoctorStatement = {
    doctorId: doc.id,
    doctorName: doc.nameAr,
    clinic: doc.clinicAr,
    totalCases: doc.totalCases,
    totalInvoiced,
    totalPaid,
    totalRemaining: totalInvoiced - totalPaid,
    invoices: docInvoices.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()),
  };

  res.json({ success: true, data: statement });
};

// ══════════════════════════════════════════
// FINANCIAL SUMMARY & ANALYTICS
// ══════════════════════════════════════════

// GET /api/accounting/financial-summary?period=2026-02
export const getFinancialSummary: RequestHandler = (req, res) => {
  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);

  const periodInvoices = invoices.filter((i) => i.issuedDate.startsWith(period) && i.status !== "cancelled");
  const periodExpenses = expenses.filter((e) => e.date.startsWith(period));

  const totalRevenue = periodInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = periodInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = totalRevenue - totalCollected;
  const totalExpensesAmount = periodExpenses.reduce((s, e) => s + e.amount, 0);

  // Find top work type
  const workTypeCounts: Record<string, number> = {};
  periodInvoices.forEach((inv) => {
    const c = cases.find((cs) => cs.id === inv.caseId);
    if (c) workTypeCounts[c.workType] = (workTypeCounts[c.workType] || 0) + 1;
  });
  const topWorkType = Object.entries(workTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  // Find top doctor
  const doctorRevenue: Record<string, { name: string; total: number }> = {};
  periodInvoices.forEach((inv) => {
    if (!doctorRevenue[inv.doctorId]) doctorRevenue[inv.doctorId] = { name: inv.doctorName, total: 0 };
    doctorRevenue[inv.doctorId].total += inv.totalAmount;
  });
  const topDoctor = Object.values(doctorRevenue).sort((a, b) => b.total - a.total)[0]?.name || "";

  const summary: FinancialSummary = {
    period,
    totalRevenue,
    totalCollected,
    totalOutstanding,
    totalExpenses: totalExpensesAmount,
    netProfit: totalCollected - totalExpensesAmount,
    collectionRate: totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0,
    invoiceCount: periodInvoices.length,
    paidInvoiceCount: periodInvoices.filter((i) => i.paymentStatus === "paid").length,
    partialInvoiceCount: periodInvoices.filter((i) => i.paymentStatus === "partial").length,
    unpaidInvoiceCount: periodInvoices.filter((i) => i.paymentStatus === "unpaid").length,
    cancelledInvoiceCount: invoices.filter((i) => i.issuedDate.startsWith(period) && i.status === "cancelled").length,
    topWorkType,
    topDoctor,
    avgInvoiceValue: periodInvoices.length > 0 ? Math.round(totalRevenue / periodInvoices.length) : 0,
  };

  res.json({ success: true, data: summary });
};

// GET /api/accounting/aging
export const getAgingReport: RequestHandler = (_req, res) => {
  const now = new Date();
  const unpaidInvoices = invoices.filter((i) => i.status !== "cancelled" && i.paymentStatus !== "paid");

  const buckets: AgingBucket[] = [
    { label: "جاري", range: "0-30 يوم", count: 0, total: 0, invoices: [] },
    { label: "متأخر", range: "31-60 يوم", count: 0, total: 0, invoices: [] },
    { label: "متأخر جداً", range: "61-90 يوم", count: 0, total: 0, invoices: [] },
    { label: "متعثر", range: "90+ يوم", count: 0, total: 0, invoices: [] },
  ];

  unpaidInvoices.forEach((inv) => {
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000));
    const invInfo = {
      invoiceNumber: inv.invoiceNumber,
      doctorName: inv.doctorName,
      amount: inv.remainingAmount,
      daysOverdue,
    };

    if (daysOverdue <= 30) { buckets[0].count++; buckets[0].total += inv.remainingAmount; buckets[0].invoices.push(invInfo); }
    else if (daysOverdue <= 60) { buckets[1].count++; buckets[1].total += inv.remainingAmount; buckets[1].invoices.push(invInfo); }
    else if (daysOverdue <= 90) { buckets[2].count++; buckets[2].total += inv.remainingAmount; buckets[2].invoices.push(invInfo); }
    else { buckets[3].count++; buckets[3].total += inv.remainingAmount; buckets[3].invoices.push(invInfo); }
  });

  res.json({ success: true, data: buckets });
};

// GET /api/accounting/payment-summary
export const getPaymentSummary: RequestHandler = (req, res) => {
  const period = (req.query.period as string) || "";
  const allPayments = invoices
    .filter((i) => i.status !== "cancelled")
    .flatMap((i) => i.payments)
    .filter((p) => !period || p.paidDate.startsWith(period));

  const methods: Record<string, { ar: string; count: number; total: number }> = {
    cash: { ar: "نقدي", count: 0, total: 0 },
    bank_transfer: { ar: "تحويل بنكي", count: 0, total: 0 },
    check: { ar: "شيك", count: 0, total: 0 },
    card: { ar: "بطاقة", count: 0, total: 0 },
  };

  allPayments.forEach((p) => {
    if (methods[p.method]) {
      methods[p.method].count++;
      methods[p.method].total += p.amount;
    }
  });

  const summary: PaymentSummary[] = Object.entries(methods).map(([method, data]) => ({
    method,
    methodAr: data.ar,
    count: data.count,
    total: data.total,
  }));

  res.json({ success: true, data: summary });
};

// GET /api/accounting/expense-summary
export const getExpenseSummary: RequestHandler = (req, res) => {
  const period = (req.query.period as string) || "";
  const filtered = period ? expenses.filter((e) => e.date.startsWith(period)) : expenses;

  const categoryLabels: Record<string, string> = {
    materials: "مواد خام", equipment: "معدات", maintenance: "صيانة",
    rent: "إيجار", utilities: "مرافق", salaries: "رواتب",
    marketing: "تسويق", transport: "نقل", other: "أخرى",
  };

  const categories: Record<string, { ar: string; count: number; total: number }> = {};
  filtered.forEach((e) => {
    if (!categories[e.category]) {
      categories[e.category] = { ar: categoryLabels[e.category] || e.category, count: 0, total: 0 };
    }
    categories[e.category].count++;
    categories[e.category].total += e.amount;
  });

  const summary = Object.entries(categories).map(([cat, data]) => ({
    category: cat,
    categoryAr: data.ar,
    count: data.count,
    total: data.total,
  })).sort((a, b) => b.total - a.total);

  res.json({ success: true, data: summary, totalExpenses: filtered.reduce((s, e) => s + e.amount, 0) });
};

// GET /api/accounting/daily-revenue?days=30
export const getDailyRevenue: RequestHandler = (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const result: { date: string; revenue: number; collected: number; expenses: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const dayInvoices = invoices.filter((inv) => inv.issuedDate.startsWith(dateStr) && inv.status !== "cancelled");
    const dayPayments = invoices
      .filter((inv) => inv.status !== "cancelled")
      .flatMap((inv) => inv.payments)
      .filter((p) => p.paidDate.startsWith(dateStr));
    const dayExpenses = expenses.filter((e) => e.date.startsWith(dateStr));

    result.push({
      date: dateStr,
      revenue: dayInvoices.reduce((s, i) => s + i.totalAmount, 0),
      collected: dayPayments.reduce((s, p) => s + p.amount, 0),
      expenses: dayExpenses.reduce((s, e) => s + e.amount, 0),
    });
  }

  res.json({ success: true, data: result });
};
