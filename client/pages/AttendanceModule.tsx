/**
 * مديول الحضور والرواتب - إدارة كاملة
 * حضور وإنصراف، محطة بصمة، استيراد CSV، رواتب وخصومات
 */

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, Clock, DollarSign, Upload, Fingerprint, Plus, Check, X,
  LayoutDashboard, FileSpreadsheet, Edit, Trash2, ExternalLink,
  LogIn, LogOut, UserCheck, UserX,
} from "lucide-react";
import type { User, AttendanceRecord, PayrollPeriod, PayrollEntry } from "@shared/api";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const STATUS_LABELS: Record<string, string> = { draft: "مسودة", approved: "معتمد", paid: "مُصرف" };
const SOURCE_LABELS: Record<string, string> = { manual: "يدوي", import: "استيراد", fingerprint: "بصمة" };

interface TodayStatus {
  userId: string;
  userName: string;
  fingerprintId?: string;
  present: boolean;
  isCurrentlyIn: boolean;
  checkIn: string | null;
  checkOut: string | null;
}

export default function AttendanceModule() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "attendance" | "import" | "payroll">("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [todayStatus, setTodayStatus] = useState<TodayStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formUserId, setFormUserId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCheckIn, setFormCheckIn] = useState("09:00");
  const [formCheckOut, setFormCheckOut] = useState("17:00");

  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());
  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1);

  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");

  const [importMapping, setImportMapping] = useState({ userId: 0, date: 2, time: 3, punch: 4 });
  const [importPreview, setImportPreview] = useState<string[][]>([]);

  const loadUsers = async () => {
    try {
      const r = await api.get<any>("/users");
      setUsers(r?.data ?? []);
    } catch (e: any) {
      toast.error("فشل تحميل المستخدمين: " + (e?.message || "خطأ غير معروف"));
    }
  };
  const loadAttendance = async () => {
    try {
      const from = `${newPeriodYear}-${String(newPeriodMonth).padStart(2, "0")}-01`;
      const to = new Date(newPeriodYear, newPeriodMonth, 0).getDate();
      const toStr = `${newPeriodYear}-${String(newPeriodMonth).padStart(2, "0")}-${String(to).padStart(2, "0")}`;
      const r = await api.get<any>(`/attendance?from=${from}&to=${toStr}`);
      setAttendance(r?.data ?? []);
    } catch (e: any) {
      toast.error("فشل تحميل الحضور: " + (e?.message || "خطأ غير معروف"));
    }
  };
  const loadPeriods = async () => {
    try {
      const r = await api.get<any>("/payroll/periods");
      setPeriods(r?.data ?? []);
    } catch (e: any) {
      toast.error("فشل تحميل الدورات: " + (e?.message || "خطأ غير معروف"));
    }
  };
  const loadToday = async () => {
    try {
      const r = await api.get<any>("/attendance/today");
      setTodayStatus(r?.data ?? []);
    } catch (e: any) {
      toast.error("فشل تحميل حالة اليوم: " + (e?.message || "خطأ غير معروف"));
    }
  };

  const loadData = async () => {
    setInitialLoad(true);
    await Promise.all([loadUsers(), loadAttendance(), loadPeriods(), loadToday()]);
    setInitialLoad(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (activeTab === "dashboard") loadToday(); }, [activeTab]);

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserId) { toast.error("اختر الموظف"); return; }
    setLoading(true);
    try {
      await api.post("/attendance", { userId: formUserId, date: formDate, checkIn: formCheckIn, checkOut: formCheckOut });
      toast.success("تم التسجيل");
      loadAttendance();
      loadToday();
    } catch (e: any) { toast.error(e?.message || "فشل"); }
    finally { setLoading(false); }
  };

  const handleFileImport = async () => {
    if (importPreview.length < 1) { toast.error("اختر ملف أولاً"); return; }
    setLoading(true);
    try {
      const res = await api.post("/attendance/import", { rows: importPreview, mapping: importMapping });
      toast.success(`تم استيراد ${res.imported} سجل`);
      if (res.errors?.length) toast.warning(`${res.errors.length} أخطاء`);
      setImportPreview([]);
      loadAttendance();
      loadToday();
    } catch (err: any) { toast.error(err?.message || "فشل الاستيراد"); }
    finally { setLoading(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const rows = lines.map((l) => l.split(/[,;\t]/).map((c) => c.trim()));
    if (rows.length < 1) { toast.error("الملف فارغ"); return; }
    setImportPreview(rows);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEdit = (r: AttendanceRecord) => {
    setEditRecord(r);
    setEditDate(r.date);
    setEditCheckIn(r.checkIn || "");
    setEditCheckOut(r.checkOut || "");
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    try {
      await api.put(`/attendance/${editRecord.id}`, { date: editDate, checkIn: editCheckIn || undefined, checkOut: editCheckOut || undefined });
      toast.success("تم التحديث");
      setEditRecord(null);
      loadAttendance();
    } catch (e: any) { toast.error(e?.message); }
  };

  const handleDelete = async (r: AttendanceRecord) => {
    if (!confirm(`حذف سجل ${r.userName} - ${r.date}؟`)) return;
    try {
      await api.delete(`/attendance/${r.id}`);
      toast.success("تم الحذف");
      loadAttendance();
      loadToday();
    } catch (e: any) { toast.error(e?.message); }
  };

  const createPeriod = async () => {
    setLoading(true);
    try {
      const res = await api.post("/payroll/periods", { year: newPeriodYear, month: newPeriodMonth });
      toast.success("تم إنشاء دورة الرواتب");
      setSelectedPeriod(res.data);
      setEntries(res.data.entries || []);
      loadPeriods();
    } catch (e: any) { toast.error(e?.message || "فشل"); }
    finally { setLoading(false); }
  };

  const openPeriod = async (p: PayrollPeriod) => {
    try {
      const res = await api.get<any>(`/payroll/periods/${p.id}`);
      setSelectedPeriod(res.data);
      setEntries(res.data.entries || []);
    } catch { toast.error("فشل التحميل"); }
  };

  const updateEntryStatus = async (periodId: string, status: string) => {
    try {
      await api.put(`/payroll/periods/${periodId}/status`, { status });
      toast.success("تم التحديث");
      loadPeriods();
      if (selectedPeriod?.id === periodId) setSelectedPeriod((prev) => prev ? { ...prev, status } : null);
    } catch (e: any) { toast.error(e?.message); }
  };

  const presentCount = todayStatus.filter((s) => s.present).length;
  const inCount = todayStatus.filter((s) => s.isCurrentlyIn).length;
  const withFingerprint = users.filter((u) => u.active && u.fingerprintId).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fingerprint className="w-7 h-7 text-indigo-600" />
            إدارة الحضور والرواتب
          </h1>
          <p className="text-muted-foreground">حضور، انصراف، محطة بصمة، استيراد، رواتب وخصومات</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/attendance/kiosk" target="_blank" rel="noopener noreferrer" className="gap-2">
            <ExternalLink className="w-4 h-4" /> محطة البصمة
          </a>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-1"><LayoutDashboard className="w-4 h-4" /> لوحة التحكم</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1"><Clock className="w-4 h-4" /> الحضور</TabsTrigger>
          <TabsTrigger value="import" className="gap-1"><Upload className="w-4 h-4" /> استيراد</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1"><DollarSign className="w-4 h-4" /> الرواتب</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {initialLoad && (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          {!initialLoad && (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{presentCount}</p>
                    <p className="text-xs text-muted-foreground">حضروا اليوم</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <LogIn className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-2xl font-bold">{inCount}</p>
                    <p className="text-xs text-muted-foreground">داخل العمل الآن</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <UserX className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold">{Math.max(0, withFingerprint - presentCount)}</p>
                    <p className="text-xs text-muted-foreground">لم يحضروا</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{withFingerprint}</p>
                    <p className="text-xs text-muted-foreground">موظفين مفعّل للبصمة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>حالة اليوم</CardTitle>
              <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayStatus.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{s.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.present ? (s.checkIn || "—") + (s.checkOut ? ` → ${s.checkOut}` : " → داخل") : "لم يحضر"}
                      </p>
                    </div>
                    {s.isCurrentlyIn ? (
                      <Badge className="bg-green-100 text-green-800 gap-1"><LogIn className="w-3 h-3" /> داخل</Badge>
                    ) : s.present ? (
                      <Badge className="bg-slate-100 text-slate-700 gap-1"><LogOut className="w-3 h-3" /> انصراف</Badge>
                    ) : (
                      <Badge variant="outline">غائب</Badge>
                    )}
                  </div>
                ))}
                {todayStatus.length === 0 && <p className="col-span-full text-center text-muted-foreground py-4">لا يوجد موظفين مع رقم بصمة</p>}
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تسجيل حضور يدوي</CardTitle>
              <p className="text-sm text-muted-foreground">للموظفين أو عند عدم توفر الجهاز</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualAttendance} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>الموظف</Label>
                  <Select value={formUserId} onValueChange={setFormUserId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>
                      {users.filter((u) => u.active).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.fullNameAr} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>التاريخ</Label><Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" /></div>
                <div><Label>وقت الحضور</Label><Input type="time" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} className="mt-1" /></div>
                <div><Label>وقت الانصراف</Label><Input type="time" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} className="mt-1" /></div>
                <div className="sm:col-span-2"><Button type="submit" disabled={loading}>تسجيل</Button></div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور</CardTitle>
              <p className="text-sm text-muted-foreground">شهر {MONTHS[newPeriodMonth - 1]} {newPeriodYear}</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Select value={String(newPeriodMonth)} onValueChange={(v) => { setNewPeriodMonth(parseInt(v)); loadAttendance(); }}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(newPeriodYear)} onValueChange={(v) => { setNewPeriodYear(parseInt(v)); loadAttendance(); }}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{[2026, 2025, 2024].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-right py-2">الموظف</th><th className="text-right py-2">التاريخ</th><th className="text-right py-2">حضور</th><th className="text-right py-2">انصراف</th><th className="text-right py-2">المصدر</th><th className="text-center py-2">إجراءات</th></tr></thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-accent/30">
                        <td className="py-2">{a.userName}</td>
                        <td className="py-2">{a.date}</td>
                        <td className="py-2">{a.checkIn || "—"}</td>
                        <td className="py-2">{a.checkOut || "—"}</td>
                        <td className="py-2 text-muted-foreground">{SOURCE_LABELS[a.source] || a.source}</td>
                        <td className="py-2 text-center">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(a)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attendance.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد سجلات</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>استيراد من جهاز البصمة</CardTitle>
              <p className="text-sm text-muted-foreground">صدّر CSV من ZKteco, ANVIZ, Hikvision أو أي جهاز ثم حدد ترتيب الأعمدة</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
                <p className="font-medium">صيغة CSV: رقم الموظف، التاريخ، الوقت، نوع (in/out)</p>
                <p className="text-muted-foreground">حدد رقم عمود لكل حقل (يبدأ من 0)</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><Label>رقم الموظف</Label><Input type="number" min={0} value={importMapping.userId} onChange={(e) => setImportMapping({ ...importMapping, userId: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>التاريخ</Label><Input type="number" min={0} value={importMapping.date} onChange={(e) => setImportMapping({ ...importMapping, date: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>الوقت</Label><Input type="number" min={0} value={importMapping.time} onChange={(e) => setImportMapping({ ...importMapping, time: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>النوع (in/out)</Label><Input type="number" min={0} value={importMapping.punch} onChange={(e) => setImportMapping({ ...importMapping, punch: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2"><FileSpreadsheet className="w-4 h-4" /> اختيار ملف</Button>
                {importPreview.length > 0 && (
                  <>
                    <Button onClick={handleFileImport} disabled={loading}>استيراد {importPreview.length} صف</Button>
                    <Button variant="ghost" onClick={() => setImportPreview([])}>إلغاء</Button>
                  </>
                )}
              </div>
              {importPreview.length > 0 && (
                <div className="max-h-40 overflow-auto text-xs font-mono p-2 bg-muted rounded">
                  {importPreview.slice(0, 10).map((row, i) => (
                    <div key={i}>{row.join(" | ")}</div>
                  ))}
                  {importPreview.length > 10 && <p>... و {importPreview.length - 10} صف آخر</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>دورات الرواتب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={String(newPeriodMonth)} onValueChange={(v) => setNewPeriodMonth(parseInt(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(newPeriodYear)} onValueChange={(v) => setNewPeriodYear(parseInt(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{[2026, 2025, 2024].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={createPeriod} disabled={loading || periods.some((p) => p.year === newPeriodYear && p.month === newPeriodMonth)}>إنشاء دورة جديدة</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <Button key={p.id} variant={selectedPeriod?.id === p.id ? "default" : "outline"} size="sm" onClick={() => openPeriod(p)}>
                    {MONTHS[p.month - 1]} {p.year} — {STATUS_LABELS[p.status]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedPeriod && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>رواتب {MONTHS[selectedPeriod.month - 1]} {selectedPeriod.year}</CardTitle>
                </div>
                <div className="flex gap-2">
                  {selectedPeriod.status === "draft" && <Button size="sm" variant="outline" onClick={() => updateEntryStatus(selectedPeriod.id, "approved")}>اعتماد</Button>}
                  {selectedPeriod.status === "approved" && <Button size="sm" onClick={() => updateEntryStatus(selectedPeriod.id, "paid")}>تسجيل صرف</Button>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">الموظف</th>
                        <th className="text-right py-2">الأساسي</th>
                        <th className="text-right py-2">الغياب</th>
                        <th className="text-right py-2">خصم غياب</th>
                        <th className="text-right py-2">تأخير</th>
                        <th className="text-right py-2">خصم تأخير</th>
                        <th className="text-right py-2 font-bold">الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id} className="border-b">
                          <td className="py-2">{e.userName}</td>
                          <td className="py-2">{e.baseSalary.toLocaleString()}</td>
                          <td className="py-2">{e.absenceDays}</td>
                          <td className="py-2 text-red-600">-{e.absenceDeduction.toLocaleString()}</td>
                          <td className="py-2">{e.lateMinutes}د</td>
                          <td className="py-2 text-red-600">-{e.lateDeduction.toLocaleString()}</td>
                          <td className="py-2 font-bold">{e.netSalary.toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {entries.length > 0 && <p className="mt-4 text-sm text-muted-foreground">الإجمالي: {entries.reduce((s, e) => s + e.netSalary, 0).toLocaleString()} ج.م</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editRecord} onOpenChange={(o) => !o && setEditRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل سجل حضور</DialogTitle></DialogHeader>
          {editRecord && (
            <div className="grid gap-4">
              <div><Label>التاريخ</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></div>
              <div><Label>وقت الحضور</Label><Input type="time" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} /></div>
              <div><Label>وقت الانصراف</Label><Input type="time" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditRecord(null)}>إلغاء</Button><Button onClick={saveEdit}>حفظ</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-indigo-200 bg-indigo-50/30">
        <CardContent className="pt-6">
          <p className="text-sm flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-indigo-600" />
            <strong>البصمة:</strong> أضف رقم البصمة لكل موظف من إدارة المستخدمين. افتح محطة البصمة للتسجيل السريع أو استورد CSV من جهازك.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
