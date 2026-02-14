/**
 * Suppliers Management Page - Enterprise Grade
 * Full CRUD, PO Management, Supplier Statements, Balance Tracking
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
  Truck, Plus, Search, Edit, Trash2, Eye, Phone, Mail, Globe,
  MapPin, DollarSign, Star, Package, FileText, CreditCard,
  ArrowUpRight, Building2, CheckCircle, Clock, XCircle,
  ShoppingCart, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import type { Supplier, PurchaseOrder } from "@shared/api";

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const CATEGORY_LABELS: Record<string, string> = {
  blocks: "بلوكات", raw_materials: "مواد خام", consumables: "مستلزمات", tools: "أدوات", equipment: "معدات",
};

const PO_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
  sent: { label: "مُرسل", color: "bg-blue-100 text-blue-700" },
  partial: { label: "جزئي", color: "bg-amber-100 text-amber-700" },
  received: { label: "مُستلم", color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغى", color: "bg-red-100 text-red-700" },
};

const emptySupplier = {
  name: "", nameAr: "", contactPerson: "", contactPersonAr: "",
  phone: "", phone2: "", email: "", website: "",
  address: "", addressAr: "", city: "", country: "مصر",
  taxNumber: "", paymentTerms: "Net 30", notes: "",
  categories: [] as string[],
};

export default function Suppliers() {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Supplier form
  const [showForm, setShowForm] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptySupplier);
  const [saving, setSaving] = useState(false);

  // Supplier detail
  const [detailSup, setDetailSup] = useState<any>(null);

  // PO form
  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPOForm] = useState({ supplierId: "", expectedDelivery: "", notes: "" });
  const [poItems, setPOItems] = useState<{ description: string; descriptionAr: string; sku: string; quantity: number; unitPrice: number }[]>([]);
  const [poDiscount, setPODiscount] = useState(0);

  // PO payment dialog
  const [payingPO, setPayingPO] = useState<PurchaseOrder | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");

  // Balances
  const [balances, setBalances] = useState<any>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (activeTab === "balances") loadBalances(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    const [supRes, poRes] = await Promise.all([
      api.get<any>("/suppliers"),
      api.get<any>("/purchase-orders"),
    ]);
    setSuppliers(supRes.data || []);
    setPurchaseOrders(poRes.data || []);
    setLoading(false);
  };

  const loadBalances = async () => {
    const res = await api.get<any>("/analytics/supplier-balance");
    setBalances(res.data || null);
  };

  // ── Supplier Actions ──
  const openCreate = () => { setForm(emptySupplier); setEditingSup(null); setShowForm(true); };

  const openEdit = (sup: Supplier) => {
    setForm({
      name: sup.name, nameAr: sup.nameAr,
      contactPerson: sup.contactPerson || "", contactPersonAr: sup.contactPersonAr || "",
      phone: sup.phone, phone2: sup.phone2 || "",
      email: sup.email || "", website: sup.website || "",
      address: sup.address || "", addressAr: sup.addressAr || "",
      city: sup.city || "", country: sup.country || "مصر",
      taxNumber: sup.taxNumber || "", paymentTerms: sup.paymentTerms || "Net 30",
      notes: sup.notes || "", categories: sup.categories || [],
    });
    setEditingSup(sup);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nameAr || !form.phone) { toast.error("يرجى ملء اسم المورد والهاتف"); return; }
    setSaving(true);
    try {
      if (editingSup) {
        await api.put<any>(`/suppliers/${editingSup.id}`, form);
        toast.success("تم تحديث بيانات المورد");
      } else {
        await api.post<any>("/suppliers", form);
        toast.success("تم إضافة المورد بنجاح");
      }
      setShowForm(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (sup: Supplier) => {
    if (!confirm(`هل أنت متأكد من حذف "${sup.nameAr}"؟`)) return;
    try {
      await api.delete<any>(`/suppliers/${sup.id}`);
      toast.success("تم حذف المورد");
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const viewDetail = async (supId: string) => {
    const res = await api.get<any>(`/suppliers/${supId}`);
    setDetailSup(res.data);
  };

  // ── PO Actions ──
  const openPOCreate = (supplierId?: string) => {
    setPOForm({ supplierId: supplierId || "", expectedDelivery: "", notes: "" });
    setPOItems([{ description: "", descriptionAr: "", sku: "", quantity: 1, unitPrice: 0 }]);
    setPODiscount(0);
    setShowPOForm(true);
  };

  const addPOItem = () => {
    setPOItems([...poItems, { description: "", descriptionAr: "", sku: "", quantity: 1, unitPrice: 0 }]);
  };

  const removePOItem = (idx: number) => {
    setPOItems(poItems.filter((_, i) => i !== idx));
  };

  const updatePOItem = (idx: number, field: string, value: any) => {
    const updated = [...poItems];
    (updated[idx] as any)[field] = value;
    setPOItems(updated);
  };

  const handleCreatePO = async () => {
    if (!poForm.supplierId) { toast.error("يرجى اختيار المورد"); return; }
    if (poItems.length === 0 || !poItems[0].descriptionAr) { toast.error("يرجى إضافة صنف واحد على الأقل"); return; }
    try {
      const items = poItems.filter((i) => i.descriptionAr).map((i) => ({
        ...i,
        total: i.quantity * i.unitPrice,
      }));
      await api.post<any>("/purchase-orders", {
        supplierId: poForm.supplierId,
        items,
        discount: poDiscount,
        expectedDelivery: poForm.expectedDelivery ? new Date(poForm.expectedDelivery).toISOString() : undefined,
        notes: poForm.notes,
      });
      toast.success("تم إنشاء أمر الشراء بنجاح");
      setShowPOForm(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const updatePOStatus = async (poId: string, status: string) => {
    try {
      await api.put<any>(`/purchase-orders/${poId}/status`, { status });
      toast.success("تم تحديث حالة أمر الشراء");
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePOPayment = async () => {
    if (!payingPO || payAmount <= 0) { toast.error("يرجى إدخال مبلغ صحيح"); return; }
    try {
      await api.post<any>(`/purchase-orders/${payingPO.id}/payment`, {
        amount: payAmount, method: payMethod, reference: payRef,
      });
      toast.success("تم تسجيل الدفعة");
      setPayingPO(null);
      loadData();
      if (activeTab === "balances") loadBalances();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Computed ──
  const totalOwed = useMemo(() => suppliers.reduce((s, sup) => s + sup.balance, 0), [suppliers]);
  const activePOs = useMemo(() => purchaseOrders.filter((po) => po.status !== "cancelled" && po.status !== "received"), [purchaseOrders]);

  const filteredSuppliers = useMemo(() => {
    let filtered = [...suppliers];
    if (statusFilter !== "all") filtered = filtered.filter((s) => s.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((sup) => sup.nameAr.includes(s) || sup.name.toLowerCase().includes(s) || sup.phone.includes(s));
    }
    return filtered;
  }, [suppliers, statusFilter, search]);

  const poSubtotal = useMemo(() => poItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [poItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            إدارة الموردين والمشتريات
          </h1>
          <p className="text-muted-foreground">إدارة شاملة للموردين وأوامر الشراء والمدفوعات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openPOCreate()} className="gap-2">
            <ShoppingCart className="w-4 h-4" /> أمر شراء جديد
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> إضافة مورد
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="suppliers" className="gap-1"><Building2 className="w-3.5 h-3.5" /> الموردين</TabsTrigger>
          <TabsTrigger value="purchase-orders" className="gap-1">
            <ShoppingCart className="w-3.5 h-3.5" /> أوامر الشراء
            {activePOs.length > 0 && <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 mr-1">{activePOs.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-1">
            <CreditCard className="w-3.5 h-3.5" /> الأرصدة
            {totalOwed > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 mr-1">{suppliers.filter(s => s.balance > 0).length}</span>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1"><TrendingUp className="w-3.5 h-3.5" /> التحليلات</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: Suppliers List ═══ */}
        <TabsContent value="suppliers" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <Building2 className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-indigo-600">{suppliers.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الموردين</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{suppliers.filter(s => s.status === "active").length}</p>
              <p className="text-xs text-muted-foreground">موردين نشطين</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-600">{suppliers.reduce((s, sup) => s + sup.totalPurchases, 0).toLocaleString("ar-EG")}</p>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات (ج.م)</p>
            </CardContent></Card>
            <Card className={totalOwed > 0 ? "border-red-200" : ""}>
              <CardContent className="pt-4 text-center">
                <CreditCard className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{totalOwed.toLocaleString("ar-EG")}</p>
                <p className="text-xs text-muted-foreground">المستحق للموردين (ج.م)</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="pr-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
                <SelectItem value="blocked">محظور</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Suppliers Grid */}
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filteredSuppliers.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا يوجد موردين</p>
            </CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((sup) => (
                <Card key={sup.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {sup.nameAr.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold">{sup.nameAr}</p>
                          <p className="text-xs text-muted-foreground">{sup.name}</p>
                        </div>
                      </div>
                      <Badge variant={sup.status === "active" ? "default" : "secondary"}>
                        {sup.status === "active" ? "نشط" : sup.status === "inactive" ? "غير نشط" : "محظور"}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> {sup.phone}
                      </div>
                      {sup.email && <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> <span className="text-xs" dir="ltr">{sup.email}</span>
                      </div>}
                      {sup.contactPersonAr && <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" /> {sup.contactPersonAr}
                      </div>}
                    </div>

                    {/* Categories */}
                    <div className="flex gap-1 flex-wrap mb-3">
                      {sup.categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">{CATEGORY_LABELS[cat] || cat}</Badge>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-accent/20 rounded-lg text-xs mb-3">
                      <div className="text-center">
                        <p className="text-muted-foreground">المشتريات</p>
                        <p className="font-bold text-blue-600">{sup.totalPurchases.toLocaleString("ar-EG")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">المدفوع</p>
                        <p className="font-bold text-green-600">{sup.totalPaid.toLocaleString("ar-EG")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">المتبقي</p>
                        <p className={`font-bold ${sup.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                          {sup.balance.toLocaleString("ar-EG")}
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    {sup.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < sup.rating! ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        ))}
                        <span className="text-xs text-muted-foreground mr-1">({sup.rating}/5)</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => viewDetail(sup.id)}>
                        <Eye className="w-3 h-3" /> عرض
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openPOCreate(sup.id)}>
                        <ShoppingCart className="w-3 h-3" /> أمر شراء
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(sup)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(sup)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB 2: Purchase Orders ═══ */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{purchaseOrders.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الأوامر</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{purchaseOrders.filter(p => p.status === "sent").length}</p>
              <p className="text-xs text-muted-foreground">قيد التوريد</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{purchaseOrders.filter(p => p.status === "received").length}</p>
              <p className="text-xs text-muted-foreground">مُستلمة</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">{purchaseOrders.filter(p => p.remainingAmount > 0).reduce((s, p) => s + p.remainingAmount, 0).toLocaleString("ar-EG")}</p>
              <p className="text-xs text-muted-foreground">غير مدفوع (ج.م)</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="pt-4">
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
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="border-b hover:bg-accent/30">
                        <td className="py-3 px-2 font-mono text-xs font-bold">{po.poNumber}</td>
                        <td className="py-3 px-2">{po.supplierNameAr}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {po.items.map(i => i.descriptionAr).join("، ").slice(0, 40)}
                          {po.items.length > 1 && "..."}
                        </td>
                        <td className="py-3 px-2 font-bold">{po.totalAmount.toLocaleString("ar-EG")}</td>
                        <td className="py-3 px-2 text-green-600">{po.paidAmount.toLocaleString("ar-EG")}</td>
                        <td className="py-3 px-2">
                          <span className={po.remainingAmount > 0 ? "text-red-600 font-bold" : "text-green-600"}>
                            {po.remainingAmount.toLocaleString("ar-EG")}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${PO_STATUS_MAP[po.status]?.color}`}>
                            {PO_STATUS_MAP[po.status]?.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {new Date(po.orderDate).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            {po.status === "draft" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(po.id, "sent")}>إرسال</Button>
                            )}
                            {po.status === "sent" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => updatePOStatus(po.id, "received")}>استلام</Button>
                            )}
                            {po.remainingAmount > 0 && po.status !== "cancelled" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setPayingPO(po); setPayAmount(po.remainingAmount); }}>
                                <CreditCard className="w-3 h-3" /> دفع
                              </Button>
                            )}
                            {po.status === "draft" && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => updatePOStatus(po.id, "cancelled")}>إلغاء</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3: Supplier Balances ═══ */}
        <TabsContent value="balances" className="space-y-4">
          {balances && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-blue-200"><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{balances.totalPurchased?.toLocaleString("ar-EG") || 0}</p>
                  <p className="text-xs text-muted-foreground">إجمالي المشتريات (ج.م)</p>
                </CardContent></Card>
                <Card className="border-red-200"><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{balances.totalOwed?.toLocaleString("ar-EG") || 0}</p>
                  <p className="text-xs text-muted-foreground">المستحق للموردين (ج.م)</p>
                </CardContent></Card>
                <Card className="border-green-200"><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{((balances.totalPurchased || 0) - (balances.totalOwed || 0)).toLocaleString("ar-EG")}</p>
                  <p className="text-xs text-muted-foreground">المدفوع (ج.م)</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg">أرصدة الموردين</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-right py-3 px-2 font-medium">المورد</th>
                          <th className="text-right py-3 px-2 font-medium">المشتريات</th>
                          <th className="text-right py-3 px-2 font-medium">المدفوع</th>
                          <th className="text-right py-3 px-2 font-medium">المستحق</th>
                          <th className="text-right py-3 px-2 font-medium">أوامر معلقة</th>
                          <th className="text-right py-3 px-2 font-medium">شروط الدفع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(balances.suppliers || []).map((s: any) => (
                          <tr key={s.id} className={`border-b hover:bg-accent/30 ${s.balance > 0 ? "bg-red-50/30" : ""}`}>
                            <td className="py-3 px-2 font-medium">{s.nameAr}</td>
                            <td className="py-3 px-2">{s.totalPurchases.toLocaleString("ar-EG")}</td>
                            <td className="py-3 px-2 text-green-600">{s.totalPaid.toLocaleString("ar-EG")}</td>
                            <td className="py-3 px-2">
                              <span className={`font-bold ${s.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                                {s.balance.toLocaleString("ar-EG")}
                              </span>
                            </td>
                            <td className="py-3 px-2">{s.pendingPOs}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs">{s.paymentTerms || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 4: Purchase Analytics ═══ */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Purchases by Supplier */}
            <Card>
              <CardHeader><CardTitle className="text-lg">المشتريات حسب المورد</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={suppliers.filter(s => s.totalPurchases > 0).map(s => ({ name: s.nameAr, value: s.totalPurchases }))}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value"
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {suppliers.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString("ar-EG")} ج.م`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* PO Status Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-lg">حالة أوامر الشراء</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={Object.entries(
                    purchaseOrders.reduce((acc: any, po) => {
                      const label = PO_STATUS_MAP[po.status]?.label || po.status;
                      if (!acc[label]) acc[label] = { count: 0, amount: 0 };
                      acc[label].count++;
                      acc[label].amount += po.totalAmount;
                      return acc;
                    }, {})
                  ).map(([name, d]: [string, any]) => ({ name, count: d.count, amount: d.amount }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="العدد" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ DIALOGS ═══ */}

      {/* Supplier Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingSup ? "تعديل مورد" : "إضافة مورد جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">البيانات الأساسية</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>اسم المورد (عربي) *</Label><Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
                <div><Label>اسم المورد (إنجليزي)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><Label>جهة الاتصال (عربي)</Label><Input value={form.contactPersonAr} onChange={(e) => setForm({ ...form, contactPersonAr: e.target.value })} /></div>
                <div><Label>جهة الاتصال (إنجليزي)</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} dir="ltr" /></div>
              </div>
            </div>

            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">بيانات التواصل</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>الهاتف *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
                <div><Label>هاتف 2</Label><Input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} dir="ltr" /></div>
                <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><Label>الموقع الإلكتروني</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} dir="ltr" /></div>
                <div><Label>الرقم الضريبي</Label><Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} dir="ltr" /></div>
              </div>
            </div>

            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">العنوان</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>العنوان</Label><Input value={form.addressAr} onChange={(e) => setForm({ ...form, addressAr: e.target.value })} /></div>
                <div><Label>المدينة</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>البلد</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              </div>
            </div>

            <div className="border-b pb-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">شروط الدفع والفئات</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>شروط الدفع</Label>
                  <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">الدفع عند الاستلام (COD)</SelectItem>
                      <SelectItem value="Net 15">صافي 15 يوم</SelectItem>
                      <SelectItem value="Net 30">صافي 30 يوم</SelectItem>
                      <SelectItem value="Net 45">صافي 45 يوم</SelectItem>
                      <SelectItem value="Net 60">صافي 60 يوم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الفئات</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <label key={k} className="flex items-center gap-1 text-xs cursor-pointer">
                        <input type="checkbox" checked={form.categories.includes(k)}
                          onChange={(e) => {
                            if (e.target.checked) setForm({ ...form, categories: [...form.categories, k] });
                            else setForm({ ...form, categories: form.categories.filter(c => c !== k) });
                          }} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "جاري الحفظ..." : editingSup ? "تحديث" : "إضافة"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={!!detailSup} onOpenChange={(o) => !o && setDetailSup(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>تفاصيل المورد</DialogTitle></DialogHeader>
          {detailSup && (
            <div className="space-y-4">
              <div className="p-4 bg-accent/20 rounded-lg flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                  {detailSup.supplier.nameAr.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{detailSup.supplier.nameAr}</h3>
                  <p className="text-sm text-muted-foreground">{detailSup.supplier.name}</p>
                  <div className="flex gap-1 mt-1">
                    {detailSup.supplier.categories?.map((c: string) => (
                      <Badge key={c} variant="outline" className="text-xs">{CATEGORY_LABELS[c]}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded bg-blue-50 text-center">
                  <p className="text-xs text-muted-foreground">المشتريات</p>
                  <p className="font-bold text-blue-600">{detailSup.supplier.totalPurchases.toLocaleString("ar-EG")} ج.م</p>
                </div>
                <div className="p-3 rounded bg-green-50 text-center">
                  <p className="text-xs text-muted-foreground">المدفوع</p>
                  <p className="font-bold text-green-600">{detailSup.supplier.totalPaid.toLocaleString("ar-EG")} ج.م</p>
                </div>
                <div className="p-3 rounded bg-red-50 text-center">
                  <p className="text-xs text-muted-foreground">المستحق</p>
                  <p className="font-bold text-red-600">{detailSup.supplier.balance.toLocaleString("ar-EG")} ج.م</p>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {detailSup.supplier.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {detailSup.supplier.phone}</div>}
                {detailSup.supplier.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> <span dir="ltr">{detailSup.supplier.email}</span></div>}
                {detailSup.supplier.website && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> <span dir="ltr">{detailSup.supplier.website}</span></div>}
                {detailSup.supplier.addressAr && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {detailSup.supplier.addressAr}</div>}
              </div>

              {/* Purchase Orders */}
              <div>
                <p className="font-medium text-sm mb-2">أوامر الشراء ({detailSup.purchaseOrders?.length || 0})</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {(detailSup.purchaseOrders || []).map((po: PurchaseOrder) => (
                    <div key={po.id} className="flex items-center justify-between p-2 rounded border text-xs">
                      <div>
                        <span className="font-mono font-bold">{po.poNumber}</span>
                        <span className={`mr-2 px-1.5 py-0.5 rounded-full ${PO_STATUS_MAP[po.status]?.color}`}>
                          {PO_STATUS_MAP[po.status]?.label}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="font-bold">{po.totalAmount.toLocaleString("ar-EG")} ج.م</span>
                        <span className="text-muted-foreground mr-2">{new Date(po.orderDate).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory Items */}
              <div>
                <p className="font-medium text-sm mb-2">الأصناف المرتبطة ({detailSup.inventoryItems?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {(detailSup.inventoryItems || []).map((item: any) => (
                    <Badge key={item.id} variant="outline">{item.nameAr} ({item.currentStock} {item.unit})</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PO Create Dialog */}
      <Dialog open={showPOForm} onOpenChange={setShowPOForm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> إنشاء أمر شراء جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>المورد *</Label>
                <Select value={poForm.supplierId} onValueChange={(v) => setPOForm({ ...poForm, supplierId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.status === "active").map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ التسليم المتوقع</Label>
                <Input type="date" value={poForm.expectedDelivery} onChange={(e) => setPOForm({ ...poForm, expectedDelivery: e.target.value })} dir="ltr" />
              </div>
              <div>
                <Label>خصم</Label>
                <Input type="number" value={poDiscount} onChange={(e) => setPODiscount(Number(e.target.value))} min={0} />
              </div>
            </div>

            {/* PO Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">الأصناف</p>
                <Button size="sm" variant="outline" onClick={addPOItem} className="gap-1"><Plus className="w-3 h-3" /> إضافة صنف</Button>
              </div>
              <div className="space-y-2">
                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg">
                    <div className="col-span-4">
                      <Label className="text-xs">الوصف (عربي) *</Label>
                      <Input value={item.descriptionAr} onChange={(e) => updatePOItem(idx, "descriptionAr", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">SKU</Label>
                      <Input value={item.sku} onChange={(e) => updatePOItem(idx, "sku", e.target.value)} className="h-8 text-xs" dir="ltr" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">الكمية</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updatePOItem(idx, "quantity", Number(e.target.value))} min={1} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">سعر الشراء</Label>
                      <Input type="number" value={item.unitPrice} onChange={(e) => updatePOItem(idx, "unitPrice", Number(e.target.value))} min={0} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-xs font-bold">{(item.quantity * item.unitPrice).toLocaleString("ar-EG")}</p>
                    </div>
                    <div className="col-span-1">
                      {poItems.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removePOItem(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-3 p-3 bg-accent/20 rounded-lg flex items-center justify-between">
                <div className="text-sm space-y-1">
                  <p>الإجمالي الفرعي: <span className="font-bold">{poSubtotal.toLocaleString("ar-EG")} ج.م</span></p>
                  {poDiscount > 0 && <p>الخصم: <span className="text-green-600">-{poDiscount.toLocaleString("ar-EG")} ج.م</span></p>}
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="text-xl font-bold text-indigo-600">{(poSubtotal - poDiscount).toLocaleString("ar-EG")} ج.م</p>
                </div>
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={poForm.notes} onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })} rows={2} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPOForm(false)}>إلغاء</Button>
              <Button onClick={handleCreatePO}>إنشاء أمر الشراء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Payment Dialog */}
      <Dialog open={!!payingPO} onOpenChange={(o) => !o && setPayingPO(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-green-700"><CreditCard className="w-5 h-5" /> تسجيل دفعة للمورد</DialogTitle></DialogHeader>
          {payingPO && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-bold">{payingPO.poNumber} - {payingPO.supplierNameAr}</p>
                <p className="text-sm">المبلغ الكلي: {payingPO.totalAmount.toLocaleString("ar-EG")} ج.م</p>
                <p className="text-sm">المتبقي: <span className="font-bold text-red-600">{payingPO.remainingAmount.toLocaleString("ar-EG")} ج.م</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>المبلغ *</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} max={payingPO.remainingAmount} /></div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>مرجع / رقم الشيك</Label><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} dir="ltr" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayingPO(null)}>إلغاء</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handlePOPayment}>تأكيد الدفع</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
