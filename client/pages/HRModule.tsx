/**
 * مديول الموارد البشرية - HR
 * احتياجات الأقسام، الوظائف الشاغرة، طلبات التوظيف
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users, Briefcase, UserPlus, Building2, FileText,
  Plus, Edit, Trash2, Phone, Mail, GraduationCap,
} from "lucide-react";
import type {
  HRDepartmentNeed,
  HRJobPosition,
  HRApplication,
  HRDepartment,
  HRNeedStatus,
  HRApplicationStatus,
} from "@shared/api";

const DEPT_OPTIONS: { value: HRDepartment; label: string }[] = [
  { value: "reception", label: "الاستقبال" },
  { value: "cad", label: "التصميم CAD" },
  { value: "cam", label: "التفريز CAM" },
  { value: "finishing", label: "البورسلين" },
  { value: "removable", label: "التركيبات المتحركة" },
  { value: "quality_control", label: "مراقبة الجودة" },
  { value: "accounting", label: "الحسابات" },
  { value: "delivery", label: "التسليم" },
  { value: "management", label: "الإدارة" },
];

const NEED_STATUS: Record<HRNeedStatus, string> = { open: "مفتوح", filled: "مُشغّل", cancelled: "ملغي" };
const APP_STATUS: Record<HRApplicationStatus, string> = {
  new: "جديد",
  screening: "فحص مبدئي",
  interview: "مقابلة",
  offer: "عرض عمل",
  hired: "تم التعيين",
  rejected: "مرفوض",
};

export default function HRModule() {
  const [activeTab, setActiveTab] = useState<"needs" | "positions" | "applications">("needs");
  const [needs, setNeeds] = useState<HRDepartmentNeed[]>([]);
  const [positions, setPositions] = useState<HRJobPosition[]>([]);
  const [applications, setApplications] = useState<HRApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNeedForm, setShowNeedForm] = useState(false);
  const [editNeed, setEditNeed] = useState<HRDepartmentNeed | null>(null);
  const [needForm, setNeedForm] = useState({
    department: "reception" as HRDepartment,
    positionTitle: "",
    positionTitleAr: "",
    requiredCount: 1,
    description: "",
    minExperience: "",
    salaryRange: "",
    status: "open" as HRNeedStatus,
  });

  const [showPosForm, setShowPosForm] = useState(false);
  const [editPos, setEditPos] = useState<HRJobPosition | null>(null);
  const [posForm, setPosForm] = useState({
    department: "reception" as HRDepartment,
    title: "",
    titleAr: "",
    description: "",
    status: "open" as "open" | "filled" | "cancelled",
  });

  const [showAppForm, setShowAppForm] = useState(false);
  const [editApp, setEditApp] = useState<HRApplication | null>(null);
  const [appForm, setAppForm] = useState({
    positionId: "",
    applicantName: "",
    applicantNameAr: "",
    phone: "",
    email: "",
    experience: "",
    education: "",
    resumeNotes: "",
    status: "new" as HRApplicationStatus,
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [n, p, a] = await Promise.all([
        api.get<any>("/hr/needs"),
        api.get<any>("/hr/positions"),
        api.get<any>("/hr/applications"),
      ]);
      setNeeds(n?.data ?? []);
      setPositions(p?.data ?? []);
      setApplications(a?.data ?? []);
    } catch (e: any) {
      toast.error("فشل تحميل البيانات: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveNeed = async () => {
    if (!needForm.positionTitleAr) {
      toast.error("اسم الوظيفة بالعربي مطلوب");
      return;
    }
    try {
      if (editNeed) {
        await api.put(`/hr/needs/${editNeed.id}`, needForm);
        toast.success("تم تحديث الاحتياج");
      } else {
        await api.post("/hr/needs", needForm);
        toast.success("تم إضافة احتياج");
      }
      setShowNeedForm(false);
      setEditNeed(null);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  };

  const handleDeleteNeed = async (id: string) => {
    if (!confirm("حذف هذا الاحتياج؟")) return;
    try {
      await api.delete(`/hr/needs/${id}`);
      toast.success("تم الحذف");
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  };

  const handleSavePosition = async () => {
    if (!posForm.titleAr) {
      toast.error("اسم الوظيفة بالعربي مطلوب");
      return;
    }
    try {
      if (editPos) {
        await api.put(`/hr/positions/${editPos.id}`, posForm);
        toast.success("تم تحديث الوظيفة");
      } else {
        await api.post("/hr/positions", posForm);
        toast.success("تم إضافة وظيفة");
      }
      setShowPosForm(false);
      setEditPos(null);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  };

  const handleDeletePosition = async (id: string) => {
    if (!confirm("حذف هذه الوظيفة؟")) return;
    try {
      await api.delete(`/hr/positions/${id}`);
      toast.success("تم الحذف");
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  };

  const handleSaveApplication = async () => {
    if (!appForm.positionId || !appForm.applicantNameAr || !appForm.phone) {
      toast.error("الوظيفة والاسم بالعربي والهاتف مطلوبون");
      return;
    }
    try {
      if (editApp) {
        await api.put(`/hr/applications/${editApp.id}`, appForm);
        toast.success("تم تحديث الطلب");
      } else {
        await api.post("/hr/applications", appForm);
        toast.success("تم إضافة طلب توظيف");
      }
      setShowAppForm(false);
      setEditApp(null);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("حذف هذا الطلب؟")) return;
    try {
      await api.delete(`/hr/applications/${id}`);
      toast.success("تم الحذف");
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  };

  const openEditNeed = (n: HRDepartmentNeed) => {
    setEditNeed(n);
    setNeedForm({
      department: n.department,
      positionTitle: n.positionTitle,
      positionTitleAr: n.positionTitleAr,
      requiredCount: n.requiredCount,
      description: n.description || "",
      minExperience: n.minExperience || "",
      salaryRange: n.salaryRange || "",
      status: n.status,
    });
    setShowNeedForm(true);
  };

  const openEditPos = (p: HRJobPosition) => {
    setEditPos(p);
    setPosForm({
      department: p.department,
      title: p.title,
      titleAr: p.titleAr,
      description: p.description || "",
      status: p.status,
    });
    setShowPosForm(true);
  };

  const openEditApp = (a: HRApplication) => {
    setEditApp(a);
    setAppForm({
      positionId: a.positionId,
      applicantName: a.applicantName,
      applicantNameAr: a.applicantNameAr,
      phone: a.phone,
      email: a.email || "",
      experience: a.experience || "",
      education: a.education || "",
      resumeNotes: a.resumeNotes || "",
      status: a.status,
      notes: a.notes || "",
    });
    setShowAppForm(true);
  };

  const openNewNeed = () => {
    setEditNeed(null);
    setNeedForm({
      department: "reception",
      positionTitle: "",
      positionTitleAr: "",
      requiredCount: 1,
      description: "",
      minExperience: "",
      salaryRange: "",
      status: "open",
    });
    setShowNeedForm(true);
  };

  const openNewPos = () => {
    setEditPos(null);
    setPosForm({
      department: "reception",
      title: "",
      titleAr: "",
      description: "",
      status: "open",
    });
    setShowPosForm(true);
  };

  const openNewApp = () => {
    setEditApp(null);
    setAppForm({
      positionId: positions[0]?.id || "",
      applicantName: "",
      applicantNameAr: "",
      phone: "",
      email: "",
      experience: "",
      education: "",
      resumeNotes: "",
      status: "new",
      notes: "",
    });
    setShowAppForm(true);
  };

  const openNeedCount = needs.filter((n) => n.status === "open").length;
  const openPosCount = positions.filter((p) => p.status === "open").length;
  const newAppCount = applications.filter((a) => a.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-indigo-600" />
          الموارد البشرية
        </h1>
        <p className="text-muted-foreground">احتياجات الأقسام، الوظائف الشاغرة، طلبات التوظيف</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{needs.length}</p>
                <p className="text-xs text-muted-foreground">احتياجات مسجلة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{openNeedCount}</p>
                <p className="text-xs text-muted-foreground">احتياجات مفتوحة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{positions.length}</p>
                <p className="text-xs text-muted-foreground">وظائف شاغرة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{applications.length}</p>
                <p className="text-xs text-muted-foreground">طلبات توظيف</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="needs" className="gap-1"><Building2 className="w-4 h-4" /> احتياجات الأقسام</TabsTrigger>
          <TabsTrigger value="positions" className="gap-1"><Briefcase className="w-4 h-4" /> الوظائف الشاغرة</TabsTrigger>
          <TabsTrigger value="applications" className="gap-1"><UserPlus className="w-4 h-4" /> طلبات التوظيف</TabsTrigger>
        </TabsList>

        <TabsContent value="needs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>احتياجات التوظيف للأقسام</CardTitle>
              <Button size="sm" onClick={openNewNeed} className="gap-1">
                <Plus className="w-4 h-4" /> إضافة احتياج
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">القسم</th>
                        <th className="text-right py-2">الوظيفة</th>
                        <th className="text-right py-2">المطلوب</th>
                        <th className="text-right py-2">الحالة</th>
                        <th className="text-center py-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {needs.map((n) => (
                        <tr key={n.id} className="border-b hover:bg-accent/30">
                          <td className="py-2">{n.departmentNameAr}</td>
                          <td className="py-2">{n.positionTitleAr}</td>
                          <td className="py-2">{n.requiredCount}</td>
                          <td className="py-2">
                            <Badge variant={n.status === "open" ? "default" : "secondary"}>{NEED_STATUS[n.status]}</Badge>
                          </td>
                          <td className="py-2 text-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditNeed(n)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteNeed(n.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {needs.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد احتياجات - أضف احتياجاً للقسم</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الوظائف الشاغرة</CardTitle>
              <Button size="sm" onClick={openNewPos} className="gap-1">
                <Plus className="w-4 h-4" /> إضافة وظيفة
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">القسم</th>
                        <th className="text-right py-2">الوظيفة</th>
                        <th className="text-right py-2">الوصف</th>
                        <th className="text-right py-2">الحالة</th>
                        <th className="text-center py-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-accent/30">
                          <td className="py-2">{DEPT_OPTIONS.find((d) => d.value === p.department)?.label || p.department}</td>
                          <td className="py-2 font-medium">{p.titleAr}</td>
                          <td className="py-2 text-muted-foreground max-w-[200px] truncate">{p.description || "—"}</td>
                          <td className="py-2">
                            <Badge variant={p.status === "open" ? "default" : "secondary"}>{p.status === "open" ? "مفتوحة" : p.status === "filled" ? "مُشغّلة" : "ملغاة"}</Badge>
                          </td>
                          <td className="py-2 text-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditPos(p)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeletePosition(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {positions.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد وظائف شاغرة</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>طلبات التوظيف</CardTitle>
              <Button size="sm" onClick={openNewApp} className="gap-1" disabled={positions.length === 0}>
                <Plus className="w-4 h-4" /> إضافة طلب
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">المرشح</th>
                        <th className="text-right py-2">الهاتف</th>
                        <th className="text-right py-2">الوظيفة</th>
                        <th className="text-right py-2">التاريخ</th>
                        <th className="text-right py-2">الحالة</th>
                        <th className="text-center py-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((a) => (
                        <tr key={a.id} className="border-b hover:bg-accent/30">
                          <td className="py-2 font-medium">{a.applicantNameAr}</td>
                          <td className="py-2 dir-ltr">{a.phone}</td>
                          <td className="py-2">{a.positionTitle}</td>
                          <td className="py-2 text-muted-foreground">{a.appliedAt.slice(0, 10)}</td>
                          <td className="py-2"><Badge variant="outline">{APP_STATUS[a.status]}</Badge></td>
                          <td className="py-2 text-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditApp(a)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteApplication(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {applications.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد طلبات توظيف</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Need Form Dialog */}
      <Dialog open={showNeedForm} onOpenChange={setShowNeedForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editNeed ? "تعديل احتياج" : "إضافة احتياج توظيف"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>القسم</Label>
              <Select value={needForm.department} onValueChange={(v) => setNeedForm({ ...needForm, department: v as HRDepartment })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPT_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم الوظيفة بالعربي *</Label>
                <Input value={needForm.positionTitleAr} onChange={(e) => setNeedForm({ ...needForm, positionTitleAr: e.target.value })} placeholder="فني بورسلين" />
              </div>
              <div>
                <Label>عدد المطلوب</Label>
                <Input type="number" min={1} value={needForm.requiredCount} onChange={(e) => setNeedForm({ ...needForm, requiredCount: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={needForm.description} onChange={(e) => setNeedForm({ ...needForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الحد الأدنى للخبرة</Label>
                <Input value={needForm.minExperience} onChange={(e) => setNeedForm({ ...needForm, minExperience: e.target.value })} placeholder="سنتين" />
              </div>
              <div>
                <Label>نطاق الراتب</Label>
                <Input value={needForm.salaryRange} onChange={(e) => setNeedForm({ ...needForm, salaryRange: e.target.value })} placeholder="5000-7000 ج.م" />
              </div>
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={needForm.status} onValueChange={(v) => setNeedForm({ ...needForm, status: v as HRNeedStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NEED_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNeedForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveNeed}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Position Form Dialog */}
      <Dialog open={showPosForm} onOpenChange={setShowPosForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editPos ? "تعديل وظيفة" : "إضافة وظيفة شاغرة"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>القسم</Label>
              <Select value={posForm.department} onValueChange={(v) => setPosForm({ ...posForm, department: v as HRDepartment })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPT_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم الوظيفة بالعربي *</Label>
                <Input value={posForm.titleAr} onChange={(e) => setPosForm({ ...posForm, titleAr: e.target.value })} placeholder="فني بورسلين" />
              </div>
              <div>
                <Label>اسم الوظيفة بالإنجليزي</Label>
                <Input value={posForm.title} onChange={(e) => setPosForm({ ...posForm, title: e.target.value })} dir="ltr" placeholder="Porcelain Technician" />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={posForm.description} onChange={(e) => setPosForm({ ...posForm, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={posForm.status} onValueChange={(v) => setPosForm({ ...posForm, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">مفتوحة</SelectItem>
                  <SelectItem value="filled">مُشغّلة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPosForm(false)}>إلغاء</Button>
              <Button onClick={handleSavePosition}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Form Dialog */}
      <Dialog open={showAppForm} onOpenChange={setShowAppForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editApp ? "تعديل طلب توظيف" : "إضافة طلب توظيف"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>الوظيفة *</Label>
              <Select value={appForm.positionId} onValueChange={(v) => setAppForm({ ...appForm, positionId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الوظيفة" /></SelectTrigger>
                <SelectContent>
                  {positions.filter((p) => p.status === "open").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.titleAr} - {DEPT_OPTIONS.find((d) => d.value === p.department)?.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم المرشح بالعربي *</Label>
                <Input value={appForm.applicantNameAr} onChange={(e) => setAppForm({ ...appForm, applicantNameAr: e.target.value })} placeholder="أحمد محمد" />
              </div>
              <div>
                <Label>اسم المرشح بالإنجليزي</Label>
                <Input value={appForm.applicantName} onChange={(e) => setAppForm({ ...appForm, applicantName: e.target.value })} dir="ltr" placeholder="Ahmed Mohamed" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الهاتف *</Label>
                <Input value={appForm.phone} onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })} dir="ltr" placeholder="01012345678" />
              </div>
              <div>
                <Label>البريد</Label>
                <Input value={appForm.email} onChange={(e) => setAppForm({ ...appForm, email: e.target.value })} type="email" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الخبرة</Label>
                <Input value={appForm.experience} onChange={(e) => setAppForm({ ...appForm, experience: e.target.value })} placeholder="3 سنوات" />
              </div>
              <div>
                <Label>المؤهل</Label>
                <Input value={appForm.education} onChange={(e) => setAppForm({ ...appForm, education: e.target.value })} placeholder="دبلوم صناعي" />
              </div>
            </div>
            <div>
              <Label>ملاحظات السيرة الذاتية</Label>
              <Textarea value={appForm.resumeNotes} onChange={(e) => setAppForm({ ...appForm, resumeNotes: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={appForm.status} onValueChange={(v) => setAppForm({ ...appForm, status: v as HRApplicationStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APP_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات داخلية</Label>
              <Textarea value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAppForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveApplication}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
