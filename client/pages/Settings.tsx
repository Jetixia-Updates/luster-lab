/**
 * Settings - Pricing Rules + Editable Lab Info + Notification Preferences
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, DollarSign, Save, Info, Building2,
  Bell, Shield, Palette, Edit, Check, X, Plus, Cpu, Monitor,
} from "lucide-react";
import { CAD_SOFTWARES } from "@shared/cadSoftwareIntegration";
import type { PricingRule } from "@shared/api";

// Stored locally since no real backend persistence for lab settings
const DEFAULT_LAB = {
  nameEn: "Luster Dental Laboratory",
  nameAr: "معمل لاستر لطب الأسنان",
  phone: "+20 123 456 7890",
  email: "info@luster-dental.com",
  address: "القاهرة - مصر",
  addressEn: "Cairo, Egypt",
  taxId: "123-456-789",
  website: "www.luster-dental.com",
  casePrefix: "L",
  invoicePrefix: "INV",
  defaultDueDays: 30,
  workingHours: "09:00 - 17:00",
  currency: "EGP",
  footerNote: "شكراً لثقتكم في معمل لاستر لطب الأسنان",
};

export default function Settings() {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Lab info - editable
  const [labInfo, setLabInfo] = useState(() => {
    try {
      const saved = localStorage.getItem("luster_lab_info");
      return saved ? JSON.parse(saved) : { ...DEFAULT_LAB };
    } catch {
      return { ...DEFAULT_LAB };
    }
  });
  const [editingLab, setEditingLab] = useState(false);
  const [labDraft, setLabDraft] = useState({ ...labInfo });

  // CAD/CAM default software
  const [defaultCadSoftware, setDefaultCadSoftware] = useState(() => {
    try {
      return localStorage.getItem("luster_default_cad_software") || "exocad";
    } catch {
      return "exocad";
    }
  });

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("luster_notif_prefs");
      return saved ? JSON.parse(saved) : {
        lowStock: true,
        rushCases: true,
        overdueCases: true,
        overduePayments: true,
        caseCompleted: true,
        dailyReport: false,
      };
    } catch {
      return { lowStock: true, rushCases: true, overdueCases: true, overduePayments: true, caseCompleted: true, dailyReport: false };
    }
  });

  useEffect(() => {
    api.get<any>("/pricing")
      .then((res) => setPricingRules(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveRule = async () => {
    if (!editingRule) return;
    try {
      await api.put<any>(`/pricing/${editingRule.id}`, editingRule);
      toast.success("تم تحديث التسعيرة بنجاح");
      setPricingRules(pricingRules.map(r => r.id === editingRule.id ? editingRule : r));
      setEditingRule(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveLabInfo = () => {
    setLabInfo(labDraft);
    localStorage.setItem("luster_lab_info", JSON.stringify(labDraft));
    setEditingLab(false);
    toast.success("تم حفظ بيانات المعمل");
  };

  const saveNotifPrefs = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem("luster_notif_prefs", JSON.stringify(updated));
    toast.success("تم تحديث إعدادات التنبيهات");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-gray-600" />
          الإعدادات
        </h1>
        <p className="text-muted-foreground">إعدادات النظام وقواعد التسعير وبيانات المعمل</p>
      </div>

      <Tabs defaultValue="pricing" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing" className="gap-2 text-xs sm:text-sm">
            <DollarSign className="w-4 h-4" />
            قواعد التسعير
          </TabsTrigger>
          <TabsTrigger value="lab" className="gap-2 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            بيانات المعمل
          </TabsTrigger>
          <TabsTrigger value="cad" className="gap-2 text-xs sm:text-sm">
            <Cpu className="w-4 h-4" />
            برامج CAD/CAM
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm">
            <Bell className="w-4 h-4" />
            التنبيهات
          </TabsTrigger>
        </TabsList>

        {/* ═══ Pricing Tab ═══ */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">كيف يعمل التسعير التلقائي:</p>
                <p>عند إصدار فاتورة، يتم الحساب: <strong>سعر الوحدة × عدد الأسنان</strong> + تكلفة المواد + تكلفة العمالة + رسوم الاستعجال.</p>
                <p className="mt-1 text-xs">مثال: زركونيا 3 أسنان = (750 × 3) + مواد + عمالة = ~3,200 ج.م</p>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid gap-4">
              {pricingRules.map((rule) => (
                <Card key={rule.id} className={editingRule?.id === rule.id ? "ring-2 ring-primary" : ""}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-primary/10 text-primary text-sm px-3 py-1">
                          {WORK_TYPE_LABELS[rule.workType]?.ar || rule.workType}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{rule.workType.toUpperCase()}</span>
                      </div>
                      {editingRule?.id === rule.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveRule} className="gap-1">
                            <Save className="w-3 h-3" /> حفظ
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingRule(null)}>إلغاء</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEditingRule({ ...rule })} className="gap-1">
                          <Edit className="w-3 h-3" /> تعديل
                        </Button>
                      )}
                    </div>

                    {editingRule?.id === rule.id ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <Label className="text-xs">سعر الوحدة (ج.م)</Label>
                          <Input type="number" value={editingRule.basePricePerUnit}
                            onChange={(e) => setEditingRule({ ...editingRule, basePricePerUnit: Number(e.target.value) })}
                            className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">معامل المواد</Label>
                          <Input type="number" step="0.1" value={editingRule.materialCostMultiplier}
                            onChange={(e) => setEditingRule({ ...editingRule, materialCostMultiplier: Number(e.target.value) })}
                            className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">تكلفة العمالة/ساعة</Label>
                          <Input type="number" value={editingRule.laborCostPerHour}
                            onChange={(e) => setEditingRule({ ...editingRule, laborCostPerHour: Number(e.target.value) })}
                            className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">هامش الربح %</Label>
                          <Input type="number" value={editingRule.profitMarginPercent}
                            onChange={(e) => setEditingRule({ ...editingRule, profitMarginPercent: Number(e.target.value) })}
                            className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">رسوم الاستعجال %</Label>
                          <Input type="number" value={editingRule.rushSurchargePercent}
                            onChange={(e) => setEditingRule({ ...editingRule, rushSurchargePercent: Number(e.target.value) })}
                            className="h-9" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-accent/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">سعر الوحدة</p>
                          <p className="font-bold text-lg">{rule.basePricePerUnit}</p>
                          <p className="text-xs text-muted-foreground">ج.م</p>
                        </div>
                        <div className="bg-accent/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">معامل المواد</p>
                          <p className="font-bold text-lg">{rule.materialCostMultiplier}x</p>
                        </div>
                        <div className="bg-accent/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">عمالة/ساعة</p>
                          <p className="font-bold text-lg">{rule.laborCostPerHour}</p>
                          <p className="text-xs text-muted-foreground">ج.م</p>
                        </div>
                        <div className="bg-accent/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">هامش الربح</p>
                          <p className="font-bold text-lg text-green-600">{rule.profitMarginPercent}%</p>
                        </div>
                        <div className="bg-accent/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">رسوم استعجال</p>
                          <p className="font-bold text-lg text-amber-600">{rule.rushSurchargePercent}%</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ Lab Info Tab ═══ */}
        <TabsContent value="lab" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">بيانات المعمل</CardTitle>
                {editingLab ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveLabInfo} className="gap-1"><Check className="w-3 h-3" /> حفظ</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingLab(false); setLabDraft({ ...labInfo }); }}><X className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setEditingLab(true); setLabDraft({ ...labInfo }); }} className="gap-1">
                    <Edit className="w-3 h-3" /> تعديل
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>اسم المعمل (English)</Label>
                  {editingLab ? (
                    <Input value={labDraft.nameEn} onChange={(e) => setLabDraft({ ...labDraft, nameEn: e.target.value })} dir="ltr" />
                  ) : (
                    <Input value={labInfo.nameEn} readOnly className="bg-muted" dir="ltr" />
                  )}
                </div>
                <div>
                  <Label>اسم المعمل (عربي)</Label>
                  {editingLab ? (
                    <Input value={labDraft.nameAr} onChange={(e) => setLabDraft({ ...labDraft, nameAr: e.target.value })} />
                  ) : (
                    <Input value={labInfo.nameAr} readOnly className="bg-muted" />
                  )}
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  {editingLab ? (
                    <Input value={labDraft.phone} onChange={(e) => setLabDraft({ ...labDraft, phone: e.target.value })} dir="ltr" />
                  ) : (
                    <Input value={labInfo.phone} readOnly className="bg-muted" dir="ltr" />
                  )}
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  {editingLab ? (
                    <Input value={labDraft.email} onChange={(e) => setLabDraft({ ...labDraft, email: e.target.value })} dir="ltr" />
                  ) : (
                    <Input value={labInfo.email} readOnly className="bg-muted" dir="ltr" />
                  )}
                </div>
                <div>
                  <Label>الموقع الإلكتروني</Label>
                  {editingLab ? (
                    <Input value={labDraft.website} onChange={(e) => setLabDraft({ ...labDraft, website: e.target.value })} dir="ltr" />
                  ) : (
                    <Input value={labInfo.website} readOnly className="bg-muted" dir="ltr" />
                  )}
                </div>
                <div>
                  <Label>الرقم الضريبي</Label>
                  {editingLab ? (
                    <Input value={labDraft.taxId} onChange={(e) => setLabDraft({ ...labDraft, taxId: e.target.value })} dir="ltr" />
                  ) : (
                    <Input value={labInfo.taxId} readOnly className="bg-muted" dir="ltr" />
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>العنوان</Label>
                  {editingLab ? (
                    <Input value={labDraft.address} onChange={(e) => setLabDraft({ ...labDraft, address: e.target.value })} />
                  ) : (
                    <Input value={labInfo.address} readOnly className="bg-muted" />
                  )}
                </div>
                <div>
                  <Label>ساعات العمل</Label>
                  {editingLab ? (
                    <Input value={labDraft.workingHours} onChange={(e) => setLabDraft({ ...labDraft, workingHours: e.target.value })} dir="ltr" />
                  ) : (
                    <Input value={labInfo.workingHours} readOnly className="bg-muted" dir="ltr" />
                  )}
                </div>
                <div>
                  <Label>أيام السماح للدفع</Label>
                  {editingLab ? (
                    <Input type="number" value={labDraft.defaultDueDays} onChange={(e) => setLabDraft({ ...labDraft, defaultDueDays: Number(e.target.value) })} />
                  ) : (
                    <Input value={`${labInfo.defaultDueDays} يوم`} readOnly className="bg-muted" />
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>ملاحظة الفاتورة</Label>
                  {editingLab ? (
                    <Textarea value={labDraft.footerNote} onChange={(e) => setLabDraft({ ...labDraft, footerNote: e.target.value })} rows={2} />
                  ) : (
                    <Input value={labInfo.footerNote} readOnly className="bg-muted" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">معلومات النظام</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-muted-foreground">إصدار النظام</p>
                  <p className="font-bold">v2.0.0</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-muted-foreground">التقنية</p>
                  <p className="font-bold">React + Express + TS</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-muted-foreground">قاعدة البيانات</p>
                  <p className="font-bold">In-Memory (Demo)</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-muted-foreground">المصادقة</p>
                  <p className="font-bold">JWT + RBAC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ CAD/CAM Software Tab ═══ */}
        <TabsContent value="cad" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                برامج التصميم والتفريز CAD/CAM
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                اختر البرنامج الافتراضي وصدّر الملفات لفتحها في البرنامج المثبت
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>البرنامج الافتراضي للتصميم</Label>
                <Select
                  value={defaultCadSoftware}
                  onValueChange={(v) => {
                    setDefaultCadSoftware(v);
                    localStorage.setItem("luster_default_cad_software", v);
                    toast.success("تم حفظ الإعداد");
                  }}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAD_SOFTWARES.map((sw) => (
                      <SelectItem key={sw.id} value={sw.id}>
                        <span className="flex items-center gap-2">{sw.icon} {sw.name} ({sw.nameAr})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  عند الضغط على "تصدير" في قسم التصميم، ستُحمَّل ملفات JSON و STL. افتحها في البرنامج المحدد.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium mb-2">البرامج المتكاملة:</p>
                <div className="grid gap-2">
                  {CAD_SOFTWARES.filter((s) => s.id !== "other").map((sw) => (
                    <div key={sw.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="text-xl">{sw.icon}</span>
                      <div>
                        <p className="font-medium">{sw.name}</p>
                        <p className="text-xs text-muted-foreground">
                          تنسيقات: {sw.extensions.join(", ")} • مجلد التصدير: {sw.exportFolder || "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Notifications Tab ═══ */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                إعدادات التنبيهات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">تفعيل أو إيقاف كل التنبيهات دفعة واحدة</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allOn = { lowStock: true, rushCases: true, overdueCases: true, overduePayments: true, caseCompleted: true, dailyReport: true };
                    setNotifPrefs(allOn);
                    localStorage.setItem("luster_notif_prefs", JSON.stringify(allOn));
                    toast.success("تم تفعيل كل التنبيهات");
                  }}
                >
                  تفعيل الكل
                </Button>
              </div>
              <div className="space-y-4">
                {([
                  { key: "lowStock", label: "تنبيه نقص المخزون", desc: "إشعار عند وصول مادة للحد الأدنى" },
                  { key: "rushCases", label: "تنبيه الحالات العاجلة", desc: "إشعار عند وجود حالات عاجلة أو مستعجلة" },
                  { key: "overdueCases", label: "تنبيه الحالات المتأخرة", desc: "إشعار عند تجاوز موعد التسليم المتوقع" },
                  { key: "overduePayments", label: "تنبيه الفواتير المتأخرة", desc: "إشعار عند تجاوز موعد استحقاق الدفع" },
                  { key: "caseCompleted", label: "إتمام الحالة", desc: "إشعار عند إكمال حالة وتجهيزها للتسليم" },
                  { key: "dailyReport", label: "التقرير اليومي", desc: "ملخص يومي بأداء المعمل (تجريبي)" },
                ] as const).map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[item.key]}
                      onCheckedChange={(checked) => saveNotifPrefs(item.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
