/**
 * Inventory Management Page - Enterprise Grade
 * Full CRUD, Stock Dashboard, Transactions, Analytics, Suppliers, Expiry Tracking
 */

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Package, AlertTriangle, Plus, TrendingDown, TrendingUp,
  Search, Trash2, Edit, X, Save, BarChart3, Truck, Clock,
  ShieldAlert, FileSpreadsheet, ArrowUpDown, Eye, Printer,
  Calendar, DollarSign, Boxes, RotateCcw, Filter, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import type { InventoryItem, InventoryTransaction } from "@shared/api";

// ══════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
  blocks: "بلوكات",
  raw_materials: "مواد خام",
  consumables: "مستلزمات",
  tools: "أدوات",
};

const CATEGORY_COLORS: Record<string, string> = {
  blocks: "#6366f1",
  raw_materials: "#f59e0b",
  consumables: "#10b981",
  tools: "#ef4444",
};

const UNIT_OPTIONS = ["unit", "piece", "box", "gram", "kg", "ml", "liter", "roll", "set", "tube", "syringe", "pack", "cartridge"];
const UNIT_LABELS: Record<string, string> = {
  unit: "وحدة", piece: "قطعة", box: "علبة", gram: "جرام",
  kg: "كجم", ml: "مل", liter: "لتر", roll: "رول", set: "طقم",
  tube: "أنبوب", syringe: "حقنة", pack: "عبوة", cartridge: "كارتريدج",
};

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const emptyItem = {
  name: "", nameAr: "", sku: "", category: "blocks" as const,
  currentStock: 0, minimumStock: 5, reorderPoint: 10, unit: "unit",
  costPerUnit: 0, supplier: "", supplierAr: "", supplierPhone: "",
  location: "", batchNumber: "", expiryDate: "", notes: "",
};

// ══════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all | low | out | expiring

  // Dialog states
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Restock dialog
  const [restockItem, setRestockItemState] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(0);
  const [restockReason, setRestockReason] = useState("توريد يدوي");
  const [restockBatch, setRestockBatch] = useState("");

  // Deduct dialog
  const [deductItem, setDeductItem] = useState<InventoryItem | null>(null);
  const [deductQty, setDeductQty] = useState(0);
  const [deductReason, setDeductReason] = useState("");

  // Analytics
  const [categorySummary, setCategorySummary] = useState<any[]>([]);
  const [consumption, setConsumption] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState("all"); // all | deduction | addition
  const [txSearch, setTxSearch] = useState("");

  // Sort
  const [sortBy, setSortBy] = useState<string>("nameAr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => { loadData(); }, [category]);
  useEffect(() => { if (activeTab === "analytics") loadAnalytics(); }, [activeTab]);
  useEffect(() => { if (activeTab === "suppliers") loadSuppliers(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (search) params.set("search", search);

    const [itemsRes, txRes] = await Promise.all([
      api.get<any>(`/inventory?${params}`),
      api.get<any>("/inventory/transactions"),
    ]);
    setItems(itemsRes.data || []);
    setTransactions(txRes.data || []);
    setLoading(false);
  };

  const loadAnalytics = async () => {
    const [catRes, consRes, stockRes, expRes] = await Promise.all([
      api.get<any>("/inventory/analytics/category-summary"),
      api.get<any>("/inventory/analytics/consumption?days=30"),
      api.get<any>("/inventory/analytics/stock-levels"),
      api.get<any>("/inventory/analytics/expiring?days=90"),
    ]);
    setCategorySummary(catRes.data || []);
    setConsumption(consRes.data || []);
    setStockLevels(stockRes.data || []);
    setExpiringItems(expRes.data || []);
  };

  const loadSuppliers = async () => {
    const res = await api.get<any>("/inventory/analytics/supplier-summary");
    setSuppliers(res.data || []);
  };

  // ── Actions ──────────────────────────────

  const openAdd = () => {
    setForm(emptyItem);
    setEditingItem(null);
    setShowAdd(true);
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name, nameAr: item.nameAr, sku: item.sku,
      category: item.category as any, currentStock: item.currentStock,
      minimumStock: item.minimumStock, reorderPoint: (item as any).reorderPoint || item.minimumStock * 2,
      unit: item.unit, costPerUnit: item.costPerUnit,
      supplier: item.supplier || "", supplierAr: (item as any).supplierAr || "",
      supplierPhone: (item as any).supplierPhone || "",
      location: item.location || "", batchNumber: (item as any).batchNumber || "",
      expiryDate: (item as any).expiryDate ? (item as any).expiryDate.split("T")[0] : "",
      notes: (item as any).notes || "",
    });
    setEditingItem(item);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.nameAr || !form.sku) {
      toast.error("يرجى ملء الحقول المطلوبة: اسم الصنف والكود");
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await api.put<any>(`/inventory/${editingItem.id}`, form);
        toast.success("تم تحديث الصنف بنجاح");
      } else {
        await api.post<any>("/inventory", form);
        toast.success("تم إضافة الصنف بنجاح");
      }
      setShowAdd(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`هل أنت متأكد من حذف "${item.nameAr}"؟`)) return;
    try {
      await api.delete<any>(`/inventory/${item.id}`);
      toast.success("تم حذف الصنف");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  const handleRestock = async () => {
    if (!restockItem || restockQty <= 0) {
      toast.error("يرجى إدخال كمية صحيحة");
      return;
    }
    try {
      await api.post<any>(`/inventory/${restockItem.id}/restock`, {
        quantity: restockQty,
        reason: restockReason || "توريد يدوي",
      });
      toast.success(`تم توريد ${restockQty} ${UNIT_LABELS[restockItem.unit] || restockItem.unit} من ${restockItem.nameAr}`);
      setRestockItemState(null);
      setRestockQty(0);
      setRestockReason("توريد يدوي");
      setRestockBatch("");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeduct = async () => {
    if (!deductItem || deductQty <= 0) {
      toast.error("يرجى إدخال كمية صحيحة");
      return;
    }
    try {
      await api.post<any>(`/inventory/${deductItem.id}/deduct`, {
        quantity: deductQty,
        reason: deductReason || "صرف يدوي",
      });
      toast.success(`تم خصم ${deductQty} ${UNIT_LABELS[deductItem.unit] || deductItem.unit} من ${deductItem.nameAr}`);
      setDeductItem(null);
      setDeductQty(0);
      setDeductReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Computed ──────────────────────────────

  const lowStockItems = useMemo(() => items.filter((i) => i.currentStock <= i.minimumStock), [items]);
  const outOfStockItems = useMemo(() => items.filter((i) => i.currentStock === 0), [items]);
  const totalStockValue = useMemo(() => items.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0), [items]);
  const totalItems = items.length;

  const filteredItems = useMemo(() => {
    let filtered = [...items];
    if (stockFilter === "low") filtered = filtered.filter((i) => i.currentStock <= i.minimumStock && i.currentStock > 0);
    else if (stockFilter === "out") filtered = filtered.filter((i) => i.currentStock === 0);
    else if (stockFilter === "expiring") filtered = filtered.filter((i) => {
      if (!(i as any).expiryDate) return false;
      const days = Math.ceil((new Date((i as any).expiryDate).getTime() - Date.now()) / 86400000);
      return days <= 90 && days > 0;
    });
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((i) =>
        i.nameAr.includes(s) || i.name.toLowerCase().includes(s) || i.sku.toLowerCase().includes(s)
      );
    }
    // Sort
    filtered.sort((a: any, b: any) => {
      let av = a[sortBy], bv = b[sortBy];
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [items, stockFilter, search, sortBy, sortDir]);

  const filteredTransactions = useMemo(() => {
    let txs = [...transactions];
    if (txFilter !== "all") txs = txs.filter((t) => t.type === txFilter);
    if (txSearch) {
      const s = txSearch.toLowerCase();
      txs = txs.filter((t) => t.itemName.toLowerCase().includes(s) || (t.caseNumber || "").toLowerCase().includes(s) || t.reason.toLowerCase().includes(s));
    }
    return txs;
  }, [transactions, txFilter, txSearch]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const exportCSV = () => {
    const headers = "الكود,الصنف,الفئة,المخزون,الحد الأدنى,سعر الوحدة,القيمة,المورد,الموقع\n";
    const rows = items.map((i) =>
      `${i.sku},${i.nameAr},${CATEGORY_LABELS[i.category]},${i.currentStock},${i.minimumStock},${i.costPerUnit},${i.currentStock * i.costPerUnit},${(i as any).supplierAr || i.supplier || ""},${i.location || ""}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("تم تصدير البيانات بنجاح");
  };

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            إدارة المخازن
          </h1>
          <p className="text-muted-foreground">إدارة شاملة للمواد والبلوكات والمستلزمات والأدوات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> إضافة صنف جديد
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard" className="gap-1"><BarChart3 className="w-3.5 h-3.5" /> لوحة المخزون</TabsTrigger>
          <TabsTrigger value="stock" className="gap-1"><Boxes className="w-3.5 h-3.5" /> الأصناف</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1"><ArrowUpDown className="w-3.5 h-3.5" /> الحركات</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> التنبيهات
            {lowStockItems.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 mr-1">{lowStockItems.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> التحليلات</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1"><Truck className="w-3.5 h-3.5" /> الموردين</TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════ */}
        {/* TAB 1: Dashboard                     */}
        {/* ═════════════════════════════════════ */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard icon={<Package className="w-5 h-5" />} label="إجمالي الأصناف" value={totalItems} color="text-indigo-600" />
            <KPICard icon={<DollarSign className="w-5 h-5" />} label="قيمة المخزون" value={`${totalStockValue.toLocaleString("ar-EG")} ج.م`} color="text-green-600" />
            <KPICard icon={<Boxes className="w-5 h-5" />} label="بلوكات متاحة" value={items.filter(i => i.category === "blocks").reduce((s, i) => s + i.currentStock, 0)} color="text-blue-600" />
            <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="تحت الحد الأدنى" value={lowStockItems.length} color="text-amber-600" warn={lowStockItems.length > 0} />
            <KPICard icon={<ShieldAlert className="w-5 h-5" />} label="نفد المخزون" value={outOfStockItems.length} color="text-red-600" warn={outOfStockItems.length > 0} />
            <KPICard icon={<RotateCcw className="w-5 h-5" />} label="حركات اليوم" value={transactions.filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString()).length} color="text-purple-600" />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Stock by Category */}
            <Card>
              <CardHeader><CardTitle className="text-lg">توزيع المخزون حسب الفئة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        items.reduce((acc: any, item) => {
                          const cat = CATEGORY_LABELS[item.category] || item.category;
                          if (!acc[cat]) acc[cat] = 0;
                          acc[cat] += item.currentStock * item.costPerUnit;
                          return acc;
                        }, {})
                      ).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      dataKey="value" nameKey="name" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.keys(CATEGORY_LABELS).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString("ar-EG")} ج.م`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock Levels Bar */}
            <Card>
              <CardHeader><CardTitle className="text-lg">حالة المخزون - أهم الأصناف</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={items.slice(0, 10).map(i => ({
                    name: i.nameAr.length > 15 ? i.nameAr.slice(0, 15) + "..." : i.nameAr,
                    currentStock: i.currentStock,
                    minimumStock: i.minimumStock,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="currentStock" name="المخزون الحالي" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="minimumStock" name="الحد الأدنى" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader><CardTitle className="text-lg">آخر الحركات</CardTitle></CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا توجد حركات بعد</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border text-sm hover:bg-accent/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "deduction" ? "bg-red-100" : "bg-green-100"}`}>
                          {tx.type === "deduction" ? <TrendingDown className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-green-500" />}
                        </div>
                        <div>
                          <p className="font-medium">{tx.itemName}</p>
                          <p className="text-xs text-muted-foreground">{tx.reason}</p>
                          {tx.caseNumber && <Badge variant="outline" className="text-xs mt-0.5">حالة: {tx.caseNumber}</Badge>}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`font-bold ${tx.type === "deduction" ? "text-red-600" : "text-green-600"}`}>
                          {tx.type === "deduction" ? "-" : "+"}{tx.quantity}
                        </span>
                        <p className="text-xs text-muted-foreground">{tx.previousStock} → {tx.newStock}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("ar-EG")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════ */}
        {/* TAB 2: Stock Items                   */}
        {/* ═════════════════════════════════════ */}
        <TabsContent value="stock" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الكود..."
                className="pr-10" onKeyDown={(e) => e.key === "Enter" && loadData()} />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="الفئة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                <SelectItem value="blocks">بلوكات</SelectItem>
                <SelectItem value="raw_materials">مواد خام</SelectItem>
                <SelectItem value="consumables">مستلزمات</SelectItem>
                <SelectItem value="tools">أدوات</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="حالة المخزون" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="low">تحت الحد الأدنى</SelectItem>
                <SelectItem value="out">نفد المخزون</SelectItem>
                <SelectItem value="expiring">قارب على الانتهاء</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} className="gap-1"><Search className="w-4 h-4" /> بحث</Button>
          </div>

          {/* Stock Table */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد أصناف تطابق البحث</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <SortHeader field="sku" label="الكود" current={sortBy} dir={sortDir} onClick={toggleSort} />
                        <SortHeader field="nameAr" label="الصنف" current={sortBy} dir={sortDir} onClick={toggleSort} />
                        <th className="text-right py-3 px-2 font-medium">الفئة</th>
                        <SortHeader field="currentStock" label="المخزون" current={sortBy} dir={sortDir} onClick={toggleSort} />
                        <th className="text-right py-3 px-2 font-medium">الحد الأدنى</th>
                        <SortHeader field="costPerUnit" label="سعر الوحدة" current={sortBy} dir={sortDir} onClick={toggleSort} />
                        <th className="text-right py-3 px-2 font-medium">القيمة</th>
                        <th className="text-right py-3 px-2 font-medium">المورد</th>
                        <th className="text-right py-3 px-2 font-medium">الموقع</th>
                        <th className="text-right py-3 px-2 font-medium">الصلاحية</th>
                        <th className="text-center py-3 px-2 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const val = item.currentStock * item.costPerUnit;
                        const isExpiring = (item as any).expiryDate && Math.ceil((new Date((item as any).expiryDate).getTime() - Date.now()) / 86400000) <= 90;
                        return (
                          <tr key={item.id} className={`border-b hover:bg-accent/30 transition-colors ${item.currentStock === 0 ? "bg-red-50" : item.currentStock <= item.minimumStock ? "bg-amber-50" : ""}`}>
                            <td className="py-3 px-2 font-mono text-xs">{item.sku}</td>
                            <td className="py-3 px-2">
                              <div>
                                <p className="font-medium">{item.nameAr}</p>
                                {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                                {(item as any).batchNumber && <p className="text-xs text-blue-500">دفعة: {(item as any).batchNumber}</p>}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="outline" style={{ borderColor: CATEGORY_COLORS[item.category], color: CATEGORY_COLORS[item.category] }}>
                                {CATEGORY_LABELS[item.category] || item.category}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1">
                                <span className={`font-bold ${item.currentStock === 0 ? "text-red-700" : item.currentStock <= item.minimumStock ? "text-amber-600" : "text-green-600"}`}>
                                  {item.currentStock}
                                </span>
                                <span className="text-muted-foreground text-xs">{UNIT_LABELS[item.unit] || item.unit}</span>
                              </div>
                              {/* Stock bar */}
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                                <div className={`h-full rounded-full ${item.currentStock === 0 ? "bg-red-500" : item.currentStock <= item.minimumStock ? "bg-amber-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(100, (item.currentStock / (item.minimumStock * 3)) * 100)}%` }} />
                              </div>
                            </td>
                            <td className="py-3 px-2 text-muted-foreground">{item.minimumStock}</td>
                            <td className="py-3 px-2">{item.costPerUnit.toLocaleString("ar-EG")} ج.م</td>
                            <td className="py-3 px-2 font-medium">{val.toLocaleString("ar-EG")} ج.م</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs">{(item as any).supplierAr || item.supplier || "-"}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs">{item.location || "-"}</td>
                            <td className="py-3 px-2 text-xs">
                              {(item as any).expiryDate ? (
                                <span className={isExpiring ? "text-red-600 font-bold" : "text-muted-foreground"}>
                                  {new Date((item as any).expiryDate).toLocaleDateString("ar-EG")}
                                  {isExpiring && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                </span>
                              ) : "-"}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1 justify-center flex-wrap">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" title="توريد"
                                  onClick={() => { setRestockItemState(item); setRestockQty(item.minimumStock * 2); }}>
                                  <TrendingUp className="w-3 h-3" /> توريد
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600" title="صرف"
                                  onClick={() => { setDeductItem(item); setDeductQty(1); }}>
                                  <TrendingDown className="w-3 h-3" /> صرف
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="عرض" onClick={() => setDetailItem(item)}>
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="تعديل" onClick={() => openEdit(item)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" title="حذف"
                                  onClick={() => handleDelete(item)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="text-sm text-muted-foreground mt-3 text-center">
                    عرض {filteredItems.length} من {items.length} صنف
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════ */}
        {/* TAB 3: Transactions                  */}
        {/* ═════════════════════════════════════ */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="بحث في الحركات..." className="pr-10" />
            </div>
            <Select value={txFilter} onValueChange={setTxFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحركات</SelectItem>
                <SelectItem value="deduction">صرف (خصم)</SelectItem>
                <SelectItem value="addition">توريد (إضافة)</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="h-9 px-3 gap-1">
              <span className="text-muted-foreground">إجمالي:</span> {filteredTransactions.length}
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-4">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد حركات</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-right py-3 px-2 font-medium">النوع</th>
                        <th className="text-right py-3 px-2 font-medium">الصنف</th>
                        <th className="text-right py-3 px-2 font-medium">الكمية</th>
                        <th className="text-right py-3 px-2 font-medium">المخزون (قبل → بعد)</th>
                        <th className="text-right py-3 px-2 font-medium">السبب</th>
                        <th className="text-right py-3 px-2 font-medium">الحالة</th>
                        <th className="text-right py-3 px-2 font-medium">بواسطة</th>
                        <th className="text-right py-3 px-2 font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === "deduction" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {tx.type === "deduction" ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                              {tx.type === "deduction" ? "صرف" : "توريد"}
                            </div>
                          </td>
                          <td className="py-3 px-2 font-medium">{tx.itemName}</td>
                          <td className="py-3 px-2">
                            <span className={`font-bold ${tx.type === "deduction" ? "text-red-600" : "text-green-600"}`}>
                              {tx.type === "deduction" ? "-" : "+"}{tx.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{tx.previousStock} → {tx.newStock}</td>
                          <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px] truncate">{tx.reason}</td>
                          <td className="py-3 px-2">
                            {tx.caseNumber ? <Badge variant="outline" className="text-xs">حالة: {tx.caseNumber}</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="py-3 px-2 text-xs">{tx.performedByName}</td>
                          <td className="py-3 px-2 text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString("ar-EG")}
                            <br />{new Date(tx.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════ */}
        {/* TAB 4: Alerts                        */}
        {/* ═════════════════════════════════════ */}
        <TabsContent value="alerts" className="space-y-6">
          {/* Out of Stock */}
          {outOfStockItems.length > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  نفد المخزون ({outOfStockItems.length} صنف)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {outOfStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium text-sm">{item.nameAr}</p>
                        <p className="text-xs text-red-600 font-bold">المخزون: 0</p>
                        <p className="text-xs text-muted-foreground">الحد الأدنى: {item.minimumStock}</p>
                      </div>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => { setRestockItemState(item); setRestockQty(item.minimumStock * 3); }}>
                        توريد عاجل
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock */}
          {lowStockItems.filter(i => i.currentStock > 0).length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  تحت الحد الأدنى ({lowStockItems.filter(i => i.currentStock > 0).length} صنف)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {lowStockItems.filter(i => i.currentStock > 0).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                      <div>
                        <p className="font-medium text-sm">{item.nameAr}</p>
                        <p className="text-xs text-muted-foreground">
                          المتاح: <span className="text-amber-600 font-bold">{item.currentStock}</span> / الحد الأدنى: {item.minimumStock}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-amber-700 border-amber-300"
                        onClick={() => { setRestockItemState(item); setRestockQty(item.minimumStock * 2); }}>
                        توريد
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expiring Soon */}
          {(() => {
            const exp = items.filter(i => {
              if (!(i as any).expiryDate) return false;
              const days = Math.ceil((new Date((i as any).expiryDate).getTime() - Date.now()) / 86400000);
              return days <= 90 && days > 0;
            });
            if (exp.length === 0) return null;
            return (
              <Card className="border-orange-300 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    مواد قاربت على انتهاء الصلاحية ({exp.length} صنف)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {exp.map((item) => {
                      const days = Math.ceil((new Date((item as any).expiryDate).getTime() - Date.now()) / 86400000);
                      return (
                        <div key={item.id} className="p-3 bg-white rounded-lg border border-orange-200">
                          <p className="font-medium text-sm">{item.nameAr}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-orange-700 font-bold">
                              {days <= 30 ? `⚠️ ${days} يوم` : `${days} يوم`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date((item as any).expiryDate).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <p className="text-green-800 font-bold text-lg">المخزون في حالة ممتازة</p>
                <p className="text-green-700 text-sm">لا توجد تنبيهات حالياً - جميع الأصناف فوق الحد الأدنى</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═════════════════════════════════════ */}
        {/* TAB 5: Analytics                     */}
        {/* ═════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Category Summary */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">ملخص حسب الفئة</CardTitle></CardHeader>
              <CardContent>
                {categorySummary.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">جاري التحميل...</p>
                ) : (
                  <div className="space-y-4">
                    {categorySummary.map((cat: any) => (
                      <div key={cat.category} className="p-3 rounded-lg border hover:bg-accent/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.category] }} />
                            <span className="font-medium">{cat.categoryAr}</span>
                          </div>
                          <Badge variant="outline">{cat.count} صنف</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">إجمالي المخزون</p>
                            <p className="font-bold">{cat.totalStock.toLocaleString("ar-EG")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">القيمة</p>
                            <p className="font-bold">{cat.totalValue.toLocaleString("ar-EG")} ج.م</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">تحت الحد الأدنى</p>
                            <p className={`font-bold ${cat.lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>{cat.lowStockCount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Value Chart */}
            <Card>
              <CardHeader><CardTitle className="text-lg">توزيع القيمة حسب الفئة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categorySummary} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="categoryAr" type="category" width={80} fontSize={12} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString("ar-EG")} ج.م`} />
                    <Bar dataKey="totalValue" name="القيمة" radius={[0, 4, 4, 0]}>
                      {categorySummary.map((entry: any, i: number) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.category] || PIE_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Consumption Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                تقرير الاستهلاك (آخر 30 يوم)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {consumption.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا يوجد استهلاك في هذه الفترة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-right py-3 px-2 font-medium">#</th>
                        <th className="text-right py-3 px-2 font-medium">الصنف</th>
                        <th className="text-right py-3 px-2 font-medium">إجمالي المصروف</th>
                        <th className="text-right py-3 px-2 font-medium">عدد العمليات</th>
                        <th className="text-right py-3 px-2 font-medium">التكلفة</th>
                        <th className="text-right py-3 px-2 font-medium">شريط الاستهلاك</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumption.map((c: any, i: number) => (
                        <tr key={c.itemId} className="border-b hover:bg-accent/20">
                          <td className="py-3 px-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-3 px-2 font-medium">{c.itemName}</td>
                          <td className="py-3 px-2 text-red-600 font-bold">{c.totalUsed}</td>
                          <td className="py-3 px-2">{c.txCount}</td>
                          <td className="py-3 px-2">{c.cost.toLocaleString("ar-EG")} ج.م</td>
                          <td className="py-3 px-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (c.totalUsed / (consumption[0]?.totalUsed || 1)) * 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Levels Health */}
          <Card>
            <CardHeader><CardTitle className="text-lg">صحة المخزون - جميع الأصناف</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stockLevels.map((sl: any) => (
                  <div key={sl.id} className={`p-3 rounded-lg border ${sl.status === "out" ? "border-red-300 bg-red-50" : sl.status === "low" ? "border-amber-300 bg-amber-50" : sl.status === "ok" ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-xs truncate flex-1">{sl.nameAr}</p>
                      <Badge variant={sl.status === "out" ? "destructive" : sl.status === "low" ? "secondary" : "outline"} className="text-xs mr-1">
                        {sl.status === "out" ? "نفد" : sl.status === "low" ? "منخفض" : sl.status === "ok" ? "مقبول" : "جيد"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sl.currentStock} / {sl.minimumStock * 3}</span>
                      <span>{sl.stockValue.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                      <div className={`h-full rounded-full transition-all ${sl.status === "out" ? "bg-red-500" : sl.status === "low" ? "bg-amber-500" : sl.status === "ok" ? "bg-blue-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(100, sl.stockPercent)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════ */}
        {/* TAB 6: Suppliers                     */}
        {/* ═════════════════════════════════════ */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Supplier Value Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-lg">توزيع قيمة المخزون حسب المورد</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={suppliers.map((s: any) => ({ name: s.nameAr || s.name, value: s.totalValue }))}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value"
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {suppliers.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString("ar-EG")} ج.م`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Suppliers Summary */}
            <Card>
              <CardHeader><CardTitle className="text-lg">ملخص الموردين</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliers.map((s: any, i: number) => (
                    <div key={s.name} className="p-3 rounded-lg border hover:bg-accent/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                            {(s.nameAr || s.name).charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.nameAr || s.name}</p>
                            {s.nameAr && s.name !== s.nameAr && <p className="text-xs text-muted-foreground">{s.name}</p>}
                          </div>
                        </div>
                        <Badge variant="outline">{s.itemCount} صنف</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">قيمة المخزون:</span>
                        <span className="font-bold">{s.totalValue.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">الأصناف: {s.items.join("، ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═════════════════════════════════════════ */}
      {/* DIALOGS                                  */}
      {/* ═════════════════════════════════════════ */}

      {/* Add/Edit Item Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingItem ? "تعديل صنف" : "إضافة صنف جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Basic Info */}
            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">البيانات الأساسية</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم الصنف (عربي) *</Label>
                  <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="مثال: بلوك زركونيا" />
                </div>
                <div>
                  <Label>اسم الصنف (إنجليزي)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Zirconia Block" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label>الكود (SKU) *</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="BLK-ZR-001" dir="ltr" />
                </div>
                <div>
                  <Label>الفئة</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الوحدة</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>{UNIT_LABELS[u] || u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stock & Pricing */}
            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">المخزون والتسعير</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>المخزون الحالي</Label>
                  <Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <Label>الحد الأدنى</Label>
                  <Input type="number" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <Label>نقطة إعادة الطلب</Label>
                  <Input type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <Label>سعر الوحدة (ج.م)</Label>
                  <Input type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} min={0} step={0.01} />
                </div>
              </div>
            </div>

            {/* Supplier & Location */}
            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">المورد والموقع</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>المورد (عربي)</Label>
                  <Input value={form.supplierAr} onChange={(e) => setForm({ ...form, supplierAr: e.target.value })} placeholder="شركة المواد الطبية" />
                </div>
                <div>
                  <Label>المورد (إنجليزي)</Label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Medical Supplies Co." dir="ltr" />
                </div>
                <div>
                  <Label>هاتف المورد</Label>
                  <Input value={form.supplierPhone} onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label>الموقع/الرف</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="رف A-3" />
                </div>
                <div>
                  <Label>رقم الدفعة</Label>
                  <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="LOT-2026-001" dir="ltr" />
                </div>
                <div>
                  <Label>تاريخ الصلاحية</Label>
                  <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} dir="ltr" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="أي ملاحظات إضافية..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : editingItem ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockItem} onOpenChange={(o) => !o && setRestockItemState(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="w-5 h-5" /> توريد مخزون
            </DialogTitle>
          </DialogHeader>
          {restockItem && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="font-bold">{restockItem.nameAr}</p>
                <p className="text-sm text-muted-foreground">SKU: {restockItem.sku}</p>
                <p className="text-sm">المخزون الحالي: <span className="font-bold">{restockItem.currentStock}</span> {UNIT_LABELS[restockItem.unit]}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الكمية المراد توريدها *</Label>
                  <Input type="number" value={restockQty} onChange={(e) => setRestockQty(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <Label>رقم الدفعة</Label>
                  <Input value={restockBatch} onChange={(e) => setRestockBatch(e.target.value)} placeholder="LOT-001" dir="ltr" />
                </div>
              </div>
              <div>
                <Label>سبب التوريد</Label>
                <Input value={restockReason} onChange={(e) => setRestockReason(e.target.value)} placeholder="توريد يدوي" />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <p>المخزون بعد التوريد: <span className="font-bold text-green-700">{restockItem.currentStock + restockQty}</span> {UNIT_LABELS[restockItem.unit]}</p>
                <p>تكلفة التوريد: <span className="font-bold">{(restockQty * restockItem.costPerUnit).toLocaleString("ar-EG")} ج.م</span></p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRestockItemState(null)}>إلغاء</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleRestock}>تأكيد التوريد</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deduct Dialog */}
      <Dialog open={!!deductItem} onOpenChange={(o) => !o && setDeductItem(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="w-5 h-5" /> صرف من المخزون
            </DialogTitle>
          </DialogHeader>
          {deductItem && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="font-bold">{deductItem.nameAr}</p>
                <p className="text-sm text-muted-foreground">SKU: {deductItem.sku}</p>
                <p className="text-sm">المخزون الحالي: <span className="font-bold">{deductItem.currentStock}</span> {UNIT_LABELS[deductItem.unit]}</p>
              </div>
              <div>
                <Label>الكمية المراد صرفها *</Label>
                <Input type="number" value={deductQty} onChange={(e) => setDeductQty(Number(e.target.value))} min={1} max={deductItem.currentStock} />
                {deductQty > deductItem.currentStock && (
                  <p className="text-xs text-red-600 mt-1">الكمية المطلوبة أكبر من المتاح!</p>
                )}
              </div>
              <div>
                <Label>سبب الصرف *</Label>
                <Input value={deductReason} onChange={(e) => setDeductReason(e.target.value)} placeholder="استخدام لحالة / صيانة / تالف" />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <p>المخزون بعد الصرف: <span className={`font-bold ${(deductItem.currentStock - deductQty) <= deductItem.minimumStock ? "text-red-700" : "text-green-700"}`}>
                  {Math.max(0, deductItem.currentStock - deductQty)}</span> {UNIT_LABELS[deductItem.unit]}
                </p>
                {(deductItem.currentStock - deductQty) <= deductItem.minimumStock && (
                  <p className="text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> سيصبح تحت الحد الأدنى!</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeductItem(null)}>إلغاء</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleDeduct} disabled={deductQty > deductItem.currentStock || deductQty <= 0}>
                  تأكيد الصرف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الصنف</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="p-4 bg-accent/20 rounded-lg">
                <h3 className="text-lg font-bold">{detailItem.nameAr}</h3>
                {detailItem.name && <p className="text-sm text-muted-foreground">{detailItem.name}</p>}
                <Badge variant="outline" className="mt-2" style={{ borderColor: CATEGORY_COLORS[detailItem.category], color: CATEGORY_COLORS[detailItem.category] }}>
                  {CATEGORY_LABELS[detailItem.category]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField label="الكود (SKU)" value={detailItem.sku} />
                <InfoField label="الوحدة" value={UNIT_LABELS[detailItem.unit] || detailItem.unit} />
                <InfoField label="المخزون الحالي" value={`${detailItem.currentStock}`} highlight={detailItem.currentStock <= detailItem.minimumStock} />
                <InfoField label="الحد الأدنى" value={`${detailItem.minimumStock}`} />
                <InfoField label="سعر الوحدة" value={`${detailItem.costPerUnit.toLocaleString("ar-EG")} ج.م`} />
                <InfoField label="قيمة المخزون" value={`${(detailItem.currentStock * detailItem.costPerUnit).toLocaleString("ar-EG")} ج.م`} />
                <InfoField label="المورد" value={(detailItem as any).supplierAr || detailItem.supplier || "-"} />
                <InfoField label="الموقع" value={detailItem.location || "-"} />
                <InfoField label="رقم الدفعة" value={(detailItem as any).batchNumber || "-"} />
                <InfoField label="تاريخ الصلاحية" value={(detailItem as any).expiryDate ? new Date((detailItem as any).expiryDate).toLocaleDateString("ar-EG") : "-"} />
                <InfoField label="آخر توريد" value={detailItem.lastRestockedAt ? new Date(detailItem.lastRestockedAt).toLocaleDateString("ar-EG") : "-"} />
                <InfoField label="تاريخ الإنشاء" value={new Date(detailItem.createdAt).toLocaleDateString("ar-EG")} />
              </div>

              {(detailItem as any).notes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium mb-1">ملاحظات:</p>
                  <p className="text-sm text-muted-foreground">{(detailItem as any).notes}</p>
                </div>
              )}

              {/* Item Transactions */}
              <div>
                <p className="font-medium text-sm mb-2">آخر الحركات على هذا الصنف:</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {transactions.filter((t) => t.itemId === detailItem.id).length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-2">لا توجد حركات</p>
                  ) : (
                    transactions.filter((t) => t.itemId === detailItem.id).slice(0, 10).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded border text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded ${tx.type === "deduction" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {tx.type === "deduction" ? "صرف" : "توريد"}
                          </span>
                          <span>{tx.reason}</span>
                        </div>
                        <div className="text-left">
                          <span className={`font-bold ${tx.type === "deduction" ? "text-red-600" : "text-green-600"}`}>
                            {tx.type === "deduction" ? "-" : "+"}{tx.quantity}
                          </span>
                          <span className="text-muted-foreground mr-2">{new Date(tx.createdAt).toLocaleDateString("ar-EG")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                  <Edit className="w-3 h-3 ml-1" /> تعديل
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setDetailItem(null); setRestockItemState(detailItem); setRestockQty(detailItem.minimumStock * 2); }}>
                  <TrendingUp className="w-3 h-3 ml-1" /> توريد
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════

function KPICard({ icon, label, value, color, warn }: { icon: React.ReactNode; label: string; value: any; color: string; warn?: boolean }) {
  return (
    <Card className={warn ? "border-red-200" : ""}>
      <CardContent className="pt-4 text-center">
        <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${color.replace("text-", "bg-").replace("600", "100")}`}>
          <span className={color}>{icon}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function SortHeader({ field, label, current, dir, onClick }: { field: string; label: string; current: string; dir: string; onClick: (f: string) => void }) {
  return (
    <th className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary select-none" onClick={() => onClick(field)}>
      <span className="flex items-center gap-1">
        {label}
        {current === field && <ArrowUpDown className={`w-3 h-3 ${dir === "desc" ? "rotate-180" : ""}`} />}
      </span>
    </th>
  );
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-2 rounded bg-accent/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium text-sm ${highlight ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
