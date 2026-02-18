/**
 * Reception Department - New Case Registration
 * Enhanced with form validation and print link
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { WORK_TYPE_LABELS, SHADE_COLORS, DENTAL_MATERIALS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ClipboardList, Send, Printer, Eye, AlertCircle } from "lucide-react";
import { ScanCaseButton } from "@/components/barcode";
import type { Doctor, DentalCase, CaseWorkType, CreateCaseRequest } from "@shared/api";

const TEETH_PATTERN = /^(\d{1,2})(,\s*\d{1,2})*$|^full$/i;

export default function Reception() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [receptionCases, setReceptionCases] = useState<DentalCase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CreateCaseRequest>({
    doctorId: "",
    patientName: "",
    workType: "zirconia",
    teethNumbers: "",
    shadeColor: "A2",
    material: "",
    expectedDeliveryDate: "",
    priority: "normal",
    doctorNotes: "",
  });

  useEffect(() => {
    api.get<any>("/doctors").then((r) => setDoctors(r.data || []));
    api.get<any>("/cases?status=reception").then((r) => setReceptionCases(r.data || []));
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.doctorId) errs.doctorId = "يرجى اختيار الطبيب";
    if (!form.patientName || form.patientName.trim().length < 2) errs.patientName = "يرجى إدخال اسم المريض (حرفين على الأقل)";
    if (!form.teethNumbers) errs.teethNumbers = "يرجى إدخال أرقام الأسنان";
    else if (!TEETH_PATTERN.test(form.teethNumbers.trim())) errs.teethNumbers = "صيغة غير صحيحة. مثال: 11,12,13 أو full";
    if (form.expectedDeliveryDate && new Date(form.expectedDeliveryDate) < new Date()) {
      errs.expectedDeliveryDate = "تاريخ التسليم يجب أن يكون في المستقبل";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post<any>("/cases", form);
      toast.success(`تم تسجيل الحالة بنجاح - رقم: ${res.data.caseNumber}`);
      setReceptionCases([res.data, ...receptionCases]);
      setShowForm(false);
      setErrors({});
      setForm({
        doctorId: "", patientName: "", workType: "zirconia",
        teethNumbers: "", shadeColor: "A2", material: "",
        expectedDeliveryDate: "", priority: "normal", doctorNotes: "",
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (c: DentalCase) => {
    const toRemovable = ["removable", "ortho", "denture"].includes(c.workType);
    const toStatus = toRemovable ? "removable" : "cad_design";
    try {
      await api.post<any>(`/cases/${c.id}/transfer`, {
        toStatus,
        notes: toRemovable ? "Transferred to Removable Dept" : "Transferred from reception",
      });
      toast.success(toRemovable ? "تم تحويل الحالة لقسم التركيبات المتحركة" : "تم تحويل الحالة لقسم التصميم");
      setReceptionCases(receptionCases.filter((x) => x.id !== c.id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-600" />
            قسم الاستقبال
          </h1>
          <p className="text-muted-foreground">تسجيل الحالات الجديدة وتحويلها للأقسام</p>
        </div>
        <div className="flex gap-2">
          <ScanCaseButton variant="outline" className="gap-2" />
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            حالة جديدة
          </Button>
        </div>
      </div>

      {/* New Case Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle>تسجيل حالة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>الطبيب *</Label>
                <Select value={form.doctorId} onValueChange={(v) => { setForm({ ...form, doctorId: v }); setErrors({ ...errors, doctorId: "" }); }}>
                  <SelectTrigger className={errors.doctorId ? "border-red-500" : ""}><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nameAr} - {d.clinicAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.doctorId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.doctorId}</p>}
              </div>

              <div>
                <Label>اسم المريض *</Label>
                <Input
                  value={form.patientName}
                  onChange={(e) => { setForm({ ...form, patientName: e.target.value }); setErrors({ ...errors, patientName: "" }); }}
                  placeholder="اسم المريض"
                  className={errors.patientName ? "border-red-500" : ""}
                />
                {errors.patientName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.patientName}</p>}
              </div>

              <div>
                <Label>نوع العمل *</Label>
                <Select value={form.workType} onValueChange={(v) => setForm({ ...form, workType: v as CaseWorkType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORK_TYPE_LABELS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>أرقام الأسنان *</Label>
                <Input
                  value={form.teethNumbers}
                  onChange={(e) => { setForm({ ...form, teethNumbers: e.target.value }); setErrors({ ...errors, teethNumbers: "" }); }}
                  placeholder="مثال: 11,12,13 أو full"
                  className={errors.teethNumbers ? "border-red-500" : ""}
                />
                {errors.teethNumbers && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.teethNumbers}</p>}
              </div>

              <div>
                <Label>درجة اللون</Label>
                <Select value={form.shadeColor} onValueChange={(v) => setForm({ ...form, shadeColor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHADE_COLORS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>المادة</Label>
                <Select value={form.material || "none"} onValueChange={(v) => setForm({ ...form, material: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— اختر المادة —</SelectItem>
                    {DENTAL_MATERIALS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>تاريخ التسليم المتوقع</Label>
                <Input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) => { setForm({ ...form, expectedDeliveryDate: e.target.value }); setErrors({ ...errors, expectedDeliveryDate: "" }); }}
                  className={errors.expectedDeliveryDate ? "border-red-500" : ""}
                />
                {errors.expectedDeliveryDate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.expectedDeliveryDate}</p>}
              </div>

              <div>
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">عادي</SelectItem>
                    <SelectItem value="urgent">مستعجل</SelectItem>
                    <SelectItem value="rush">عاجل جداً</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>ملاحظات الطبيب</Label>
                <Textarea
                  value={form.doctorNotes || ""}
                  onChange={(e) => setForm({ ...form, doctorNotes: e.target.value })}
                  placeholder="أي ملاحظات خاصة من الطبيب..."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? "جاري الحفظ..." : "تسجيل الحالة"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setErrors({}); }}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cases in Reception */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الحالات في الاستقبال ({receptionCases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {receptionCases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حالات في الاستقبال حالياً</p>
          ) : (
            <div className="space-y-3">
              {receptionCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                      <Badge className={c.priority === "rush" ? "bg-red-500 text-white" : c.priority === "urgent" ? "bg-amber-500 text-white" : "bg-gray-200"}>
                        {c.priority === "rush" ? "عاجل" : c.priority === "urgent" ? "مستعجل" : "عادي"}
                      </Badge>
                      <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      المريض: {c.patientName} | الطبيب: {c.doctorName} | اللون: {c.shadeColor} | الأسنان: {c.teethNumbers}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/cases/${c.id}/print`}>
                      <Button size="sm" variant="ghost" title="طباعة باركود">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link to={`/cases/${c.id}`}>
                      <Button size="sm" variant="ghost" title="عرض التفاصيل">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button size="sm" onClick={() => handleTransfer(c)} className="gap-1">
                      <Send className="w-4 h-4" />
                      {["removable", "ortho", "denture"].includes(c.workType) ? "تحويل للتركيبات المتحركة" : "تحويل للتصميم"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
