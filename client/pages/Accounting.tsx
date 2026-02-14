/**
 * Accounting Department - World-Class Enterprise Grade
 * =====================================================
 * Fully interactive financial management:
 * - Financial Dashboard with KPIs & Charts
 * - Invoice Management (Create, Detail, Pay, Cancel, Print)
 * - Purchase Orders (Create, Detail, Pay, Status, Link to Suppliers)
 * - Cost Analysis & Profitability
 * - Expense Management (CRUD)
 * - Doctor Accounts & Statements
 * - Aging Analysis with Quick-Pay
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  Calculator, FileText, CreditCard, Printer, XCircle,
  TrendingUp, TrendingDown, DollarSign, Users, Eye,
  Plus, Edit, Trash2, Receipt, Wallet, PieChart as PieIcon,
  AlertTriangle, Clock, CheckCircle, Search, RefreshCcw,
  ArrowUpRight, ArrowDownRight, BarChart3, ShoppingCart,
  Target, Percent, Package, Send, Ban, Truck,
} from "lucide-react";
import type { DentalCase, Invoice, Expense, FinancialSummary, AgingBucket, PaymentSummary, PurchaseOrder, CostAnalysis, MaterialProfitability, Supplier } from "@shared/api";

const EXPENSE_CATEGORIES: Record<string, string> = {
  materials: "مواد خام", equipment: "معدات", maintenance: "صيانة",
  rent: "إيجار", utilities: "مرافق", salaries: "رواتب",
  marketing: "تسويق", transport: "نقل", other: "أخرى",
};

const PAY_METHOD_AR: Record<string, string> = { cash: "نقدي", bank_transfer: "تحويل بنكي", check: "شيك", card: "بطاقة" };
const PO_STATUS_AR: Record<string, string> = { draft: "مسودة", sent: "مرسل", partial: "جزئي", received: "مستلم", cancelled: "ملغى" };
const PO_STATUS_COLOR: Record<string, string> = { draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", received: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6b7280"];

export default function Accounting() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // Core Data
  const [accountingCases, setAccountingCases] = useState<DentalCase[]>([]);
  const [allCases, setAllCases] = useState<DentalCase[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [doctorDebts, setDoctorDebts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Analytics
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);

  // Purchase Orders & Cost Analysis
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [profitability, setProfitability] = useState<MaterialProfitability[]>([]);
  const [purchaseVsSales, setPurchaseVsSales] = useState<any[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<any>(null);

  // ── Payment Dialog State ──
  const [payDialog, setPayDialog] = useState<{ type: "invoice" | "po"; id: string; max: number; label: string } | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // ── Invoice Create Dialog ──
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invCaseId, setInvCaseId] = useState("");
  const [invDiscount, setInvDiscount] = useState(0);
  const [invTax, setInvTax] = useState(0);
  const [invDueDays, setInvDueDays] = useState(30);
  const [invMaterialsCost, setInvMaterialsCost] = useState<number | null>(null);
  const [invLaborCost, setInvLaborCost] = useState<number | null>(null);
  const [invUnitPrice, setInvUnitPrice] = useState<number | null>(null);
  const [invCustomItems, setInvCustomItems] = useState<{ descriptionAr: string; quantity: number; unitPrice: number }[]>([]);
  const [invUseCustomItems, setInvUseCustomItems] = useState(false);
  const [invPreview, setInvPreview] = useState<any>(null);
  const [invPreviewLoading, setInvPreviewLoading] = useState(false);

  // ── Pricing Rules ──
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [editingPricing, setEditingPricing] = useState<any>(null);

  // ── Invoice Detail Dialog ──
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // ── Filters ──
  const [invFilter, setInvFilter] = useState("all");
  const [invSearch, setInvSearch] = useState("");
  const [poFilter, setPoFilter] = useState("all");

  // ── Expense form ──
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState({
    category: "materials" as string, description: "", amount: 0,
    date: new Date().toISOString().split("T")[0], vendor: "", reference: "", notes: "",
  });

  // ── PO Create Dialog ──
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [poSupplierId, setPOSupplierId] = useState("");
  const [poExpDelivery, setPOExpDelivery] = useState("");
  const [poDiscount, setPODiscount] = useState(0);
  const [poNotes, setPONotes] = useState("");
  const [poItems, setPOItems] = useState([{ descriptionAr: "", description: "", sku: "", quantity: 1, unitPrice: 0 }]);

  // ── PO Detail Dialog ──
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Period
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [casesAccRes, casesAllRes, invRes, debtsRes, expRes, sumRes, agingRes, payRes, expSumRes, dailyRes,
        poRes, costRes, profitRes, pvsRes, balRes, supRes, priceRes,
      ] = await Promise.all([
        api.get<any>("/cases?status=accounting"),
        api.get<any>("/cases"),
        api.get<any>("/invoices"),
        api.get<any>("/accounting/doctor-debts"),
        api.get<any>("/expenses"),
        api.get<any>(`/accounting/financial-summary?period=${period}`),
        api.get<any>("/accounting/aging"),
        api.get<any>(`/accounting/payment-summary?period=${period}`),
        api.get<any>(`/accounting/expense-summary?period=${period}`),
        api.get<any>("/accounting/daily-revenue?days=30"),
        api.get<any>("/purchase-orders"),
        api.get<any>(`/analytics/cost-analysis?period=${period}`),
        api.get<any>("/analytics/material-profitability"),
        api.get<any>("/analytics/purchase-vs-sales"),
        api.get<any>("/analytics/supplier-balance"),
        api.get<any>("/suppliers?status=active"),
        api.get<any>("/pricing"),
      ]);
      setAccountingCases(casesAccRes.data || []);
      setAllCases(casesAllRes.data || []);
      setInvoices(invRes.data || []);
      setDoctorDebts(debtsRes.data || []);
      setExpenses(expRes.data || []);
      setFinancialSummary(sumRes.data || null);
      setAgingData(agingRes.data || []);
      setPaymentSummary(payRes.data || []);
      setExpenseSummary(expSumRes.data || []);
      setDailyRevenue(dailyRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setCostAnalysis(costRes.data || null);
      setProfitability(profitRes.data || []);
      setPurchaseVsSales(pvsRes.data || []);
      setSupplierBalances(balRes.data || null);
      setSuppliers(supRes.data || []);
      setPricingRules(priceRes.data || []);
    } catch { /* silently fail partial */ }
    setLoading(false);
  };

  // ══════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════

  // ── Invoice Actions ──
  const quickCreateInvoice = async (caseId: string) => {
    try {
      const res = await api.post<any>("/invoices", {
        caseId, dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      toast.success(`تم إصدار الفاتورة: ${res.data.invoiceNumber}`);
      await api.post<any>(`/cases/${caseId}/transfer`, {
        toStatus: "ready_for_delivery", notes: `Invoice created: ${res.data.invoiceNumber}`,
      });
      toast.success("تم تحويل الحالة لقسم التسليم");
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Invoice Preview ──
  const loadInvoicePreview = async (caseId: string) => {
    if (!caseId) { setInvPreview(null); return; }
    setInvPreviewLoading(true);
    try {
      const payload: any = { caseId, discount: invDiscount, tax: invTax };
      if (invMaterialsCost != null) payload.materialsCost = invMaterialsCost;
      if (invLaborCost != null) payload.laborCost = invLaborCost;
      if (invUnitPrice != null) payload.unitPrice = invUnitPrice;
      if (invUseCustomItems && invCustomItems.length > 0) payload.customItems = invCustomItems.filter(i => i.descriptionAr);
      const res = await api.post<any>("/invoices/preview", payload);
      setInvPreview(res.data);
      // Set defaults from pricing if not overridden
      if (invMaterialsCost == null) setInvMaterialsCost(res.data.materialsCost);
      if (invLaborCost == null) setInvLaborCost(res.data.laborCost);
      if (invUnitPrice == null) setInvUnitPrice(res.data.pricingRule?.basePricePerUnit || 500);
    } catch { setInvPreview(null); }
    setInvPreviewLoading(false);
  };

  const handleCreateInvoice = async () => {
    if (!invCaseId) { toast.error("يرجى اختيار الحالة"); return; }
    try {
      const payload: any = {
        caseId: invCaseId, discount: invDiscount, tax: invTax,
        dueDate: new Date(Date.now() + invDueDays * 86400000).toISOString(),
      };
      if (invMaterialsCost != null) payload.materialsCost = invMaterialsCost;
      if (invLaborCost != null) payload.laborCost = invLaborCost;
      if (invUnitPrice != null) payload.unitPrice = invUnitPrice;
      if (invUseCustomItems && invCustomItems.length > 0) payload.customItems = invCustomItems.filter(i => i.descriptionAr);
      const res = await api.post<any>("/invoices", payload);
      toast.success(`تم إصدار الفاتورة: ${res.data.invoiceNumber}`);
      const c = allCases.find(cs => cs.id === invCaseId);
      if (c && c.currentStatus === "accounting") {
        await api.post<any>(`/cases/${invCaseId}/transfer`, {
          toStatus: "ready_for_delivery", notes: `Invoice created: ${res.data.invoiceNumber}`,
        });
      }
      setShowCreateInvoice(false);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Pricing Rules ──
  const savePricingRule = async () => {
    if (!editingPricing) return;
    try {
      await api.put<any>(`/pricing/${editingPricing.id}`, editingPricing);
      toast.success("تم تحديث قاعدة التسعير");
      setEditingPricing(null);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const cancelInvoice = async (invoiceId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء هذه الفاتورة؟")) return;
    try {
      await api.post<any>(`/invoices/${invoiceId}/cancel`, {});
      toast.success("تم إلغاء الفاتورة");
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Universal Payment ──
  const openPayDialog = (type: "invoice" | "po", id: string, max: number, label: string) => {
    setPayDialog({ type, id, max, label });
    setPayAmount(max);
    setPayMethod("cash");
    setPayReference("");
    setPayNotes("");
  };

  const handlePay = async () => {
    if (!payDialog || payAmount <= 0) { toast.error("يرجى إدخال مبلغ صحيح"); return; }
    try {
      const url = payDialog.type === "invoice"
        ? `/invoices/${payDialog.id}/payment`
        : `/purchase-orders/${payDialog.id}/payment`;
      await api.post<any>(url, {
        amount: payAmount, method: payMethod, reference: payReference, notes: payNotes,
      });
      toast.success("تم تسجيل الدفعة بنجاح");
      setPayDialog(null);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── PO Actions ──
  const handleCreatePO = async () => {
    if (!poSupplierId) { toast.error("يرجى اختيار المورد"); return; }
    const validItems = poItems.filter(i => i.descriptionAr);
    if (validItems.length === 0) { toast.error("يرجى إضافة صنف واحد على الأقل"); return; }
    try {
      await api.post<any>("/purchase-orders", {
        supplierId: poSupplierId,
        items: validItems.map(i => ({ ...i, total: i.quantity * i.unitPrice })),
        discount: poDiscount,
        expectedDelivery: poExpDelivery ? new Date(poExpDelivery).toISOString() : undefined,
        notes: poNotes,
      });
      toast.success("تم إنشاء أمر الشراء بنجاح");
      setShowCreatePO(false);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const updatePOStatus = async (poId: string, status: string) => {
    try {
      await api.put<any>(`/purchase-orders/${poId}/status`, { status });
      toast.success("تم تحديث حالة أمر الشراء");
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const createExpenseFromPO = async (poId: string) => {
    try {
      await api.post<any>(`/purchase-orders/${poId}/create-expense`, {});
      toast.success("تم تسجيل أمر الشراء كمصروف");
      loadAll();
      setSelectedPO(null);
    } catch (err: any) { toast.error(err?.response?.data?.error || err.message); }
  };

  // ── Expense Actions ──
  const openExpenseCreate = () => {
    setExpForm({ category: "materials", description: "", amount: 0, date: new Date().toISOString().split("T")[0], vendor: "", reference: "", notes: "" });
    setEditingExpense(null); setShowExpenseForm(true);
  };
  const openExpenseEdit = (exp: Expense) => {
    setExpForm({ category: exp.category, description: exp.description, amount: exp.amount, date: exp.date.split("T")[0], vendor: exp.vendor || "", reference: exp.reference || "", notes: exp.notes || "" });
    setEditingExpense(exp); setShowExpenseForm(true);
  };
  const saveExpense = async () => {
    if (!expForm.description || expForm.amount <= 0) { toast.error("يرجى ملء الوصف والمبلغ"); return; }
    try {
      const payload = { ...expForm, date: new Date(expForm.date).toISOString() };
      if (editingExpense) { await api.put<any>(`/expenses/${editingExpense.id}`, payload); toast.success("تم تحديث المصروف"); }
      else { await api.post<any>("/expenses", payload); toast.success("تم إضافة المصروف"); }
      setShowExpenseForm(false); loadAll();
    } catch (err: any) { toast.error(err.message); }
  };
  const deleteExpense = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
    try { await api.delete<any>(`/expenses/${id}`); toast.success("تم حذف المصروف"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  // ── Computed ──
  const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
  const totalRevenue = activeInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = activeInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalRemaining = activeInvoices.reduce((s, i) => s + i.remainingAmount, 0);
  const totalExpensesAmount = expenses.reduce((s, e) => s + e.amount, 0);

  const filteredInvoices = invoices.filter((inv) => {
    if (invFilter === "paid" && inv.paymentStatus !== "paid") return false;
    if (invFilter === "partial" && inv.paymentStatus !== "partial") return false;
    if (invFilter === "unpaid" && (inv.paymentStatus === "paid" || inv.status === "cancelled")) return false;
    if (invFilter === "cancelled" && inv.status !== "cancelled") return false;
    if (invSearch) {
      const s = invSearch.toLowerCase();
      return inv.invoiceNumber.toLowerCase().includes(s) || inv.caseNumber.toLowerCase().includes(s) ||
        inv.doctorName.includes(invSearch) || inv.patientName.includes(invSearch);
    }
    return true;
  });

  const filteredPOs = purchaseOrders.filter(po => poFilter === "all" || po.status === poFilter);
  const poSubtotal = poItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const invoicableCases = allCases.filter(c => c.qcData?.overallResult === "pass" && !c.invoiceId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7 text-green-600" />
            قسم الحسابات والمالية
          </h1>
          <p className="text-muted-foreground">الفواتير والمشتريات والمصروفات وتحليل الربحية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowCreatePO(true); setPOSupplierId(""); setPOItems([{ descriptionAr: "", description: "", sku: "", quantity: 1, unitPrice: 0 }]); setPODiscount(0); setPONotes(""); setPOExpDelivery(""); }} className="gap-1">
            <ShoppingCart className="w-4 h-4" /> أمر شراء
          </Button>
          <Button size="sm" onClick={() => { setShowCreateInvoice(true); setInvCaseId(""); setInvDiscount(0); setInvTax(0); setInvDueDays(30); setInvMaterialsCost(null); setInvLaborCost(null); setInvUnitPrice(null); setInvPreview(null); setInvUseCustomItems(false); setInvCustomItems([]); }} className="gap-1 bg-green-600 hover:bg-green-700">
            <FileText className="w-4 h-4" /> إصدار فاتورة
          </Button>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-1">
            <RefreshCcw className="w-4 h-4" /> تحديث
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="dashboard" className="gap-1 text-xs sm:text-sm"><BarChart3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">لوحة</span> المالية</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1 text-xs sm:text-sm"><FileText className="w-3.5 h-3.5" /> الفواتير</TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1 text-xs sm:text-sm"><ShoppingCart className="w-3.5 h-3.5" /> المشتريات</TabsTrigger>
          <TabsTrigger value="cost-analysis" className="gap-1 text-xs sm:text-sm"><Target className="w-3.5 h-3.5" /> الربحية</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1 text-xs sm:text-sm"><Receipt className="w-3.5 h-3.5" /> المصروفات</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1 text-xs sm:text-sm"><DollarSign className="w-3.5 h-3.5" /> التسعير</TabsTrigger>
          <TabsTrigger value="doctors" className="gap-1 text-xs sm:text-sm"><Users className="w-3.5 h-3.5" /> الأطباء</TabsTrigger>
          <TabsTrigger value="aging" className="gap-1 text-xs sm:text-sm"><Clock className="w-3.5 h-3.5" /> تقادم الديون</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: Dashboard ═══ */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KPI icon={<TrendingUp className="w-5 h-5" />} value={totalRevenue.toLocaleString()} label="إجمالي الفواتير" color="green" />
            <KPI icon={<Wallet className="w-5 h-5" />} value={totalPaid.toLocaleString()} label="المحصّل" color="blue" />
            <KPI icon={<AlertTriangle className="w-5 h-5" />} value={totalRemaining.toLocaleString()} label="المتبقي" color="red" />
            <KPI icon={<TrendingDown className="w-5 h-5" />} value={totalExpensesAmount.toLocaleString()} label="المصروفات" color="amber" />
            <KPI icon={<DollarSign className="w-5 h-5" />} value={(totalPaid - totalExpensesAmount).toLocaleString()} label="صافي الربح" color="emerald" />
            <KPI icon={<PieIcon className="w-5 h-5" />} value={`${financialSummary?.collectionRate || 0}%`} label="نسبة التحصيل" color="purple" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">الإيرادات والتحصيل (آخر 30 يوم)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyRevenue.filter(d => d.revenue > 0 || d.collected > 0 || d.expenses > 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => v.split("-")[2]} fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("ar-EG")} formatter={(value: number, name: string) => [value.toLocaleString() + " ج.م", name === "revenue" ? "الإيرادات" : name === "collected" ? "التحصيل" : "المصروفات"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="الإيرادات" />
                    <Area type="monotone" dataKey="collected" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="التحصيل" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} name="المصروفات" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">توزيع طرق الدفع</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={paymentSummary.filter(p => p.total > 0)} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="total" nameKey="methodAr" label={({ methodAr, total }) => `${methodAr}: ${total.toLocaleString()}`} labelLine={false} fontSize={11}>
                      {paymentSummary.filter(p => p.total > 0).map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend /><Tooltip formatter={(value: number) => value.toLocaleString() + " ج.م"} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cases awaiting invoicing */}
          {accountingCases.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/30">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /> حالات في انتظار الفوترة ({accountingCases.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accountingCases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                          <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                          {c.priority === "rush" && <Badge className="bg-red-500 text-white">عاجل</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{c.patientName} | {c.doctorName} | الأسنان: {c.teethNumbers}</p>
                      </div>
                      <Button size="sm" onClick={() => quickCreateInvoice(c.id)} className="gap-1 bg-green-600 hover:bg-green-700"><FileText className="w-3 h-3" /> إصدار فاتورة</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ TAB 2: Invoices ═══ */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={invSearch} onChange={(e) => setInvSearch(e.target.value)} placeholder="بحث برقم الفاتورة أو الحالة أو الطبيب..." className="pr-10" />
            </div>
            <Select value={invFilter} onValueChange={setInvFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="حالة الدفع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل ({invoices.length})</SelectItem>
                <SelectItem value="paid">مسدد ({invoices.filter(i => i.paymentStatus === "paid").length})</SelectItem>
                <SelectItem value="partial">جزئي ({invoices.filter(i => i.paymentStatus === "partial").length})</SelectItem>
                <SelectItem value="unpaid">غير مسدد ({invoices.filter(i => i.paymentStatus === "unpaid" && i.status !== "cancelled").length})</SelectItem>
                <SelectItem value="cancelled">ملغاة ({invoices.filter(i => i.status === "cancelled").length})</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setShowCreateInvoice(true); setInvCaseId(""); setInvDiscount(0); setInvTax(0); setInvDueDays(30); setInvMaterialsCost(null); setInvLaborCost(null); setInvUnitPrice(null); setInvPreview(null); setInvUseCustomItems(false); setInvCustomItems([]); }} className="gap-1 bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4" /> فاتورة جديدة</Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-right py-3 px-2 font-medium">الفاتورة</th>
                      <th className="text-right py-3 px-2 font-medium">الحالة</th>
                      <th className="text-right py-3 px-2 font-medium">الطبيب</th>
                      <th className="text-right py-3 px-2 font-medium">المريض</th>
                      <th className="text-right py-3 px-2 font-medium">الإجمالي</th>
                      <th className="text-right py-3 px-2 font-medium">المدفوع</th>
                      <th className="text-right py-3 px-2 font-medium">المتبقي</th>
                      <th className="text-right py-3 px-2 font-medium">التاريخ</th>
                      <th className="text-right py-3 px-2 font-medium">الحالة</th>
                      <th className="text-center py-3 px-2 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-2 font-mono text-primary">
                          <button onClick={() => setSelectedInvoice(inv)} className="hover:underline flex items-center gap-1">{inv.invoiceNumber} <Eye className="w-3 h-3 opacity-40" /></button>
                        </td>
                        <td className="py-3 px-2 font-mono"><Link to={`/cases/${inv.caseId}`} className="text-primary hover:underline">{inv.caseNumber}</Link></td>
                        <td className="py-3 px-2">{inv.doctorName}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{inv.patientName}</td>
                        <td className="py-3 px-2 font-bold">{inv.totalAmount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-green-600">{inv.paidAmount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-red-600 font-bold">{inv.remainingAmount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(inv.issuedDate).toLocaleDateString("ar-EG")}</td>
                        <td className="py-3 px-2">
                          {inv.status === "cancelled" ? <Badge className="bg-gray-200 text-gray-600 text-[10px]">ملغاة</Badge> :
                            <Badge className={`text-[10px] ${inv.paymentStatus === "paid" ? "bg-green-100 text-green-800" : inv.paymentStatus === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                              {inv.paymentStatus === "paid" ? "مسدد" : inv.paymentStatus === "partial" ? "جزئي" : "غير مسدد"}
                            </Badge>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Link to={`/invoices/${inv.id}/print`}><Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="طباعة"><Printer className="w-3.5 h-3.5" /></Button></Link>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="تفاصيل" onClick={() => setSelectedInvoice(inv)}><Eye className="w-3.5 h-3.5" /></Button>
                            {inv.status !== "cancelled" && inv.paymentStatus !== "paid" && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-0.5"
                                onClick={() => openPayDialog("invoice", inv.id, inv.remainingAmount, inv.invoiceNumber)}>
                                <CreditCard className="w-3 h-3" /> دفع
                              </Button>
                            )}
                            {inv.status !== "cancelled" && inv.paidAmount === 0 && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" title="إلغاء" onClick={() => cancelInvoice(inv.id)}><XCircle className="w-3.5 h-3.5" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredInvoices.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد فواتير تطابق البحث</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3: Purchases ═══ */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={<ShoppingCart className="w-5 h-5" />} value={purchaseOrders.length.toString()} label="إجمالي أوامر الشراء" color="indigo" />
            <KPI icon={<DollarSign className="w-5 h-5" />} value={purchaseOrders.reduce((s, po) => s + po.totalAmount, 0).toLocaleString()} label="إجمالي المشتريات (ج.م)" color="blue" />
            <KPI icon={<Wallet className="w-5 h-5" />} value={purchaseOrders.reduce((s, po) => s + po.paidAmount, 0).toLocaleString()} label="المدفوع للموردين (ج.م)" color="green" />
            <KPI icon={<CreditCard className="w-5 h-5" />} value={(supplierBalances?.totalOwed || 0).toLocaleString()} label="المستحق للموردين (ج.م)" color="red" />
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <Select value={poFilter} onValueChange={setPoFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأوامر ({purchaseOrders.length})</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="sent">مرسل</SelectItem>
                <SelectItem value="received">مستلم</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setShowCreatePO(true); setPOSupplierId(""); setPOItems([{ descriptionAr: "", description: "", sku: "", quantity: 1, unitPrice: 0 }]); setPODiscount(0); setPONotes(""); setPOExpDelivery(""); }} className="gap-1"><Plus className="w-4 h-4" /> أمر شراء جديد</Button>
            <Link to="/suppliers"><Button size="sm" variant="outline" className="gap-1"><Truck className="w-4 h-4" /> إدارة الموردين</Button></Link>
          </div>

          {/* Purchase vs Sales Chart */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /> المشتريات مقابل المبيعات</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={purchaseVsSales}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" fontSize={12} /><YAxis />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} /><Legend />
                  <Bar dataKey="sales" name="المبيعات" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="المشتريات" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="الربح" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Supplier balances alert */}
          {supplierBalances && (supplierBalances.suppliers || []).filter((s: any) => s.balance > 0).length > 0 && (
            <Card className="border-red-200">
              <CardHeader><CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> موردين لديهم مستحقات</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(supplierBalances.suppliers || []).filter((s: any) => s.balance > 0).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/30">
                      <div>
                        <p className="font-bold text-sm">{s.nameAr}</p>
                        <p className="text-xs text-muted-foreground">{s.paymentTerms} | {s.pendingPOs} أمر معلق</p>
                      </div>
                      <span className="font-bold text-red-600">{s.balance.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PO Table */}
          <Card>
            <CardHeader><CardTitle className="text-lg">أوامر الشراء</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-right py-3 px-2 font-medium">رقم الأمر</th>
                      <th className="text-right py-3 px-2 font-medium">المورد</th>
                      <th className="text-right py-3 px-2 font-medium">الأصناف</th>
                      <th className="text-right py-3 px-2 font-medium">المبلغ</th>
                      <th className="text-right py-3 px-2 font-medium">المدفوع</th>
                      <th className="text-right py-3 px-2 font-medium">المتبقي</th>
                      <th className="text-right py-3 px-2 font-medium">الحالة</th>
                      <th className="text-right py-3 px-2 font-medium">التاريخ</th>
                      <th className="text-center py-3 px-2 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPOs.map((po) => (
                      <tr key={po.id} className="border-b hover:bg-accent/30">
                        <td className="py-3 px-2">
                          <button className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1" onClick={() => setSelectedPO(po)}>{po.poNumber} <Eye className="w-3 h-3 opacity-40" /></button>
                        </td>
                        <td className="py-3 px-2">{po.supplierNameAr}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground max-w-[180px] truncate">{po.items.map(i => i.descriptionAr).join("، ")}</td>
                        <td className="py-3 px-2 font-bold">{po.totalAmount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-green-600">{po.paidAmount.toLocaleString()}</td>
                        <td className="py-3 px-2"><span className={po.remainingAmount > 0 ? "text-red-600 font-bold" : "text-green-600"}>{po.remainingAmount.toLocaleString()}</span></td>
                        <td className="py-3 px-2"><span className={`text-xs px-2 py-0.5 rounded-full ${PO_STATUS_COLOR[po.status]}`}>{PO_STATUS_AR[po.status]}</span></td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{new Date(po.orderDate).toLocaleDateString("ar-EG")}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="تفاصيل" onClick={() => setSelectedPO(po)}><Eye className="w-3 h-3" /></Button>
                            {po.status === "draft" && <Button size="sm" variant="outline" className="h-7 text-[10px] gap-0.5" onClick={() => updatePOStatus(po.id, "sent")}><Send className="w-3 h-3" /> إرسال</Button>}
                            {po.status === "sent" && <Button size="sm" variant="outline" className="h-7 text-[10px] gap-0.5 text-green-700" onClick={() => updatePOStatus(po.id, "received")}><CheckCircle className="w-3 h-3" /> استلام</Button>}
                            {po.remainingAmount > 0 && po.status !== "cancelled" && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-0.5" onClick={() => openPayDialog("po", po.id, po.remainingAmount, po.poNumber)}><CreditCard className="w-3 h-3" /> دفع</Button>
                            )}
                            {po.status === "draft" && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" title="إلغاء" onClick={() => updatePOStatus(po.id, "cancelled")}><Ban className="w-3 h-3" /></Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPOs.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد أوامر شراء</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 4: Cost Analysis ═══ */}
        <TabsContent value="cost-analysis" className="space-y-6">
          {costAnalysis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPI icon={<TrendingUp className="w-5 h-5" />} value={costAnalysis.totalSalesRevenue.toLocaleString()} label="إيرادات المبيعات" color="green" />
              <KPI icon={<ShoppingCart className="w-5 h-5" />} value={costAnalysis.totalPurchasesCost.toLocaleString()} label="تكلفة المشتريات" color="red" />
              <KPI icon={<Package className="w-5 h-5" />} value={costAnalysis.totalMaterialsCost.toLocaleString()} label="تكلفة الخامات" color="amber" />
              <KPI icon={<Users className="w-5 h-5" />} value={costAnalysis.totalLaborCost.toLocaleString()} label="تكلفة العمالة" color="blue" />
              <KPI icon={<Percent className="w-5 h-5" />} value={`${costAnalysis.grossMargin}%`} label="هامش الربح الإجمالي" color={costAnalysis.grossMargin >= 30 ? "green" : "red"} />
              <KPI icon={<DollarSign className="w-5 h-5" />} value={costAnalysis.netProfit.toLocaleString()} label="صافي الربح (ج.م)" color={costAnalysis.netProfit >= 0 ? "emerald" : "red"} />
            </div>
          )}
          {costAnalysis && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">تحليل تكلفة البيع مقابل الشراء</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <CostBar label="متوسط سعر البيع" value={costAnalysis.avgRevenuePerCase} max={costAnalysis.avgRevenuePerCase} color="green" />
                    <CostBar label="متوسط تكلفة الحالة" value={costAnalysis.avgCostPerCase} max={costAnalysis.avgRevenuePerCase} color="red" />
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">ربح الحالة الواحدة</span>
                        <span className="text-xl font-bold text-blue-700">{(costAnalysis.avgRevenuePerCase - costAnalysis.avgCostPerCase).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">توزيع التكاليف</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={[{ name: "خامات", value: costAnalysis.totalMaterialsCost }, { name: "عمالة", value: costAnalysis.totalLaborCost }, { name: "مشتريات", value: costAnalysis.totalPurchasesCost }, { name: "مصاريف عامة", value: costAnalysis.totalOverhead }].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        <Cell fill="#f59e0b" /><Cell fill="#3b82f6" /><Cell fill="#6366f1" /><Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
          {profitability.length > 0 && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-indigo-600" /> ربحية أنواع العمل</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground">
                        <th className="text-right py-3 px-2">نوع العمل</th><th className="text-right py-3 px-2">الحالات</th><th className="text-right py-3 px-2">المبيعات</th><th className="text-right py-3 px-2">التكلفة</th><th className="text-right py-3 px-2">الربح</th><th className="text-right py-3 px-2">الهامش</th><th className="text-right py-3 px-2">متوسط البيع</th><th className="text-right py-3 px-2">متوسط التكلفة</th>
                      </tr></thead>
                      <tbody>
                        {profitability.map((p) => (
                          <tr key={p.workType} className="border-b hover:bg-accent/30">
                            <td className="py-3 px-2 font-bold">{p.workTypeAr}</td>
                            <td className="py-3 px-2">{p.caseCount}</td>
                            <td className="py-3 px-2 text-green-600">{p.totalRevenue.toLocaleString()}</td>
                            <td className="py-3 px-2 text-red-600">{p.totalCost.toLocaleString()}</td>
                            <td className="py-3 px-2"><span className={`font-bold ${p.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{p.profit.toLocaleString()}</span></td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full"><div className={`h-full rounded-full ${p.margin >= 30 ? "bg-green-500" : p.margin >= 15 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(0, p.margin))}%` }} /></div>
                                <span className={`text-xs font-bold ${p.margin >= 30 ? "text-green-700" : "text-red-700"}`}>{p.margin}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-blue-600">{p.avgSellPrice.toLocaleString()}</td>
                            <td className="py-3 px-2 text-amber-600">{p.avgBuyPrice.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">مقارنة سعر البيع والتكلفة</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitability}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="workTypeAr" fontSize={12} /><YAxis />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} /><Legend />
                      <Bar dataKey="avgSellPrice" name="سعر البيع" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgBuyPrice" name="التكلفة" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 5: Expenses ═══ */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 flex-shrink-0" />
            <span>أوامر الشراء المستلمة تُسجّل تلقائياً كمصروفات. يمكنك أيضاً إضافة مصروفات يدوية من الزر أدناه.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base px-3 py-1">إجمالي: {totalExpensesAmount.toLocaleString()} ج.م</Badge>
              <Badge variant="outline">{expenses.length} مصروف</Badge>
            </div>
            <Button onClick={openExpenseCreate} className="gap-2"><Plus className="w-4 h-4" /> إضافة مصروف</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {expenseSummary.slice(0, 4).map((cat: any, idx: number) => (
              <Card key={cat.category}><CardContent className="pt-4 text-center">
                <p className="text-xl font-bold" style={{ color: PIE_COLORS[idx] }}>{cat.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{cat.categoryAr} ({cat.count})</p>
              </CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="pt-4"><div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b text-muted-foreground">
              <th className="text-right py-3 px-2">التاريخ</th><th className="text-right py-3 px-2">الفئة</th><th className="text-right py-3 px-2">الوصف</th><th className="text-right py-3 px-2">المبلغ</th><th className="text-right py-3 px-2">المورد</th><th className="text-right py-3 px-2">المرجع</th><th className="text-right py-3 px-2">بواسطة</th><th className="text-center py-3 px-2">إجراءات</th>
            </tr></thead><tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b hover:bg-accent/30">
                  <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(exp.date).toLocaleDateString("ar-EG")}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{EXPENSE_CATEGORIES[exp.category]}</Badge>
                      {(exp as any).source === "purchase_order" && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5 bg-indigo-100 text-indigo-800">
                          <ShoppingCart className="w-3 h-3" /> أمر شراء
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">{exp.description}</td>
                  <td className="py-3 px-2 font-bold text-red-600">{exp.amount.toLocaleString()}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{exp.vendor || "-"}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs font-mono">{exp.reference || "-"}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{exp.createdByName}</td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex gap-1 justify-center">
                      {(exp as any).source !== "purchase_order" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openExpenseEdit(exp)}><Edit className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteExpense(exp.id)}><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                      {(exp as any).source === "purchase_order" && (
                        <span className="text-[10px] text-muted-foreground">مرتبط بأمر شراء</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div></CardContent></Card>
        </TabsContent>

        {/* ═══ TAB 6: Pricing Rules ═══ */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> قواعد التسعير لكل نوع عمل</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">من هنا بتتحكم في تكلفة المواد والعمالة وسعر الوحدة لكل نوع عمل. التغييرات هتأثر على الفواتير الجديدة.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground">
                    <th className="text-right py-3 px-2">نوع العمل</th>
                    <th className="text-right py-3 px-2">سعر الوحدة (ج.م)</th>
                    <th className="text-right py-3 px-2">مُضاعف تكلفة المواد</th>
                    <th className="text-right py-3 px-2">تكلفة العمالة/ساعة</th>
                    <th className="text-right py-3 px-2">هامش الربح %</th>
                    <th className="text-right py-3 px-2">نسبة الاستعجال %</th>
                    <th className="text-center py-3 px-2">تعديل</th>
                  </tr></thead>
                  <tbody>
                    {pricingRules.map((rule: any) => (
                      <tr key={rule.id} className="border-b hover:bg-accent/30">
                        <td className="py-3 px-2 font-bold">{WORK_TYPE_LABELS[rule.workType]?.ar || rule.workType}</td>
                        <td className="py-3 px-2 text-green-700 font-bold">{rule.basePricePerUnit.toLocaleString()}</td>
                        <td className="py-3 px-2">{rule.materialCostMultiplier}x</td>
                        <td className="py-3 px-2">{rule.laborCostPerHour.toLocaleString()}</td>
                        <td className="py-3 px-2">{rule.profitMarginPercent}%</td>
                        <td className="py-3 px-2">{rule.rushSurchargePercent}%</td>
                        <td className="py-3 px-2 text-center"><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPricing({ ...rule })}><Edit className="w-3 h-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <p><strong>شرح الحقول:</strong></p>
                <ul className="mt-1 space-y-0.5 mr-3 list-disc">
                  <li><strong>سعر الوحدة:</strong> سعر السنة الواحدة من هذا النوع</li>
                  <li><strong>مُضاعف تكلفة المواد:</strong> 1.2 يعني تكلفة المواد = 20% من سعر الأساس</li>
                  <li><strong>تكلفة العمالة/ساعة:</strong> سعر ساعة الفني (يتم حساب ساعتين لكل سنة)</li>
                  <li><strong>نسبة الاستعجال:</strong> الزيادة على السعر للحالات العاجلة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 7: Doctor Accounts ═══ */}
        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> حسابات الأطباء</CardTitle></CardHeader>
            <CardContent>
              {doctorDebts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" /><p>لا توجد ديون</p></div>
              ) : (
                <div className="space-y-3">
                  {doctorDebts.map((d: any) => (
                    <div key={d.doctorId} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">{d.name.charAt(d.name.indexOf(".") + 2) || d.name.charAt(0)}</div>
                        <div><p className="font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.clinic}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-red-600 text-lg">{d.totalDebt.toLocaleString()} ج.م</p>
                        <Link to={`/accounting/doctor/${d.doctorId}`}><Button size="sm" variant="outline" className="gap-1"><Eye className="w-3 h-3" /> كشف حساب</Button></Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">ملخص الفواتير حسب الطبيب</CardTitle></CardHeader>
            <CardContent>{(() => {
              const sum: Record<string, { name: string; total: number; paid: number; remaining: number; count: number }> = {};
              activeInvoices.forEach((inv) => { if (!sum[inv.doctorId]) sum[inv.doctorId] = { name: inv.doctorName, total: 0, paid: 0, remaining: 0, count: 0 }; sum[inv.doctorId].total += inv.totalAmount; sum[inv.doctorId].paid += inv.paidAmount; sum[inv.doctorId].remaining += inv.remainingAmount; sum[inv.doctorId].count++; });
              return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-muted-foreground"><th className="text-right py-2 px-2">الطبيب</th><th className="text-right py-2 px-2">الفواتير</th><th className="text-right py-2 px-2">إجمالي</th><th className="text-right py-2 px-2">مدفوع</th><th className="text-right py-2 px-2">متبقي</th><th className="text-right py-2 px-2">التحصيل</th></tr></thead>
                <tbody>{Object.entries(sum).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => (
                  <tr key={id} className="border-b hover:bg-accent/30"><td className="py-2 px-2 font-medium">{d.name}</td><td className="py-2 px-2">{d.count}</td><td className="py-2 px-2 font-bold">{d.total.toLocaleString()}</td><td className="py-2 px-2 text-green-600">{d.paid.toLocaleString()}</td><td className="py-2 px-2 text-red-600">{d.remaining.toLocaleString()}</td>
                    <td className="py-2 px-2"><div className="flex items-center gap-2"><div className="flex-1 bg-muted rounded-full h-2"><div className="h-full bg-green-500 rounded-full" style={{ width: `${d.total > 0 ? (d.paid / d.total) * 100 : 0}%` }} /></div><span className="text-xs font-medium">{d.total > 0 ? Math.round((d.paid / d.total) * 100) : 0}%</span></div></td></tr>
                ))}</tbody></table></div>;
            })()}</CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 7: Aging ═══ */}
        <TabsContent value="aging" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agingData.map((bucket, idx) => {
              const colors = ["border-green-200 bg-green-50/50", "border-amber-200 bg-amber-50/50", "border-orange-200 bg-orange-50/50", "border-red-200 bg-red-50/50"];
              const textColors = ["text-green-700", "text-amber-700", "text-orange-700", "text-red-700"];
              return <Card key={bucket.label} className={colors[idx]}><CardContent className="pt-4 text-center"><p className={`text-2xl font-bold ${textColors[idx]}`}>{bucket.total.toLocaleString()}</p><p className="font-medium text-sm">{bucket.label}</p><p className="text-xs text-muted-foreground">{bucket.range} ({bucket.count} فاتورة)</p></CardContent></Card>;
            })}
          </div>
          {agingData.map((bucket, idx) => {
            if (bucket.invoices.length === 0) return null;
            const bc = ["border-green-300", "border-amber-300", "border-orange-300", "border-red-300"];
            return (
              <Card key={bucket.label} className={bc[idx]}>
                <CardHeader><CardTitle className="text-base flex items-center gap-2">{idx >= 2 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-amber-500" />} {bucket.label} - {bucket.range}</CardTitle></CardHeader>
                <CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-muted-foreground"><th className="text-right py-2 px-2">الفاتورة</th><th className="text-right py-2 px-2">الطبيب</th><th className="text-right py-2 px-2">المتبقي</th><th className="text-right py-2 px-2">التأخير</th><th className="text-center py-2 px-2">إجراء</th></tr></thead>
                  <tbody>{bucket.invoices.map((inv) => {
                    const fullInv = invoices.find(i => i.invoiceNumber === inv.invoiceNumber);
                    return (
                      <tr key={inv.invoiceNumber} className="border-b hover:bg-accent/30">
                        <td className="py-2 px-2 font-mono text-primary">{inv.invoiceNumber}</td><td className="py-2 px-2">{inv.doctorName}</td><td className="py-2 px-2 font-bold text-red-600">{inv.amount.toLocaleString()}</td>
                        <td className="py-2 px-2"><Badge className={inv.daysOverdue > 60 ? "bg-red-100 text-red-800" : inv.daysOverdue > 30 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>{inv.daysOverdue} يوم</Badge></td>
                        <td className="py-2 px-2 text-center">{fullInv && fullInv.paymentStatus !== "paid" && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-0.5" onClick={() => openPayDialog("invoice", fullInv.id, fullInv.remainingAmount, fullInv.invoiceNumber)}><CreditCard className="w-3 h-3" /> تحصيل</Button>
                        )}</td>
                      </tr>
                    );
                  })}</tbody></table></div></CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════ */}
      {/* DIALOGS                                */}
      {/* ═══════════════════════════════════════ */}

      {/* Universal Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-green-700"><CreditCard className="w-5 h-5" /> تسجيل دفعة</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-bold">{payDialog.label}</p>
                <p className="text-sm">المتبقي: <span className="font-bold text-red-600">{payDialog.max.toLocaleString()} ج.م</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>المبلغ *</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} max={payDialog.max} min={1} /></div>
                <div><Label>طريقة الدفع</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem><SelectItem value="check">شيك</SelectItem><SelectItem value="card">بطاقة</SelectItem>
                  </SelectContent></Select>
                </div>
              </div>
              <div><Label>المرجع</Label><Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="رقم الشيك / التحويل" dir="ltr" /></div>
              <div><Label>ملاحظات</Label><Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="ملاحظات..." /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayDialog(null)}>إلغاء</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handlePay} disabled={payAmount <= 0 || payAmount > payDialog.max}>تأكيد الدفع ({payAmount.toLocaleString()} ج.م)</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog - Enhanced with Live Preview */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-green-600" /> إصدار فاتورة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Case Selection */}
            <div>
              <Label>اختر الحالة *</Label>
              <Select value={invCaseId} onValueChange={(v) => { setInvCaseId(v); setInvMaterialsCost(null); setInvLaborCost(null); setInvUnitPrice(null); setInvPreview(null); setTimeout(() => loadInvoicePreview(v), 100); }}>
                <SelectTrigger><SelectValue placeholder="اختر حالة لإصدار فاتورة لها..." /></SelectTrigger>
                <SelectContent>
                  {invoicableCases.length === 0 && <SelectItem value="__none" disabled>لا توجد حالات جاهزة للفوترة</SelectItem>}
                  {invoicableCases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.doctorName} - {c.patientName} ({WORK_TYPE_LABELS[c.workType]?.ar})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invoicableCases.length === 0 && <p className="text-xs text-amber-600 mt-1">يجب أن تجتاز الحالة مراقبة الجودة أولاً</p>}
            </div>

            {invCaseId && invPreview && (
              <>
                {/* Case Info */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-blue-50 border border-blue-100"><span className="text-muted-foreground">الحالة:</span> <span className="font-bold">{invPreview.caseNumber}</span></div>
                  <div className="p-2 rounded bg-blue-50 border border-blue-100"><span className="text-muted-foreground">الطبيب:</span> <span className="font-bold">{invPreview.doctorName}</span></div>
                  <div className="p-2 rounded bg-blue-50 border border-blue-100"><span className="text-muted-foreground">النوع:</span> <span className="font-bold">{WORK_TYPE_LABELS[invPreview.workType]?.ar}</span></div>
                  <div className="p-2 rounded bg-blue-50 border border-blue-100"><span className="text-muted-foreground">الأسنان:</span> <span className="font-bold">{invPreview.teethCount}</span></div>
                </div>

                {/* Editable Costs */}
                <Card className="border-amber-200">
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-600" /> تعديل التكاليف (اختياري)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">سعر الوحدة (ج.م)</Label>
                        <Input type="number" value={invUnitPrice ?? ""} onChange={(e) => setInvUnitPrice(e.target.value ? Number(e.target.value) : null)} min={0} placeholder={invPreview.pricingRule?.basePricePerUnit?.toString()} />
                        <p className="text-[10px] text-muted-foreground mt-0.5">الافتراضي: {invPreview.pricingRule?.basePricePerUnit}</p>
                      </div>
                      <div>
                        <Label className="text-xs">تكلفة المواد (ج.م)</Label>
                        <Input type="number" value={invMaterialsCost ?? ""} onChange={(e) => setInvMaterialsCost(e.target.value ? Number(e.target.value) : null)} min={0} placeholder={invPreview.materialsCost?.toString()} />
                        <p className="text-[10px] text-muted-foreground mt-0.5">الافتراضي: {invPreview.materialsCost}</p>
                      </div>
                      <div>
                        <Label className="text-xs">تكلفة العمالة (ج.م)</Label>
                        <Input type="number" value={invLaborCost ?? ""} onChange={(e) => setInvLaborCost(e.target.value ? Number(e.target.value) : null)} min={0} placeholder={invPreview.laborCost?.toString()} />
                        <p className="text-[10px] text-muted-foreground mt-0.5">الافتراضي: {invPreview.laborCost}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => loadInvoicePreview(invCaseId)}><RefreshCcw className="w-3 h-3" /> إعادة حساب</Button>
                  </CardContent>
                </Card>

                {/* Custom Items Toggle */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={invUseCustomItems} onChange={(e) => { setInvUseCustomItems(e.target.checked); if (e.target.checked && invCustomItems.length === 0) setInvCustomItems([{ descriptionAr: "", quantity: 1, unitPrice: 0 }]); }} className="rounded" />
                    إضافة بنود مخصصة للفاتورة
                  </label>
                </div>
                {invUseCustomItems && (
                  <div className="space-y-2">
                    {invCustomItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg">
                        <div className="col-span-5"><Label className="text-xs">الوصف</Label><Input value={item.descriptionAr} onChange={(e) => { const u = [...invCustomItems]; u[idx].descriptionAr = e.target.value; setInvCustomItems(u); }} className="h-8 text-xs" /></div>
                        <div className="col-span-2"><Label className="text-xs">الكمية</Label><Input type="number" value={item.quantity} onChange={(e) => { const u = [...invCustomItems]; u[idx].quantity = Number(e.target.value); setInvCustomItems(u); }} min={1} className="h-8 text-xs" /></div>
                        <div className="col-span-3"><Label className="text-xs">سعر الوحدة</Label><Input type="number" value={item.unitPrice} onChange={(e) => { const u = [...invCustomItems]; u[idx].unitPrice = Number(e.target.value); setInvCustomItems(u); }} min={0} className="h-8 text-xs" /></div>
                        <div className="col-span-1 text-center"><p className="text-xs font-bold">{(item.quantity * item.unitPrice).toLocaleString()}</p></div>
                        <div className="col-span-1">{invCustomItems.length > 1 && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => setInvCustomItems(invCustomItems.filter((_, i) => i !== idx))}><Trash2 className="w-3 h-3" /></Button>}</div>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setInvCustomItems([...invCustomItems, { descriptionAr: "", quantity: 1, unitPrice: 0 }])} className="gap-1"><Plus className="w-3 h-3" /> بند</Button>
                  </div>
                )}

                {/* Financial Controls */}
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>الخصم (ج.م)</Label><Input type="number" value={invDiscount} onChange={(e) => setInvDiscount(Number(e.target.value))} min={0} /></div>
                  <div><Label>الضريبة (ج.م)</Label><Input type="number" value={invTax} onChange={(e) => setInvTax(Number(e.target.value))} min={0} /></div>
                  <div><Label>مدة الاستحقاق (يوم)</Label><Input type="number" value={invDueDays} onChange={(e) => setInvDueDays(Number(e.target.value))} min={1} /></div>
                </div>

                {/* Preview Summary */}
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader className="py-3"><CardTitle className="text-sm text-green-700">معاينة الفاتورة</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {invPreview.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-green-200">
                        <span>{item.descriptionAr}</span><span className="font-bold">{item.quantity} x {item.unitPrice.toLocaleString()} = {item.total.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 text-amber-700"><span>تكلفة المواد</span><span>{(invMaterialsCost ?? invPreview.materialsCost).toLocaleString()}</span></div>
                    <div className="flex justify-between py-1 text-blue-700"><span>تكلفة العمالة</span><span>{(invLaborCost ?? invPreview.laborCost).toLocaleString()}</span></div>
                    {invPreview.rushSurcharge > 0 && <div className="flex justify-between py-1 text-red-600"><span>رسوم الاستعجال</span><span>{invPreview.rushSurcharge.toLocaleString()}</span></div>}
                    {invDiscount > 0 && <div className="flex justify-between py-1 text-green-600"><span>الخصم</span><span>-{invDiscount.toLocaleString()}</span></div>}
                    {invTax > 0 && <div className="flex justify-between py-1"><span>الضريبة</span><span>{invTax.toLocaleString()}</span></div>}
                    <div className="flex justify-between py-2 border-t-2 border-green-300 font-bold text-lg">
                      <span>الإجمالي</span><span className="text-green-700">{invPreview.totalAmount.toLocaleString()} ج.م</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {invPreviewLoading && <div className="flex justify-center py-4"><div className="animate-spin w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full" /></div>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateInvoice(false)}>إلغاء</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateInvoice} disabled={!invCaseId}>إصدار الفاتورة</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedInvoice && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> تفاصيل الفاتورة: {selectedInvoice.invoiceNumber}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">رقم الحالة</p><p className="font-mono font-bold text-primary">{selectedInvoice.caseNumber}</p></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">الطبيب</p><p className="font-medium">{selectedInvoice.doctorName}</p></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">المريض</p><p className="font-medium">{selectedInvoice.patientName}</p></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">تاريخ الإصدار</p><p>{new Date(selectedInvoice.issuedDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                </div>
                <Card><CardHeader className="py-3"><CardTitle className="text-sm">تفصيل التكلفة</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
                  {selectedInvoice.items.map((item) => <div key={item.id} className="flex justify-between py-1 border-b"><span>{item.descriptionAr}</span><span>{item.quantity} x {item.unitPrice.toLocaleString()} = <span className="font-bold">{item.total.toLocaleString()}</span></span></div>)}
                  <div className="flex justify-between py-1 text-muted-foreground"><span>تكلفة المواد</span><span>{selectedInvoice.materialsCost.toLocaleString()}</span></div>
                  <div className="flex justify-between py-1 text-muted-foreground"><span>تكلفة العمالة</span><span>{selectedInvoice.laborCost.toLocaleString()}</span></div>
                  {selectedInvoice.rushSurcharge > 0 && <div className="flex justify-between py-1 text-amber-600"><span>رسوم الاستعجال</span><span>{selectedInvoice.rushSurcharge.toLocaleString()}</span></div>}
                  {selectedInvoice.discount > 0 && <div className="flex justify-between py-1 text-green-600"><span>الخصم</span><span>-{selectedInvoice.discount.toLocaleString()}</span></div>}
                  {selectedInvoice.tax > 0 && <div className="flex justify-between py-1"><span>الضريبة</span><span>{selectedInvoice.tax.toLocaleString()}</span></div>}
                  <div className="flex justify-between py-2 border-t-2 font-bold text-base"><span>الإجمالي</span><span>{selectedInvoice.totalAmount.toLocaleString()} ج.م</span></div>
                </CardContent></Card>
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center justify-between"><span>سجل الدفعات</span><div className="flex gap-2 text-xs font-normal"><Badge className="bg-green-100 text-green-800">مدفوع: {selectedInvoice.paidAmount.toLocaleString()}</Badge><Badge className="bg-red-100 text-red-800">متبقي: {selectedInvoice.remainingAmount.toLocaleString()}</Badge></div></CardTitle></CardHeader>
                  <CardContent>
                    {selectedInvoice.payments.length === 0 ? <p className="text-center text-muted-foreground py-4">لا توجد دفعات</p> : (
                      <div className="space-y-2">{selectedInvoice.payments.map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border text-sm"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><div><p className="font-bold text-green-700">{pay.amount.toLocaleString()} ج.م</p><p className="text-xs text-muted-foreground">{PAY_METHOD_AR[pay.method]}{pay.reference && ` - ${pay.reference}`}</p></div></div><div className="text-left text-xs text-muted-foreground"><p>{new Date(pay.paidDate).toLocaleDateString("ar-EG")}</p>{pay.notes && <p className="text-[10px]">{pay.notes}</p>}</div></div>
                      ))}</div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex justify-end gap-2">
                  {selectedInvoice.status !== "cancelled" && selectedInvoice.paymentStatus !== "paid" && (
                    <Button className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => { setSelectedInvoice(null); openPayDialog("invoice", selectedInvoice.id, selectedInvoice.remainingAmount, selectedInvoice.invoiceNumber); }}><CreditCard className="w-4 h-4" /> تسجيل دفعة</Button>
                  )}
                  <Link to={`/invoices/${selectedInvoice.id}/print`}><Button variant="outline" className="gap-1"><Printer className="w-4 h-4" /> طباعة</Button></Link>
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>إغلاق</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={showCreatePO} onOpenChange={setShowCreatePO}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> إنشاء أمر شراء جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>المورد *</Label>
                <Select value={poSupplierId} onValueChange={setPOSupplierId}><SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger><SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>)}
                </SelectContent></Select>
              </div>
              <div><Label>تاريخ التسليم المتوقع</Label><Input type="date" value={poExpDelivery} onChange={(e) => setPOExpDelivery(e.target.value)} dir="ltr" /></div>
              <div><Label>خصم (ج.م)</Label><Input type="number" value={poDiscount} onChange={(e) => setPODiscount(Number(e.target.value))} min={0} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><p className="font-medium text-sm">الأصناف</p><Button size="sm" variant="outline" onClick={() => setPOItems([...poItems, { descriptionAr: "", description: "", sku: "", quantity: 1, unitPrice: 0 }])} className="gap-1"><Plus className="w-3 h-3" /> إضافة</Button></div>
              <div className="space-y-2">
                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg">
                    <div className="col-span-4"><Label className="text-xs">الوصف *</Label><Input value={item.descriptionAr} onChange={(e) => { const u = [...poItems]; u[idx].descriptionAr = e.target.value; setPOItems(u); }} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-xs">SKU</Label><Input value={item.sku} onChange={(e) => { const u = [...poItems]; u[idx].sku = e.target.value; setPOItems(u); }} className="h-8 text-xs" dir="ltr" /></div>
                    <div className="col-span-2"><Label className="text-xs">الكمية</Label><Input type="number" value={item.quantity} onChange={(e) => { const u = [...poItems]; u[idx].quantity = Number(e.target.value); setPOItems(u); }} min={1} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-xs">سعر الشراء</Label><Input type="number" value={item.unitPrice} onChange={(e) => { const u = [...poItems]; u[idx].unitPrice = Number(e.target.value); setPOItems(u); }} min={0} className="h-8 text-xs" /></div>
                    <div className="col-span-1 text-center"><p className="text-xs font-bold">{(item.quantity * item.unitPrice).toLocaleString()}</p></div>
                    <div className="col-span-1">{poItems.length > 1 && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => setPOItems(poItems.filter((_, i) => i !== idx))}><Trash2 className="w-3 h-3" /></Button>}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-accent/20 rounded-lg flex items-center justify-between">
                <div className="text-sm">الإجمالي الفرعي: <span className="font-bold">{poSubtotal.toLocaleString()} ج.م</span>{poDiscount > 0 && <span className="text-green-600 mr-2"> | خصم: -{poDiscount.toLocaleString()}</span>}</div>
                <div className="text-left"><p className="text-xs text-muted-foreground">الإجمالي</p><p className="text-xl font-bold text-indigo-600">{(poSubtotal - poDiscount).toLocaleString()} ج.م</p></div>
              </div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={poNotes} onChange={(e) => setPONotes(e.target.value)} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreatePO(false)}>إلغاء</Button><Button onClick={handleCreatePO}>إنشاء أمر الشراء</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Detail Dialog */}
      <Dialog open={!!selectedPO} onOpenChange={(o) => !o && setSelectedPO(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedPO && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> تفاصيل أمر الشراء: {selectedPO.poNumber}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">المورد</p><p className="font-bold">{selectedPO.supplierNameAr}</p></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">الحالة</p><span className={`text-xs px-2 py-0.5 rounded-full ${PO_STATUS_COLOR[selectedPO.status]}`}>{PO_STATUS_AR[selectedPO.status]}</span></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">تاريخ الأمر</p><p>{new Date(selectedPO.orderDate).toLocaleDateString("ar-EG")}</p></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">تاريخ الاستلام</p><p>{selectedPO.receivedDate ? new Date(selectedPO.receivedDate).toLocaleDateString("ar-EG") : "لم يُستلم بعد"}</p></div>
                </div>
                {/* Items */}
                <Card><CardHeader className="py-3"><CardTitle className="text-sm">الأصناف</CardTitle></CardHeader><CardContent>
                  <table className="w-full text-sm"><thead><tr className="border-b text-muted-foreground"><th className="text-right py-2 px-2">الصنف</th><th className="text-right py-2 px-2">SKU</th><th className="text-right py-2 px-2">الكمية</th><th className="text-right py-2 px-2">السعر</th><th className="text-right py-2 px-2">الإجمالي</th></tr></thead>
                    <tbody>{selectedPO.items.map(i => <tr key={i.id} className="border-b"><td className="py-2 px-2">{i.descriptionAr}</td><td className="py-2 px-2 font-mono text-xs">{i.sku || "-"}</td><td className="py-2 px-2">{i.quantity}</td><td className="py-2 px-2">{i.unitPrice.toLocaleString()}</td><td className="py-2 px-2 font-bold">{i.total.toLocaleString()}</td></tr>)}</tbody>
                    <tfoot><tr className="border-t-2 font-bold"><td colSpan={4} className="py-2 px-2">الإجمالي</td><td className="py-2 px-2">{selectedPO.totalAmount.toLocaleString()} ج.م</td></tr></tfoot>
                  </table>
                </CardContent></Card>
                {/* Payments */}
                <Card><CardHeader className="py-3"><CardTitle className="text-sm flex items-center justify-between"><span>المدفوعات</span><div className="flex gap-2 text-xs font-normal"><Badge className="bg-green-100 text-green-800">مدفوع: {selectedPO.paidAmount.toLocaleString()}</Badge><Badge className="bg-red-100 text-red-800">متبقي: {selectedPO.remainingAmount.toLocaleString()}</Badge></div></CardTitle></CardHeader>
                  <CardContent>{selectedPO.payments.length === 0 ? <p className="text-center text-muted-foreground py-3">لا توجد دفعات</p> : (
                    <div className="space-y-2">{selectedPO.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded border text-sm"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><div><p className="font-bold text-green-700">{p.amount.toLocaleString()} ج.م</p><p className="text-xs text-muted-foreground">{PAY_METHOD_AR[p.method]}{p.reference && ` - ${p.reference}`}</p></div></div><p className="text-xs text-muted-foreground">{new Date(p.paidDate).toLocaleDateString("ar-EG")}</p></div>
                    ))}</div>
                  )}</CardContent>
                </Card>
                <div className="flex justify-end gap-2 flex-wrap">
                  {selectedPO.status === "draft" && <Button variant="outline" className="gap-1" onClick={() => { setSelectedPO(null); updatePOStatus(selectedPO.id, "sent"); }}><Send className="w-4 h-4" /> إرسال</Button>}
                  {selectedPO.status === "sent" && <Button variant="outline" className="gap-1 text-green-700" onClick={() => { setSelectedPO(null); updatePOStatus(selectedPO.id, "received"); }}><CheckCircle className="w-4 h-4" /> تأكيد الاستلام</Button>}
                  {selectedPO.status === "received" && !expenses.some((e: any) => e.purchaseOrderId === selectedPO.id) && (
                    <Button variant="outline" className="gap-1 text-amber-700 border-amber-300" onClick={() => createExpenseFromPO(selectedPO.id)}>
                      <Receipt className="w-4 h-4" /> تسجيل كمصروف
                    </Button>
                  )}
                  {selectedPO.remainingAmount > 0 && selectedPO.status !== "cancelled" && (
                    <Button className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => { setSelectedPO(null); openPayDialog("po", selectedPO.id, selectedPO.remainingAmount, selectedPO.poNumber); }}><CreditCard className="w-4 h-4" /> تسجيل دفعة</Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedPO(null)}>إغلاق</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pricing Rule Edit Dialog */}
      <Dialog open={!!editingPricing} onOpenChange={(o) => !o && setEditingPricing(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          {editingPricing && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> تعديل تسعير: {WORK_TYPE_LABELS[editingPricing.workType]?.ar || editingPricing.workType}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>سعر الوحدة (ج.م) *</Label><Input type="number" value={editingPricing.basePricePerUnit} onChange={(e) => setEditingPricing({ ...editingPricing, basePricePerUnit: Number(e.target.value) })} min={0} /></div>
                  <div><Label>مُضاعف تكلفة المواد *</Label><Input type="number" value={editingPricing.materialCostMultiplier} onChange={(e) => setEditingPricing({ ...editingPricing, materialCostMultiplier: Number(e.target.value) })} min={1} step={0.1} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>تكلفة العمالة/ساعة (ج.م) *</Label><Input type="number" value={editingPricing.laborCostPerHour} onChange={(e) => setEditingPricing({ ...editingPricing, laborCostPerHour: Number(e.target.value) })} min={0} /></div>
                  <div><Label>هامش الربح %</Label><Input type="number" value={editingPricing.profitMarginPercent} onChange={(e) => setEditingPricing({ ...editingPricing, profitMarginPercent: Number(e.target.value) })} min={0} max={100} /></div>
                </div>
                <div><Label>نسبة الاستعجال %</Label><Input type="number" value={editingPricing.rushSurchargePercent} onChange={(e) => setEditingPricing({ ...editingPricing, rushSurchargePercent: Number(e.target.value) })} min={0} max={100} /></div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-xs">
                  <p className="font-bold text-green-800">معاينة (سنة واحدة):</p>
                  <p>السعر الأساس: {editingPricing.basePricePerUnit.toLocaleString()} ج.م</p>
                  <p>تكلفة المواد: {(editingPricing.basePricePerUnit * editingPricing.materialCostMultiplier - editingPricing.basePricePerUnit).toLocaleString()} ج.م</p>
                  <p>تكلفة العمالة (2 ساعة): {(editingPricing.laborCostPerHour * 2).toLocaleString()} ج.م</p>
                  <p className="font-bold mt-1">الإجمالي: {(editingPricing.basePricePerUnit + (editingPricing.basePricePerUnit * editingPricing.materialCostMultiplier - editingPricing.basePricePerUnit) + editingPricing.laborCostPerHour * 2).toLocaleString()} ج.م</p>
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingPricing(null)}>إلغاء</Button><Button onClick={savePricingRule}>حفظ التعديلات</Button></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Expense Form Dialog */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editingExpense ? "تعديل مصروف" : "إضافة مصروف جديد"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الفئة *</Label><Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>المبلغ (ج.م) *</Label><Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })} min={0} step={0.01} /></div>
            </div>
            <div><Label>الوصف *</Label><Textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="وصف المصروف..." rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ</Label><Input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} /></div>
              <div><Label>المورد</Label><Input value={expForm.vendor} onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })} placeholder="اسم المورد" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المرجع</Label><Input value={expForm.reference} onChange={(e) => setExpForm({ ...expForm, reference: e.target.value })} placeholder="PO-2026-001" dir="ltr" /></div>
              <div><Label>ملاحظات</Label><Input value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} placeholder="ملاحظات..." /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setShowExpenseForm(false)}>إلغاء</Button><Button onClick={saveExpense}>{editingExpense ? "تحديث" : "إضافة"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════

const KPI_STYLES: Record<string, { card: string; icon: string; value: string; label: string }> = {
  green: { card: "border-green-200 bg-green-50/50", icon: "text-green-600", value: "text-green-700", label: "text-green-600" },
  blue: { card: "border-blue-200 bg-blue-50/50", icon: "text-blue-600", value: "text-blue-700", label: "text-blue-600" },
  red: { card: "border-red-200 bg-red-50/50", icon: "text-red-500", value: "text-red-600", label: "text-red-500" },
  amber: { card: "border-amber-200 bg-amber-50/50", icon: "text-amber-600", value: "text-amber-700", label: "text-amber-600" },
  emerald: { card: "border-emerald-200 bg-emerald-50/50", icon: "text-emerald-600", value: "text-emerald-700", label: "text-emerald-600" },
  purple: { card: "border-purple-200 bg-purple-50/50", icon: "text-purple-600", value: "text-purple-700", label: "text-purple-600" },
  indigo: { card: "border-indigo-200 bg-indigo-50/50", icon: "text-indigo-600", value: "text-indigo-700", label: "text-indigo-600" },
};

function KPI({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  const s = KPI_STYLES[color] || KPI_STYLES.blue;
  return (
    <Card className={s.card}>
      <CardContent className="pt-4 text-center">
        <div className={`${s.icon} mx-auto mb-1 flex justify-center`}>{icon}</div>
        <p className={`text-2xl font-bold ${s.value}`}>{value}</p>
        <p className={`text-[11px] ${s.label}`}>{label}</p>
      </CardContent>
    </Card>
  );
}

function CostBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const isGreen = color === "green";
  return (
    <div className={`p-4 rounded-lg ${isGreen ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-xl font-bold ${isGreen ? "text-green-700" : "text-red-600"}`}>{value.toLocaleString()} ج.م</span>
      </div>
      <div className={`w-full h-3 ${isGreen ? "bg-green-200" : "bg-red-200"} rounded-full`}>
        <div className={`h-full ${isGreen ? "bg-green-500" : "bg-red-500"} rounded-full`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}
